/**
 * Authentication Middleware
 */

import { Request, Response, NextFunction } from 'express';
import { verifyAccessToken } from '../utils/jwt';
import { AppError } from '../utils/responses';
import { AuthPayload, ERROR_CODES } from '@voiceflow/shared';
import logger from '../utils/logger';

export interface AuthenticatedRequest extends Request {
  user?: AuthPayload;
  userId?: string;
}

export const authMiddleware = (req: AuthenticatedRequest, res: Response, next: NextFunction): void => {
  try {
    const authHeader = req.headers.authorization;

    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      throw new AppError('Missing or invalid authorization header', 401, 'UNAUTHORIZED');
    }

    const token = authHeader.slice(7);

    try {
      const decoded = verifyAccessToken(token);
      req.user = decoded;
      req.userId = decoded.userId;
      next();
    } catch (error) {
      throw new AppError('Token expired or invalid', 401, 'TOKEN_EXPIRED');
    }
  } catch (error) {
    if (error instanceof AppError) {
      res.status(error.statusCode).json({
        success: false,
        error: {
          code: error.code,
          message: error.message,
          details: error.details,
        },
        timestamp: Date.now(),
      });
    } else {
      logger.error('Auth middleware error', error);
      res.status(500).json({
        success: false,
        error: {
          code: 'INTERNAL_ERROR',
          message: 'Internal server error',
        },
        timestamp: Date.now(),
      });
    }
  }
};

export default authMiddleware;
