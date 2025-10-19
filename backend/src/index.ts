/**
 * VoiceFlow Backend Entry Point
 * Initializes Express server with Socket.IO integration
 */

import express, { Express } from 'express';
import cors from 'cors';
import helmet from 'helmet';
import { createServer } from 'http';
import { Server } from 'socket.io';
import config from './config/index';
import { initializeDatabase } from './database/index';
import { setupSocketHandlers } from './sockets/handlers';
import { setupRecurringJobs } from './jobs/index';
import { authMiddleware } from './middleware/auth';
import { errorHandler } from './middleware/errorHandler';
import logger from './utils/logger';
import apiRoutes from './routes/index';

const app: Express = express();
const httpServer = createServer(app);
const io = new Server(httpServer, {
  cors: {
    origin: config.SOCKET_CORS_ORIGIN,
    methods: ['GET', 'POST'],
  },
  path: config.SOCKET_PATH,
});

// Middleware
app.use(helmet());
app.use(cors({ origin: config.FRONTEND_URL }));
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ limit: '10mb', extended: true }));

// Health check endpoint
app.get('/health', (req: express.Request, res: express.Response) => {
  res.json({ status: 'ok', timestamp: Date.now() });
});

// API version endpoint
app.get('/api/v1/info', (req: express.Request, res: express.Response) => {
  res.json({
    name: 'VoiceFlow API',
    version: '1.0.0',
    environment: config.NODE_ENV,
  });
});

// Mount API routes
app.use('/api/v1', apiRoutes);

// Socket.IO handlers
setupSocketHandlers(io);

// Error handling middleware (must be last)
app.use(errorHandler);

/**
 * Start server
 */
const startServer = async (): Promise<void> => {
  try {
    // Initialize database
    await initializeDatabase();

    // Setup recurring background jobs
    setupRecurringJobs();

    // Start HTTP server
    httpServer.listen(config.PORT, () => {
      logger.info(`Server running on http://localhost:${config.PORT}`);
      logger.info(`WebSocket available at ws://localhost:${config.PORT}${config.SOCKET_PATH}`);
      logger.info(`Environment: ${config.NODE_ENV}`);
    });
  } catch (error) {
    logger.error('Failed to start server', error);
    process.exit(1);
  }
};

// Handle graceful shutdown
process.on('SIGTERM', () => {
  logger.info('SIGTERM received, shutting down gracefully');
  httpServer.close(() => {
    logger.info('Server closed');
    process.exit(0);
  });
});

process.on('SIGINT', () => {
  logger.info('SIGINT received, shutting down gracefully');
  httpServer.close(() => {
    logger.info('Server closed');
    process.exit(0);
  });
});

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
