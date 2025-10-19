import { Request, Response, NextFunction } from 'express';
import { AuthService } from '../services/auth.service';
import { AppError } from '../utils/responses';

type AuthRequest = Request & { userId?: string };

export class UserController {
  private authService: AuthService;

  constructor() {
    this.authService = new AuthService();
  }

  /**
   * Get user profile
   * GET /api/v1/users/:userId
   */
  getUserProfile = async (
    req: Request,
    res: Response,
    next: NextFunction
  ): Promise<void> => {
    try {
      const { userId } = req.params;

      const user = await this.authService.getUserById(userId);

      res.status(200).json({
        success: true,
        data: {
          id: user.id,
          username: user.username,
          email: user.email,
          avatarUrl: user.avatarUrl,
          createdAt: user.createdAt,
        },
      });
    } catch (error) {
      next(error);
    }
  };

  /**
   * Update user profile (current user)
   * PUT /api/v1/users/me
   */
  updateProfile = async (
    req: AuthRequest,
    res: Response,
    next: NextFunction
  ): Promise<void> => {
    try {
      const userId = req.userId;
      if (!userId) {
        throw new AppError('Unauthorized', 401, 'UNAUTHORIZED');
      }

      const { username, avatarUrl } = req.body;

      if (!username && !avatarUrl) {
        throw new AppError(
          'At least one field is required',
          400,
          'VALIDATION_ERROR'
        );
      }

      // TODO: Implement user update service method
      // For now, just return success
      const user = await this.authService.getUserById(userId);

      res.status(200).json({
        success: true,
        message: 'Profile updated successfully',
        data: user,
      });
    } catch (error) {
      next(error);
    }
  };

  /**
   * Search users
   * GET /api/v1/users/search
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

      // TODO: Implement user search service method
      // For now, return empty array
      res.status(200).json({
        success: true,
        data: [],
      });
    } catch (error) {
      next(error);
    }
  };
}
