/**
 * VoiceFlow Backend Entry Point - Performance Optimized
 * Initializes Express server with Socket.IO integration, Redis scaling, and presence management
 */

import express, { Express } from 'express';
import cors from 'cors';
import helmet from 'helmet';
import rateLimit from 'express-rate-limit';
import { createServer } from 'http';
import { Server } from 'socket.io';
import config from './config/index';
import { initializeDatabase } from './database/index';
import { setupRecurringJobs } from './jobs/index';
import { authMiddleware } from './middleware/auth';
import { errorHandler } from './middleware/errorHandler';
import logger from './utils/logger';
import apiRoutes from './routes/index';

// Import optimized services
import { redisService } from './services/redis.service';
import { presenceService } from './services/presence.service';
import OptimizedSocketHandlers from './sockets/optimized-handlers';

const app: Express = express();
const httpServer = createServer(app);
const io = new Server(httpServer, {
  cors: {
    origin: config.SOCKET_CORS_ORIGIN,
    methods: ['GET', 'POST'],
  },
  path: config.SOCKET_PATH,
  // Performance optimizations
  pingTimeout: 60000,
  pingInterval: 25000,
  transports: ['websocket', 'polling'],
  allowEIO3: true
});

// Global rate limiting
const globalRateLimit = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 1000, // Limit each IP to 1000 requests per windowMs
  message: 'Too many requests from this IP, please try again later',
  standardHeaders: true,
  legacyHeaders: false
});

// Middleware
app.use(helmet({
  crossOriginEmbedderPolicy: false,
  contentSecurityPolicy: false
}));
app.use(cors({ 
  origin: config.FRONTEND_URL,
  credentials: true
}));
app.use(globalRateLimit);
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ limit: '10mb', extended: true }));

// Initialize optimized services
let socketHandlers: OptimizedSocketHandlers;

// Enhanced health check endpoint with performance metrics
app.get('/health', async (req: express.Request, res: express.Response) => {
  try {
    const redisHealth = await redisService.healthCheck();
    const presenceStats = presenceService.getPresenceStats();
    const socketStats = socketHandlers ? socketHandlers.getPerformanceStats() : null;

    res.json({
      status: 'ok',
      timestamp: Date.now(),
      services: {
        redis: redisHealth.redis,
        database: true, // Add DB health check here
      },
      metrics: {
        presence: presenceStats,
        sockets: socketStats,
        memory: process.memoryUsage(),
        uptime: process.uptime()
      }
    });
  } catch (error) {
    logger.error('Health check failed:', error);
    res.status(500).json({
      status: 'error',
      timestamp: Date.now(),
      error: 'Health check failed'
    });
  }
});

// API version endpoint with performance info
app.get('/api/v1/info', (req: express.Request, res: express.Response) => {
  res.json({
    name: 'VoiceFlow API',
    version: '1.0.0',
    environment: config.NODE_ENV,
    features: ['realtime-chat', 'presence-tracking', 'redis-scaling', 'rate-limiting'],
    performance: {
      nodeVersion: process.version,
      platform: process.platform,
      arch: process.arch
    }
  });
});

// Mount API routes
app.use('/api/v1', apiRoutes);

// Make Socket.IO instance available to controllers
app.set('io', io);

// Error handling middleware (must be last)
app.use(errorHandler);

/**
 * Start server with performance optimizations
 */
const startServer = async (): Promise<void> => {
  try {
    logger.info('Initializing VoiceFlow backend with performance optimizations...');

    // Initialize database
    logger.info('Connecting to database...');
    await initializeDatabase();

    // Initialize Redis adapter for horizontal scaling
    logger.info('Setting up Redis adapter for Socket.IO...');
    redisService.setupSocketAdapter(io);

    // Initialize presence service
    logger.info('Initializing presence service...');
    presenceService.initialize(io);

    // Initialize WebRTC service
    logger.info('Initializing WebRTC service...');
    const { webrtcService } = await import('./services/webrtc.service');
    webrtcService.initialize(io);

    // Initialize optimized socket handlers
    logger.info('Setting up optimized socket handlers...');
    socketHandlers = new OptimizedSocketHandlers(io);

    // Setup recurring background jobs
    logger.info('Setting up background jobs...');
    setupRecurringJobs();

    // Start HTTP server
    httpServer.listen(config.PORT, () => {
      logger.info(`🚀 VoiceFlow server running on http://localhost:${config.PORT}`);
      logger.info(`📡 WebSocket available at ws://localhost:${config.PORT}${config.SOCKET_PATH}`);
      logger.info(`🔧 Environment: ${config.NODE_ENV}`);
      logger.info('✅ Performance optimizations active:');
      logger.info('   - Redis horizontal scaling');
      logger.info('   - User presence tracking');
      logger.info('   - Rate limiting & debouncing');
      logger.info('   - Connection pooling');
      logger.info('   - Message queuing');
      logger.info('   - Memory leak prevention');
    });
  } catch (error) {
    logger.error('Failed to start server', error);
    process.exit(1);
  }
};

// Enhanced graceful shutdown with cleanup
const gracefulShutdown = async (signal: string) => {
  logger.info(`${signal} received, shutting down gracefully...`);
  
  try {
    // Stop accepting new connections
    httpServer.close(async () => {
      logger.info('HTTP server closed');

      // Cleanup optimized services
      if (socketHandlers) {
        socketHandlers.cleanup();
        logger.info('Socket handlers cleaned up');
      }

      if (presenceService) {
        presenceService.cleanup();
        logger.info('Presence service cleaned up');
      }

      // Disconnect Redis
      await redisService.disconnect();
      logger.info('Redis disconnected');

      logger.info('Graceful shutdown completed');
      process.exit(0);
    });

    // Force close after 30 seconds
    setTimeout(() => {
      logger.error('Force shutdown after timeout');
      process.exit(1);
    }, 30000);
  } catch (error) {
    logger.error('Error during shutdown:', error);
    process.exit(1);
  }
};

process.on('SIGTERM', () => gracefulShutdown('SIGTERM'));
process.on('SIGINT', () => gracefulShutdown('SIGINT'));

// Handle uncaught exceptions
process.on('uncaughtException', (error) => {
  logger.error('Uncaught exception', error);
  process.exit(1);
});

process.on('unhandledRejection', (reason, promise) => {
  logger.error('Unhandled rejection', { reason, promise });
  process.exit(1);
});

// Start the server
startServer();

export default app;
