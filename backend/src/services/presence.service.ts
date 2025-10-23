/**
 * Presence Service - User Activity and Status Management
 * Handles online/offline/away status, room presence, and activity tracking
 */

import { Server as SocketServer, Socket } from 'socket.io';
import { redisService } from './redis.service';
import logger from '../utils/logger';

export interface UserPresence {
  userId: string;
  status: 'online' | 'away' | 'offline';
  lastSeen: Date;
  currentRoom?: string;
  socketId?: string;
  userAgent?: string;
  ipAddress?: string;
}

export interface RoomPresence {
  roomId: string;
  users: UserPresence[];
  lastActivity: Date;
  activeUsers: number;
}

export interface TypingStatus {
  userId: string;
  roomId: string;
  isTyping: boolean;
  timestamp: Date;
}

/**
 * Advanced Presence Management System
 */
export class PresenceService {
  private io: SocketServer | null = null;
  private userSockets = new Map<string, Set<string>>(); // userId -> Set of socketIds
  private socketUsers = new Map<string, string>(); // socketId -> userId
  private roomUsers = new Map<string, Set<string>>(); // roomId -> Set of userIds
  private userRooms = new Map<string, Set<string>>(); // userId -> Set of roomIds
  private typingUsers = new Map<string, Map<string, Date>>(); // roomId -> Map<userId, timestamp>
  private presenceCache = new Map<string, UserPresence>();
  
  // Cleanup intervals
  private presenceCleanupInterval: NodeJS.Timeout | null = null;
  private typingCleanupInterval: NodeJS.Timeout | null = null;
  private heartbeatInterval: NodeJS.Timeout | null = null;

  // Configuration
  private readonly TYPING_TIMEOUT = 3000; // 3 seconds
  private readonly PRESENCE_CLEANUP_INTERVAL = 30000; // 30 seconds
  private readonly HEARTBEAT_INTERVAL = 60000; // 1 minute
  private readonly AWAY_TIMEOUT = 300000; // 5 minutes
  private readonly OFFLINE_TIMEOUT = 600000; // 10 minutes

  constructor() {
    this.startCleanupIntervals();
  }

  /**
   * Initialize presence service with Socket.IO server
   */
  public initialize(io: SocketServer): void {
    this.io = io;
    logger.info('Presence service initialized');
  }

  /**
   * Handle user connection
   */
  public async handleUserConnect(socket: Socket, userId: string): Promise<void> {
    try {
      const socketId = socket.id;
      
      // Update socket mappings
      if (!this.userSockets.has(userId)) {
        this.userSockets.set(userId, new Set());
      }
      this.userSockets.get(userId)!.add(socketId);
      this.socketUsers.set(socketId, userId);

      // Create or update presence
      const presence: UserPresence = {
        userId,
        status: 'online',
        lastSeen: new Date(),
        socketId,
        userAgent: socket.handshake.headers['user-agent'],
        ipAddress: socket.handshake.address
      };

      this.presenceCache.set(userId, presence);
      
      // Store in Redis for persistence across instances
      await redisService.setUserPresence(userId, 'online');

      // Notify other users about online status
      this.broadcastPresenceUpdate(userId, 'online');

      // Send offline messages if any
      await this.deliverOfflineMessages(userId);

      logger.debug(`User ${userId} connected with socket ${socketId}`);
    } catch (error) {
      logger.error('Handle user connect error:', error);
    }
  }

  /**
   * Handle user disconnection
   */
  public async handleUserDisconnect(socket: Socket): Promise<void> {
    try {
      const socketId = socket.id;
      const userId = this.socketUsers.get(socketId);

      if (!userId) return;

      // Remove socket mappings
      this.socketUsers.delete(socketId);
      const userSocketSet = this.userSockets.get(userId);
      if (userSocketSet) {
        userSocketSet.delete(socketId);
        if (userSocketSet.size === 0) {
          this.userSockets.delete(userId);
          // User is completely offline
          await this.setUserStatus(userId, 'offline');
        }
      }

      // Remove from all rooms
      const userRoomSet = this.userRooms.get(userId);
      if (userRoomSet) {
        for (const roomId of userRoomSet) {
          await this.handleUserLeaveRoom(userId, roomId);
        }
      }

      // Clear typing status
      this.clearUserTyping(userId);

      logger.debug(`User ${userId} disconnected (socket ${socketId})`);
    } catch (error) {
      logger.error('Handle user disconnect error:', error);
    }
  }

