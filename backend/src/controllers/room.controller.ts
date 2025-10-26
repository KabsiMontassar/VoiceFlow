import { Request, Response, NextFunction } from 'express';
import { RoomService } from '../services/room.service';
import { AppError, successResponse, errorResponse } from '../utils/responses';
import {
  CreateRoomSchema,
  UpdateRoomSchema,
  PaginationSchema,
  ERROR_CODES,
} from '../../../shared/src';

type AuthRequest = Request & { userId?: string; user?: { userId: string } };

export class RoomController {
  private roomService: RoomService;

  constructor() {
    this.roomService = new RoomService();
  }

  /**
   * Create a new room
   * POST /api/v1/rooms
   */
  createRoom = async (
    req: AuthRequest,
    res: Response,
    next: NextFunction
  ): Promise<void> => {
    try {
      console.log('Room creation request received');
      console.log('Request body:', req.body);
      console.log('User ID from auth:', req.userId);
      
      const userId = req.userId;
      if (!userId) {
        throw new AppError('Unauthorized', 401, 'UNAUTHORIZED');
      }

      const { name, description, maxUsers } = req.body;

      const validation = CreateRoomSchema.safeParse({
        name,
        description,
        maxUsers,
      });

      if (!validation.success) {
        throw new AppError(
          'Validation failed',
          400,
          'VALIDATION_ERROR',
          validation.error.issues
        );
      }

      const room = await this.roomService.createRoom(
        userId,
        name,
        description,
        maxUsers
      );

      console.log('Room created successfully:', room);
      res.status(201).json({
        success: true,
        message: 'Room created successfully',
        data: room,
      });
    } catch (error) {
      next(error);
    }
  };

  /**
   * Get room by ID
   * GET /api/v1/rooms/:roomId
   */
  getRoom = async (
    req: AuthRequest,
    res: Response,
    next: NextFunction
  ): Promise<void> => {
    try {
      const { roomId } = req.params;

      const room = await this.roomService.getRoomById(roomId);

      res.status(200).json({
        success: true,
        data: room,
      });
    } catch (error) {
      next(error);
    }
  };

  /**
   * Get room by code
   * GET /api/v1/rooms/code/:code
   */
  getRoomByCode = async (
    req: Request,
    res: Response,
    next: NextFunction
  ): Promise<void> => {
    try {
      const { code } = req.params;

      const room = await this.roomService.getRoomByCode(code);

      res.status(200).json({
        success: true,
        data: room,
      });
    } catch (error) {
      next(error);
    }
  };

  /**
   * List user's rooms
   * GET /api/v1/rooms
   */
  listUserRooms = async (
    req: AuthRequest,
    res: Response,
    next: NextFunction
  ): Promise<void> => {
    try {
      const userId = req.userId;
      if (!userId) {
        throw new AppError('Unauthorized', 401, 'UNAUTHORIZED');
      }

      console.log('List user rooms request for user:', userId);

      const { page = 1, limit = 20 } = req.query;

      const validation = PaginationSchema.safeParse({
        page: parseInt(page as string),
        limit: parseInt(limit as string),
      });

      if (!validation.success) {
        throw new AppError(
          'Validation failed',
          400,
          'VALIDATION_ERROR',
          validation.error.issues
        );
      }

      const result = await this.roomService.listUserRooms(
        userId,
        validation.data.page,
        validation.data.limit
      );

      console.log('Returning rooms result:', result);

      res.status(200).json({
        success: true,
        data: result,
      });
    } catch (error) {
      next(error);
    }
  };

  /**
   * Update room
   * PUT /api/v1/rooms/:roomId
   */
  updateRoom = async (
    req: AuthRequest,
    res: Response,
    next: NextFunction
  ): Promise<void> => {
    try {
      const userId = req.userId;
      if (!userId) {
        throw new AppError('Unauthorized', 401, 'UNAUTHORIZED');
      }

      const { roomId } = req.params;
      const { name, description, maxUsers } = req.body;

      const validation = UpdateRoomSchema.safeParse({
        name,
        description,
        maxUsers,
      });

      if (!validation.success) {
        throw new AppError(
          'Validation failed',
          400,
          'VALIDATION_ERROR',
          validation.error.issues
        );
      }

      const room = await this.roomService.updateRoom(
        roomId,
        userId,
        validation.data.name,
        validation.data.description,
        validation.data.maxUsers
      );

      res.status(200).json({
        success: true,
        message: 'Room updated successfully',
        data: room,
      });
    } catch (error) {
      next(error);
    }
  };

  /**
   * Delete room
   * DELETE /api/v1/rooms/:roomId
   */
  deleteRoom = async (
    req: AuthRequest,
    res: Response,
    next: NextFunction
  ): Promise<void> => {
    try {
      const userId = req.userId;
      if (!userId) {
        throw new AppError('Unauthorized', 401, 'UNAUTHORIZED');
      }

      const { roomId } = req.params;

      await this.roomService.deleteRoom(roomId, userId);

      res.status(200).json({
        success: true,
        message: 'Room deleted successfully',
      });
    } catch (error) {
      next(error);
    }
  };

