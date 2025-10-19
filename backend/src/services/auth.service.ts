/**
 * Auth Service - Handles authentication logic
 */

import { UserModel } from '../models/index';
import { generateAccessToken, generateRefreshToken, verifyRefreshToken } from '../utils/jwt';
import { hashPassword, comparePassword } from '../utils/password';
import { AppError } from '../utils/responses';
import { ERROR_CODES, User, AuthPayload } from '@voiceflow/shared';
import { generateUUID } from '@voiceflow/shared/utils';

export class AuthService {
  /**
   * Register a new user
   */
  async register(
    email: string,
    username: string,
    password: string
  ): Promise<{ user: User; accessToken: string; refreshToken: string }> {
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

    // Create user
    const user = await UserModel.create({
      id: generateUUID(),
      email,
      username,
      passwordHash,
      avatarUrl: null,
      status: 'offline',
    });

    const userJson = user.toJSON();
    delete (userJson as unknown as Record<string, unknown>).passwordHash;

    // Generate tokens
    const payload: AuthPayload = {
      userId: user.id,
      email: user.email,
      username: user.username,
    };

    const accessToken = generateAccessToken(payload);
    const refreshToken = generateRefreshToken(payload);

    return {
      user: userJson as User,
      accessToken,
      refreshToken,
    };
  }

  /**
   * Login user
   */
  async login(
    email: string,
    password: string
  ): Promise<{ user: User; accessToken: string; refreshToken: string }> {
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
      user: userJson as User,
      accessToken,
      refreshToken,
    };
  }

  /**
   * Refresh access token
   */
  async refreshAccessToken(
    refreshToken: string
  ): Promise<{ accessToken: string; refreshToken: string }> {
    try {
      const decoded = verifyRefreshToken(refreshToken);

      // Get user
      const user = await UserModel.findByPk(decoded.userId);

      if (!user) {
        throw new AppError(
          'User not found',
          401,
          ERROR_CODES.USER_NOT_FOUND
        );
      }

      // Generate new tokens
      const payload: AuthPayload = {
        userId: user.id,
        email: user.email,
        username: user.username,
      };

      const newAccessToken = generateAccessToken(payload);
      const newRefreshToken = generateRefreshToken(payload);

      return {
        accessToken: newAccessToken,
        refreshToken: newRefreshToken,
      };
    } catch (error) {
      throw new AppError(
        'Invalid refresh token',
        401,
        ERROR_CODES.TOKEN_EXPIRED
      );
    }
  }

  /**
   * Get user by ID
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

    const userJson = user.toJSON();
    delete (userJson as unknown as Record<string, unknown>).passwordHash;

    return userJson as User;
  }
}

export const authService = new AuthService();
