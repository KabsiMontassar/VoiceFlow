/**
 * Settings Service
 * Handles user settings/preferences management
 */

import { UserSettingsModel } from '../models/index';
import { AppError } from '../utils/responses';
// @ts-ignore
import type { UserSettings } from '../../../shared/src';

export class SettingsService {
  /**
   * Get user settings (create default if doesn't exist)
   */
  static async getUserSettings(userId: string): Promise<UserSettings> {
    let settings = await UserSettingsModel.findOne({
      where: { userId },
    });

    // Create default settings if they don't exist
    if (!settings) {
      settings = await UserSettingsModel.create({
        userId,
        allowFriendRequests: true,
        showOnlineStatus: true,
      });
    }

    return settings.toJSON() as UserSettings;
  }

  /**
   * Update user settings
   */
  static async updateUserSettings(
    userId: string,
    updates: {
      allowFriendRequests?: boolean;
      showOnlineStatus?: boolean;
    }
  ): Promise<UserSettings> {
    let settings = await UserSettingsModel.findOne({
      where: { userId },
    });

    if (!settings) {
      // Create with provided updates
      settings = await UserSettingsModel.create({
        userId,
        allowFriendRequests: updates.allowFriendRequests ?? true,
        showOnlineStatus: updates.showOnlineStatus ?? true,
      });
    } else {
      // Update existing settings
      await settings.update(updates);
    }

    return settings.toJSON() as UserSettings;
  }

  /**
   * Delete user settings (cascade on user delete)
   */
  static async deleteUserSettings(userId: string): Promise<void> {
    await UserSettingsModel.destroy({
      where: { userId },
    });
  }
}

export default SettingsService;
