/**
 * Room Service - Handles room management logic
 */

import { RoomModel, RoomUserModel, UserModel, MessageModel } from '../models/index';
import { Room, RoomWithParticipants, ERROR_CODES } from '@voiceflow/shared';
import { AppError } from '../utils/responses';
import { generateRoomCode, generateUUID } from '@voiceflow/shared/utils';

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
    const code = generateRoomCode();

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

    // Add creator as admin
    await RoomUserModel.create({
      id: generateUUID(),
      roomId: room.id,
      userId: createdById,
      role: 'admin',
      joinedAt: new Date(),
    });

    return room.toJSON();
  }

  /**
   * Get room by ID with participants
   */
  async getRoomById(roomId: string): Promise<RoomWithParticipants> {
    const room = await RoomModel.findByPk(roomId);

    if (!room) {
      throw new AppError(ERROR_CODES.ROOM_NOT_FOUND, 'Room not found', 404);
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

    return {
      ...room.toJSON(),
      participants: participants.map((p) => ({
        ...p.toJSON(),
        user: p.get('user'),
      })),
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
      throw new AppError(ERROR_CODES.INVALID_ROOM_CODE, 'Room not found', 404);
    }

    return room.toJSON();
  }

  /**
   * List user's rooms
   */
  async listUserRooms(userId: string, page: number = 1, limit: number = 20): Promise<{ rooms: Room[]; total: number }> {
    const offset = (page - 1) * limit;

    const { count, rows } = await RoomModel.findAndCountAll({
      include: [
        {
          model: UserModel,
          as: 'room_users',
          where: { userId },
          through: { attributes: [] },
          attributes: [],
        },
      ],
      limit,
      offset,
      order: [['lastActivity', 'DESC']],
    });

    return {
      rooms: rows.map((r) => r.toJSON()),
      total: count,
    };
  }

  /**
   * Join user to room
   */
  async joinRoom(roomId: string, userId: string): Promise<void> {
    const room = await RoomModel.findByPk(roomId);

    if (!room) {
      throw new AppError(ERROR_CODES.ROOM_NOT_FOUND, 'Room not found', 404);
    }

    if (!room.isActive) {
      throw new AppError(ERROR_CODES.ROOM_NOT_FOUND, 'Room is no longer active', 404);
    }

    // Check if already in room
    const exists = await RoomUserModel.findOne({
      where: { roomId, userId },
    });

    if (exists) {
      throw new AppError(ERROR_CODES.ALREADY_IN_ROOM, 'Already in this room', 400);
    }

    // Check room capacity
    const memberCount = await RoomUserModel.count({
      where: { roomId },
    });

    if (memberCount >= room.maxUsers) {
      throw new AppError(ERROR_CODES.ROOM_FULL, 'Room is full', 400);
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

    return members.map((m) => ({
      ...m.toJSON(),
      user: m.get('user'),
    }));
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
      throw new AppError(ERROR_CODES.ROOM_NOT_FOUND, 'Room not found', 404);
    }

    // Check if user is admin
    const membership = await RoomUserModel.findOne({
      where: { roomId, userId },
    });

    if (!membership || membership.role !== 'admin') {
      throw new AppError(ERROR_CODES.PERMISSION_DENIED, 'Only admins can update room', 403);
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
      throw new AppError(ERROR_CODES.ROOM_NOT_FOUND, 'Room not found', 404);
    }

    // Check if user is creator
    if (room.createdById !== userId) {
      throw new AppError(ERROR_CODES.PERMISSION_DENIED, 'Only creator can delete room', 403);
    }

    // Soft delete - set isActive to false
    await room.update({ isActive: false });

    // Delete all room data (messages, members, etc)
    await MessageModel.destroy({ where: { roomId } });
    await RoomUserModel.destroy({ where: { roomId } });
  }
}

export const roomService = new RoomService();
