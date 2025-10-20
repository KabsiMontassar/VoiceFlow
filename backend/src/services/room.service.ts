/**
 * Room Service - Handles room management logic
 */

import { RoomModel, RoomUserModel, UserModel, MessageModel } from '../models/index';
import { Room, RoomWithParticipants, ERROR_CODES, User, RoomUser } from '../../../shared/src';
import { AppError } from '../utils/responses';
import { generateRoomCode, generateUUID } from '../../../shared/src/utils';

export class RoomService {
  /**
   * Create a new room
   */
  async createRoom(
    createdById: string,
    name: string,
    description: string | null = null,
    maxUsers: number = 100,
    settings: Record<string, unknown> = {},
  ): Promise<Room> {
    try {
      console.log('Creating room with params:', { createdById, name, description, maxUsers });
      const code = generateRoomCode();
      console.log('Generated room code:', code);

      const room = await RoomModel.create({
        id: generateUUID(),
        code,
        name,
        description,
        createdById,
        maxUsers,
        settings: {
          isPublic: true,
          allowGuests: false,
          requireApproval: false,
          recordMessages: true,
          ...settings,
        },
        createdAt: new Date(),
        lastActivity: new Date(),
        isActive: true,
      });

      console.log('Room created in database:', room.id);

      // Add creator as admin
      await RoomUserModel.create({
        id: generateUUID(),
        roomId: room.id,
        userId: createdById,
        role: 'admin',
        joinedAt: new Date(),
      });

      console.log('Room creator added as admin');

      return room.toJSON();
    } catch (error) {
      console.error('Error creating room:', error);
      throw error;
    }
  }

  /**
   * Get room by ID with participants
   */
  async getRoomById(roomId: string): Promise<RoomWithParticipants> {
    console.log('Getting room by ID:', roomId);
    const room = await RoomModel.findByPk(roomId);

    if (!room) {
      throw new AppError('Room not found', 404, ERROR_CODES.ROOM_NOT_FOUND);
    }

    // Get participants
    const participants = await RoomUserModel.findAll({
      where: { roomId },
      include: [
        {
          model: UserModel,
          as: 'user',
          attributes: { exclude: ['passwordHash'] },
        },
      ],
    });

    console.log('Found participants:', participants.length);

    return {
      ...room.toJSON(),
      participants: participants.map((p) => {
        const user = (p.get('user') as unknown) as User;
        return {
          ...p.toJSON(),
          user,
        } as RoomUser & { user: User };
      }),
      participantCount: participants.length,
    };
  }

  /**
   * Get room by code
   */
  async getRoomByCode(code: string): Promise<Room> {
    const room = await RoomModel.findOne({
      where: { code },
    });

    if (!room) {
      throw new AppError('Room not found', 404, ERROR_CODES.INVALID_ROOM_CODE);
    }

    return room.toJSON();
  }

  /**
   * List user's rooms
   */
  async listUserRooms(userId: string, page: number = 1, limit: number = 20): Promise<{ rooms: Room[]; total: number }> {
    console.log('Listing rooms for user:', userId);
    const offset = (page - 1) * limit;

    // Get room IDs that the user is a member of
    const userRooms = await RoomUserModel.findAll({
      where: { userId },
      attributes: ['roomId'],
    });

    const roomIds = userRooms.map(ur => ur.roomId);
    console.log('User is member of room IDs:', roomIds);

    if (roomIds.length === 0) {
      return { rooms: [], total: 0 };
    }

    const { count, rows } = await RoomModel.findAndCountAll({
      where: {
        id: roomIds,
        isActive: true,
      },
      limit,
      offset,
      order: [['lastActivity', 'DESC']],
    });

    console.log('Found rooms:', count);

    const roomsWithMemberCount = await Promise.all(
      rows.map(async (room) => {
        const memberCount = await RoomUserModel.count({
          where: { roomId: room.id },
        });
        
        return {
          ...room.toJSON(),
          memberCount,
        };
      })
    );

    return {
      rooms: roomsWithMemberCount,
      total: count,
    };
  }

  /**
   * Join user to room
   */
  async joinRoom(roomId: string, userId: string): Promise<void> {
    const room = await RoomModel.findByPk(roomId);

    if (!room) {
      throw new AppError('Room not found', 404, ERROR_CODES.ROOM_NOT_FOUND);
    }

    if (!room.isActive) {
      throw new AppError('Room is no longer active', 404, ERROR_CODES.ROOM_NOT_FOUND);
    }

    // Check if already in room
    const exists = await RoomUserModel.findOne({
      where: { roomId, userId },
    });

    if (exists) {
      throw new AppError('Already in this room', 400, ERROR_CODES.ALREADY_IN_ROOM);
    }

    // Check room capacity
    const memberCount = await RoomUserModel.count({
      where: { roomId },
    });

    if (memberCount >= room.maxUsers) {
      throw new AppError('Room is full', 400, ERROR_CODES.ROOM_FULL);
    }

    // Add user to room
    await RoomUserModel.create({
      id: generateUUID(),
      roomId,
      userId,
      role: 'member',
      joinedAt: new Date(),
    });

    // Update room last activity
    await room.update({ lastActivity: new Date() });
  }

  /**
   * Leave room
   */
  async leaveRoom(roomId: string, userId: string): Promise<void> {
    await RoomUserModel.destroy({
      where: { roomId, userId },
    });

    // Update room last activity
    const room = await RoomModel.findByPk(roomId);
    if (room) {
      await room.update({ lastActivity: new Date() });
    }
  }

  /**
   * Get room members
   */
  async getRoomMembers(roomId: string): Promise<unknown[]> {
    console.log('Getting members for room:', roomId);
    const members = await RoomUserModel.findAll({
      where: { roomId },
      include: [
        {
          model: UserModel,
          as: 'user',
          attributes: { exclude: ['passwordHash'] },
        },
      ],
    });

    console.log('Found members:', members.length);

    return members.map((m) => {
      const user = (m.get('user') as unknown) as User;
      return {
        ...m.toJSON(),
        user,
      } as RoomUser & { user: User };
    });
  }

  /**
   * Update room
   */
  async updateRoom(
    roomId: string,
    userId: string,
    name?: string,
    description?: string | null,
    maxUsers?: number,
  ): Promise<Room> {
    const room = await RoomModel.findByPk(roomId);

    if (!room) {
      throw new AppError('Room not found', 404, ERROR_CODES.ROOM_NOT_FOUND);
    }

    // Check if user is admin
    const membership = await RoomUserModel.findOne({
      where: { roomId, userId },
    });

    if (!membership || membership.role !== 'admin') {
      throw new AppError('Only admins can update room', 403, ERROR_CODES.PERMISSION_DENIED);
    }

    // Update room
    if (name) room.name = name;
    if (description !== undefined) room.description = description;
    if (maxUsers) room.maxUsers = maxUsers;

    await room.save();

    return room.toJSON();
  }

  /**
   * Delete room (soft delete)
   */
  async deleteRoom(roomId: string, userId: string): Promise<void> {
    const room = await RoomModel.findByPk(roomId);

    if (!room) {
      throw new AppError('Room not found', 404, ERROR_CODES.ROOM_NOT_FOUND);
    }

    // Check if user is creator
    if (room.createdById !== userId) {
      throw new AppError('Only creator can delete room', 403, ERROR_CODES.PERMISSION_DENIED);
    }

    // Soft delete - set isActive to false
    await room.update({ isActive: false });

    // Delete all room data (messages, members, etc)
    await MessageModel.destroy({ where: { roomId } });
    await RoomUserModel.destroy({ where: { roomId } });
  }
}

export const roomService = new RoomService();
