import { Router } from 'express';
import type { Router as ExpressRouter } from 'express';
import { MessageController } from '../controllers/message.controller';
import { authMiddleware } from '../middleware/auth';

const router: ExpressRouter = Router();
const messageController = new MessageController();

/**
 * Protected routes - require authentication
 */
router.use(authMiddleware);

// Send message
router.post('/', messageController.sendMessage);

// Get room messages
router.get('/:roomId', messageController.getRoomMessages);

// Delete message
router.delete('/:messageId', messageController.deleteMessage);

// Edit message
router.put('/:messageId', messageController.editMessage);

export default router;
