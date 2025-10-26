import { Router } from 'express';
import type { Router as ExpressRouter } from 'express';
import { settingsController } from '../controllers/settings.controller';
import { authMiddleware } from '../middleware/auth';

const router: ExpressRouter = Router();

/**
 * All settings routes require authentication
 */
router.use(authMiddleware);

// Get user settings
router.get('/', settingsController.getUserSettings);

// Update user settings
router.patch('/', settingsController.updateUserSettings);

export default router;
