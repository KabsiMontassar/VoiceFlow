import { Router } from 'express';
import type { Router as ExpressRouter } from 'express';
import { UserController } from '../controllers/user.controller';
import { authMiddleware } from '../middleware/auth';

const router: ExpressRouter = Router();
const userController = new UserController();

/**
 * Public routes
 */

// Search users
router.get('/search', userController.searchUsers);

/**
 * Protected routes - require authentication
 */
router.use(authMiddleware);

// Get current user profile (must be before /:userId to avoid matching "me" as userId)
router.get('/me', userController.getMyProfile);

// Get user profile by ID
router.get('/:userId', userController.getUserProfile);

// Update current user profile
router.patch('/me', userController.updateProfile);

// Change password
router.post('/me/password', userController.changePassword);

export default router;
