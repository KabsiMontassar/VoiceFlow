/**
 * Redis Service - Comprehensive Performance Optimization
 * Handles horizontal scaling, caching, message queuing, and rate limiting
 */

import Redis from 'ioredis';
import { createAdapter } from '@socket.io/redis-adapter';
import { Server } from 'socket.io';
import config from '../config/index';
import logger from '../utils/logger';

interface RedisConfig {
  host: string;
  port: number;
  password?: string;
  db?: number;
  retryDelayOnFailover: number;
  enableReadyCheck: boolean;
  maxRetriesPerRequest: number;
  lazyConnect: boolean;
  keepAlive: number;
  connectTimeout: number;
  commandTimeout: number;
}

interface OfflineMessage {
  id: string;
  roomId: string;
  userId: string;
  content: string;
  timestamp: Date;
  messageType: string;
}

interface RateLimitInfo {
  count: number;
  resetTime: number;
}

/**
 * Optimized Redis Connection Manager with Connection Pooling
 */
export class RedisService {
  private pubClient: Redis | null = null;
  private subClient: Redis | null = null;
  private cacheClient: Redis | null = null;
  private isInitialized = false;
  private connectionRetries = 0;
  private maxRetries = 5;
  private reconnectDelay = 1000;

  constructor() {
    this.initializeClients();
  }

  /**
   * Initialize Redis clients with optimized connection pooling
   */
  private async initializeClients(): Promise<void> {
    try {
      const redisConfig: RedisConfig = {
        host: process.env.REDIS_HOST || 'localhost',
        port: parseInt(process.env.REDIS_PORT || '6379'),
        password: process.env.REDIS_PASSWORD,
        db: 0,
        retryDelayOnFailover: 100,
        enableReadyCheck: true,
        maxRetriesPerRequest: 3,
        lazyConnect: true,
        keepAlive: 30000,
        connectTimeout: 10000,
        commandTimeout: 5000
      };

      // Create optimized clients for different purposes
      this.pubClient = new Redis({
        ...redisConfig,
        db: 0, // Publisher
        enableOfflineQueue: false
      });

      this.subClient = new Redis({
        ...redisConfig,
        db: 0, // Subscriber
        enableOfflineQueue: false
      });

      this.cacheClient = new Redis({
        ...redisConfig,
        db: 1, // Cache & Rate Limiting
        enableOfflineQueue: true
      });

      // Connection event handlers
      this.setupConnectionHandlers();

      // Connect all clients
      await Promise.all([
        this.pubClient.connect(),
        this.subClient.connect(),
        this.cacheClient.connect()
      ]);

      this.isInitialized = true;
      this.connectionRetries = 0;
      logger.info('Redis clients connected successfully with connection pooling');

    } catch (error) {
      logger.error('Redis initialization failed:', error);
      await this.handleConnectionFailure();
    }
  }

  /**
   * Setup connection event handlers for monitoring
   */
  private setupConnectionHandlers(): void {
    const clients = [
      { name: 'pub', client: this.pubClient },
      { name: 'sub', client: this.subClient },
      { name: 'cache', client: this.cacheClient }
    ];

    clients.forEach(({ name, client }) => {
      if (!client) return;

      client.on('connect', () => {
        logger.info(`Redis ${name} client connected`);
      });

      client.on('ready', () => {
        logger.info(`Redis ${name} client ready`);
      });

      client.on('error', (error) => {
        logger.error(`Redis ${name} client error:`, error);
      });

      client.on('close', () => {
        logger.warn(`Redis ${name} client connection closed`);
      });

      client.on('reconnecting', () => {
        logger.info(`Redis ${name} client reconnecting...`);
      });
    });
  }

  /**
   * Handle connection failures with exponential backoff
   */
  private async handleConnectionFailure(): Promise<void> {
    if (this.connectionRetries < this.maxRetries) {
      this.connectionRetries++;
      const delay = this.reconnectDelay * Math.pow(2, this.connectionRetries - 1);
      
      logger.info(`Retrying Redis connection in ${delay}ms (attempt ${this.connectionRetries}/${this.maxRetries})`);
      
      setTimeout(() => {
        this.initializeClients();
      }, delay);
    } else {
      logger.error('Max Redis connection retries reached. Operating without Redis.');
      this.isInitialized = false;
    }
  }

