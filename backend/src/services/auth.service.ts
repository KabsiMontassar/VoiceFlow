/**
 * Enhanced Auth Service with Session Management
 */

import { UserModel } from '../models/index';
import { jwtService, TokenPair } from '../utils/jwt';
import { hashPassword, comparePassword } from '../utils/password';
import { AppError } from '../utils/responses';
import { ERROR_CODES, User, AuthPayload, UserPresenceStatus } from '../../../shared/src';
import { generateUUID } from '../../../shared/src/utils';
import logger from '../utils/logger';
import { redisService } from './redis.service';

export interface LoginSessionInfo {
  deviceId?: string;
  ipAddress?: string;
  userAgent?: string;
}

export interface AuthResult {
  user: User;
  tokens: TokenPair;
}

export class AuthService {
  /**
   * Register a new user
   */
  async register(
    email: string,
    username: string,
    password: string,
    sessionInfo?: LoginSessionInfo
  ): Promise<AuthResult> {
    // Check if user exists
    const existingUser = await UserModel.findOne({
      where: { email },
    });

    if (existingUser) {
      throw new AppError(
        'Email already registered',
        400,
        ERROR_CODES.VALIDATION_ERROR
      );
    }

    const existingUsername = await UserModel.findOne({
      where: { username },
    });

    if (existingUsername) {
      throw new AppError(
        'Username already taken',
        400,
        ERROR_CODES.VALIDATION_ERROR
      );
    }

    // Hash password
    const passwordHash = await hashPassword(password);

    // Create user with inactive status initially
    const user = await UserModel.create({
      id: generateUUID(),
      email,
      username,
      passwordHash,
      avatarUrl: null,
      status: UserPresenceStatus.INACTIVE,
    });

    const userJson = user.toJSON();
    delete (userJson as unknown as Record<string, unknown>).passwordHash;

    // Generate tokens and mark user as active
    const payload: AuthPayload = {
      userId: user.id,
      email: user.email,
      username: user.username,
    };

    const tokens = await jwtService.generateTokenPair(payload, sessionInfo);

    // Update user status to active in database
    await user.update({ status: UserPresenceStatus.ACTIVE });
    (userJson as any).status = UserPresenceStatus.ACTIVE;

    // Set user as ACTIVE in Redis (global status based on authentication)
    await redisService.setUserPresence(user.id, UserPresenceStatus.ACTIVE);

    logger.info(`User ${user.id} registered and marked as active`);

    return {
      user: userJson as User,
      tokens,
    };
  }

  /**
   * Login user with session management
   */
  async login(
    email: string,
    password: string,
    sessionInfo?: LoginSessionInfo
  ): Promise<AuthResult> {
    const user = await UserModel.findOne({
      where: { email },
    });

    if (!user) {
      throw new AppError(
        'Invalid email or password',
        401,
        ERROR_CODES.INVALID_CREDENTIALS
      );
    }

    // Verify password
    const isPasswordValid = await comparePassword(password, user.passwordHash);

    if (!isPasswordValid) {
      throw new AppError(
        'Invalid email or password',
        401,
        ERROR_CODES.INVALID_CREDENTIALS
      );
    }

    // Generate tokens and mark user as active
    const payload: AuthPayload = {
      userId: user.id,
      email: user.email,
      username: user.username,
    };

    const tokens = await jwtService.generateTokenPair(payload, sessionInfo);

    // Update user status to active in database
    await user.update({ status: 'active' });

    const userJson = user.toJSON();
    delete (userJson as unknown as Record<string, unknown>).passwordHash;
    (userJson as any).status = 'active';

    // Set user as ACTIVE in Redis (global status based on authentication)
    await redisService.setUserPresence(user.id, UserPresenceStatus.ACTIVE);

    logger.info(`User ${user.id} logged in and marked as active`);

    return {
      user: userJson as User,
      tokens,
    };
  }

  /**
   * Refresh access token
   */
  async refreshAccessToken(refreshToken: string): Promise<TokenPair> {
    try {
      const tokens = await jwtService.refreshTokens(refreshToken);
      logger.debug('Access token refreshed successfully');
      return tokens;
    } catch (error: any) {
      logger.debug('Token refresh failed:', error.message);
      throw new AppError(
        'Invalid or expired refresh token',
        401,
        ERROR_CODES.TOKEN_EXPIRED
      );
    }
  }

