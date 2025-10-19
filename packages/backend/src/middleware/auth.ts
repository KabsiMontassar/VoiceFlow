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
}

export const authMiddleware = (req: AuthenticatedRequest, res: Response, next: NextFunction): void => {
  try {
    const authHeader = req.headers.authorization;

    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      throw new AppError(ERROR_CODES.UNAUTHORIZED, 'Missing or invalid authorization header', 401);
    }

    const token = authHeader.slice(7);

    try {
      const decoded = verifyAccessToken(token);
      req.user = decoded;
      next();
    } catch (error) {
      throw new AppError(ERROR_CODES.TOKEN_EXPIRED, 'Token expired or invalid', 401);
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
