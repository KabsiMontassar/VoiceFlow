/**
 * Database Models using Sequelize
 * Defines all models for VoiceFlow application
 */

import { DataTypes, Model, Sequelize } from 'sequelize';
// @ts-ignore - Monorepo imports flagged by rootDir constraint but valid
import { User, Room, Message, RoomUser, MessageType, RoomSettings } from '../../../shared/src';

export class UserModel extends Model implements User {
  declare id: string;
  declare username: string;
  declare email: string;
  declare passwordHash: string; // Not in User interface, but needed for DB
  declare avatarUrl: string | null;
  declare createdAt: Date;
  declare updatedAt: Date;
}

export class RoomModel extends Model implements Room {
  declare id: string;
  declare code: string;
  declare name: string;
  declare description: string | null;
  declare createdById: string;
  declare maxUsers: number;
  declare settings: RoomSettings;
  declare createdAt: Date;
  declare lastActivity: Date;
  declare isActive: boolean;
}

export class MessageModel extends Model implements Message {
  declare id: string;
  declare roomId: string;
  declare userId: string;
  declare content: string;
  declare type: MessageType;
  declare fileId: string | null;
  declare createdAt: Date;
  declare updatedAt: Date;
  declare author?: User; // Association property
}

export class RoomUserModel extends Model implements RoomUser {
  declare id: string;
  declare roomId: string;
  declare userId: string;
  declare role: 'admin' | 'member';
  declare joinedAt: Date;
  declare user?: User; // Association property
}

export class FileMetadataModel extends Model {
  declare id: string;
  declare name: string;
  declare size: number;
  declare mimeType: string;
  declare url: string;
  declare uploadedBy: string;
  declare uploadedAt: Date;
}

