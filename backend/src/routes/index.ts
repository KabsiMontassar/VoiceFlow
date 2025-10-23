import { Router, Request, Response, Express } from 'express';
import type { Router as ExpressRouter } from 'express';
import authRoutes from './auth.routes';
import roomRoutes from './room.routes';
import messageRoutes from './message.routes';
import userRoutes from './user.routes';
import debugRoutes from './debug.routes';

const router: ExpressRouter = Router();

/**
 * API v1 routes
 */
router.use('/auth', authRoutes);
router.use('/rooms', roomRoutes);
router.use('/messages', messageRoutes);
router.use('/users', userRoutes);

// Debug routes (only in development)
if (process.env.NODE_ENV === 'development') {
  router.use('/', debugRoutes);
}

/**
 * Health check
 */
router.get('/health', (req: Request, res: Response) => {
  res.status(200).json({ status: 'ok', timestamp: new Date().toISOString() });
});

export default router;
