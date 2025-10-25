/**
 * Enhanced Authentication Middleware with Session Management
 */

import { Request, Response, NextFunction } from 'express';
import { jwtService } from '../utils/jwt';
import { AppError } from '../utils/responses';
import { AuthPayload, ERROR_CODES } from '../../../shared/src';
import logger from '../utils/logger';

export interface AuthenticatedRequest extends Request {
  user?: AuthPayload & { sessionId: string };
  userId?: string;
  sessionId?: string;
}

/**
 * Main authentication middleware
 */
export const authMiddleware = async (req: AuthenticatedRequest, res: Response, next: NextFunction): Promise<void> => {
  try {
    const authHeader = req.headers.authorization;

    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return sendUnauthorizedResponse(res, 'Missing or invalid authorization header', 'UNAUTHORIZED');
    }

    const token = authHeader.slice(7);

    try {
      const decoded = await jwtService.verifyAccessToken(token);
      req.user = decoded;
      req.userId = decoded.userId;
      req.sessionId = decoded.sessionId;
      
      logger.debug(`User ${decoded.userId} authenticated with session ${decoded.sessionId}`);
      next();
    } catch (error: any) {
      logger.debug('Token verification failed:', error.message);
      
      if (error.message.includes('expired')) {
        return sendUnauthorizedResponse(res, 'Access token expired', 'TOKEN_EXPIRED');
      } else if (error.message.includes('Session not found')) {
        return sendUnauthorizedResponse(res, 'Session expired or invalid', 'SESSION_EXPIRED');
      } else {
        return sendUnauthorizedResponse(res, 'Invalid access token', 'INVALID_TOKEN');
      }
    }
  } catch (error) {
    logger.error('Auth middleware error:', error);
    return sendInternalErrorResponse(res);
  }
};

/**
 * Optional authentication middleware (doesn't fail if no token)
 */
export const optionalAuthMiddleware = async (req: AuthenticatedRequest, res: Response, next: NextFunction): Promise<void> => {
  try {
    const authHeader = req.headers.authorization;

    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return next(); // Continue without authentication
    }

    const token = authHeader.slice(7);

    try {
      const decoded = await jwtService.verifyAccessToken(token);
      req.user = decoded;
      req.userId = decoded.userId;
      req.sessionId = decoded.sessionId;
    } catch (error) {
      // Log but don't fail
      logger.debug('Optional auth failed:', error);
    }

    next();
  } catch (error) {
    logger.error('Optional auth middleware error:', error);
    next(); // Continue even if there's an error
  }
};

/**
 * Admin-only middleware
 */
export const adminMiddleware = async (req: AuthenticatedRequest, res: Response, next: NextFunction): Promise<void> => {
  // First ensure user is authenticated
  await authMiddleware(req, res, () => {
    // Check if user has admin privileges
    // For now, check if user is in admin list or has admin role
    // This can be enhanced based on your user model
    
    if (!req.user) {
      return sendUnauthorizedResponse(res, 'Authentication required', 'UNAUTHORIZED');
    }

    // Add admin check logic here
    // For example: check user role in database
    
    next();
  });
};

/**
 * Rate limiting per user middleware
 */
export const userRateLimitMiddleware = (maxRequests: number = 100, windowMinutes: number = 15) => {
  return async (req: AuthenticatedRequest, res: Response, next: NextFunction): Promise<void> => {
    if (!req.userId) {
      return next(); // Skip if no user (handled by auth middleware)
    }

    try {
      const { redisService } = await import('../services/redis.service');
      const result = await redisService.checkRateLimit(
        `user_rate_limit:${req.userId}`,
        maxRequests,
        windowMinutes * 60
      );

      if (!result.allowed) {
        res.set({
          'X-RateLimit-Limit': maxRequests.toString(),
          'X-RateLimit-Remaining': result.remaining.toString(),
          'X-RateLimit-Reset': new Date(result.resetTime).toISOString(),
        });

        res.status(429).json({
          success: false,
          error: {
            code: 'RATE_LIMIT_EXCEEDED',
            message: 'Rate limit exceeded',
            details: {
              limit: maxRequests,
              remaining: result.remaining,
              resetTime: result.resetTime,
            },
          },
          timestamp: Date.now(),
        });
        return;
      }

      // Set rate limit headers
      res.set({
        'X-RateLimit-Limit': maxRequests.toString(),
        'X-RateLimit-Remaining': result.remaining.toString(),
        'X-RateLimit-Reset': new Date(result.resetTime).toISOString(),
      });

      next();
    } catch (error) {
      logger.error('Rate limit middleware error:', error);
      next(); // Continue on error
    }
  };
};

/**
 * Session validation middleware (additional security)
 */
export const validateSessionMiddleware = async (req: AuthenticatedRequest, res: Response, next: NextFunction): Promise<void> => {
  if (!req.sessionId || !req.userId) {
    return next(); // Skip if no session info
  }

  try {
    // Check if user is still active
    const isActive = await jwtService.isUserActive(req.userId);
    if (!isActive) {
      return sendUnauthorizedResponse(res, 'User session is no longer active', 'SESSION_INACTIVE');
    }

    next();
  } catch (error) {
    logger.error('Session validation error:', error);
    next(); // Continue on error
  }
};

/**
 * Helper function to send unauthorized response
 */
function sendUnauthorizedResponse(res: Response, message: string, code: string): void {
  res.status(401).json({
    success: false,
    error: {
      code,
      message,
    },
    timestamp: Date.now(),
  });
}

/**
 * Helper function to send internal error response
 */
function sendInternalErrorResponse(res: Response): void {
  res.status(500).json({
    success: false,
    error: {
      code: 'INTERNAL_ERROR',
      message: 'Internal server error',
    },
    timestamp: Date.now(),
  });
}

export default authMiddleware;
