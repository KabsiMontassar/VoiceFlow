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

// Join room by code (MUST be before /:roomId routes to avoid conflicts)
router.post('/join/:code', roomController.joinRoomByCode);

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

// Kick user from room
router.post('/:roomId/kick/:userId', roomController.kickUser);

// Ban user from room
router.post('/:roomId/ban/:userId', roomController.banUser);

// Unban user from room
router.delete('/:roomId/ban/:userId', roomController.unbanUser);

// Get room bans
router.get('/:roomId/bans', roomController.getRoomBans);

export default router;
