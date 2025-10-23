/**
 * Optimized Socket Handlers - High Performance Real-time Communication
 * Addresses all performance bottlenecks: rate limiting, memory leaks, debouncing, caching
 */

import { Server as SocketServer, Socket } from 'socket.io';
import jwt from 'jsonwebtoken';
import { messageService } from '../services/message.service';
import { presenceService } from '../services/presence.service';
import { redisService } from '../services/redis.service';
import logger from '../utils/logger';

interface AuthenticatedSocket extends Socket {
  userId?: string;
  user?: any;
}

interface RateLimitedSocket extends AuthenticatedSocket {
  rateLimitInfo?: {
    messages: number;
    typing: number;
    lastReset: number;
  };
}

interface TypingDebounceInfo {
  timeout: NodeJS.Timeout;
  isTyping: boolean;
}

/**
 * Performance-Optimized Socket Handler
 */
export class OptimizedSocketHandlers {
  private io: SocketServer;
  private typingDebounceMap = new Map<string, TypingDebounceInfo>();
  private connectionPool = new Map<string, Set<string>>(); // userId -> socketIds
  
  // Rate limiting configuration
  private readonly RATE_LIMITS = {
    messages: { max: 30, window: 60000 }, // 30 messages per minute
    typing: { max: 60, window: 60000 },   // 60 typing events per minute
    join: { max: 10, window: 60000 }      // 10 room joins per minute
  };

  // Debounce configuration
  private readonly TYPING_DEBOUNCE_DELAY = 1000; // 1 second
  private readonly TYPING_STOP_DELAY = 3000;     // 3 seconds

  constructor(io: SocketServer) {
    this.io = io;
    this.setupSocketHandlers();
    this.setupPerformanceMonitoring();
  }

  /**
   * Setup main socket event handlers with optimizations
   */
  private setupSocketHandlers(): void {
    this.io.use(this.authenticationMiddleware.bind(this));
    this.io.use(this.rateLimitMiddleware.bind(this));

    this.io.on('connection', (socket: RateLimitedSocket) => {
      this.handleConnection(socket);
    });
  }

  /**
   * Authentication middleware with JWT validation
   */
  private async authenticationMiddleware(socket: AuthenticatedSocket, next: Function): Promise<void> {
    try {
      const token = socket.handshake.auth.token || socket.handshake.headers.authorization?.replace('Bearer ', '');
      
      logger.debug('Socket authentication attempt:', {
        hasToken: !!token,
        tokenPreview: token ? `${token.substring(0, 20)}...` : 'none',
        authData: socket.handshake.auth,
        headers: socket.handshake.headers.authorization
      });
      
      if (!token) {
        logger.error('Authentication token missing');
        return next(new Error('Authentication token required'));
      }

      const decoded = jwt.verify(token, process.env.JWT_SECRET!) as any;
      
      logger.debug('JWT decoded successfully:', {
        id: decoded.id,
        userId: decoded.userId,
        username: decoded.username,
        email: decoded.email,
        allFields: Object.keys(decoded)
      });
      
      // Try multiple possible user ID fields
      socket.userId = decoded.userId || decoded.id || decoded.user?.id;
      socket.user = {
        id: decoded.userId || decoded.id,
        userId: decoded.userId,
        email: decoded.email,
        username: decoded.username,
        ...decoded
      };
      
      if (!socket.userId) {
        logger.error('User ID not found in JWT token:', decoded);
        return next(new Error('Invalid token: missing user ID'));
      }
      
      logger.debug(`Socket authenticated successfully for user ${socket.userId}`);
      next();
    } catch (error) {
      logger.error('Socket authentication failed:', error);
      next(new Error('Invalid authentication token'));
    }
  }