  /**
   * Handle user joining a room
   */
  public async handleUserJoinRoom(userId: string, roomId: string): Promise<void> {
    try {
      // Update room mappings
      if (!this.roomUsers.has(roomId)) {
        this.roomUsers.set(roomId, new Set());
      }
      this.roomUsers.get(roomId)!.add(userId);

      if (!this.userRooms.has(userId)) {
        this.userRooms.set(userId, new Set());
      }
      this.userRooms.get(userId)!.add(roomId);

      // Update presence with current room
      const presence = this.presenceCache.get(userId);
      if (presence) {
        presence.currentRoom = roomId;
        presence.lastSeen = new Date();
        this.presenceCache.set(userId, presence);
        
        await redisService.setUserPresence(userId, presence.status, roomId);
      }

      // Notify room about user join
      await this.broadcastRoomPresenceUpdate(roomId);

      logger.debug(`User ${userId} joined room ${roomId}`);
    } catch (error) {
      logger.error('Handle user join room error:', error);
    }
  }

  /**
   * Handle user leaving a room
   */
  public async handleUserLeaveRoom(userId: string, roomId: string): Promise<void> {
    try {
      // Remove from room mappings
      const roomUserSet = this.roomUsers.get(roomId);
      if (roomUserSet) {
        roomUserSet.delete(userId);
        if (roomUserSet.size === 0) {
          this.roomUsers.delete(roomId);
        }
      }

      const userRoomSet = this.userRooms.get(userId);
      if (userRoomSet) {
        userRoomSet.delete(roomId);
        if (userRoomSet.size === 0) {
          this.userRooms.delete(userId);
        }
      }

      // Update presence
      const presence = this.presenceCache.get(userId);
      if (presence && presence.currentRoom === roomId) {
        presence.currentRoom = undefined;
        presence.lastSeen = new Date();
        this.presenceCache.set(userId, presence);
        
        await redisService.setUserPresence(userId, presence.status);
      }

      // Clear typing status in this room
      this.clearUserTypingInRoom(userId, roomId);

      // Notify room about user leave
      await this.broadcastRoomPresenceUpdate(roomId);

      logger.debug(`User ${userId} left room ${roomId}`);
    } catch (error) {
      logger.error('Handle user leave room error:', error);
    }
  }

  /**
   * Set user status (online, away, offline)
   */
  public async setUserStatus(userId: string, status: 'online' | 'away' | 'offline'): Promise<void> {
    try {
      const presence = this.presenceCache.get(userId) || {
        userId,
        status: 'offline',
        lastSeen: new Date()
      };

      presence.status = status;
      presence.lastSeen = new Date();
      this.presenceCache.set(userId, presence);

      // Update Redis
      await redisService.setUserPresence(userId, status, presence.currentRoom);

      // Broadcast status change
      this.broadcastPresenceUpdate(userId, status);

      logger.debug(`User ${userId} status changed to ${status}`);
    } catch (error) {
      logger.error('Set user status error:', error);
    }
  }

  /**
   * Handle typing start
   */
  public async handleTypingStart(userId: string, roomId: string): Promise<void> {
    try {
      if (!this.typingUsers.has(roomId)) {
        this.typingUsers.set(roomId, new Map());
      }
      
      const roomTyping = this.typingUsers.get(roomId)!;
      const wasTyping = roomTyping.has(userId);
      
      roomTyping.set(userId, new Date());

      // Only broadcast if user wasn't already typing
      if (!wasTyping && this.io) {
        // Get user information for typing display
        try {
          const { UserModel } = await import('../models');
          const user = await UserModel.findByPk(userId, {
            attributes: ['id', 'username', 'email']
          });

          this.io.to(roomId).emit('user_typing', {
            userId,
            roomId,
            isTyping: true,
            timestamp: new Date(),
            user: user ? {
              id: user.id,
              username: user.username,
              email: user.email
            } : null
          });
        } catch (dbError) {
          // Fallback if user fetch fails
          this.io.to(roomId).emit('user_typing', {
            userId,
            roomId,
            isTyping: true,
            timestamp: new Date(),
            user: null
          });
        }
      }

      logger.debug(`User ${userId} started typing in room ${roomId}`);
    } catch (error) {
      logger.error('Handle typing start error:', error);
    }
  }

