/**
 * Friend Service
 * Handles friend requests, friendships, and private 1:1 rooms
 */

import { Op } from 'sequelize';
import { 
  UserModel, 
  FriendRequestModel, 
  FriendshipModel,
  RoomModel,
  RoomUserModel,
  MessageModel
} from '../models/index';
import { generateRoomCode } from '../utils/codeGenerator';
// @ts-ignore
import type { FriendRequest, Friendship, User, FriendWithStatus } from '../../../shared/src';

export class FriendService {
  /**
   * Send a friend request using friend code
   */
  static async sendFriendRequest(senderId: string, friendCode: string): Promise<FriendRequest> {
    // Find receiver by friend code
    const receiver = await UserModel.findOne({ where: { friendCode } });
    
    if (!receiver) {
      throw new Error('User not found with this friend code');
    }

    if (receiver.id === senderId) {
      throw new Error('You cannot send a friend request to yourself');
    }

    // Check if already friends
    const existingFriendship = await FriendshipModel.findOne({
      where: {
        [Op.or]: [
          { user1Id: senderId, user2Id: receiver.id },
          { user1Id: receiver.id, user2Id: senderId },
        ],
      },
    });

    if (existingFriendship) {
      throw new Error('You are already friends with this user');
    }

    // Check for existing friend request
    const existingRequest = await FriendRequestModel.findOne({
      where: {
        [Op.or]: [
          { senderId, receiverId: receiver.id, status: 'pending' },
          { senderId: receiver.id, receiverId: senderId, status: 'pending' },
        ],
      },
    });

    if (existingRequest) {
      if (existingRequest.senderId === senderId) {
        throw new Error('Friend request already sent');
      } else {
        // They sent us a request, auto-accept
        return this.acceptFriendRequest(existingRequest.id, senderId);
      }
    }

    // Create new friend request
    const friendRequest = await FriendRequestModel.create({
      senderId,
      receiverId: receiver.id,
      status: 'pending',
    });

    // Load sender and receiver data
    await friendRequest.reload({
      include: [
        { model: UserModel, as: 'sender' },
        { model: UserModel, as: 'receiver' },
      ],
    });

    return friendRequest.toJSON() as FriendRequest;
  }

  /**
   * Get all pending friend requests for a user
   */
  static async getPendingRequests(userId: string): Promise<FriendRequest[]> {
    const requests = await FriendRequestModel.findAll({
      where: {
        receiverId: userId,
        status: 'pending',
      },
      include: [
        { model: UserModel, as: 'sender' },
        { model: UserModel, as: 'receiver' },
      ],
      order: [['createdAt', 'DESC']],
    });

    return requests.map(r => r.toJSON() as FriendRequest);
  }

  /**
   * Get all sent friend requests
   */
  static async getSentRequests(userId: string): Promise<FriendRequest[]> {
    const requests = await FriendRequestModel.findAll({
      where: {
        senderId: userId,
        status: 'pending',
      },
      include: [
        { model: UserModel, as: 'sender' },
        { model: UserModel, as: 'receiver' },
      ],
      order: [['createdAt', 'DESC']],
    });

    return requests.map(r => r.toJSON() as FriendRequest);
  }

  /**
   * Accept a friend request and create 1:1 private room
   */
  static async acceptFriendRequest(requestId: string, userId: string): Promise<FriendRequest> {
    const request = await FriendRequestModel.findByPk(requestId);

    if (!request) {
      throw new Error('Friend request not found');
    }

    if (request.receiverId !== userId) {
      throw new Error('You can only accept friend requests sent to you');
    }

    if (request.status !== 'pending') {
      throw new Error('Friend request is no longer pending');
    }

    // Update request status
    request.status = 'accepted';
    await request.save();

    // Create private 1:1 room
    const roomCode = generateRoomCode();
    const [user1, user2] = await Promise.all([
      UserModel.findByPk(request.senderId),
      UserModel.findByPk(request.receiverId),
    ]);

    const room = await RoomModel.create({
      code: roomCode,
      name: `${user1?.username} & ${user2?.username}`,
      description: 'Private chat',
      createdById: userId,
      maxUsers: 2,
      settings: {
        isPublic: false,
        allowGuests: false,
        requireApproval: false,
        recordMessages: true,
      },
      isActive: true,
    });

    // Add both users to the room
    await Promise.all([
      RoomUserModel.create({
        roomId: room.id,
        userId: request.senderId,
        role: 'member',
      }),
      RoomUserModel.create({
        roomId: room.id,
        userId: request.receiverId,
        role: 'member',
      }),
    ]);

    // Create friendship with room reference
    await FriendshipModel.create({
      user1Id: request.senderId < request.receiverId ? request.senderId : request.receiverId,
      user2Id: request.senderId < request.receiverId ? request.receiverId : request.senderId,
      roomId: room.id,
    });

    // Reload request with user data
    await request.reload({
      include: [
        { model: UserModel, as: 'sender' },
        { model: UserModel, as: 'receiver' },
      ],
    });

    return request.toJSON() as FriendRequest;
  }

