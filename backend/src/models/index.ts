/**
 * Database Models using Sequelize
 * Defines all models for VoiceFlow application
 */

import { DataTypes, Model, Sequelize } from 'sequelize';
// @ts-ignore - Monorepo imports flagged by rootDir constraint but valid
import { User, Room, Message, RoomUser, MessageType, RoomSettings, UserPresenceStatus } from '../../../shared/src';

export class UserModel extends Model implements User {
  declare id: string;
  declare username: string;
  declare email: string;
  declare passwordHash: string; // Not in User interface, but needed for DB
  declare avatarUrl: string | null;
  declare status: UserPresenceStatus; // User status: active/inactive/away
  declare friendCode: string; // Unique friend code
  declare age: number | null;
  declare country: string | null;
  declare gender: 'male' | 'female' | null;
  declare createdAt: Date;
  declare updatedAt: Date;
  declare lastSeen: Date;
}

export class FriendRequestModel extends Model {
  declare id: string;
  declare senderId: string;
  declare receiverId: string;
  declare status: 'pending' | 'accepted' | 'rejected' | 'cancelled';
  declare createdAt: Date;
  declare updatedAt: Date;
}

export class FriendshipModel extends Model {
  declare id: string;
  declare user1Id: string;
  declare user2Id: string;
  declare roomId: string | null; // Private 1:1 room
  declare createdAt: Date;
}

export class RoomBanModel extends Model {
  declare id: string;
  declare roomId: string;
  declare userId: string;
  declare bannedBy: string;
  declare reason: string | null;
  declare createdAt: Date;
}

