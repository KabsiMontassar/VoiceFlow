import { Request, Response, NextFunction } from 'express';
import { AuthService } from '../services/auth.service';
import { AppError, sendSuccess, sendError } from '../utils/responses';
import { RegisterSchema, LoginSchema, ERROR_CODES } from '../../../shared/src';

type AuthRequest = Request & { userId?: string };

export class AuthController {
  private authService: AuthService;

  constructor() {
    this.authService = new AuthService();
  }

  /**
   * Register a new user
   * POST /api/v1/auth/register
   */
  register = async (
    req: Request,
    res: Response,
    next: NextFunction
  ): Promise<void> => {
    try {
      const { email, username, password, confirmPassword } = req.body;

      // Validate request body
      const validation = RegisterSchema.safeParse({
        email,
        username,
        password,
        confirmPassword,
      });

      if (!validation.success) {
        throw new AppError(
          'Validation failed',
          400,
          'VALIDATION_ERROR',
          validation.error.issues
        );
      }

      const result = await this.authService.register(
        email,
        username,
        password
      );

      res.status(201).json({
        success: true,
        message: 'User registered successfully',
        data: {
          id: result.user.id,
          email: result.user.email,
          username: result.user.username,
          accessToken: result.accessToken,
          refreshToken: result.refreshToken,
        },
      });
    } catch (error) {
      next(error);
    }
  };

  /**
   * Login user
   * POST /api/v1/auth/login
   */
  login = async (
    req: Request,
    res: Response,
    next: NextFunction
  ): Promise<void> => {
    try {
      const { email, password } = req.body;

      // Validate request body
      const validation = LoginSchema.safeParse({ email, password });

      if (!validation.success) {
        throw new AppError(
          'Validation failed',
          400,
          'VALIDATION_ERROR',
          validation.error.issues
        );
      }

      const result = await this.authService.login(email, password);

      res.status(200).json({
        success: true,
        message: 'Logged in successfully',
        data: {
          id: result.user.id,
          email: result.user.email,
          username: result.user.username,
          accessToken: result.accessToken,
          refreshToken: result.refreshToken,
        },
      });
    } catch (error) {
      next(error);
    }
  };

  /**
   * Refresh access token
   * POST /api/v1/auth/refresh
   */
  refreshToken = async (
    req: Request,
    res: Response,
    next: NextFunction
  ): Promise<void> => {
    try {
      const { refreshToken } = req.body;

      if (!refreshToken) {
        throw new AppError(
          'Refresh token required',
          400,
          'MISSING_TOKEN'
        );
      }

      const result = await this.authService.refreshAccessToken(refreshToken);

      res.status(200).json({
        success: true,
        message: 'Token refreshed',
        data: {
          accessToken: result.accessToken,
          refreshToken: result.refreshToken,
        },
      });
    } catch (error) {
      next(error);
    }
  };

  /**
   * Get current user profile
   * GET /api/v1/auth/me
   */
  getCurrentUser = async (
    req: AuthRequest,
    res: Response,
    next: NextFunction
  ): Promise<void> => {
    try {
      const userId = req.userId;

      if (!userId) {
        throw new AppError(
          'Unauthorized',
          401,
          'UNAUTHORIZED'
        );
      }

      const user = await this.authService.getUserById(userId);

      res.status(200).json({
        success: true,
        data: {
          id: user.id,
          email: user.email,
          username: user.username,
          avatarUrl: user.avatarUrl,
          createdAt: user.createdAt,
        },
      });
    } catch (error) {
      next(error);
    }
  };

  /**
   * Logout user (client-side clearing tokens)
   * POST /api/v1/auth/logout
   */
  logout = async (
    req: Request,
    res: Response,
    next: NextFunction
  ): Promise<void> => {
    try {
      // Note: With JWT, logout is handled client-side by clearing tokens
      // This endpoint can be used for logging/auditing or blacklisting tokens if needed
      res.status(200).json({
        success: true,
        message: 'Logged out successfully',
      });
    } catch (error) {
      next(error);
    }
  };
}
