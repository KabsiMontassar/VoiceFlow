/**
 * Enhanced JWT Service with Redis Token Management
 * Handles access tokens, refresh tokens, blacklisting, and user status tracking
 */

import jwt from 'jsonwebtoken';
import { AuthPayload } from '../../../shared/src';
import config from '../config/index';
import { redisService } from '../services/redis.service';
import logger from './logger';

export interface TokenPair {
  accessToken: string;
  refreshToken: string;
  expiresAt: number;
  refreshExpiresAt: number;
}

export interface SessionInfo {
  userId: string;
  deviceId?: string;
  ipAddress?: string;
  userAgent?: string;
  createdAt: Date;
  lastActiveAt: Date;
}

export class JWTService {
  private readonly ACCESS_TOKEN_TTL = 15 * 60; // 15 minutes in seconds
  private readonly REFRESH_TOKEN_TTL = 7 * 24 * 60 * 60; // 7 days in seconds
  private readonly MAX_SESSIONS_PER_USER = 5; // Maximum concurrent sessions per user

  /**
   * Generate access token with short TTL (15 minutes)
   */
  generateAccessToken(payload: AuthPayload, sessionId?: string): string {
    const tokenPayload = {
      ...payload,
      sessionId: sessionId || this.generateSessionId(),
      type: 'access',
      iat: Math.floor(Date.now() / 1000),
    };

    return jwt.sign(tokenPayload, config.JWT_SECRET, {
      expiresIn: this.ACCESS_TOKEN_TTL,
    });
  }

  /**
   * Generate refresh token with longer TTL (7 days)
   */
  generateRefreshToken(payload: AuthPayload, sessionId: string): string {
    const tokenPayload = {
      ...payload,
      sessionId,
      type: 'refresh',
      iat: Math.floor(Date.now() / 1000),
    };

    return jwt.sign(tokenPayload, config.JWT_REFRESH_SECRET, {
      expiresIn: this.REFRESH_TOKEN_TTL,
    });
  }

  /**
   * Generate token pair and store session in Redis
   */
  async generateTokenPair(
    payload: AuthPayload,
    sessionInfo?: Partial<SessionInfo>
  ): Promise<TokenPair> {
    const sessionId = this.generateSessionId();
    const now = Date.now();
    
    const accessToken = this.generateAccessToken(payload, sessionId);
    const refreshToken = this.generateRefreshToken(payload, sessionId);

    // Store session information in Redis
    const session: SessionInfo = {
      userId: payload.userId,
      deviceId: sessionInfo?.deviceId,
      ipAddress: sessionInfo?.ipAddress,
      userAgent: sessionInfo?.userAgent,
      createdAt: new Date(),
      lastActiveAt: new Date(),
    };

    await this.storeSession(sessionId, session);
    await this.storeRefreshToken(sessionId, refreshToken);
    await this.setUserActiveStatus(payload.userId, true);

    // Clean up old sessions if user has too many
    await this.cleanupOldSessions(payload.userId);

    return {
      accessToken,
      refreshToken,
      expiresAt: now + (this.ACCESS_TOKEN_TTL * 1000),
      refreshExpiresAt: now + (this.REFRESH_TOKEN_TTL * 1000),
    };
  }

  /**
   * Verify access token and check if session is valid
   */
  async verifyAccessToken(token: string): Promise<AuthPayload & { sessionId: string }> {
    try {
      const decoded = jwt.verify(token, config.JWT_SECRET) as any;

      if (decoded.type !== 'access') {
        throw new Error('Invalid token type');
      }

      // Check if session exists and is valid
      const session = await this.getSession(decoded.sessionId);
      if (!session) {
        throw new Error('Session not found or expired');
      }

      // Update last active time
      await this.updateSessionActivity(decoded.sessionId);

      return {
        userId: decoded.userId,
        email: decoded.email,
        username: decoded.username,
        sessionId: decoded.sessionId,
      };
    } catch (error) {
      logger.debug('Access token verification failed:', error);
      throw new Error('Invalid or expired access token');
    }
  }

