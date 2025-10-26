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

// Get user profile by ID
router.get('/:userId', userController.getUserProfile);

/**
 * Protected routes - require authentication
 */
router.use(authMiddleware);

// Get current user profile
router.get('/me', userController.getMyProfile);

// Update current user profile
router.patch('/me', userController.updateProfile);

// Change password
router.post('/me/password', userController.changePassword);

export default router;