  /**
   * Rate limiting middleware with Redis-backed sliding window
   */
  private async rateLimitMiddleware(socket: RateLimitedSocket, next: Function): Promise<void> {
    try {
      if (!socket.userId) {
        logger.error('Rate limit middleware: socket.userId is undefined. Authentication may have failed.');
        return next(new Error('Authentication required before rate limiting'));
      }

      const userId = socket.userId;
      const socketId = socket.id;

      logger.debug('Rate limiting middleware:', {
        userId,
        socketId,
        hasUserId: !!userId
      });

      // Initialize rate limit info
      socket.rateLimitInfo = {
        messages: 0,
        typing: 0,
        lastReset: Date.now()
      };

      // Check connection rate limiting
      const connectRateLimit = await redisService.checkRateLimit(
        `connect:${userId}`,
        this.RATE_LIMITS.join.max,
        this.RATE_LIMITS.join.window / 1000
      );

      if (!connectRateLimit.allowed) {
        logger.warn(`Connection rate limit exceeded for user ${userId}`);
        return next(new Error('Connection rate limit exceeded'));
      }

      logger.debug(`Socket rate limit initialized for user ${userId}`);
      next();
    } catch (error) {
      logger.error('Rate limit middleware error:', error);
      next(error);
    }
  }

  /**
   * Handle new socket connection with connection pooling
   */
  private async handleConnection(socket: RateLimitedSocket): Promise<void> {
    const userId = socket.userId!;
    const socketId = socket.id;

    try {
      // Add to connection pool
      if (!this.connectionPool.has(userId)) {
        this.connectionPool.set(userId, new Set());
      }
      this.connectionPool.get(userId)!.add(socketId);

      // Initialize presence
      await presenceService.handleUserConnect(socket, userId);

      // Setup socket event handlers
      this.setupSocketEvents(socket);

      // Setup connection monitoring
      this.setupConnectionMonitoring(socket);

      logger.info(`User ${userId} connected with socket ${socketId} (Total connections: ${this.connectionPool.get(userId)?.size})`);

    } catch (error) {
      logger.error('Handle connection error:', error);
      socket.disconnect(true);
    }
  }

  /**
   * Setup individual socket event handlers
   */
  private setupSocketEvents(socket: RateLimitedSocket): void {
    const userId = socket.userId!;

    // Message handling with rate limiting
    socket.on('send_message', async (data) => {
      await this.handleSendMessage(socket, data);
    });

    // Room management
    socket.on('join_room', async (data) => {
      await this.handleJoinRoom(socket, data);
    });

    socket.on('leave_room', async (data) => {
      await this.handleLeaveRoom(socket, data);
    });

    // Typing indicators with debouncing
    socket.on('typing_start', async (data) => {
      await this.handleTypingStart(socket, data);
    });

    socket.on('typing_stop', async (data) => {
      await this.handleTypingStop(socket, data);
    });

    // Presence management
    socket.on('update_status', async (data) => {
      await this.handleUpdateStatus(socket, data);
    });

    socket.on('get_room_presence', async (data) => {
      await this.handleGetRoomPresence(socket, data);
    });

    // WebRTC signaling (optimized)
    socket.on('webrtc_signal', async (data) => {
      await this.handleWebRTCSignal(socket, data);
    });

    // Heartbeat for connection health
    socket.on('heartbeat', () => {
      socket.emit('heartbeat_ack', { timestamp: Date.now() });
    });

    // Disconnection handling
    socket.on('disconnect', async (reason) => {
      await this.handleDisconnection(socket, reason);
    });
  }