  /**
   * Verify refresh token and generate new token pair
   */
  async refreshTokens(refreshToken: string): Promise<TokenPair> {
    try {
      const decoded = jwt.verify(refreshToken, config.JWT_REFRESH_SECRET) as any;

      if (decoded.type !== 'refresh') {
        throw new Error('Invalid token type');
      }

      // Check if refresh token exists in Redis
      const storedToken = await this.getRefreshToken(decoded.sessionId);
      if (!storedToken || storedToken !== refreshToken) {
        throw new Error('Refresh token not found or revoked');
      }

      // Check if session exists
      const session = await this.getSession(decoded.sessionId);
      if (!session) {
        throw new Error('Session not found');
      }

      // Generate new token pair
      const payload: AuthPayload = {
        userId: decoded.userId,
        email: decoded.email,
        username: decoded.username,
      };

      // Invalidate old refresh token
      await this.invalidateRefreshToken(decoded.sessionId);

      // Generate new tokens with same session ID
      const now = Date.now();
      const newAccessToken = this.generateAccessToken(payload, decoded.sessionId);
      const newRefreshToken = this.generateRefreshToken(payload, decoded.sessionId);

      // Store new refresh token
      await this.storeRefreshToken(decoded.sessionId, newRefreshToken);
      await this.updateSessionActivity(decoded.sessionId);
      await this.setUserActiveStatus(payload.userId, true);

      return {
        accessToken: newAccessToken,
        refreshToken: newRefreshToken,
        expiresAt: now + (this.ACCESS_TOKEN_TTL * 1000),
        refreshExpiresAt: now + (this.REFRESH_TOKEN_TTL * 1000),
      };
    } catch (error) {
      logger.debug('Refresh token verification failed:', error);
      throw new Error('Invalid or expired refresh token');
    }
  }

  /**
   * Logout user from specific session
   */
  async logout(sessionId: string): Promise<void> {
    const session = await this.getSession(sessionId);
    if (session) {
      await this.invalidateSession(sessionId);
      
      // Check if user has any other active sessions
      const userSessions = await this.getUserSessions(session.userId);
      if (userSessions.length === 0) {
        await this.setUserActiveStatus(session.userId, false);
      }
    }
  }

  /**
   * Logout user from all sessions
   */
  async logoutAllSessions(userId: string): Promise<void> {
    const sessions = await this.getUserSessions(userId);
    
    for (const sessionId of sessions) {
      await this.invalidateSession(sessionId);
    }
    
    await this.setUserActiveStatus(userId, false);
    logger.info(`Logged out all sessions for user ${userId}`);
  }

  /**
   * Check if user is currently active (has valid sessions)
   */
  async isUserActive(userId: string): Promise<boolean> {
    const activeStatus = await redisService.getCache(`user_status:${userId}`);
    return activeStatus === 'active';
  }

  /**
   * Get all active sessions for a user
   */
  async getUserSessions(userId: string): Promise<string[]> {
    try {
      const sessions = await redisService.getCache(`user_sessions:${userId}`);
      return sessions || [];
    } catch (error) {
      logger.error('Failed to get user sessions:', error);
      return [];
    }
  }

  /**
   * Get session information
   */
  private async getSession(sessionId: string): Promise<SessionInfo | null> {
    try {
      return await redisService.getCache(`session:${sessionId}`);
    } catch (error) {
      logger.error('Failed to get session:', error);
      return null;
    }
  }

  /**
   * Store session information
   */
  private async storeSession(sessionId: string, session: SessionInfo): Promise<void> {
    try {
      // Store session data
      await redisService.setCache(`session:${sessionId}`, session, this.REFRESH_TOKEN_TTL);
      
      // Add session to user's session list
      const userSessions = await this.getUserSessions(session.userId);
      userSessions.push(sessionId);
      await redisService.setCache(`user_sessions:${session.userId}`, userSessions, this.REFRESH_TOKEN_TTL);
      
      logger.debug(`Stored session ${sessionId} for user ${session.userId}`);
    } catch (error) {
      logger.error('Failed to store session:', error);
    }
  }

  /**
   * Update session activity timestamp
   */
  private async updateSessionActivity(sessionId: string): Promise<void> {
    try {
      const session = await this.getSession(sessionId);
      if (session) {
        session.lastActiveAt = new Date();
        await redisService.setCache(`session:${sessionId}`, session, this.REFRESH_TOKEN_TTL);
      }
    } catch (error) {
      logger.error('Failed to update session activity:', error);
    }
  }

  /**
   * Store refresh token
   */
  private async storeRefreshToken(sessionId: string, token: string): Promise<void> {
    try {
      await redisService.setCache(`refresh_token:${sessionId}`, token, this.REFRESH_TOKEN_TTL);
    } catch (error) {
      logger.error('Failed to store refresh token:', error);
    }
  }