  /**
   * Logout user from current session
   */
  async logout(sessionId: string, userId: string): Promise<void> {
    try {
      await jwtService.logout(sessionId);
      
      // Check if user has any other active sessions
      const isStillActive = await jwtService.isUserActive(userId);
      
      if (!isStillActive) {
        // Update user status to inactive in database
        await UserModel.update(
          { status: UserPresenceStatus.INACTIVE },
          { where: { id: userId } }
        );
        
        // Set user as INACTIVE in Redis (global status - logged out)
        await redisService.setUserPresence(userId, UserPresenceStatus.INACTIVE);
        
        logger.info(`User ${userId} logged out and marked as inactive`);
      } else {
        logger.info(`User ${userId} logged out from session ${sessionId} but still has active sessions`);
      }
    } catch (error) {
      logger.error('Logout error:', error);
      throw new AppError(
        'Failed to logout',
        500,
        ERROR_CODES.INTERNAL_ERROR
      );
    }
  }

  /**
   * Logout user from all sessions
   */
  async logoutAllSessions(userId: string): Promise<void> {
    try {
      await jwtService.logoutAllSessions(userId);
      
      // Update user status to inactive in database
      await UserModel.update(
        { status: UserPresenceStatus.INACTIVE },
        { where: { id: userId } }
      );
      
      // Set user as INACTIVE in Redis (global status - logged out)
      await redisService.setUserPresence(userId, UserPresenceStatus.INACTIVE);
      
      logger.info(`User ${userId} logged out from all sessions and marked as inactive`);
    } catch (error) {
      logger.error('Logout all sessions error:', error);
      throw new AppError(
        'Failed to logout from all sessions',
        500,
        ERROR_CODES.INTERNAL_ERROR
      );
    }
  }

  /**
   * Get user by ID with current status
   */
  async getUserById(userId: string): Promise<User> {
    const user = await UserModel.findByPk(userId);

    if (!user) {
      throw new AppError(
        'User not found',
        404,
        ERROR_CODES.USER_NOT_FOUND
      );
    }

    // Check if user is actually active based on sessions
    const isActive = await jwtService.isUserActive(userId);
    const actualStatus = isActive ? UserPresenceStatus.ACTIVE : UserPresenceStatus.INACTIVE;

    // Update database if status doesn't match
    if (user.status !== actualStatus) {
      await user.update({ status: actualStatus });
    }

    const userJson = user.toJSON();
    delete (userJson as unknown as Record<string, unknown>).passwordHash;
    (userJson as any).status = actualStatus;

    return userJson as User;
  }

  /**
   * Get user sessions
   */
  async getUserSessions(userId: string): Promise<string[]> {
    try {
      return await jwtService.getUserSessions(userId);
    } catch (error) {
      logger.error('Get user sessions error:', error);
      return [];
    }
  }

  /**
   * Check if user is currently active
   */
  async isUserActive(userId: string): Promise<boolean> {
    try {
      return await jwtService.isUserActive(userId);
    } catch (error) {
      logger.error('Check user active error:', error);
      return false;
    }
  }

  /**
   * Update user activity (extends session)
   */
  async updateUserActivity(userId: string, sessionId: string): Promise<void> {
    try {
      // This is handled automatically by the JWT service when tokens are verified
      // But we can add additional activity tracking here if needed
      logger.debug(`Updated activity for user ${userId} session ${sessionId}`);
    } catch (error) {
      logger.error('Update user activity error:', error);
    }
  }

  /**
   * Get all active users
   */
  async getActiveUsers(): Promise<User[]> {
    try {
      const activeUsers = await UserModel.findAll({
        where: { status: UserPresenceStatus.ACTIVE },
        attributes: { exclude: ['passwordHash'] },
      });

      // Verify each user is actually active and update if needed
      const verifiedUsers: User[] = [];
      
      for (const user of activeUsers) {
        const isActuallyActive = await jwtService.isUserActive(user.id);
        
        if (isActuallyActive) {
          verifiedUsers.push(user.toJSON() as User);
        } else {
          // Update user to inactive
          await user.update({ status: UserPresenceStatus.INACTIVE });
        }
      }

      return verifiedUsers;
    } catch (error) {
      logger.error('Get active users error:', error);
      return [];
    }
  }

  /**
   * Cleanup inactive sessions (for maintenance)
   */
  async cleanupInactiveSessions(): Promise<void> {
    try {
      // This could be called by a cron job
      const users = await UserModel.findAll({
        where: { status: UserPresenceStatus.ACTIVE },
      });

      for (const user of users) {
        const isActive = await jwtService.isUserActive(user.id);
        if (!isActive) {
          await user.update({ status: UserPresenceStatus.INACTIVE });
          logger.info(`Cleaned up inactive user ${user.id}`);
        }
      }
    } catch (error) {
      logger.error('Cleanup inactive sessions error:', error);
    }
  }
}

export const authService = new AuthService();