  /**
   * Handle message sending with comprehensive rate limiting
   */
  private async handleSendMessage(socket: RateLimitedSocket, data: any): Promise<void> {
    const userId = socket.userId!;

    try {
      logger.debug('Send message attempt:', {
        userId: userId,
        socketId: socket.id,
        hasUser: !!socket.user,
        userData: socket.user,
        messageData: data
      });

      // Rate limiting check
      const rateLimit = await redisService.checkRateLimit(
        `messages:${userId}`,
        this.RATE_LIMITS.messages.max,
        this.RATE_LIMITS.messages.window / 1000
      );

      if (!rateLimit.allowed) {
        socket.emit('rate_limit_exceeded', {
          type: 'messages',
          remaining: rateLimit.remaining,
          resetTime: rateLimit.resetTime
        });
        return;
      }

      // Validate message data
      if (!data.roomId || !data.content || typeof data.content !== 'string') {
        logger.error('Invalid message data:', data);
        socket.emit('error', { message: 'Invalid message data' });
        return;
      }

      // Content validation and sanitization
      const sanitizedContent = data.content.trim();
      if (sanitizedContent.length === 0 || sanitizedContent.length > 1000) {
        logger.error('Message content invalid:', { length: sanitizedContent.length });
        socket.emit('error', { message: 'Message content invalid' });
        return;
      }

      logger.debug('Calling messageService.sendMessage with:', {
        roomId: data.roomId,
        userId: userId,
        content: sanitizedContent,
        messageType: data.messageType || 'text'
      });

      // Create message via service
      const message = await messageService.sendMessage(
        data.roomId,
        userId,
        sanitizedContent,
        data.messageType || 'text'
      );

      logger.debug('Message created successfully:', message);

      // Broadcast to room (optimized)
      socket.to(data.roomId).emit('new_message', {
        ...message,
        user: socket.user
      });

      // Confirm to sender
      socket.emit('message_sent', {
        tempId: data.tempId,
        message: {
          ...message,
          user: socket.user
        }
      });

      // Stop typing indicator
      await this.handleTypingStop(socket, { roomId: data.roomId });

      // Cache recent messages for faster retrieval
      await redisService.setCache(`recent_msg:${data.roomId}`, message, 3600);

      logger.debug(`Message sent successfully by user ${userId} to room ${data.roomId}`);

    } catch (error) {
      logger.error('Send message error:', error);
      socket.emit('error', { 
        message: 'Failed to send message', 
        details: error instanceof Error ? error.message : 'Unknown error'
      });
    }
  }

  /**
   * Handle room joining with optimization
   */
  private async handleJoinRoom(socket: RateLimitedSocket, data: any): Promise<void> {
    const userId = socket.userId!;

    try {
      const { roomId } = data;
      if (!roomId) {
        socket.emit('error', { message: 'Room ID required' });
        return;
      }

      // Rate limiting for room joins
      const rateLimit = await redisService.checkRateLimit(
        `join:${userId}`,
        this.RATE_LIMITS.join.max,
        this.RATE_LIMITS.join.window / 1000
      );

      if (!rateLimit.allowed) {
        socket.emit('rate_limit_exceeded', {
          type: 'join',
          remaining: rateLimit.remaining,
          resetTime: rateLimit.resetTime
        });
        return;
      }

      // Join socket room
      await socket.join(roomId);

      // Update presence
      await presenceService.handleUserJoinRoom(userId, roomId);

      // Get and cache room data
      let roomData = await redisService.getCache(`room:${roomId}`);
      if (!roomData) {
        // Fetch from database and cache
        roomData = await this.getRoomData(roomId);
        await redisService.setCache(`room:${roomId}`, roomData, 1800); // 30 minutes
      }

      // Send room data to user
      socket.emit('room_joined', {
        roomId,
        ...roomData
      });

      // Get recent messages from cache
      const recentMessages = await redisService.getCache(`messages:${roomId}`) || [];
      socket.emit('room_messages', recentMessages);

      // Notify room about new member
      socket.to(roomId).emit('user_joined_room', {
        userId,
        user: socket.user,
        timestamp: new Date()
      });

      logger.debug(`User ${userId} joined room ${roomId}`);

    } catch (error) {
      logger.error('Join room error:', error);
      socket.emit('error', { message: 'Failed to join room' });
    }
  }

  /**
   * Handle room leaving
   */
  private async handleLeaveRoom(socket: RateLimitedSocket, data: any): Promise<void> {
    const userId = socket.userId!;

    try {
      const { roomId } = data;
      if (!roomId) return;

      // Leave socket room
      await socket.leave(roomId);

      // Update presence
      await presenceService.handleUserLeaveRoom(userId, roomId);

      // Notify room about member leaving
      socket.to(roomId).emit('user_left_room', {
        userId,
        user: socket.user,
        timestamp: new Date()
      });

      // Confirm to user
      socket.emit('room_left', { roomId });

      logger.debug(`User ${userId} left room ${roomId}`);

    } catch (error) {
      logger.error('Leave room error:', error);
    }
  }

