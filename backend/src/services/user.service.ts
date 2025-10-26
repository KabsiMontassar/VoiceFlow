/**
 * User Service
 * Handles user profile management
 */

import { UserModel } from '../models/index';
import { hashPassword, comparePassword } from '../utils/password';
import { AppError } from '../utils/responses';
import { Op } from 'sequelize';
// @ts-ignore
import type { User } from '../../../shared/src';

export class UserService {
  /**
   * Get user by ID
   */
  static async getUserById(userId: string): Promise<User> {
    const user = await UserModel.findByPk(userId, {
      attributes: { exclude: ['passwordHash'] },
    });

    if (!user) {
      throw new AppError('User not found', 404, 'USER_NOT_FOUND');
    }

    return user.toJSON() as User;
  }

  /**
   * Update user profile
   */
  static async updateProfile(
    userId: string,
    updates: {
      username?: string;
      age?: number;
      country?: string;
      gender?: 'male' | 'female';
      avatarUrl?: string;
    }
  ): Promise<User> {
    const user = await UserModel.findByPk(userId);

    if (!user) {
      throw new AppError('User not found', 404, 'USER_NOT_FOUND');
    }

    // Check if username is taken
    if (updates.username && updates.username !== user.username) {
      const existingUser = await UserModel.findOne({
        where: { username: updates.username },
      });

      if (existingUser) {
        throw new AppError('Username already taken', 400, 'VALIDATION_ERROR');
      }
    }

    // Validate age
    if (updates.age !== undefined) {
      if (updates.age < 13 || updates.age > 120) {
        throw new AppError('Age must be between 13 and 120', 400, 'VALIDATION_ERROR');
      }
    }

    // Update user
    await user.update(updates);

    const updatedUser = user.toJSON();
    delete (updatedUser as any).passwordHash;

    return updatedUser as User;
  }

  /**
   * Change password
   */
  static async changePassword(
    userId: string,
    currentPassword: string,
    newPassword: string
  ): Promise<void> {
    const user = await UserModel.findByPk(userId);

    if (!user) {
      throw new AppError('User not found', 404, 'USER_NOT_FOUND');
    }

    // Verify current password
    const isPasswordValid = await comparePassword(currentPassword, user.passwordHash);

    if (!isPasswordValid) {
      throw new AppError('Current password is incorrect', 400, 'INVALID_PASSWORD');
    }

    // Validate new password
    if (newPassword.length < 8) {
      throw new AppError('Password must be at least 8 characters', 400, 'VALIDATION_ERROR');
    }

    // Hash and update password
    const passwordHash = await hashPassword(newPassword);
    await user.update({ passwordHash });
  }

  /**
   * Search users by username or email
   */
  static async searchUsers(query: string, limit: number = 20): Promise<User[]> {
    const users = await UserModel.findAll({
      where: {
        [Op.or]: [
          { username: { [Op.iLike]: `%${query}%` } },
          { email: { [Op.iLike]: `%${query}%` } },
        ],
      },
      attributes: { exclude: ['passwordHash'] },
      limit,
    });

    return users.map(u => u.toJSON() as User);
  }

  /**
   * Get user by friend code
   */
  static async getUserByFriendCode(friendCode: string): Promise<User> {
    const user = await UserModel.findOne({
      where: { friendCode },
      attributes: { exclude: ['passwordHash'] },
    });

    if (!user) {
      throw new AppError('User not found with this friend code', 404, 'USER_NOT_FOUND');
    }

    return user.toJSON() as User;
  }

  /**
   * Update user avatar
   */
  static async updateAvatar(userId: string, avatarUrl: string): Promise<User> {
    const user = await UserModel.findByPk(userId);

    if (!user) {
      throw new AppError('User not found', 404, 'USER_NOT_FOUND');
    }

    await user.update({ avatarUrl });

    const updatedUser = user.toJSON();
    delete (updatedUser as any).passwordHash;

    return updatedUser as User;
  }

  /**
   * Get multiple users by IDs
   */
  static async getUsersByIds(userIds: string[]): Promise<User[]> {
    const users = await UserModel.findAll({
      where: { id: { [Op.in]: userIds } },
      attributes: { exclude: ['passwordHash'] },
    });

    return users.map(u => u.toJSON() as User);
  }

  /**
   * Update last seen timestamp
   */
  static async updateLastSeen(userId: string): Promise<void> {
    await UserModel.update(
      { lastSeen: new Date() },
      { where: { id: userId } }
    );
  }
}

export default UserService;
