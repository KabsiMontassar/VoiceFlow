/**
 * Enhanced Presence Service - User Activity and Status Management
 * Handles active/inactive/away status based on authentication state
 */

import { Server as SocketServer, Socket } from 'socket.io';
import { redisService } from './redis.service';
import { UserPresenceStatus, UserPresence } from '../../../shared/src/types';
import logger from '../utils/logger';

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
 * Enhanced Presence Management System with Authentication-based Status
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
  private typingCleanupInterval: NodeJS.Timeout | null = null;
  private presenceHeartbeatInterval: NodeJS.Timeout | null = null;

  // Configuration
  private readonly TYPING_TIMEOUT = 3000; // 3 seconds
  private readonly PRESENCE_HEARTBEAT_INTERVAL = 45000; // 45 seconds - refresh Redis TTL before expiry

  constructor() {
    this.startCleanupIntervals();
    this.startPresenceHeartbeat();
  }

  /**
   * Initialize presence service with Socket.IO server
   */
  public initialize(io: SocketServer): void {
    this.io = io;
    logger.info('Enhanced presence service initialized');
  }

  /**
   * Handle user connection with authentication-based status
   */
  public async handleUserConnect(socket: Socket, userId: string, sessionId?: string): Promise<void> {
    try {
      const socketId = socket.id;
      
      // Update socket mappings
      const isFirstConnection = !this.userSockets.has(userId);
      
      if (!this.userSockets.has(userId)) {
        this.userSockets.set(userId, new Set());
      }
      this.userSockets.get(userId)!.add(socketId);
      this.socketUsers.set(socketId, userId);

      // Create or update presence cache (for room tracking, not global status)
      const presence: UserPresence = {
        userId,
        status: UserPresenceStatus.ACTIVE, // This is just cache, real status is in Redis
        lastSeen: new Date(),
        currentRoom: undefined
      };

      this.presenceCache.set(userId, presence);
      
      // CRITICAL FIX: Always update Redis with ACTIVE status on socket connection
      // This ensures Redis reflects the current connection state
      await redisService.setUserPresence(userId, UserPresenceStatus.ACTIVE);

      // Only broadcast status change on first connection (not for reconnects)
      if (isFirstConnection) {
        // Notify other users about active status
        this.broadcastPresenceUpdate(userId, UserPresenceStatus.ACTIVE);
        logger.info(`User ${userId} came online (first connection)`);
      } else {
        logger.debug(`User ${userId} reconnected (additional socket)`);
      }

      // Send offline messages if any
      await this.deliverOfflineMessages(userId);

      logger.debug(`User ${userId} connected with socket ${socketId} - status: ${presence.status}`);
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
          
          // CRITICAL FIX: When last socket disconnects, mark user as INACTIVE in Redis
          // This ensures proper offline status tracking
          await redisService.setUserPresence(userId, UserPresenceStatus.INACTIVE);
          
          // Broadcast offline status to other users
          this.broadcastPresenceUpdate(userId, UserPresenceStatus.INACTIVE);
          
          // Remove from presence cache
          this.presenceCache.delete(userId);
          
          logger.info(`User ${userId} went offline (all sockets disconnected)`);
        } else {
          logger.debug(`User ${userId} still has ${userSocketSet.size} active socket(s)`);
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

      // Get global status from Redis (authentication-based)
      const redisPresence = await redisService.getUserPresence(userId);
      const globalStatus = redisPresence?.status || UserPresenceStatus.INACTIVE;
      
      // Update or create presence cache with current room
      let presence = this.presenceCache.get(userId);
      
      if (presence) {
        presence.currentRoom = roomId;
        presence.lastSeen = new Date();
        presence.status = globalStatus as UserPresenceStatus; // Use global status from Redis
        this.presenceCache.set(userId, presence);
      } else {
        // Create new presence if it doesn't exist
        const newPresence: UserPresence = {
          userId,
          status: globalStatus as UserPresenceStatus,
          lastSeen: new Date(),
          currentRoom: roomId
        };
        this.presenceCache.set(userId, newPresence);
      }
      
      // Update current room in Redis (but don't change global status)
      await redisService.setUserPresence(userId, globalStatus, roomId);

      // Broadcast presence update to the room
      this.broadcastPresenceUpdate(userId, globalStatus);

      logger.debug(`User ${userId} joined room ${roomId}, global status: ${globalStatus}`);
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
   * Set user status (active, inactive, away)
   * NOTE: This is now ONLY used for socket-based presence updates
   * Global status is managed by auth service in Redis
   * @deprecated Use auth service for global status changes
   */
  public async setUserStatus(userId: string, status: UserPresenceStatus): Promise<void> {
    try {
      // Only update local cache, not Redis (Redis is managed by auth service)
      const presence = this.presenceCache.get(userId);
      
      if (presence) {
        presence.status = status;
        presence.lastSeen = new Date();
        this.presenceCache.set(userId, presence);
      }

      // Broadcast status change to rooms (local event only)
      this.broadcastPresenceUpdate(userId, status);

      logger.debug(`User ${userId} local presence status changed to ${status}`);
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

      // Load all users from database at once for performance
      const { UserModel } = await import('../models');
      const dbUsers = await UserModel.findAll({
        where: { id: Array.from(userIds) },
        attributes: ['id', 'username', 'email', 'avatarUrl']
      });
      
      const userMap = new Map(dbUsers.map(u => [u.id, u]));

      for (const userId of userIds) {
        // Always get global status from Redis (authentication-based)
        const redisPresence = await redisService.getUserPresence(userId);
        const globalStatus = redisPresence?.status || UserPresenceStatus.INACTIVE;
        
        // Get user details from database
        const dbUser = userMap.get(userId);
        
        // Get room presence from cache (for room tracking)
        let presence = this.presenceCache.get(userId);
        
        if (!presence) {
          const userSockets = this.userSockets.get(userId);
          presence = {
            userId,
            username: dbUser?.username || userId,
            email: dbUser?.email || '',
            avatarUrl: dbUser?.avatarUrl || null,
            status: globalStatus as UserPresenceStatus, // Use global status from Redis
            lastSeen: redisPresence?.lastSeen ? new Date(redisPresence.lastSeen) : new Date(),
            currentRoom: roomId
          };
          this.presenceCache.set(userId, presence);
        } else {
          // Update cached presence with global status from Redis and user details
          presence.status = globalStatus as UserPresenceStatus;
          presence.username = dbUser?.username || presence.username || userId;
          presence.email = dbUser?.email || presence.email || '';
          presence.avatarUrl = dbUser?.avatarUrl || presence.avatarUrl || null;
          presence.lastSeen = redisPresence?.lastSeen ? new Date(redisPresence.lastSeen) : presence.lastSeen;
        }
        
        users.push(presence);
        if (presence.status === UserPresenceStatus.ACTIVE) {
          activeUsers++;
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
      // Always get global status from Redis (authentication-based)
      const redisPresence = await redisService.getUserPresence(userId);
      
      if (redisPresence) {
        // Return presence with global status from Redis
        const presence: UserPresence = {
          userId,
          status: redisPresence.status as UserPresenceStatus,
          lastSeen: new Date(redisPresence.lastSeen),
          currentRoom: redisPresence.roomId
        };
        
        // Update cache for performance
        this.presenceCache.set(userId, presence);
        
        return presence;
      }
      
      // Fallback to cache if Redis fails
      const cachedPresence = this.presenceCache.get(userId);
      return cachedPresence || null;
      
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
   * Note: This is now only called for room presence changes, not global status
   */
  private broadcastPresenceUpdate(userId: string, status: string): void {
    if (!this.io) return;

    const userRoomSet = this.userRooms.get(userId);
    if (userRoomSet) {
      for (const roomId of userRoomSet) {
        // Broadcast presence update (room-level presence only)
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
    // Cleanup typing timeouts only (presence cleanup removed - now handled by Redis TTL)
    this.typingCleanupInterval = setInterval(() => {
      this.cleanupTypingTimeouts();
    }, this.TYPING_TIMEOUT);

    logger.info('Typing cleanup interval started');
  }

  /**
   * Start presence heartbeat to keep Redis presence alive
   * This prevents presence from expiring due to Redis TTL
   */
  private startPresenceHeartbeat(): void {
    this.presenceHeartbeatInterval = setInterval(async () => {
      try {
        // Refresh presence in Redis for all connected users
        for (const userId of this.userSockets.keys()) {
          const presence = this.presenceCache.get(userId);
          if (presence) {
            // Refresh Redis TTL by updating presence
            await redisService.setUserPresence(
              userId,
              presence.status,
              presence.currentRoom
            );
          }
        }
        
        logger.debug(`Refreshed presence for ${this.userSockets.size} connected users`);
      } catch (error) {
        logger.error('Presence heartbeat error:', error);
      }
    }, this.PRESENCE_HEARTBEAT_INTERVAL);

    logger.info('Presence heartbeat started');
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
   * Get presence statistics
   */
  public getPresenceStats(): {
    totalUsers: number;
    activeUsers: number;
    awayUsers: number;
    inactiveUsers: number;
    totalRooms: number;
    activeRooms: number;
  } {
    let activeUsers = 0;
    let awayUsers = 0;
    let inactiveUsers = 0;

    for (const presence of this.presenceCache.values()) {
      switch (presence.status) {
        case UserPresenceStatus.ACTIVE:
          activeUsers++;
          break;
        case UserPresenceStatus.AWAY:
          awayUsers++;
          break;
        case UserPresenceStatus.INACTIVE:
          inactiveUsers++;
          break;
      }
    }

    const activeRooms = Array.from(this.roomUsers.values())
      .filter(users => users.size > 0).length;

    return {
      totalUsers: this.presenceCache.size,
      activeUsers,
      awayUsers,
      inactiveUsers,
      totalRooms: this.roomUsers.size,
      activeRooms
    };
  }

  /**
   * Cleanup resources
   */
  public cleanup(): void {
    if (this.typingCleanupInterval) {
      clearInterval(this.typingCleanupInterval);
    }

    if (this.presenceHeartbeatInterval) {
      clearInterval(this.presenceHeartbeatInterval);
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