  /**
   * Handle typing start with debouncing
   */
  private async handleTypingStart(socket: RateLimitedSocket, data: any): Promise<void> {
    logger.debug('Typing start handler called:', {
      socketId: socket.id,
      userId: socket.userId,
      hasUserId: !!socket.userId,
      data: data,
      socketAuth: {
        hasUser: !!socket.user,
        userKeys: socket.user ? Object.keys(socket.user) : []
      }
    });

    const userId = socket.userId!;
    const { roomId } = data;

    if (!userId) {
      logger.error('Typing start: userId is undefined', {
        socketId: socket.id,
        socket: {
          userId: socket.userId,
          user: socket.user,
          rateLimitInfo: socket.rateLimitInfo
        }
      });
      return;
    }

    try {
      if (!roomId) {
        logger.warn('Typing start: roomId is missing', { userId, data });
        return;
      }

      // Rate limiting for typing events
      const rateLimit = await redisService.checkRateLimit(
        `typing:${userId}`,
        this.RATE_LIMITS.typing.max,
        this.RATE_LIMITS.typing.window / 1000
      );

      if (!rateLimit.allowed) return;

      const debounceKey = `${userId}:${roomId}`;
      const existingDebounce = this.typingDebounceMap.get(debounceKey);

      // Clear existing timeout
      if (existingDebounce) {
        clearTimeout(existingDebounce.timeout);
      }

      // Set typing status
      if (!existingDebounce?.isTyping) {
        await presenceService.handleTypingStart(userId, roomId);
      }

      // Set debounced stop timeout
      const timeout = setTimeout(async () => {
        await this.handleTypingStop(socket, { roomId });
        this.typingDebounceMap.delete(debounceKey);
      }, this.TYPING_STOP_DELAY);

      this.typingDebounceMap.set(debounceKey, {
        timeout,
        isTyping: true
      });

    } catch (error) {
      logger.error('Typing start error:', error);
    }
  }

  /**
   * Handle typing stop with debouncing
   */
  private async handleTypingStop(socket: RateLimitedSocket, data: any): Promise<void> {
    const userId = socket.userId!;
    const { roomId } = data;

    try {
      if (!roomId) return;

      const debounceKey = `${userId}:${roomId}`;
      const existingDebounce = this.typingDebounceMap.get(debounceKey);

      if (existingDebounce) {
        clearTimeout(existingDebounce.timeout);
        this.typingDebounceMap.delete(debounceKey);
      }

      await presenceService.handleTypingStop(userId, roomId);

    } catch (error) {
      logger.error('Typing stop error:', error);
    }
  }

  /**
   * Handle status updates
   */
  private async handleUpdateStatus(socket: RateLimitedSocket, data: any): Promise<void> {
    const userId = socket.userId!;

    try {
      const { status } = data;
      if (!['online', 'away', 'offline'].includes(status)) {
        socket.emit('error', { message: 'Invalid status' });
        return;
      }

      await presenceService.setUserStatus(userId, status);
      socket.emit('status_updated', { status, timestamp: new Date() });

    } catch (error) {
      logger.error('Update status error:', error);
    }
  }

  /**
   * Handle room presence requests
   */
  private async handleGetRoomPresence(socket: RateLimitedSocket, data: any): Promise<void> {
    try {
      const { roomId } = data;
      if (!roomId) return;

      const presence = await presenceService.getRoomPresence(roomId);
      socket.emit('room_presence', presence);

    } catch (error) {
      logger.error('Get room presence error:', error);
    }
  }

