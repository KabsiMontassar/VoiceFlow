import { Request, Response, NextFunction } from 'express';
import { SettingsService } from '../services/settings.service';
import { AppError, successResponse } from '../utils/responses';

type AuthRequest = Request & { userId?: string; user?: { userId: string } };

export class SettingsController {
  /**
   * Get user settings
   * GET /api/settings
   */
  getUserSettings = async (
    req: AuthRequest,
    res: Response,
    next: NextFunction
  ): Promise<void> => {
    try {
      const userId = (req as any).user.userId;
      if (!userId) {
        throw new AppError('Unauthorized', 401, 'UNAUTHORIZED');
      }

      const settings = await SettingsService.getUserSettings(userId);
      res.status(200).json(successResponse(settings));
    } catch (error) {
      next(error);
    }
  };

  /**
   * Update user settings
   * PATCH /api/settings
   */
  updateUserSettings = async (
    req: AuthRequest,
    res: Response,
    next: NextFunction
  ): Promise<void> => {
    try {
      const userId = (req as any).user.userId;
      if (!userId) {
        throw new AppError('Unauthorized', 401, 'UNAUTHORIZED');
      }

      const { allowFriendRequests, showOnlineStatus } = req.body;

      // Validate boolean values
      if (allowFriendRequests !== undefined && typeof allowFriendRequests !== 'boolean') {
        throw new AppError('allowFriendRequests must be a boolean', 400, 'VALIDATION_ERROR');
      }

      if (showOnlineStatus !== undefined && typeof showOnlineStatus !== 'boolean') {
        throw new AppError('showOnlineStatus must be a boolean', 400, 'VALIDATION_ERROR');
      }

      const settings = await SettingsService.updateUserSettings(userId, {
        allowFriendRequests,
        showOnlineStatus,
      });

      res.status(200).json(successResponse(settings, 'Settings updated successfully'));
    } catch (error) {
      next(error);
    }
  };
}

export const settingsController = new SettingsController();
