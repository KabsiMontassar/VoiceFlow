import { Response } from 'express';
import { SocketErrorResponse, SocketSuccessResponse, ApiResponse } from '../../../shared/src';

export class AppError extends Error {
  constructor(
    message: string,
    public statusCode: number = 400,
    public code: string = 'INTERNAL_ERROR',
    public details?: Record<string, unknown> | Record<string, any>[],
  ) {
    super(message);
    this.name = 'AppError';
  }
}

export const sendSuccess = <T>(
  res: Response,
  statusCode: number,
  data: T,
  message?: string,
): void => {
  const response: ApiResponse<T> = {
    success: true,
    data,
    timestamp: Date.now(),
  };
  res.status(statusCode).json(response);
};

export const sendError = (
  res: Response,
  statusCode: number,
  code: string,
  message: string,
  details?: Record<string, unknown>,
): void => {
  const response: ApiResponse<never> = {
    success: false,
    error: {
      code,
      message,
      details,
    },
    timestamp: Date.now(),
  };
  res.status(statusCode).json(response);
};

export const socketSendSuccess = <T>(data: T): SocketSuccessResponse<T> => {
  return {
    success: true,
    data,
    timestamp: Date.now(),
  };
};

export const socketSendError = (
  code: string,
  message: string,
  details?: Record<string, unknown>,
): SocketErrorResponse => {
  return {
    code,
    message,
    details,
  };
};
