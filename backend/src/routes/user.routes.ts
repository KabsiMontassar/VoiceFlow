import { Router } from 'express';
import type { Router as ExpressRouter } from 'express';
import { UserController } from '../controllers/user.controller';
import { authMiddleware } from '../middleware/auth';

const router: ExpressRouter = Router();
const userController = new UserController();

/**
 * Public routes
 */

// Get user profile by ID
router.get('/:userId', userController.getUserProfile);

// Search users
router.get('/search', userController.searchUsers);

/**
 * Protected routes - require authentication
 */
router.use(authMiddleware);

// Update current user profile
router.put('/me', userController.updateProfile);

export default router;
