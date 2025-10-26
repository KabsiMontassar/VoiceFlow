/**
 * Migration: Remove Private Rooms from Friendships
 * 
 * This migration:
 * 1. Removes the roomId column from friendships table
 * 2. Drops the DirectMessage table (no longer needed)
 * 
 * Friends must create rooms to chat - no automatic 1-to-1 private rooms
 */

import { QueryInterface, DataTypes } from 'sequelize';

export default {
  async up(queryInterface: QueryInterface): Promise<void> {
    console.log('Starting migration: Remove private rooms from friendships');

    // Remove roomId column from friendships table
    await queryInterface.removeColumn('friendships', 'roomId');
    console.log('✓ Removed roomId column from friendships table');

    // Drop direct_messages table (optional - no longer used)
    await queryInterface.dropTable('direct_messages');
    console.log('✓ Dropped direct_messages table');

    console.log('Migration completed successfully!');
  },

  async down(queryInterface: QueryInterface): Promise<void> {
    console.log('Reverting migration: Add back private rooms to friendships');

    // Add roomId column back to friendships table
    await queryInterface.addColumn('friendships', 'roomId', {
      type: DataTypes.UUID,
      allowNull: true,
      references: {
        model: 'rooms',
        key: 'id',
      },
      onDelete: 'SET NULL',
    });

    // Recreate direct_messages table
    await queryInterface.createTable('direct_messages', {
      id: {
        type: DataTypes.UUID,
        defaultValue: DataTypes.UUIDV4,
        primaryKey: true,
      },
      senderId: {
        type: DataTypes.UUID,
        allowNull: false,
        references: {
          model: 'users',
          key: 'id',
        },
      },
      receiverId: {
        type: DataTypes.UUID,
        allowNull: false,
        references: {
          model: 'users',
          key: 'id',
        },
      },
      content: {
        type: DataTypes.TEXT,
        allowNull: false,
      },
      isRead: {
        type: DataTypes.BOOLEAN,
        defaultValue: false,
      },
      createdAt: {
        type: DataTypes.DATE,
        defaultValue: DataTypes.NOW,
      },
      updatedAt: {
        type: DataTypes.DATE,
        defaultValue: DataTypes.NOW,
      },
    });

    console.log('Migration reverted successfully!');
  },
};