  /**
   * Handle typing stop
   */
  public async handleTypingStop(userId: string, roomId: string): Promise<void> {
    try {
      const roomTyping = this.typingUsers.get(roomId);
      if (roomTyping && roomTyping.has(userId)) {
        roomTyping.delete(userId);

        if (this.io) {
          // Get user information for typing display
          try {
            const { UserModel } = await import('../models');
            const user = await UserModel.findByPk(userId, {
              attributes: ['id', 'username', 'email']
            });

            this.io.to(roomId).emit('user_typing', {
              userId,
              roomId,
              isTyping: false,
              timestamp: new Date(),
              user: user ? {
                id: user.id,
                username: user.username,
                email: user.email
              } : null
            });
          } catch (dbError) {
            // Fallback if user fetch fails
            this.io.to(roomId).emit('user_typing', {
              userId,
              roomId,
              isTyping: false,
              timestamp: new Date(),
              user: null
            });
          }
        }

        logger.debug(`User ${userId} stopped typing in room ${roomId}`);
      }
    } catch (error) {
      logger.error('Handle typing stop error:', error);
    }
  }

  /**
   * Get room presence information
   */
  public async getRoomPresence(roomId: string): Promise<RoomPresence> {
    try {
      const userIds = this.roomUsers.get(roomId) || new Set();
      const users: UserPresence[] = [];
      let activeUsers = 0;

      for (const userId of userIds) {
        const presence = this.presenceCache.get(userId);
        if (presence) {
          users.push(presence);
          if (presence.status === 'online') {
            activeUsers++;
          }
        }
      }

      return {
        roomId,
        users,
        lastActivity: new Date(),
        activeUsers
      };
    } catch (error) {
      logger.error('Get room presence error:', error);
      return {
        roomId,
        users: [],
        lastActivity: new Date(),
        activeUsers: 0
      };
    }
  }

  /**
   * Get user presence
   */
  public async getUserPresence(userId: string): Promise<UserPresence | null> {
    try {
      // Try cache first
      let presence = this.presenceCache.get(userId);
      
      if (!presence) {
        // Try Redis
        const redisPresence = await redisService.getUserPresence(userId);
        if (redisPresence) {
          presence = {
            userId,
            status: redisPresence.status as 'online' | 'away' | 'offline',
            lastSeen: new Date(redisPresence.lastSeen),
            currentRoom: redisPresence.roomId
          };
          this.presenceCache.set(userId, presence);
        }
      }

      return presence || null;
    } catch (error) {
      logger.error('Get user presence error:', error);
      return null;
    }
  }

  /**
   * Get typing users in room
   */
  public getTypingUsers(roomId: string): TypingStatus[] {
    const roomTyping = this.typingUsers.get(roomId);
    if (!roomTyping) return [];

    const now = new Date();
    const typingStatuses: TypingStatus[] = [];

    for (const [userId, timestamp] of roomTyping.entries()) {
      if (now.getTime() - timestamp.getTime() < this.TYPING_TIMEOUT) {
        typingStatuses.push({
          userId,
          roomId,
          isTyping: true,
          timestamp
        });
      }
    }

    return typingStatuses;
  }

  /**
   * Broadcast presence update to relevant users
   */
  private broadcastPresenceUpdate(userId: string, status: string): void {
    if (!this.io) return;

    const userRoomSet = this.userRooms.get(userId);
    if (userRoomSet) {
      for (const roomId of userRoomSet) {
        this.io.to(roomId).emit('presence_update', {
          userId,
          status,
          timestamp: new Date()
        });
      }
    }
  }

  /**
   * Broadcast room presence update
   */
  private async broadcastRoomPresenceUpdate(roomId: string): Promise<void> {
    if (!this.io) return;

    try {
      const roomPresence = await this.getRoomPresence(roomId);
      this.io.to(roomId).emit('room_presence_update', roomPresence);
    } catch (error) {
      logger.error('Broadcast room presence update error:', error);
    }
  }

  /**
   * Clear user typing status
   */
  private clearUserTyping(userId: string): void {
    for (const [roomId, roomTyping] of this.typingUsers.entries()) {
      if (roomTyping.has(userId)) {
        roomTyping.delete(userId);
        if (this.io) {
          this.io.to(roomId).emit('user_typing', {
            userId,
            roomId,
            isTyping: false,
            timestamp: new Date()
          });
        }
      }
    }
  }

  /**
   * Clear user typing status in specific room
   */
  private clearUserTypingInRoom(userId: string, roomId: string): void {
    const roomTyping = this.typingUsers.get(roomId);
    if (roomTyping && roomTyping.has(userId)) {
      roomTyping.delete(userId);
      if (this.io) {
        this.io.to(roomId).emit('user_typing', {
          userId,
          roomId,
          isTyping: false,
          timestamp: new Date()
        });
      }
    }
  }

