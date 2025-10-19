/**
 * Auth Service - Handles authentication logic
 */

import { UserModel } from '../models/index';
import { generateAccessToken, generateRefreshToken } from '../utils/jwt';
import { hashPassword, comparePassword } from '../utils/password';
import { AppError, socketSendError } from '../utils/responses';
import { ERROR_CODES, User, AuthPayload } from '@voiceflow/shared';
import { generateUUID } from '@voiceflow/shared/utils';

export class AuthService {
  /**
   * Register a new user
   */
  async register(email: string, username: string, password: string): Promise<User> {
    // Check if user exists
    const existingUser = await UserModel.findOne({
      where: { email },
    });

    if (existingUser) {
      throw new AppError(ERROR_CODES.VALIDATION_ERROR, 'Email already registered', 400);
    }

    const existingUsername = await UserModel.findOne({
      where: { username },
    });

    if (existingUsername) {
      throw new AppError(ERROR_CODES.VALIDATION_ERROR, 'Username already taken', 400);
    }

    // Hash password
    const passwordHash = await hashPassword(password);

    // Create user
    const user = await UserModel.create({
      id: generateUUID(),
      email,
      username,
      passwordHash,
      avatarUrl: null,
    });

    return user.toJSON();
  }

  /**
   * Login user
   */
  async login(email: string, password: string): Promise<{ user: User; accessToken: string; refreshToken: string }> {
    const user = await UserModel.findOne({
      where: { email },
    });

    if (!user) {
      throw new AppError(ERROR_CODES.INVALID_CREDENTIALS, 'Invalid email or password', 401);
    }

    // Verify password
    const isPasswordValid = await comparePassword(password, user.passwordHash);

    if (!isPasswordValid) {
      throw new AppError(ERROR_CODES.INVALID_CREDENTIALS, 'Invalid email or password', 401);
    }

    // Generate tokens
    const payload: AuthPayload = {
      userId: user.id,
      email: user.email,
      username: user.username,
    };

    const accessToken = generateAccessToken(payload);
    const refreshToken = generateRefreshToken(payload);

    const userJson = user.toJSON();
    delete (userJson as unknown as Record<string, unknown>).passwordHash;

    return {
      user: userJson,
      accessToken,
      refreshToken,
    };
  }

  /**
   * Get user by ID
   */
  async getUserById(userId: string): Promise<User> {
    const user = await UserModel.findByPk(userId);

    if (!user) {
      throw new AppError(ERROR_CODES.USER_NOT_FOUND, 'User not found', 404);
    }

    const userJson = user.toJSON();
    delete (userJson as unknown as Record<string, unknown>).passwordHash;

    return userJson;
  }
}

export const authService = new AuthService();
