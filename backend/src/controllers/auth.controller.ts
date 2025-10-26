import { Request, Response, NextFunction } from 'express';
import { authService } from '../services/auth.service';
import { AppError, sendSuccess, sendError } from '../utils/responses';
import { RegisterSchema, LoginSchema, ERROR_CODES } from '../../../shared/src';
import { AuthenticatedRequest } from '../middleware/auth';

export class AuthController {
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

      // Extract session info from request
      const sessionInfo = {
        ipAddress: req.ip,
        userAgent: req.headers['user-agent'],
        deviceId: req.headers['x-device-id'] as string,
      };

      const result = await authService.register(
        email,
        username,
        password,
        sessionInfo
      );

      res.status(201).json({
        success: true,
        message: 'User registered successfully',
        data: {
          user: {
            id: result.user.id,
            email: result.user.email,
            username: result.user.username,
            status: result.user.status,
            avatarUrl: result.user.avatarUrl,
            friendCode: result.user.friendCode,
            createdAt: result.user.createdAt,
          },
          accessToken: result.tokens.accessToken,
          refreshToken: result.tokens.refreshToken,
          expiresAt: result.tokens.expiresAt,
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

      // Extract session info from request
      const sessionInfo = {
        ipAddress: req.ip,
        userAgent: req.headers['user-agent'],
        deviceId: req.headers['x-device-id'] as string,
      };

      const result = await authService.login(email, password, sessionInfo);

      res.status(200).json({
        success: true,
        message: 'Logged in successfully',
        data: {
          user: {
            id: result.user.id,
            email: result.user.email,
            username: result.user.username,
            status: result.user.status,
            avatarUrl: result.user.avatarUrl,
            friendCode: result.user.friendCode,
            createdAt: result.user.createdAt,
          },
          accessToken: result.tokens.accessToken,
          refreshToken: result.tokens.refreshToken,
          expiresAt: result.tokens.expiresAt,
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

      const result = await authService.refreshAccessToken(refreshToken);

      res.status(200).json({
        success: true,
        message: 'Token refreshed',
        data: {
          accessToken: result.accessToken,
          refreshToken: result.refreshToken,
          expiresAt: result.expiresAt,
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
    req: AuthenticatedRequest,
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

      const user = await authService.getUserById(userId);

      res.status(200).json({
        success: true,
        data: {
          id: user.id,
          email: user.email,
          username: user.username,
          status: user.status,
          avatarUrl: user.avatarUrl,
          friendCode: user.friendCode,
          createdAt: user.createdAt,
          updatedAt: user.updatedAt,
        },
      });
    } catch (error) {
      next(error);
    }
  };

  /**
   * Logout user from current session
   * POST /api/v1/auth/logout
   */
  logout = async (
    req: AuthenticatedRequest,
    res: Response,
    next: NextFunction
  ): Promise<void> => {
    try {
      const userId = req.userId;
      const sessionId = req.sessionId;

      if (!userId || !sessionId) {
        throw new AppError(
          'Unauthorized',
          401,
          'UNAUTHORIZED'
        );
      }

      await authService.logout(sessionId, userId);

      res.status(200).json({
        success: true,
        message: 'Logged out successfully',
      });
    } catch (error) {
      next(error);
    }
  };

  /**
   * Logout user from all sessions
   * POST /api/v1/auth/logout-all
   */
  logoutAll = async (
    req: AuthenticatedRequest,
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

      await authService.logoutAllSessions(userId);

      res.status(200).json({
        success: true,
        message: 'Logged out from all sessions successfully',
      });
    } catch (error) {
      next(error);
    }
  };

  /**
   * Get user sessions
   * GET /api/v1/auth/sessions
   */
  getSessions = async (
    req: AuthenticatedRequest,
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

      const sessions = await authService.getUserSessions(userId);

      res.status(200).json({
        success: true,
        data: {
          sessions,
          currentSession: req.sessionId,
        },
      });
    } catch (error) {
      next(error);
    }
  };

  /**
   * Check if user is active
   * GET /api/v1/auth/status
   */
  getStatus = async (
    req: AuthenticatedRequest,
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

      const isActive = await authService.isUserActive(userId);

      res.status(200).json({
        success: true,
        data: {
          userId,
          isActive,
          sessionId: req.sessionId,
        },
      });
    } catch (error) {
      next(error);
    }
  };
}

export const authController = new AuthController();
