import { Request, Response, NextFunction } from 'express';
import { RoomService } from '../services/room.service';
import { AppError } from '../utils/responses';
import {
  CreateRoomSchema,
  UpdateRoomSchema,
  PaginationSchema,
  ERROR_CODES,
} from '@voiceflow/shared';

type AuthRequest = Request & { userId?: string };

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
        name,
        userId,
        description,
        maxUsers
      );

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
}
