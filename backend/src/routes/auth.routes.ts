import { Router, Request, Response, NextFunction } from 'express';
import type { Router as ExpressRouter } from 'express';
import { authController } from '../controllers/auth.controller';
import { authMiddleware, userRateLimitMiddleware, validateSessionMiddleware } from '../middleware/auth';

const router: ExpressRouter = Router();

/**
 * Public routes with rate limiting
 */
router.post('/register', userRateLimitMiddleware(5, 15), authController.register);
router.post('/login', userRateLimitMiddleware(10, 15), authController.login);
router.post('/refresh', userRateLimitMiddleware(30, 15), authController.refreshToken);

/**
 * Protected routes with authentication and session validation
 */
router.get('/me', authMiddleware, validateSessionMiddleware, authController.getCurrentUser);
router.post('/logout', authMiddleware, authController.logout);
router.post('/logout-all', authMiddleware, authController.logoutAll);
router.get('/sessions', authMiddleware, validateSessionMiddleware, authController.getSessions);
router.get('/status', authMiddleware, authController.getStatus);

export default router;