export const initializeModels = (sequelize: Sequelize): void => {
  // User model
  UserModel.init(
    {
      id: {
        type: DataTypes.UUID,
        defaultValue: DataTypes.UUIDV4,
        primaryKey: true,
      },
      username: {
        type: DataTypes.STRING(20),
        allowNull: false,
        unique: true,
        validate: {
          len: [3, 20],
        },
      },
      email: {
        type: DataTypes.STRING,
        allowNull: false,
        unique: true,
        validate: {
          isEmail: true,
        },
      },
      passwordHash: {
        type: DataTypes.STRING,
        allowNull: false,
      },
      avatarUrl: {
        type: DataTypes.STRING,
        allowNull: true,
      },
      createdAt: {
        type: DataTypes.DATE,
        defaultValue: DataTypes.NOW,
      },
      updatedAt: {
        type: DataTypes.DATE,
        defaultValue: DataTypes.NOW,
      },
    },
    {
      sequelize,
      modelName: 'User',
      tableName: 'users',
      timestamps: true,
      indexes: [{ fields: ['email'] }, { fields: ['username'] }],
    },
  );

  // Room model
  RoomModel.init(
    {
      id: {
        type: DataTypes.UUID,
        defaultValue: DataTypes.UUIDV4,
        primaryKey: true,
      },
      code: {
        type: DataTypes.STRING(20),
        allowNull: false,
        unique: true,
      },
      name: {
        type: DataTypes.STRING(100),
        allowNull: false,
      },
      description: {
        type: DataTypes.TEXT,
        allowNull: true,
      },
      createdById: {
        type: DataTypes.UUID,
        allowNull: false,
        references: {
          model: 'users',
          key: 'id',
        },
      },
      maxUsers: {
        type: DataTypes.INTEGER,
        allowNull: false,
        defaultValue: 100,
        validate: {
          min: 2,
          max: 500,
        },
      },
      settings: {
        type: DataTypes.JSONB,
        allowNull: false,
        defaultValue: {
          isPublic: true,
          allowGuests: false,
          requireApproval: false,
          recordMessages: true,
        },
      },
      createdAt: {
        type: DataTypes.DATE,
        defaultValue: DataTypes.NOW,
      },
      lastActivity: {
        type: DataTypes.DATE,
        defaultValue: DataTypes.NOW,
      },
      isActive: {
        type: DataTypes.BOOLEAN,
        defaultValue: true,
      },
    },
    {
      sequelize,
      modelName: 'Room',
      tableName: 'rooms',
      timestamps: false,
      indexes: [{ fields: ['code'] }, { fields: ['createdById'] }, { fields: ['isActive'] }],
    },
  );

  // Message model
  MessageModel.init(
    {
      id: {
        type: DataTypes.UUID,
        defaultValue: DataTypes.UUIDV4,
        primaryKey: true,
      },
      roomId: {
        type: DataTypes.UUID,
        allowNull: false,
        references: {
          model: 'rooms',
          key: 'id',
        },
      },
      userId: {
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
        validate: {
          len: [1, 4000],
        },
      },
      type: {
        type: DataTypes.ENUM('text', 'file', 'system', 'voice_note'),
        defaultValue: 'text',
      },
      fileId: {
        type: DataTypes.UUID,
        allowNull: true,
        references: {
          model: 'file_metadata',
          key: 'id',
        },
      },
      createdAt: {
        type: DataTypes.DATE,
        defaultValue: DataTypes.NOW,
      },
      updatedAt: {
        type: DataTypes.DATE,
        defaultValue: DataTypes.NOW,
      },
    },
    {
      sequelize,
      modelName: 'Message',
      tableName: 'messages',
      timestamps: true,
      indexes: [
        { fields: ['roomId'] },
        { fields: ['userId'] },
        { fields: ['roomId', 'createdAt'] },
      ],
    },
  );

  // RoomUser model
  RoomUserModel.init(
    {
      id: {
        type: DataTypes.UUID,
        defaultValue: DataTypes.UUIDV4,
        primaryKey: true,
      },
      roomId: {
        type: DataTypes.UUID,
        allowNull: false,
        references: {
          model: 'rooms',
          key: 'id',
        },
      },
      userId: {
        type: DataTypes.UUID,
        allowNull: false,
        references: {
          model: 'users',
          key: 'id',
        },
      },
      role: {
        type: DataTypes.ENUM('admin', 'member'),
        defaultValue: 'member',
      },
      joinedAt: {
        type: DataTypes.DATE,
        defaultValue: DataTypes.NOW,
      },
    },
    {
      sequelize,
      modelName: 'RoomUser',
      tableName: 'room_users',
      timestamps: false,
      indexes: [
        { fields: ['roomId'] },
        { fields: ['userId'] },
        { fields: ['roomId', 'userId'], unique: true },
      ],
    },
  );

  // FileMetadata model
  FileMetadataModel.init(
    {
      id: {
        type: DataTypes.UUID,
        defaultValue: DataTypes.UUIDV4,
        primaryKey: true,
      },
      name: {
        type: DataTypes.STRING,
        allowNull: false,
      },
      size: {
        type: DataTypes.BIGINT,
        allowNull: false,
      },
      mimeType: {
        type: DataTypes.STRING,
        allowNull: false,
      },
      url: {
        type: DataTypes.STRING,
        allowNull: false,
      },
      uploadedBy: {
        type: DataTypes.UUID,
        allowNull: false,
        references: {
          model: 'users',
          key: 'id',
        },
      },
      uploadedAt: {
        type: DataTypes.DATE,
        defaultValue: DataTypes.NOW,
      },
    },
    {
      sequelize,
      modelName: 'FileMetadata',
      tableName: 'file_metadata',
      timestamps: false,
      indexes: [{ fields: ['uploadedBy'] }],
    },
  );

  // Set up associations
  UserModel.hasMany(RoomModel, { foreignKey: 'createdById', as: 'createdRooms' });
  RoomModel.belongsTo(UserModel, { foreignKey: 'createdById', as: 'creator' });

  UserModel.belongsToMany(RoomModel, { through: RoomUserModel, foreignKey: 'userId' });
  RoomModel.belongsToMany(UserModel, { through: RoomUserModel, foreignKey: 'roomId' });

  UserModel.hasMany(MessageModel, { foreignKey: 'userId' });
  MessageModel.belongsTo(UserModel, { foreignKey: 'userId', as: 'author' });

  RoomModel.hasMany(MessageModel, { foreignKey: 'roomId' });
  MessageModel.belongsTo(RoomModel, { foreignKey: 'roomId' });

  MessageModel.belongsTo(FileMetadataModel, { foreignKey: 'fileId', as: 'file' });
  FileMetadataModel.hasMany(MessageModel, { foreignKey: 'fileId' });
};

export default {
  UserModel,
  RoomModel,
  MessageModel,
  RoomUserModel,
  FileMetadataModel,
  initializeModels,
};