export class DirectMessageModel extends Model {
  declare id: string;
  declare senderId: string;
  declare receiverId: string;
  declare content: string;
  declare isRead: boolean;
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
      status: {
        type: DataTypes.ENUM('active', 'inactive', 'away', 'in_call'),
        defaultValue: 'inactive',
        allowNull: false,
      },
      friendCode: {
        type: DataTypes.STRING(12),
        allowNull: false,
        unique: true,
      },
      age: {
        type: DataTypes.INTEGER,
        allowNull: true,
        validate: {
          min: 13,
          max: 120,
        },
      },
      country: {
        type: DataTypes.STRING(100),
        allowNull: true,
      },
      gender: {
        type: DataTypes.ENUM('male', 'female'),
        allowNull: true,
      },
      lastSeen: {
        type: DataTypes.DATE,
        defaultValue: DataTypes.NOW,
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
      indexes: [
        { fields: ['email'] }, 
        { fields: ['username'] },
        { fields: ['friendCode'], unique: true },
      ],
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

  // FriendRequest model
  FriendRequestModel.init(
    {
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
      status: {
        type: DataTypes.ENUM('pending', 'accepted', 'rejected', 'cancelled'),
        defaultValue: 'pending',
        allowNull: false,
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
      modelName: 'FriendRequest',
      tableName: 'friend_requests',
      timestamps: true,
      indexes: [
        { fields: ['senderId'] },
        { fields: ['receiverId'] },
        { fields: ['senderId', 'receiverId'], unique: true },
      ],
    },
  );

  // Friendship model
  FriendshipModel.init(
    {
      id: {
        type: DataTypes.UUID,
        defaultValue: DataTypes.UUIDV4,
        primaryKey: true,
      },
      user1Id: {
        type: DataTypes.UUID,
        allowNull: false,
        references: {
          model: 'users',
          key: 'id',
        },
      },
      user2Id: {
        type: DataTypes.UUID,
        allowNull: false,
        references: {
          model: 'users',
          key: 'id',
        },
      },
      roomId: {
        type: DataTypes.UUID,
        allowNull: true,
        references: {
          model: 'rooms',
          key: 'id',
        },
      },
      createdAt: {
        type: DataTypes.DATE,
        defaultValue: DataTypes.NOW,
      },
    },
    {
      sequelize,
      modelName: 'Friendship',
      tableName: 'friendships',
      timestamps: false,
      indexes: [
        { fields: ['user1Id'] },
        { fields: ['user2Id'] },
        { fields: ['user1Id', 'user2Id'], unique: true },
        { fields: ['roomId'] },
      ],
    },
  );

  // RoomBan model
  RoomBanModel.init(
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
      bannedBy: {
        type: DataTypes.UUID,
        allowNull: false,
        references: {
          model: 'users',
          key: 'id',
        },
      },
      reason: {
        type: DataTypes.TEXT,
        allowNull: true,
      },
      createdAt: {
        type: DataTypes.DATE,
        defaultValue: DataTypes.NOW,
      },
    },
    {
      sequelize,
      modelName: 'RoomBan',
      tableName: 'room_bans',
      timestamps: false,
      indexes: [
        { fields: ['roomId'] },
        { fields: ['userId'] },
        { fields: ['roomId', 'userId'], unique: true },
      ],
    },
  );

  // DirectMessage model
  DirectMessageModel.init(
    {
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
        validate: {
          len: [1, 4000],
        },
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
    },
    {
      sequelize,
      modelName: 'DirectMessage',
      tableName: 'direct_messages',
      timestamps: true,
      indexes: [
        { fields: ['senderId'] },
        { fields: ['receiverId'] },
        { fields: ['senderId', 'receiverId'] },
        { fields: ['isRead'] },
      ],
    },
  );

  // Set up associations
  UserModel.hasMany(RoomModel, { foreignKey: 'createdById', as: 'createdRooms' });
  RoomModel.belongsTo(UserModel, { foreignKey: 'createdById', as: 'creator' });

  UserModel.belongsToMany(RoomModel, { through: RoomUserModel, foreignKey: 'userId' });
  RoomModel.belongsToMany(UserModel, { through: RoomUserModel, foreignKey: 'roomId' });

  UserModel.hasMany(RoomUserModel, { foreignKey: 'userId' });
  RoomUserModel.belongsTo(UserModel, { foreignKey: 'userId', as: 'user' });

  RoomModel.hasMany(RoomUserModel, { foreignKey: 'roomId' });
  RoomUserModel.belongsTo(RoomModel, { foreignKey: 'roomId', as: 'room' });

  UserModel.hasMany(MessageModel, { foreignKey: 'userId' });
  MessageModel.belongsTo(UserModel, { foreignKey: 'userId', as: 'author' });

  RoomModel.hasMany(MessageModel, { foreignKey: 'roomId' });
  MessageModel.belongsTo(RoomModel, { foreignKey: 'roomId' });

  MessageModel.belongsTo(FileMetadataModel, { foreignKey: 'fileId', as: 'file' });
  FileMetadataModel.hasMany(MessageModel, { foreignKey: 'fileId' });

  // Friend request associations
  FriendRequestModel.belongsTo(UserModel, { foreignKey: 'senderId', as: 'sender' });
  FriendRequestModel.belongsTo(UserModel, { foreignKey: 'receiverId', as: 'receiver' });
  UserModel.hasMany(FriendRequestModel, { foreignKey: 'senderId', as: 'sentFriendRequests' });
  UserModel.hasMany(FriendRequestModel, { foreignKey: 'receiverId', as: 'receivedFriendRequests' });

  // Friendship associations
  FriendshipModel.belongsTo(UserModel, { foreignKey: 'user1Id', as: 'user1' });
  FriendshipModel.belongsTo(UserModel, { foreignKey: 'user2Id', as: 'user2' });
  FriendshipModel.belongsTo(RoomModel, { foreignKey: 'roomId', as: 'privateRoom' });

  // Room ban associations
  RoomBanModel.belongsTo(RoomModel, { foreignKey: 'roomId', as: 'room' });
  RoomBanModel.belongsTo(UserModel, { foreignKey: 'userId', as: 'bannedUser' });
  RoomBanModel.belongsTo(UserModel, { foreignKey: 'bannedBy', as: 'banner' });
  RoomModel.hasMany(RoomBanModel, { foreignKey: 'roomId', as: 'bans' });

  // Direct message associations
  DirectMessageModel.belongsTo(UserModel, { foreignKey: 'senderId', as: 'sender' });
  DirectMessageModel.belongsTo(UserModel, { foreignKey: 'receiverId', as: 'receiver' });
  UserModel.hasMany(DirectMessageModel, { foreignKey: 'senderId', as: 'sentDirectMessages' });
  UserModel.hasMany(DirectMessageModel, { foreignKey: 'receiverId', as: 'receivedDirectMessages' });
};

export default {
  UserModel,
  RoomModel,
  MessageModel,
  RoomUserModel,
  FileMetadataModel,
  FriendRequestModel,
  FriendshipModel,
  RoomBanModel,
  DirectMessageModel,
  initializeModels,
};
