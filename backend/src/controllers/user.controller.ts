import { Request, Response, NextFunction } from 'express';
import { AuthService } from '../services/auth.service';
import { UserService } from '../services/user.service';
import { AppError, successResponse, errorResponse } from '../utils/responses';
import logger from '../utils/logger';

type AuthRequest = Request & { userId?: string; user?: { userId: string } };

export class UserController {
  private authService: AuthService;

  constructor() {
    this.authService = new AuthService();
  }

  /**
   * Get user profile
   * GET /api/users/:userId
   */
  getUserProfile = async (
    req: Request,
    res: Response,
    next: NextFunction
  ): Promise<void> => {
    try {
      const { userId } = req.params;
      const user = await UserService.getUserById(userId);

      res.status(200).json(successResponse(user));
    } catch (error) {
      next(error);
    }
  };

  /**
   * Get current user profile
   * GET /api/users/me
   */
  getMyProfile = async (
    req: AuthRequest,
    res: Response,
    next: NextFunction
  ): Promise<void> => {
    try {
      const userId = (req as any).user.userId;
      if (!userId) {
        throw new AppError('Unauthorized', 401, 'UNAUTHORIZED');
      }

      const user = await UserService.getUserById(userId);
      res.status(200).json(successResponse(user));
    } catch (error) {
      next(error);
    }
  };

  /**
   * Update user profile
   * PATCH /api/users/me
   */
  updateProfile = async (
    req: AuthRequest,
    res: Response,
    next: NextFunction
  ): Promise<void> => {
    try {
      const userId = (req as any).user.userId;
      if (!userId) {
        throw new AppError('Unauthorized', 401, 'UNAUTHORIZED');
      }

      const { username, age, country, gender, avatarUrl } = req.body;

      const user = await UserService.updateProfile(userId, {
        username,
        age,
        country,
        gender,
        avatarUrl,
      });

      res.status(200).json(successResponse(user, 'Profile updated successfully'));
    } catch (error) {
      next(error);
    }
  };

  /**
   * Change password
   * POST /api/users/me/password
   */
  changePassword = async (
    req: AuthRequest,
    res: Response,
    next: NextFunction
  ): Promise<void> => {
    try {
      const userId = (req as any).user.userId;
      if (!userId) {
        throw new AppError('Unauthorized', 401, 'UNAUTHORIZED');
      }

      const { currentPassword, newPassword } = req.body;

      if (!currentPassword || !newPassword) {
        throw new AppError(
          'Current password and new password are required',
          400,
          'VALIDATION_ERROR'
        );
      }

      await UserService.changePassword(userId, currentPassword, newPassword);

      res.status(200).json(successResponse(null, 'Password changed successfully'));
    } catch (error) {
      next(error);
    }
  };

  /**
   * Search users
   * GET /api/users/search
   */
  searchUsers = async (
    req: Request,
    res: Response,
    next: NextFunction
  ): Promise<void> => {
    try {
      const { query } = req.query;

      if (!query || typeof query !== 'string' || query.length < 2) {
        throw new AppError(
          'Search query must be at least 2 characters',
          400,
          'VALIDATION_ERROR'
        );
      }

      const users = await UserService.searchUsers(query);

      res.status(200).json(successResponse(users));
    } catch (error) {
      next(error);
    }
  };
}