  /**
   * Join room
   * POST /api/v1/rooms/:roomId/join
   */
  joinRoom = async (
    req: AuthRequest,
    res: Response,
    next: NextFunction
  ): Promise<void> => {
    try {
      const userId = req.userId;
      if (!userId) {
        throw new AppError('Unauthorized', 401, 'UNAUTHORIZED');
      }

      const { roomId } = req.params;

      await this.roomService.joinRoom(roomId, userId);

      res.status(200).json({
        success: true,
        message: 'Joined room successfully',
      });
    } catch (error) {
      next(error);
    }
  };

  /**
   * Leave room
   * POST /api/v1/rooms/:roomId/leave
   */
  leaveRoom = async (
    req: AuthRequest,
    res: Response,
    next: NextFunction
  ): Promise<void> => {
    try {
      const userId = req.userId;
      if (!userId) {
        throw new AppError('Unauthorized', 401, 'UNAUTHORIZED');
      }

      const { roomId } = req.params;

      await this.roomService.leaveRoom(roomId, userId);

      res.status(200).json({
        success: true,
        message: 'Left room successfully',
      });
    } catch (error) {
      next(error);
    }
  };

  /**
   * Get room members
   * GET /api/v1/rooms/:roomId/members
   */
  getRoomMembers = async (
    req: Request,
    res: Response,
    next: NextFunction
  ): Promise<void> => {
    try {
      const { roomId } = req.params;

      const members = await this.roomService.getRoomMembers(roomId);

      res.status(200).json({
        success: true,
        data: members,
      });
    } catch (error) {
      next(error);
    }
  };

  /**
   * Join room by code
   * POST /api/rooms/join/:code
   */
  joinRoomByCode = async (
    req: AuthRequest,
    res: Response,
    next: NextFunction
  ): Promise<void> => {
    try {
      const userId = (req as any).user?.userId;
      if (!userId) {
        throw new AppError('Unauthorized', 401, 'UNAUTHORIZED');
      }

      const { code } = req.params;

      const room = await this.roomService.joinRoomByCode(code, userId);

      res.status(200).json(successResponse(room, 'Joined room successfully'));
    } catch (error) {
      next(error);
    }
  };

  /**
   * Kick user from room
   * POST /api/rooms/:roomId/kick/:userId
   */
  kickUser = async (
    req: AuthRequest,
    res: Response,
    next: NextFunction
  ): Promise<void> => {
    try {
      const kickedBy = (req as any).user?.userId;
      if (!kickedBy) {
        throw new AppError('Unauthorized', 401, 'UNAUTHORIZED');
      }

      const { roomId, userId } = req.params;

      await this.roomService.kickUserFromRoom(roomId, userId, kickedBy);

      res.status(200).json(successResponse(null, 'User kicked from room'));
    } catch (error) {
      next(error);
    }
  };

  /**
   * Ban user from room
   * POST /api/rooms/:roomId/ban/:userId
   */
  banUser = async (
    req: AuthRequest,
    res: Response,
    next: NextFunction
  ): Promise<void> => {
    try {
      const bannedBy = (req as any).user?.userId;
      if (!bannedBy) {
        throw new AppError('Unauthorized', 401, 'UNAUTHORIZED');
      }

      const { roomId, userId } = req.params;
      const { reason } = req.body;

      const ban = await this.roomService.banUserFromRoom(roomId, userId, bannedBy, reason);

      res.status(200).json(successResponse(ban, 'User banned from room'));
    } catch (error) {
      next(error);
    }
  };

  /**
   * Unban user from room
   * DELETE /api/rooms/:roomId/ban/:userId
   */
  unbanUser = async (
    req: AuthRequest,
    res: Response,
    next: NextFunction
  ): Promise<void> => {
    try {
      const unbannedBy = (req as any).user?.userId;
      if (!unbannedBy) {
        throw new AppError('Unauthorized', 401, 'UNAUTHORIZED');
      }

      const { roomId, userId } = req.params;

      await this.roomService.unbanUser(roomId, userId, unbannedBy);

      res.status(200).json(successResponse(null, 'User unbanned from room'));
    } catch (error) {
      next(error);
    }
  };

  /**
   * Get room bans
   * GET /api/rooms/:roomId/bans
   */
  getRoomBans = async (
    req: AuthRequest,
    res: Response,
    next: NextFunction
  ): Promise<void> => {
    try {
      const userId = (req as any).user?.userId;
      if (!userId) {
        throw new AppError('Unauthorized', 401, 'UNAUTHORIZED');
      }

      const { roomId } = req.params;

      // Verify user is admin
      const membership = await this.roomService.getRoomMembers(roomId);
      const userMembership = (membership as any[]).find((m: any) => m.userId === userId);
      
      if (!userMembership || userMembership.role !== 'admin') {
        throw new AppError('Only admins can view bans', 403, ERROR_CODES.PERMISSION_DENIED);
      }

      const bans = await this.roomService.getRoomBans(roomId);

      res.status(200).json(successResponse(bans));
    } catch (error) {
      next(error);
    }
  };
}