  /**
   * Deliver offline messages to user
   */
  private async deliverOfflineMessages(userId: string): Promise<void> {
    try {
      const offlineMessages = await redisService.getOfflineMessages(userId);
      if (offlineMessages.length > 0 && this.io) {
        const userSockets = this.userSockets.get(userId);
        if (userSockets) {
          for (const socketId of userSockets) {
            this.io.to(socketId).emit('offline_messages', offlineMessages);
          }
        }
        logger.info(`Delivered ${offlineMessages.length} offline messages to user ${userId}`);
      }
    } catch (error) {
      logger.error('Deliver offline messages error:', error);
    }
  }

  /**
   * Start cleanup intervals
   */
  private startCleanupIntervals(): void {
    // Cleanup stale presence data
    this.presenceCleanupInterval = setInterval(() => {
      this.cleanupStalePresence();
    }, this.PRESENCE_CLEANUP_INTERVAL);

    // Cleanup typing timeouts
    this.typingCleanupInterval = setInterval(() => {
      this.cleanupTypingTimeouts();
    }, this.TYPING_TIMEOUT);

    // Heartbeat for away/offline detection
    this.heartbeatInterval = setInterval(() => {
      this.updateUserActivity();
    }, this.HEARTBEAT_INTERVAL);

    logger.info('Presence cleanup intervals started');
  }

  /**
   * Cleanup stale presence data
   */
  private cleanupStalePresence(): void {
    const now = new Date();
    
    for (const [userId, presence] of this.presenceCache.entries()) {
      const timeDiff = now.getTime() - presence.lastSeen.getTime();
      
      // Check if user should be marked as away or offline
      if (presence.status === 'online' && timeDiff > this.AWAY_TIMEOUT) {
        this.setUserStatus(userId, 'away');
      } else if (presence.status !== 'offline' && timeDiff > this.OFFLINE_TIMEOUT) {
        this.setUserStatus(userId, 'offline');
      }
    }
  }

  /**
   * Cleanup typing timeouts
   */
  private cleanupTypingTimeouts(): void {
    const now = new Date();
    
    for (const [roomId, roomTyping] of this.typingUsers.entries()) {
      const expiredUsers: string[] = [];
      
      for (const [userId, timestamp] of roomTyping.entries()) {
        if (now.getTime() - timestamp.getTime() > this.TYPING_TIMEOUT) {
          expiredUsers.push(userId);
        }
      }
      
      // Remove expired typing users
      for (const userId of expiredUsers) {
        this.handleTypingStop(userId, roomId);
      }
    }
  }

  /**
   * Update user activity for heartbeat
   */
  private updateUserActivity(): void {
    for (const [userId, socketSet] of this.userSockets.entries()) {
      if (socketSet.size > 0) {
        const presence = this.presenceCache.get(userId);
        if (presence && presence.status === 'online') {
          presence.lastSeen = new Date();
          this.presenceCache.set(userId, presence);
        }
      }
    }
  }

  /**
   * Get presence statistics
   */
  public getPresenceStats(): {
    totalUsers: number;
    onlineUsers: number;
    awayUsers: number;
    offlineUsers: number;
    totalRooms: number;
    activeRooms: number;
  } {
    let onlineUsers = 0;
    let awayUsers = 0;
    let offlineUsers = 0;

    for (const presence of this.presenceCache.values()) {
      switch (presence.status) {
        case 'online':
          onlineUsers++;
          break;
        case 'away':
          awayUsers++;
          break;
        case 'offline':
          offlineUsers++;
          break;
      }
    }

    const activeRooms = Array.from(this.roomUsers.values())
      .filter(users => users.size > 0).length;

    return {
      totalUsers: this.presenceCache.size,
      onlineUsers,
      awayUsers,
      offlineUsers,
      totalRooms: this.roomUsers.size,
      activeRooms
    };
  }

  /**
   * Cleanup resources
   */
  public cleanup(): void {
    if (this.presenceCleanupInterval) {
      clearInterval(this.presenceCleanupInterval);
    }
    if (this.typingCleanupInterval) {
      clearInterval(this.typingCleanupInterval);
    }
    if (this.heartbeatInterval) {
      clearInterval(this.heartbeatInterval);
    }

    this.userSockets.clear();
    this.socketUsers.clear();
    this.roomUsers.clear();
    this.userRooms.clear();
    this.typingUsers.clear();
    this.presenceCache.clear();

    logger.info('Presence service cleaned up');
  }
}

// Export singleton instance
export const presenceService = new PresenceService();
export default presenceService;