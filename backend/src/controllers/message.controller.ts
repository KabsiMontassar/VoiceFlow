import { Request, Response, NextFunction } from 'express';
import { MessageService } from '../services/message.service';
import { AppError } from '../utils/responses';
import { CreateMessageSchema, PaginationSchema } from '@voiceflow/shared';

type AuthRequest = Request & { userId?: string };

export class MessageController {
  private messageService: MessageService;

  constructor() {
    this.messageService = new MessageService();
  }

  /**
   * Send a message
   * POST /api/v1/messages
   */
  sendMessage = async (
    req: AuthRequest,
    res: Response,
    next: NextFunction
  ): Promise<void> => {
    try {
      const userId = req.userId;
      if (!userId) {
        throw new AppError('Unauthorized', 401, 'UNAUTHORIZED');
      }

      const { roomId, content, type = 'text', fileId } = req.body;

      const validation = CreateMessageSchema.safeParse({
        roomId,
        content,
        type,
        fileId,
      });

      if (!validation.success) {
        throw new AppError(
          'Validation failed',
          400,
          'VALIDATION_ERROR',
          validation.error.issues
        );
      }

      const message = await this.messageService.sendMessage(
        roomId,
        userId,
        content,
        type,
        fileId
      );

      res.status(201).json({
        success: true,
        message: 'Message sent successfully',
        data: message,
      });
    } catch (error) {
      next(error);
    }
  };

  /**
   * Get room messages
   * GET /api/v1/messages/:roomId
   */
  getRoomMessages = async (
    req: AuthRequest,
    res: Response,
    next: NextFunction
  ): Promise<void> => {
    try {
      const { roomId } = req.params;
      const { page = 1, limit = 50 } = req.query;

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

      const messages = await this.messageService.getRoomMessages(
        roomId,
        validation.data.page,
        validation.data.limit
      );

      res.status(200).json({
        success: true,
        data: messages,
      });
    } catch (error) {
      next(error);
    }
  };

  /**
   * Delete message
   * DELETE /api/v1/messages/:messageId
   */
  deleteMessage = async (
    req: AuthRequest,
    res: Response,
    next: NextFunction
  ): Promise<void> => {
    try {
      const userId = req.userId;
      if (!userId) {
        throw new AppError('Unauthorized', 401, 'UNAUTHORIZED');
      }

      const { messageId } = req.params;

      await this.messageService.deleteMessage(messageId, userId);

      res.status(200).json({
        success: true,
        message: 'Message deleted successfully',
      });
    } catch (error) {
      next(error);
    }
  };

  /**
   * Edit message
   * PUT /api/v1/messages/:messageId
   */
  editMessage = async (
    req: AuthRequest,
    res: Response,
    next: NextFunction
  ): Promise<void> => {
    try {
      const userId = req.userId;
      if (!userId) {
        throw new AppError('Unauthorized', 401, 'UNAUTHORIZED');
      }

      const { messageId } = req.params;
      const { content } = req.body;

      if (!content || typeof content !== 'string' || content.trim().length === 0) {
        throw new AppError(
          'Message content required',
          400,
          'VALIDATION_ERROR'
        );
      }

      const message = await this.messageService.editMessage(
        messageId,
        userId,
        content.trim()
      );

      res.status(200).json({
        success: true,
        message: 'Message updated successfully',
        data: message,
      });
    } catch (error) {
      next(error);
    }
  };
}