  /**
   * Get refresh token
   */
  private async getRefreshToken(sessionId: string): Promise<string | null> {
    try {
      return await redisService.getCache(`refresh_token:${sessionId}`);
    } catch (error) {
      logger.error('Failed to get refresh token:', error);
      return null;
    }
  }

  /**
   * Invalidate refresh token
   */
  private async invalidateRefreshToken(sessionId: string): Promise<void> {
    try {
      await redisService.setCache(`refresh_token:${sessionId}`, null, 0);
    } catch (error) {
      logger.error('Failed to invalidate refresh token:', error);
    }
  }

  /**
   * Invalidate entire session
   */
  private async invalidateSession(sessionId: string): Promise<void> {
    try {
      const session = await this.getSession(sessionId);
      if (session) {
        // Remove from user's session list
        const userSessions = await this.getUserSessions(session.userId);
        const filteredSessions = userSessions.filter(id => id !== sessionId);
        await redisService.setCache(`user_sessions:${session.userId}`, filteredSessions, this.REFRESH_TOKEN_TTL);
      }

      // Remove session and refresh token
      await redisService.setCache(`session:${sessionId}`, null, 0);
      await redisService.setCache(`refresh_token:${sessionId}`, null, 0);
      
      logger.debug(`Invalidated session ${sessionId}`);
    } catch (error) {
      logger.error('Failed to invalidate session:', error);
    }
  }

  /**
   * Set user active/inactive status
   */
  private async setUserActiveStatus(userId: string, isActive: boolean): Promise<void> {
    try {
      const status = isActive ? 'active' : 'inactive';
      await redisService.setCache(`user_status:${userId}`, status, this.REFRESH_TOKEN_TTL);
      logger.debug(`Set user ${userId} status to ${status}`);
    } catch (error) {
      logger.error('Failed to set user status:', error);
    }
  }

  /**
   * Clean up old sessions if user has too many
   */
  private async cleanupOldSessions(userId: string): Promise<void> {
    try {
      const sessions = await this.getUserSessions(userId);
      
      if (sessions.length > this.MAX_SESSIONS_PER_USER) {
        // Get session details to sort by last activity
        const sessionDetails = await Promise.all(
          sessions.map(async (sessionId) => {
            const session = await this.getSession(sessionId);
            return { sessionId, lastActiveAt: session?.lastActiveAt || new Date(0) };
          })
        );

        // Sort by last activity and keep only the most recent sessions
        sessionDetails.sort((a, b) => b.lastActiveAt.getTime() - a.lastActiveAt.getTime());
        const sessionsToRemove = sessionDetails.slice(this.MAX_SESSIONS_PER_USER);

        // Remove old sessions
        for (const { sessionId } of sessionsToRemove) {
          await this.invalidateSession(sessionId);
        }

        logger.info(`Cleaned up ${sessionsToRemove.length} old sessions for user ${userId}`);
      }
    } catch (error) {
      logger.error('Failed to cleanup old sessions:', error);
    }
  }

  /**
   * Generate unique session ID
   */
  private generateSessionId(): string {
    return `sess_${Date.now()}_${Math.random().toString(36).substring(2)}`;
  }

  /**
   * Decode token without verification (for debugging)
   */
  decodeToken(token: string): any {
    try {
      return jwt.decode(token);
    } catch {
      return null;
    }
  }
}

// Export singleton instance
export const jwtService = new JWTService();

// Legacy exports for backward compatibility
export const generateAccessToken = (payload: AuthPayload): string => {
  return jwtService.generateAccessToken(payload);
};

export const generateRefreshToken = (payload: AuthPayload): string => {
  const sessionId = `legacy_${Date.now()}`;
  return jwtService.generateRefreshToken(payload, sessionId);
};

export const verifyAccessToken = async (token: string): Promise<AuthPayload> => {
  const result = await jwtService.verifyAccessToken(token);
  return {
    userId: result.userId,
    email: result.email,
    username: result.username,
  };
};

export const verifyRefreshToken = (token: string): AuthPayload => {
  const decoded = jwt.verify(token, config.JWT_REFRESH_SECRET) as any;
  return {
    userId: decoded.userId,
    email: decoded.email,
    username: decoded.username,
  };
};

export const decodeToken = (token: string): AuthPayload | null => {
  return jwtService.decodeToken(token);
};

export default jwtService;