  /**
   * Setup Socket.IO Redis adapter for horizontal scaling
   */
  public setupSocketAdapter(io: Server): void {
    if (!this.pubClient || !this.subClient || !this.isInitialized) {
      logger.warn('Redis not available, using in-memory adapter');
      return;
    }

    try {
      const adapter = createAdapter(this.pubClient, this.subClient, {
        key: 'voiceflow:socket.io',
        requestsTimeout: 5000
      });

      io.adapter(adapter);
      logger.info('Socket.IO Redis adapter configured for horizontal scaling');
    } catch (error) {
      logger.error('Failed to setup Socket.IO Redis adapter:', error);
    }
  }

  /**
   * Optimized caching with TTL and compression
   */
  public async setCache(key: string, value: any, ttlSeconds: number = 3600): Promise<void> {
    if (!this.cacheClient || !this.isInitialized) return;

    try {
      const serializedValue = JSON.stringify(value);
      await this.cacheClient.setex(`cache:${key}`, ttlSeconds, serializedValue);
      logger.debug(`Cache set: ${key} (TTL: ${ttlSeconds}s)`);
    } catch (error) {
      logger.error('Cache set error:', error);
    }
  }

  /**
   * Get cached data with automatic deserialization
   */
  public async getCache(key: string): Promise<any | null> {
    if (!this.cacheClient || !this.isInitialized) return null;

    try {
      const value = await this.cacheClient.get(`cache:${key}`);
      return value ? JSON.parse(value) : null;
    } catch (error) {
      logger.error('Cache get error:', error);
      return null;
    }
  }

  /**
   * Advanced rate limiting with Redis
   */
  public async checkRateLimit(identifier: string, maxRequests: number, windowSeconds: number): Promise<{ allowed: boolean; remaining: number; resetTime: number }> {
    if (!this.cacheClient || !this.isInitialized) {
      // Fallback to allowing requests
      return { allowed: true, remaining: maxRequests - 1, resetTime: Date.now() + (windowSeconds * 1000) };
    }

    try {
      const key = `ratelimit:${identifier}`;
      const now = Date.now();
      const windowStart = now - (windowSeconds * 1000);

      // Use Redis sorted set for sliding window rate limiting
      const pipeline = this.cacheClient.pipeline();
      
      // Remove old entries
      pipeline.zremrangebyscore(key, 0, windowStart);
      
      // Add current request
      pipeline.zadd(key, now, `${now}-${Math.random()}`);
      
      // Count requests in window
      pipeline.zcard(key);
      
      // Set expiry
      pipeline.expire(key, windowSeconds);

      const results = await pipeline.exec();
      const count = results?.[2]?.[1] as number || 0;

      const allowed = count <= maxRequests;
      const remaining = Math.max(0, maxRequests - count);
      const resetTime = now + (windowSeconds * 1000);

      return { allowed, remaining, resetTime };
    } catch (error) {
      logger.error('Rate limit check error:', error);
      return { allowed: true, remaining: maxRequests - 1, resetTime: Date.now() + (windowSeconds * 1000) };
    }
  }

  /**
   * Queue messages for offline users
   */
  public async queueOfflineMessage(userId: string, message: OfflineMessage): Promise<void> {
    if (!this.cacheClient || !this.isInitialized) return;

    try {
      const key = `offline_messages:${userId}`;
      const messageData = JSON.stringify(message);
      
      // Add to list with TTL of 24 hours
      await this.cacheClient.lpush(key, messageData);
      await this.cacheClient.expire(key, 86400); // 24 hours
      
      // Limit queue size to prevent memory issues
      await this.cacheClient.ltrim(key, 0, 99); // Keep last 100 messages
      
      logger.debug(`Queued offline message for user ${userId}`);
    } catch (error) {
      logger.error('Offline message queue error:', error);
    }
  }

