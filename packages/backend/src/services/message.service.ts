/**
 * Message Service - Handles message logic
 */

import { MessageModel, UserModel, RoomModel } from '../models/index';
import { Message, MessageWithAuthor, PaginatedResponse, ERROR_CODES } from '@voiceflow/shared';
import { AppError } from '../utils/responses';
import { generateUUID } from '@voiceflow/shared/utils';

export class MessageService {
  /**
   * Send a message
   */
  async sendMessage(
    roomId: string,
    userId: string,
    content: string,
    type: Message['type'] = 'text',
    fileId?: string | null,
  ): Promise<MessageWithAuthor> {
    // Check if room exists
    const room = await RoomModel.findByPk(roomId);
    if (!room) {
      throw new AppError(ERROR_CODES.ROOM_NOT_FOUND, 'Room not found', 404);
    }

    // Check if user is in room
    const { RoomUserModel } = await import('../models/index');
    const membership = await RoomUserModel.findOne({
      where: { roomId, userId },
    });

    if (!membership) {
      throw new AppError(ERROR_CODES.PERMISSION_DENIED, 'Not in this room', 403);
    }

    // Create message
    const message = await MessageModel.create({
      id: generateUUID(),
      roomId,
      userId,
      content,
      type,
      fileId: fileId || null,
      createdAt: new Date(),
      updatedAt: new Date(),
    });

    // Update room last activity
    await room.update({ lastActivity: new Date() });

    // Get message with author
    return this.getMessageWithAuthor(message.id);
  }

  /**
   * Get message with author info
   */
  private async getMessageWithAuthor(messageId: string): Promise<MessageWithAuthor> {
    const message = await MessageModel.findByPk(messageId, {
      include: [
        {
          model: UserModel,
          as: 'author',
          attributes: { exclude: ['passwordHash'] },
        },
      ],
    });

    if (!message) {
      throw new AppError(ERROR_CODES.MESSAGE_NOT_FOUND, 'Message not found', 404);
    }

    return {
      ...message.toJSON(),
      author: message.get('author'),
    };
  }

  /**
   * Get room messages with pagination
   */
  async getRoomMessages(
    roomId: string,
    page: number = 1,
    limit: number = 20,
  ): Promise<PaginatedResponse<MessageWithAuthor>> {
    const offset = (page - 1) * limit;

    const { count, rows } = await MessageModel.findAndCountAll({
      where: { roomId },
      include: [
        {
          model: UserModel,
          as: 'author',
          attributes: { exclude: ['passwordHash'] },
        },
      ],
      order: [['createdAt', 'DESC']],
      limit,
      offset,
    });

    const messages = rows.map((m) => ({
      ...m.toJSON(),
      author: m.get('author'),
    }));

    return {
      data: messages.reverse(), // Reverse to show chronological order
      total: count,
      page,
      limit,
      hasMore: offset + limit < count,
    };
  }

  /**
   * Delete message
   */
  async deleteMessage(messageId: string, userId: string): Promise<void> {
    const message = await MessageModel.findByPk(messageId);

    if (!message) {
      throw new AppError(ERROR_CODES.MESSAGE_NOT_FOUND, 'Message not found', 404);
    }

    // Check if user is author or room admin
    if (message.userId !== userId) {
      // Check if user is admin
      const { RoomUserModel } = await import('../models/index');
      const membership = await RoomUserModel.findOne({
        where: { roomId: message.roomId, userId },
      });

      if (!membership || membership.role !== 'admin') {
        throw new AppError(ERROR_CODES.PERMISSION_DENIED, 'Cannot delete message', 403);
      }
    }

    await message.destroy();
  }

  /**
   * Edit message
   */
  async editMessage(messageId: string, userId: string, content: string): Promise<MessageWithAuthor> {
    const message = await MessageModel.findByPk(messageId);

    if (!message) {
      throw new AppError(ERROR_CODES.MESSAGE_NOT_FOUND, 'Message not found', 404);
    }

    // Check if user is author
    if (message.userId !== userId) {
      throw new AppError(ERROR_CODES.PERMISSION_DENIED, 'Cannot edit message', 403);
    }

    message.content = content;
    message.updatedAt = new Date();
    await message.save();

    return this.getMessageWithAuthor(messageId);
  }
}

export const messageService = new MessageService();
