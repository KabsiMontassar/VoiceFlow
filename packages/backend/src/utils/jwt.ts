import jwt from 'jsonwebtoken';
import { AuthPayload } from '@voiceflow/shared';
import config from '../config/index';

export const generateAccessToken = (payload: AuthPayload): string => {
  return jwt.sign(payload, config.JWT_SECRET, {
    expiresIn: config.JWT_EXPIRES_IN,
  });
};

export const generateRefreshToken = (payload: AuthPayload): string => {
  return jwt.sign(payload, config.JWT_REFRESH_SECRET, {
    expiresIn: config.JWT_REFRESH_EXPIRES_IN,
  });
};

export const verifyAccessToken = (token: string): AuthPayload => {
  return jwt.verify(token, config.JWT_SECRET) as AuthPayload;
};

export const verifyRefreshToken = (token: string): AuthPayload => {
  return jwt.verify(token, config.JWT_REFRESH_SECRET) as AuthPayload;
};

export const decodeToken = (token: string): AuthPayload | null => {
  try {
    return jwt.decode(token) as AuthPayload;
  } catch {
    return null;
  }
};