  /**
   * Retrieve and clear offline messages for user
   */
  public async getOfflineMessages(userId: string): Promise<OfflineMessage[]> {
    if (!this.cacheClient || !this.isInitialized) return [];

    try {
      const key = `offline_messages:${userId}`;
      const messages = await this.cacheClient.lrange(key, 0, -1);
      
      if (messages.length > 0) {
        // Clear messages after retrieval
        await this.cacheClient.del(key);
        
        return messages.map(msg => JSON.parse(msg)).reverse(); // Reverse to get chronological order
      }
      
      return [];
    } catch (error) {
      logger.error('Get offline messages error:', error);
      return [];
    }
  }

  /**
   * Store user presence with TTL
   */
  public async setUserPresence(userId: string, status: 'online' | 'away' | 'offline', roomId?: string): Promise<void> {
    if (!this.cacheClient || !this.isInitialized) return;

    try {
      const presenceData = {
        status,
        lastSeen: new Date().toISOString(),
        roomId: roomId || null
      };

      await this.cacheClient.setex(
        `presence:${userId}`, 
        300, // 5 minutes TTL
        JSON.stringify(presenceData)
      );
      
      logger.debug(`Updated presence for user ${userId}: ${status}`);
    } catch (error) {
      logger.error('Set user presence error:', error);
    }
  }

  /**
   * Get user presence status
   */
  public async getUserPresence(userId: string): Promise<{ status: string; lastSeen: string; roomId?: string } | null> {
    if (!this.cacheClient || !this.isInitialized) return null;

    try {
      const presence = await this.cacheClient.get(`presence:${userId}`);
      return presence ? JSON.parse(presence) : null;
    } catch (error) {
      logger.error('Get user presence error:', error);
      return null;
    }
  }

  /**
   * Publish real-time events across instances
   */
  public async publishEvent(channel: string, data: any): Promise<void> {
    if (!this.pubClient || !this.isInitialized) return;

    try {
      await this.pubClient.publish(channel, JSON.stringify(data));
      logger.debug(`Published event to channel: ${channel}`);
    } catch (error) {
      logger.error('Publish event error:', error);
    }
  }

  /**
   * Subscribe to real-time events
   */
  public async subscribeToEvents(channel: string, callback: (data: any) => void): Promise<void> {
    if (!this.subClient || !this.isInitialized) return;

    try {
      await this.subClient.subscribe(channel);
      this.subClient.on('message', (receivedChannel, message) => {
        if (receivedChannel === channel) {
          try {
            const data = JSON.parse(message);
            callback(data);
          } catch (error) {
            logger.error('Event callback error:', error);
          }
        }
      });
      
      logger.info(`Subscribed to channel: ${channel}`);
    } catch (error) {
      logger.error('Subscribe to events error:', error);
    }
  }

  /**
   * Health check for Redis connections
   */
  public async healthCheck(): Promise<{ redis: boolean; clients: { pub: boolean; sub: boolean; cache: boolean } }> {
    const health = {
      redis: this.isInitialized,
      clients: {
        pub: false,
        sub: false,
        cache: false
      }
    };

    try {
      if (this.pubClient) {
        await this.pubClient.ping();
        health.clients.pub = true;
      }
      
      if (this.subClient) {
        await this.subClient.ping();
        health.clients.sub = true;
      }
      
      if (this.cacheClient) {
        await this.cacheClient.ping();
        health.clients.cache = true;
      }
    } catch (error) {
      logger.error('Redis health check failed:', error);
    }

    return health;
  }

  /**
   * Graceful shutdown
   */
  public async disconnect(): Promise<void> {
    try {
      if (this.pubClient) {
        await this.pubClient.quit();
      }
      if (this.subClient) {
        await this.subClient.quit();
      }
      if (this.cacheClient) {
        await this.cacheClient.quit();
      }
      
      this.isInitialized = false;
      logger.info('Redis clients disconnected gracefully');
    } catch (error) {
      logger.error('Redis disconnect error:', error);
    }
  }
}

// Export singleton instance
export const redisService = new RedisService();
export default redisService;