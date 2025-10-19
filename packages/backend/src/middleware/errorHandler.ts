/**
 * Error Handling Middleware
 */

import { Request, Response, NextFunction } from 'express';
import { AppError } from '../utils/responses';
import { ERROR_CODES } from '@voiceflow/shared';
import logger from '../utils/logger';

export const errorHandler = (
  error: Error | AppError,
  req: Request,
  res: Response,
  next: NextFunction,
): void => {
  logger.error('Unhandled error', { error: error.message, stack: error.stack });

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
    return;
  }

  // Default error response
  res.status(500).json({
    success: false,
    error: {
      code: ERROR_CODES.INTERNAL_ERROR,
      message: 'Internal server error',
    },
    timestamp: Date.now(),
  });
};

export default errorHandler;