  /**
   * Reject a friend request
   */
  static async rejectFriendRequest(requestId: string, userId: string): Promise<void> {
    const request = await FriendRequestModel.findByPk(requestId);

    if (!request) {
      throw new Error('Friend request not found');
    }

    if (request.receiverId !== userId) {
      throw new Error('You can only reject friend requests sent to you');
    }

    if (request.status !== 'pending') {
      throw new Error('Friend request is no longer pending');
    }

    request.status = 'rejected';
    await request.save();
  }

  /**
   * Cancel a sent friend request
   */
  static async cancelFriendRequest(requestId: string, userId: string): Promise<void> {
    const request = await FriendRequestModel.findByPk(requestId);

    if (!request) {
      throw new Error('Friend request not found');
    }

    if (request.senderId !== userId) {
      throw new Error('You can only cancel friend requests you sent');
    }

    if (request.status !== 'pending') {
      throw new Error('Friend request is no longer pending');
    }

    request.status = 'cancelled';
    await request.save();
  }

  /**
   * Get all friends for a user with online status
   */
  static async getFriends(userId: string): Promise<FriendWithStatus[]> {
    const friendships = await FriendshipModel.findAll({
      where: {
        [Op.or]: [{ user1Id: userId }, { user2Id: userId }],
      },
      include: [
        { model: UserModel, as: 'user1' },
        { model: UserModel, as: 'user2' },
        { model: RoomModel, as: 'privateRoom' },
      ],
    });

    const friends: FriendWithStatus[] = [];

    for (const friendship of friendships) {
      const friendshipData = friendship.toJSON() as any;
      const friendData = friendshipData.user1Id === userId ? friendshipData.user2 : friendshipData.user1;
      
      if (friendData) {
        friends.push({
          ...friendData,
          friendshipId: friendship.id,
          isOnline: friendData.status === 'active' || friendData.status === 'in_call',
          privateRoomId: friendship.roomId,
        } as FriendWithStatus);
      }
    }

    return friends;
  }

  /**
   * Remove a friend and delete their private room
   */
  static async removeFriend(userId: string, friendId: string): Promise<void> {
    const friendship = await FriendshipModel.findOne({
      where: {
        [Op.or]: [
          { user1Id: userId, user2Id: friendId },
          { user1Id: friendId, user2Id: userId },
        ],
      },
    });

    if (!friendship) {
      throw new Error('Friendship not found');
    }

    // Delete all messages in the private room
    if (friendship.roomId) {
      await MessageModel.destroy({
        where: { roomId: friendship.roomId },
      });

      // Delete room users
      await RoomUserModel.destroy({
        where: { roomId: friendship.roomId },
      });

      // Delete the room
      await RoomModel.destroy({
        where: { id: friendship.roomId },
      });
    }

    // Delete the friendship
    await friendship.destroy();
  }

  /**
   * Check if two users are friends
   */
  static async areFriends(userId1: string, userId2: string): Promise<boolean> {
    const friendship = await FriendshipModel.findOne({
      where: {
        [Op.or]: [
          { user1Id: userId1, user2Id: userId2 },
          { user1Id: userId2, user2Id: userId1 },
        ],
      },
    });

    return !!friendship;
  }

  /**
   * Get friend count for a user
   */
  static async getFriendCount(userId: string): Promise<number> {
    return await FriendshipModel.count({
      where: {
        [Op.or]: [{ user1Id: userId }, { user2Id: userId }],
      },
    });
  }
}

export default FriendService;
