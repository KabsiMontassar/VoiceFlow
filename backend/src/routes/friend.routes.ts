/**
 * Friend Routes
 * Handles all friend-related endpoints
 */

import { Router } from 'express';
import { FriendController } from '../controllers/friend.controller';
import { authMiddleware } from '../middleware/auth';

const router: Router = Router();

// All routes require authentication
router.use(authMiddleware);

// Friend requests
router.post('/request', FriendController.sendRequest);
router.get('/requests/pending', FriendController.getPendingRequests);
router.get('/requests/sent', FriendController.getSentRequests);
router.post('/requests/:requestId/accept', FriendController.acceptRequest);
router.post('/requests/:requestId/reject', FriendController.rejectRequest);
router.delete('/requests/:requestId', FriendController.cancelRequest);

// Friends management
router.get('/', FriendController.getFriends);
router.delete('/:friendId', FriendController.removeFriend);
router.get('/count', FriendController.getFriendCount);
router.get('/check/:friendId', FriendController.checkFriendship);

export default router;