  /**
   * Handle WebRTC signaling with optimization
   */
  private async handleWebRTCSignal(socket: RateLimitedSocket, data: any): Promise<void> {
    try {
      const { targetUserId, roomId, signal } = data;
      if (!targetUserId || !roomId || !signal) return;

      // Find target user's sockets
      const targetSockets = this.connectionPool.get(targetUserId);
      if (targetSockets) {
        for (const targetSocketId of targetSockets) {
          this.io.to(targetSocketId).emit('webrtc_signal', {
            fromUserId: socket.userId,
            roomId,
            signal
          });
        }
      }

    } catch (error) {
      logger.error('WebRTC signal error:', error);
    }
  }

  /**
   * Handle socket disconnection with cleanup
   */
  private async handleDisconnection(socket: RateLimitedSocket, reason: string): Promise<void> {
    const userId = socket.userId!;
    const socketId = socket.id;

    try {
      // Remove from connection pool
      const userSockets = this.connectionPool.get(userId);
      if (userSockets) {
        userSockets.delete(socketId);
        if (userSockets.size === 0) {
          this.connectionPool.delete(userId);
        }
      }

      // Clear typing debounce
      for (const [key, debounceInfo] of this.typingDebounceMap.entries()) {
        if (key.startsWith(`${userId}:`)) {
          clearTimeout(debounceInfo.timeout);
          this.typingDebounceMap.delete(key);
        }
      }

      // Handle presence disconnection
      await presenceService.handleUserDisconnect(socket);

      logger.info(`User ${userId} disconnected (${reason}). Remaining connections: ${userSockets?.size || 0}`);

    } catch (error) {
      logger.error('Disconnection handling error:', error);
    }
  }

  /**
   * Setup connection monitoring and health checks
   */
  private setupConnectionMonitoring(socket: RateLimitedSocket): void {
    const userId = socket.userId!;

    // Connection health monitoring
    const healthCheckInterval = setInterval(() => {
      socket.emit('ping', { timestamp: Date.now() });
    }, 30000);

    socket.on('pong', (data) => {
      const latency = Date.now() - data.timestamp;
      logger.debug(`User ${userId} latency: ${latency}ms`);
    });

    // Cleanup on disconnect
    socket.on('disconnect', () => {
      clearInterval(healthCheckInterval);
    });
  }

  /**
   * Setup performance monitoring
   */
  private setupPerformanceMonitoring(): void {
    // Monitor connection pool size
    setInterval(() => {
      const totalConnections = Array.from(this.connectionPool.values())
        .reduce((total, sockets) => total + sockets.size, 0);

      logger.debug(`Active connections: ${totalConnections}, Users: ${this.connectionPool.size}`);

      // Emit metrics to monitoring system
      this.io.emit('server_metrics', {
        connections: totalConnections,
        users: this.connectionPool.size,
        rooms: this.io.sockets.adapter.rooms.size,
        timestamp: new Date()
      });
    }, 60000); // Every minute
  }

  /**
   * Get room data (with caching)
   */
  private async getRoomData(roomId: string): Promise<any> {
    try {
      // This would typically fetch from your room service/database
      // For now, return basic room info
      return {
        id: roomId,
        name: `Room ${roomId}`,
        memberCount: 0,
        createdAt: new Date()
      };
    } catch (error) {
      logger.error('Get room data error:', error);
      return null;
    }
  }

  /**
   * Get performance statistics
   */
  public getPerformanceStats(): {
    connections: number;
    users: number;
    rooms: number;
    typingDebounces: number;
    memoryUsage: NodeJS.MemoryUsage;
  } {
    const totalConnections = Array.from(this.connectionPool.values())
      .reduce((total, sockets) => total + sockets.size, 0);

    return {
      connections: totalConnections,
      users: this.connectionPool.size,
      rooms: this.io.sockets.adapter.rooms.size,
      typingDebounces: this.typingDebounceMap.size,
      memoryUsage: process.memoryUsage()
    };
  }

  /**
   * Cleanup resources
   */
  public cleanup(): void {
    // Clear all typing debounces
    for (const debounceInfo of this.typingDebounceMap.values()) {
      clearTimeout(debounceInfo.timeout);
    }
    this.typingDebounceMap.clear();
    this.connectionPool.clear();

    logger.info('Optimized socket handlers cleaned up');
  }
}

export default OptimizedSocketHandlers;