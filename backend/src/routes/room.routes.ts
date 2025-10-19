import { Router } from 'express';
import type { Router as ExpressRouter } from 'express';
import { RoomController } from '../controllers/room.controller';
import { authMiddleware } from '../middleware/auth';

const router: ExpressRouter = Router();
const roomController = new RoomController();

/**
 * Protected routes - require authentication
 */
router.use(authMiddleware);

// Create new room
router.post('/', roomController.createRoom);

// List user's rooms
router.get('/', roomController.listUserRooms);

// Get room by code (before :roomId to avoid conflicts)
router.get('/code/:code', roomController.getRoomByCode);

// Get room by ID
router.get('/:roomId', roomController.getRoom);

// Update room
router.put('/:roomId', roomController.updateRoom);

// Delete room
router.delete('/:roomId', roomController.deleteRoom);

// Join room
router.post('/:roomId/join', roomController.joinRoom);

// Leave room
router.post('/:roomId/leave', roomController.leaveRoom);

// Get room members
router.get('/:roomId/members', roomController.getRoomMembers);

export default router;
