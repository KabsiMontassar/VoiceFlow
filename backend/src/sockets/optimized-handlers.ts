/**
 * Optimized Socket Handlers - High Performance Real-time Communication
 * Addresses all performance bottlenecks: rate limiting, memory leaks, debouncing, caching
 */

import { Server as SocketServer, Socket } from 'socket.io';
import jwt from 'jsonwebtoken';
import { messageService } from '../services/message.service';
import { presenceService } from '../services/presence.service';
import { redisService } from '../services/redis.service';
import { FriendService } from '../services/friend.service';
import { UserService } from '../services/user.service';
import logger from '../utils/logger';

interface AuthenticatedSocket extends Socket {
  userId?: string;
  sessionId?: string;
  user?: any;
}

interface RateLimitedSocket extends AuthenticatedSocket {
  rateLimitInfo?: {
    messages: number;
    typing: number;
    lastReset: number;
  };
}

interface TypingDebounceInfo {
  timeout: NodeJS.Timeout;
  isTyping: boolean;
}

/**
 * Performance-Optimized Socket Handler
 */
export class OptimizedSocketHandlers {
  private io: SocketServer;
  private typingDebounceMap = new Map<string, TypingDebounceInfo>();
  private connectionPool = new Map<string, Set<string>>(); // userId -> socketIds
  private roomPresenceHeartbeatIntervals = new Map<string, NodeJS.Timeout>(); // roomId -> interval
  private lastBroadcastedPresence = new Map<string, string>(); // roomId -> JSON stringified presence for change detection
  
  // Rate limiting configuration
  private readonly RATE_LIMITS = {
    messages: { max: 30, window: 60000 },  // 30 messages per minute
    typing: { max: 60, window: 60000 },    // 60 typing events per minute
    join: { max: 20, window: 60000 },      // 20 room joins per minute (increased for page refreshes)
    connect: { max: 5, window: 60000 }     // 5 socket connections per minute (for page refreshes)
  };

  // Debounce configuration
  private readonly TYPING_DEBOUNCE_DELAY = 1000; // 1 second
  private readonly TYPING_STOP_DELAY = 3000;     // 3 seconds
  
  // Presence heartbeat configuration - balanced for real-time feel without rate limit issues
  private readonly PRESENCE_HEARTBEAT_INTERVAL = 10000; // 10 seconds (was 2 seconds)

  constructor(io: SocketServer) {
    this.io = io;
    this.setupSocketHandlers();
    this.setupPerformanceMonitoring();
  }

  /**
   * Setup main socket event handlers with optimizations
   */
  private setupSocketHandlers(): void {
    this.io.use(this.authenticationMiddleware.bind(this));
    this.io.use(this.rateLimitMiddleware.bind(this));

    this.io.on('connection', (socket: RateLimitedSocket) => {
      this.handleConnection(socket);
    });
  }

  /**
   * Authentication middleware with JWT validation and session tracking
   */
  private async authenticationMiddleware(socket: AuthenticatedSocket, next: Function): Promise<void> {
    try {
      const token = socket.handshake.auth.token || socket.handshake.headers.authorization?.replace('Bearer ', '');
      
      logger.debug('Socket authentication attempt:', {
        hasToken: !!token,
        tokenPreview: token ? `${token.substring(0, 20)}...` : 'none',
        authData: socket.handshake.auth,
        headers: socket.handshake.headers.authorization
      });
      
      if (!token) {
        logger.error('Authentication token missing');
        return next(new Error('Authentication token required'));
      }

      try {
        const { jwtService } = await import('../utils/jwt');
        const decoded = await jwtService.verifyAccessToken(token);
        
        logger.debug('JWT decoded successfully:', {
          userId: decoded.userId,
          username: decoded.username,
          email: decoded.email,
          sessionId: decoded.sessionId
        });
        
        socket.userId = decoded.userId;
        socket.sessionId = decoded.sessionId;
        socket.user = {
          id: decoded.userId,
          userId: decoded.userId,
          email: decoded.email,
          username: decoded.username,
          sessionId: decoded.sessionId
        };
        
        if (!socket.userId) {
          logger.error('User ID not found in JWT token:', decoded);
          return next(new Error('Invalid token: missing user ID'));
        }
        
        logger.debug(`Socket authenticated successfully for user ${socket.userId} with session ${socket.sessionId}`);
        next();
      } catch (error: any) {
        logger.error('JWT verification failed:', error.message);
        
        if (error.message.includes('expired')) {
          return next(new Error('Access token expired - please refresh'));
        } else if (error.message.includes('Session not found')) {
          return next(new Error('Session expired - please login again'));
        } else {
          return next(new Error('Invalid authentication token'));
        }
      }
    } catch (error) {
      logger.error('Socket authentication failed:', error);
      next(new Error('Authentication error'));
    }
  }

  /**
   * Rate limiting middleware with Redis-backed sliding window
   */
  private async rateLimitMiddleware(socket: RateLimitedSocket, next: Function): Promise<void> {
    try {
      if (!socket.userId) {
        logger.error('Rate limit middleware: socket.userId is undefined. Authentication may have failed.');
        return next(new Error('Authentication required before rate limiting'));
      }

      const userId = socket.userId;
      const socketId = socket.id;

      logger.debug('Rate limiting middleware:', {
        userId,
        socketId,
        hasUserId: !!userId
      });

      // Initialize rate limit info
      socket.rateLimitInfo = {
        messages: 0,
        typing: 0,
        lastReset: Date.now()
      };

      // Check connection rate limiting
      const connectRateLimit = await redisService.checkRateLimit(
        `connect:${userId}`,
        this.RATE_LIMITS.connect.max,
        this.RATE_LIMITS.connect.window / 1000
      );

      if (!connectRateLimit.allowed) {
        logger.warn(`Connection rate limit exceeded for user ${userId}`);
        return next(new Error('Connection rate limit exceeded'));
      }

      logger.debug(`Socket rate limit initialized for user ${userId}`);
      next();
    } catch (error) {
      logger.error('Rate limit middleware error:', error);
      next(error);
    }
  }

  /**
   * Handle new socket connection with connection pooling
   */
  private async handleConnection(socket: RateLimitedSocket): Promise<void> {
    const userId = socket.userId!;
    const socketId = socket.id;

    try {
      // Add to connection pool
      if (!this.connectionPool.has(userId)) {
        this.connectionPool.set(userId, new Set());
      }
      this.connectionPool.get(userId)!.add(socketId);

      // Initialize presence
      await presenceService.handleUserConnect(socket, userId, socket.sessionId);

      // Setup socket event handlers
      this.setupSocketEvents(socket);

      // Setup connection monitoring
      this.setupConnectionMonitoring(socket);

      logger.info(`User ${userId} connected with socket ${socketId} (Total connections: ${this.connectionPool.get(userId)?.size})`);

    } catch (error) {
      logger.error('Handle connection error:', error);
      socket.disconnect(true);
    }
  }

  /**
   * Setup individual socket event handlers
   */
  private setupSocketEvents(socket: RateLimitedSocket): void {
    const userId = socket.userId!;

    // Message handling with rate limiting
    socket.on('send_message', async (data) => {
      await this.handleSendMessage(socket, data);
    });

    // Room management
    socket.on('join_room', async (data) => {
      await this.handleJoinRoom(socket, data);
    });

    socket.on('leave_room', async (data) => {
      await this.handleLeaveRoom(socket, data);
    });

    // Typing indicators with debouncing
    socket.on('typing_start', async (data) => {
      await this.handleTypingStart(socket, data);
    });

    socket.on('typing_stop', async (data) => {
      await this.handleTypingStop(socket, data);
    });

    // Presence management
    // Note: User status (active/inactive) is now managed by auth service
    // Only room presence queries are handled here
    socket.on('get_room_presence', async (data) => {
      await this.handleGetRoomPresence(socket, data);
    });

    // WebRTC signaling (optimized)
    socket.on('webrtc_signal', async (data) => {
      await this.handleWebRTCSignal(socket, data);
    });

    // Heartbeat for connection health
    socket.on('heartbeat', () => {
      socket.emit('heartbeat_ack', { timestamp: Date.now() });
    });

    // Friend system events
    socket.on('friend_request_sent', async (data) => {
      await this.handleFriendRequestSent(socket, data);
    });

    socket.on('friend_request_accepted', async (data) => {
      await this.handleFriendRequestAccepted(socket, data);
    });

    socket.on('friend_removed', async (data) => {
      await this.handleFriendRemoved(socket, data);
    });

    socket.on('friend_status_check', async (data) => {
      await this.handleFriendStatusCheck(socket, data);
    });

    // Direct messaging events
    socket.on('dm_sent', async (data) => {
      await this.handleDirectMessage(socket, data);
    });

    socket.on('dm_read', async (data) => {
      await this.handleDirectMessageRead(socket, data);
    });

    // Room moderation events
    socket.on('user_kicked', async (data) => {
      await this.handleUserKicked(socket, data);
    });

    socket.on('user_banned', async (data) => {
      await this.handleUserBanned(socket, data);
    });

    socket.on('user_unbanned', async (data) => {
      await this.handleUserUnbanned(socket, data);
    });

    // Disconnection handling
    socket.on('disconnect', async (reason) => {
      await this.handleDisconnection(socket, reason);
    });
  }

  /**
   * Handle message sending with comprehensive rate limiting
   */
  private async handleSendMessage(socket: RateLimitedSocket, data: any): Promise<void> {
    const userId = socket.userId!;

    try {
      logger.debug('Send message attempt:', {
        userId: userId,
        socketId: socket.id,
        hasUser: !!socket.user,
        userData: socket.user,
        messageData: data
      });

      // Rate limiting check
      const rateLimit = await redisService.checkRateLimit(
        `messages:${userId}`,
        this.RATE_LIMITS.messages.max,
        this.RATE_LIMITS.messages.window / 1000
      );

      if (!rateLimit.allowed) {
        socket.emit('rate_limit_exceeded', {
          type: 'messages',
          remaining: rateLimit.remaining,
          resetTime: rateLimit.resetTime
        });
        return;
      }

      // Validate message data
      if (!data.roomId || !data.content || typeof data.content !== 'string') {
        logger.error('Invalid message data:', data);
        socket.emit('error', { message: 'Invalid message data' });
        return;
      }

      // Content validation and sanitization
      const sanitizedContent = data.content.trim();
      if (sanitizedContent.length === 0 || sanitizedContent.length > 1000) {
        logger.error('Message content invalid:', { length: sanitizedContent.length });
        socket.emit('error', { message: 'Message content invalid' });
        return;
      }

      logger.debug('Calling messageService.sendMessage with:', {
        roomId: data.roomId,
        userId: userId,
        content: sanitizedContent,
        messageType: data.messageType || 'text'
      });

      // Create message via service
      const message = await messageService.sendMessage(
        data.roomId,
        userId,
        sanitizedContent,
        data.messageType || 'text'
      );

      logger.debug('Message created successfully:', message);

      // Prepare message with user info for broadcasting
      const messageWithUser = {
        ...message,
        user: socket.user
      };

      // Broadcast to ALL users in the room (including sender for consistency)
      this.io.to(data.roomId).emit('new_message', messageWithUser);

      // Also send confirmation to sender with tempId mapping
      socket.emit('message_sent', {
        tempId: data.tempId,
        message: messageWithUser
      });

      // Stop typing indicator
      await this.handleTypingStop(socket, { roomId: data.roomId });

      // Cache recent messages for faster retrieval
      await redisService.setCache(`recent_msg:${data.roomId}`, message, 3600);

      logger.debug(`Message sent successfully by user ${userId} to room ${data.roomId}`);

    } catch (error) {
      logger.error('Send message error:', error);
      socket.emit('error', { 
        message: 'Failed to send message', 
        details: error instanceof Error ? error.message : 'Unknown error'
      });
    }
  }

  /**
   * Handle room joining with optimization
   */
  private async handleJoinRoom(socket: RateLimitedSocket, data: any): Promise<void> {
    const userId = socket.userId!;

    try {
      const { roomId } = data;
      if (!roomId) {
        socket.emit('error', { message: 'Room ID required' });
        return;
      }

      // Rate limiting for room joins
      const rateLimit = await redisService.checkRateLimit(
        `join:${userId}`,
        this.RATE_LIMITS.join.max,
        this.RATE_LIMITS.join.window / 1000
      );

      if (!rateLimit.allowed) {
        socket.emit('rate_limit_exceeded', {
          type: 'join',
          remaining: rateLimit.remaining,
          resetTime: rateLimit.resetTime
        });
        return;
      }

      // Join socket room
      await socket.join(roomId);

      // Update presence
      await presenceService.handleUserJoinRoom(userId, roomId);

      // Get and cache room data
      let roomData = await redisService.getCache(`room:${roomId}`);
      if (!roomData) {
        // Fetch from database and cache
        roomData = await this.getRoomData(roomId);
        await redisService.setCache(`room:${roomId}`, roomData, 1800); // 30 minutes
      }

      // Send room data to user
      socket.emit('room_joined', {
        roomId,
        ...roomData
      });

      // Get recent messages from cache
      const recentMessages = await redisService.getCache(`messages:${roomId}`) || [];
      socket.emit('room_messages', recentMessages);

      // CRITICAL: Send current room presence to the newly joined user FIRST
      // This ensures the new user sees who's already online in the room
      const currentRoomPresence = await presenceService.getRoomPresence(roomId);
      socket.emit('room_presence', currentRoomPresence);

      // Notify OTHER users in the room about the new member
      socket.to(roomId).emit('user_joined_room', {
        userId,
        user: socket.user,
        timestamp: new Date()
      });

      // Broadcast updated room presence to ALL users in the room (including the new user)
      // Force broadcast on join since this is a significant change
      await this.broadcastRoomPresenceToAll(roomId, true);

      // Start presence heartbeat for this room if not already running
      this.startRoomPresenceHeartbeat(roomId);

      logger.debug(`User ${userId} joined room ${roomId}, broadcasted presence to all`);

      logger.debug(`User ${userId} joined room ${roomId}`);

    } catch (error) {
      logger.error('Join room error:', error);
      socket.emit('error', { message: 'Failed to join room' });
    }
  }

  /**
   * Handle room leaving
   */
  private async handleLeaveRoom(socket: RateLimitedSocket, data: any): Promise<void> {
    const userId = socket.userId!;

    try {
      const { roomId } = data;
      if (!roomId) return;

      // Leave socket room
      await socket.leave(roomId);

      // Update presence
      await presenceService.handleUserLeaveRoom(userId, roomId);

      // Notify room about member leaving
      socket.to(roomId).emit('user_left_room', {
        userId,
        user: socket.user,
        timestamp: new Date()
      });

      // Confirm to user
      socket.emit('room_left', { roomId });

      // Check if room is now empty and stop heartbeat if so
      const roomSockets = await this.io.in(roomId).fetchSockets();
      if (roomSockets.length === 0) {
        this.stopRoomPresenceHeartbeat(roomId);
        logger.debug(`Room ${roomId} is now empty, stopped presence heartbeat`);
      }

      logger.debug(`User ${userId} left room ${roomId}`);

    } catch (error) {
      logger.error('Leave room error:', error);
    }
  }

  /**
   * Handle typing start with debouncing
   */
  private async handleTypingStart(socket: RateLimitedSocket, data: any): Promise<void> {
    logger.debug('Typing start handler called:', {
      socketId: socket.id,
      userId: socket.userId,
      hasUserId: !!socket.userId,
      data: data,
      socketAuth: {
        hasUser: !!socket.user,
        userKeys: socket.user ? Object.keys(socket.user) : []
      }
    });

    const userId = socket.userId!;
    const { roomId } = data;

    if (!userId) {
      logger.error('Typing start: userId is undefined', {
        socketId: socket.id,
        socket: {
          userId: socket.userId,
          user: socket.user,
          rateLimitInfo: socket.rateLimitInfo
        }
      });
      return;
    }

    try {
      if (!roomId) {
        logger.warn('Typing start: roomId is missing', { userId, data });
        return;
      }

      // Rate limiting for typing events
      const rateLimit = await redisService.checkRateLimit(
        `typing:${userId}`,
        this.RATE_LIMITS.typing.max,
        this.RATE_LIMITS.typing.window / 1000
      );

      if (!rateLimit.allowed) return;

      const debounceKey = `${userId}:${roomId}`;
      const existingDebounce = this.typingDebounceMap.get(debounceKey);

      // Clear existing timeout
      if (existingDebounce) {
        clearTimeout(existingDebounce.timeout);
      }

      // Set typing status
      if (!existingDebounce?.isTyping) {
        await presenceService.handleTypingStart(userId, roomId);
      }

      // Set debounced stop timeout
      const timeout = setTimeout(async () => {
        await this.handleTypingStop(socket, { roomId });
        this.typingDebounceMap.delete(debounceKey);
      }, this.TYPING_STOP_DELAY);

      this.typingDebounceMap.set(debounceKey, {
        timeout,
        isTyping: true
      });

    } catch (error) {
      logger.error('Typing start error:', error);
    }
  }

  /**
   * Handle typing stop with debouncing
   */
  private async handleTypingStop(socket: RateLimitedSocket, data: any): Promise<void> {
    const userId = socket.userId!;
    const { roomId } = data;

    try {
      if (!roomId) return;

      const debounceKey = `${userId}:${roomId}`;
      const existingDebounce = this.typingDebounceMap.get(debounceKey);

      if (existingDebounce) {
        clearTimeout(existingDebounce.timeout);
        this.typingDebounceMap.delete(debounceKey);
      }

      await presenceService.handleTypingStop(userId, roomId);

    } catch (error) {
      logger.error('Typing stop error:', error);
    }
  }

  /**
   * Handle room presence requests
   */
  private async handleGetRoomPresence(socket: RateLimitedSocket, data: any): Promise<void> {
    try {
      const { roomId } = data;
      if (!roomId) return;

      const presence = await presenceService.getRoomPresence(roomId);
      socket.emit('room_presence', presence);

    } catch (error) {
      logger.error('Get room presence error:', error);
    }
  }

  /**
   * Handle WebRTC signaling with optimization
   */
  private async handleWebRTCSignal(socket: RateLimitedSocket, data: any): Promise<void> {
    try {
      const { targetUserId, roomId, signal } = data;
      if (!targetUserId || !roomId || !signal) return;

      // Find target user's sockets
      const targetSockets = this.connectionPool.get(targetUserId);
      if (targetSockets) {
        for (const targetSocketId of targetSockets) {
          this.io.to(targetSocketId).emit('webrtc_signal', {
            fromUserId: socket.userId,
            roomId,
            signal
          });
        }
      }

    } catch (error) {
      logger.error('WebRTC signal error:', error);
    }
  }

  /**
   * Handle socket disconnection with cleanup
   */
  private async handleDisconnection(socket: RateLimitedSocket, reason: string): Promise<void> {
    const userId = socket.userId!;
    const socketId = socket.id;

    try {
      // Remove from connection pool
      const userSockets = this.connectionPool.get(userId);
      if (userSockets) {
        userSockets.delete(socketId);
        if (userSockets.size === 0) {
          this.connectionPool.delete(userId);
          
          // User completely disconnected - notify friends
          await this.notifyFriendsOfStatusChange(userId, 'offline');
        }
      }

      // Clear typing debounce
      for (const [key, debounceInfo] of this.typingDebounceMap.entries()) {
        if (key.startsWith(`${userId}:`)) {
          clearTimeout(debounceInfo.timeout);
          this.typingDebounceMap.delete(key);
        }
      }

      // Handle presence disconnection
      await presenceService.handleUserDisconnect(socket);

      logger.info(`User ${userId} disconnected (${reason}). Remaining connections: ${userSockets?.size || 0}`);

    } catch (error) {
      logger.error('Disconnection handling error:', error);
    }
  }

  /**
   * Handle friend request sent - notify recipient
   */
  private async handleFriendRequestSent(socket: RateLimitedSocket, data: any): Promise<void> {
    try {
      const { recipientId, request } = data;
      if (!recipientId || !request) return;

      // Emit to all of recipient's active sockets
      const recipientSockets = this.connectionPool.get(recipientId);
      if (recipientSockets) {
        for (const socketId of recipientSockets) {
          this.io.to(socketId).emit('friend_request_received', {
            request,
            timestamp: new Date()
          });
        }
        logger.debug(`Notified user ${recipientId} of friend request from ${socket.userId}`);
      }
    } catch (error) {
      logger.error('Friend request sent handler error:', error);
    }
  }

  /**
   * Handle friend request accepted - notify both users
   */
  private async handleFriendRequestAccepted(socket: RateLimitedSocket, data: any): Promise<void> {
    try {
      const { requesterId, friendship, privateRoom } = data;
      if (!requesterId || !friendship) return;

      const userId = socket.userId!;

      // Notify requester
      const requesterSockets = this.connectionPool.get(requesterId);
      if (requesterSockets) {
        for (const socketId of requesterSockets) {
          this.io.to(socketId).emit('friend_request_accepted', {
            friendship,
            privateRoom,
            acceptedBy: userId,
            timestamp: new Date()
          });
        }
      }

      // Notify accepter (current user)
      socket.emit('friend_added', {
        friendship,
        privateRoom,
        timestamp: new Date()
      });

      logger.debug(`Friend request accepted between ${userId} and ${requesterId}`);
    } catch (error) {
      logger.error('Friend request accepted handler error:', error);
    }
  }

  /**
   * Handle friend removed - notify both users
   */
  private async handleFriendRemoved(socket: RateLimitedSocket, data: any): Promise<void> {
    try {
      const { friendId } = data;
      if (!friendId) return;

      const userId = socket.userId!;

      // Notify friend
      const friendSockets = this.connectionPool.get(friendId);
      if (friendSockets) {
        for (const socketId of friendSockets) {
          this.io.to(socketId).emit('friendship_ended', {
            removedBy: userId,
            timestamp: new Date()
          });
        }
      }

      logger.debug(`Friendship removed between ${userId} and ${friendId}`);
    } catch (error) {
      logger.error('Friend removed handler error:', error);
    }
  }

  /**
   * Handle friend status check - return online/offline status
   */
  private async handleFriendStatusCheck(socket: RateLimitedSocket, data: any): Promise<void> {
    try {
      const { friendIds } = data;
      if (!Array.isArray(friendIds)) return;

      const statuses = friendIds.map(friendId => ({
        userId: friendId,
        isOnline: this.connectionPool.has(friendId),
        lastSeen: null // Could fetch from database if needed
      }));

      socket.emit('friend_statuses', { statuses });
    } catch (error) {
      logger.error('Friend status check handler error:', error);
    }
  }

  /**
   * Handle direct message - send to recipient
   */
  private async handleDirectMessage(socket: RateLimitedSocket, data: any): Promise<void> {
    try {
      const { recipientId, message, conversationId } = data;
      if (!recipientId || !message) return;

      const senderId = socket.userId!;

      // Emit to all of recipient's active sockets
      const recipientSockets = this.connectionPool.get(recipientId);
      if (recipientSockets) {
        for (const socketId of recipientSockets) {
          this.io.to(socketId).emit('dm_received', {
            message,
            conversationId,
            senderId,
            timestamp: new Date()
          });
        }
      }

      // Confirm to sender
      socket.emit('dm_delivered', {
        messageId: message.id,
        delivered: recipientSockets && recipientSockets.size > 0,
        timestamp: new Date()
      });

      logger.debug(`Direct message from ${senderId} to ${recipientId}`);
    } catch (error) {
      logger.error('Direct message handler error:', error);
    }
  }

  /**
   * Handle direct message read - notify sender
   */
  private async handleDirectMessageRead(socket: RateLimitedSocket, data: any): Promise<void> {
    try {
      const { senderId, messageIds, conversationId } = data;
      if (!senderId || !messageIds) return;

      // Notify sender that messages were read
      const senderSockets = this.connectionPool.get(senderId);
      if (senderSockets) {
        for (const socketId of senderSockets) {
          this.io.to(socketId).emit('dm_read_receipt', {
            messageIds,
            conversationId,
            readBy: socket.userId,
            timestamp: new Date()
          });
        }
      }
    } catch (error) {
      logger.error('Direct message read handler error:', error);
    }
  }

  /**
   * Handle user kicked from room - notify kicked user
   */
  private async handleUserKicked(socket: RateLimitedSocket, data: any): Promise<void> {
    try {
      const { roomId, kickedUserId, reason } = data;
      if (!roomId || !kickedUserId) return;

      // Force kicked user to leave room
      const kickedSockets = this.connectionPool.get(kickedUserId);
      if (kickedSockets) {
        for (const socketId of kickedSockets) {
          const kickedSocket = this.io.sockets.sockets.get(socketId);
          if (kickedSocket) {
            await kickedSocket.leave(roomId);
            this.io.to(socketId).emit('kicked_from_room', {
              roomId,
              kickedBy: socket.userId,
              reason,
              timestamp: new Date()
            });
          }
        }
      }

      // Notify remaining room members
      this.io.to(roomId).emit('user_kicked_from_room', {
        roomId,
        kickedUserId,
        kickedBy: socket.userId,
        reason,
        timestamp: new Date()
      });

      logger.debug(`User ${kickedUserId} kicked from room ${roomId} by ${socket.userId}`);
    } catch (error) {
      logger.error('User kicked handler error:', error);
    }
  }

  /**
   * Handle user banned from room - notify banned user
   */
  private async handleUserBanned(socket: RateLimitedSocket, data: any): Promise<void> {
    try {
      const { roomId, bannedUserId, reason, ban } = data;
      if (!roomId || !bannedUserId) return;

      // Force banned user to leave room
      const bannedSockets = this.connectionPool.get(bannedUserId);
      if (bannedSockets) {
        for (const socketId of bannedSockets) {
          const bannedSocket = this.io.sockets.sockets.get(socketId);
          if (bannedSocket) {
            await bannedSocket.leave(roomId);
            this.io.to(socketId).emit('banned_from_room', {
              roomId,
              bannedBy: socket.userId,
              reason,
              ban,
              timestamp: new Date()
            });
          }
        }
      }

      // Notify remaining room members
      this.io.to(roomId).emit('user_banned_from_room', {
        roomId,
        bannedUserId,
        bannedBy: socket.userId,
        reason,
        timestamp: new Date()
      });

      logger.debug(`User ${bannedUserId} banned from room ${roomId} by ${socket.userId}`);
    } catch (error) {
      logger.error('User banned handler error:', error);
    }
  }

  /**
   * Handle user unbanned from room - notify unbanned user
   */
  private async handleUserUnbanned(socket: RateLimitedSocket, data: any): Promise<void> {
    try {
      const { roomId, unbannedUserId } = data;
      if (!roomId || !unbannedUserId) return;

      // Notify unbanned user
      const unbannedSockets = this.connectionPool.get(unbannedUserId);
      if (unbannedSockets) {
        for (const socketId of unbannedSockets) {
          this.io.to(socketId).emit('unbanned_from_room', {
            roomId,
            unbannedBy: socket.userId,
            timestamp: new Date()
          });
        }
      }

      logger.debug(`User ${unbannedUserId} unbanned from room ${roomId} by ${socket.userId}`);
    } catch (error) {
      logger.error('User unbanned handler error:', error);
    }
  }

  /**
   * Notify friends when user status changes (online/offline)
   */
  private async notifyFriendsOfStatusChange(userId: string, status: 'online' | 'offline'): Promise<void> {
    try {
      // Get user's friends
      const friends = await FriendService.getFriends(userId);
      
      // Notify each online friend
      for (const friend of friends) {
        const friendSockets = this.connectionPool.get(friend.id);
        if (friendSockets) {
          for (const socketId of friendSockets) {
            this.io.to(socketId).emit('friend_status_changed', {
              userId,
              status,
              timestamp: new Date()
            });
          }
        }
      }

      logger.debug(`Notified friends of ${userId} status change to ${status}`);
    } catch (error) {
      logger.error('Notify friends of status change error:', error);
    }
  }

  /**
   * Setup connection monitoring and health checks
   */
  private setupConnectionMonitoring(socket: RateLimitedSocket): void {
    const userId = socket.userId!;

    // Connection health monitoring
    const healthCheckInterval = setInterval(() => {
      socket.emit('ping', { timestamp: Date.now() });
    }, 30000);

    socket.on('pong', (data) => {
      const latency = Date.now() - data.timestamp;
      logger.debug(`User ${userId} latency: ${latency}ms`);
    });

    // Cleanup on disconnect
    socket.on('disconnect', () => {
      clearInterval(healthCheckInterval);
    });
  }

  /**
   * Setup performance monitoring
   */
  private setupPerformanceMonitoring(): void {
    // Monitor connection pool size
    setInterval(() => {
      const totalConnections = Array.from(this.connectionPool.values())
        .reduce((total, sockets) => total + sockets.size, 0);

      logger.debug(`Active connections: ${totalConnections}, Users: ${this.connectionPool.size}`);

      // Emit metrics to monitoring system
      this.io.emit('server_metrics', {
        connections: totalConnections,
        users: this.connectionPool.size,
        rooms: this.io.sockets.adapter.rooms.size,
        timestamp: new Date()
      });
    }, 60000); // Every minute
  }

  /**
   * Start presence heartbeat for a room
   * Broadcasts room presence every 5 seconds to keep all clients in sync
   */
  private startRoomPresenceHeartbeat(roomId: string): void {
    // Don't create duplicate heartbeats
    if (this.roomPresenceHeartbeatIntervals.has(roomId)) {
      return;
    }

    logger.info(`Starting presence heartbeat for room ${roomId}`);

    const heartbeatInterval = setInterval(async () => {
      try {
        // Check if room still has users
        const roomSockets = await this.io.in(roomId).fetchSockets();
        
        if (roomSockets.length === 0) {
          // Room is empty, stop heartbeat
          this.stopRoomPresenceHeartbeat(roomId);
          logger.debug(`Room ${roomId} empty, stopping heartbeat`);
          return;
        }

        // Broadcast current room presence to all users in the room
        await this.broadcastRoomPresenceToAll(roomId);
        
      } catch (error) {
        logger.error(`Error in presence heartbeat for room ${roomId}:`, error);
      }
    }, this.PRESENCE_HEARTBEAT_INTERVAL);

    this.roomPresenceHeartbeatIntervals.set(roomId, heartbeatInterval);
  }

  /**
   * Stop presence heartbeat for a room
   */
  private stopRoomPresenceHeartbeat(roomId: string): void {
    const interval = this.roomPresenceHeartbeatIntervals.get(roomId);
    
    if (interval) {
      clearInterval(interval);
      this.roomPresenceHeartbeatIntervals.delete(roomId);
      // Clean up cached presence signature
      this.lastBroadcastedPresence.delete(roomId);
      logger.info(`Stopped presence heartbeat for room ${roomId}`);
    }
  }

  /**
   * Broadcast room presence to all users in the room
   * Only broadcasts if presence has actually changed to avoid unnecessary updates
   */
  private async broadcastRoomPresenceToAll(roomId: string, force: boolean = false): Promise<void> {
    try {
      const roomPresence = await presenceService.getRoomPresence(roomId);
      
      // Create a signature of the current presence state
      const presenceSignature = JSON.stringify(
        roomPresence.users.map(u => ({ userId: u.userId, status: u.status })).sort((a, b) => a.userId.localeCompare(b.userId))
      );
      
      // Only broadcast if presence changed or forced
      const lastSignature = this.lastBroadcastedPresence.get(roomId);
      if (force || lastSignature !== presenceSignature) {
        this.io.to(roomId).emit('room_presence_update', roomPresence);
        this.lastBroadcastedPresence.set(roomId, presenceSignature);
        
        logger.debug(`Broadcasted room presence update to room ${roomId}`, {
          roomId,
          userCount: roomPresence.users.length,
          activeUsers: roomPresence.activeUsers,
          users: roomPresence.users.map(u => ({ userId: u.userId, status: u.status })),
          changed: lastSignature !== presenceSignature
        });
      } else {
        logger.debug(`Skipped room presence broadcast (no change) for room ${roomId}`);
      }
    } catch (error) {
      logger.error('Broadcast room presence to all error:', error);
    }
  }

  /**
   * Get room data (with caching)
   */
  private async getRoomData(roomId: string): Promise<any> {
    try {
      // This would typically fetch from your room service/database
      // For now, return basic room info
      return {
        id: roomId,
        name: `Room ${roomId}`,
        memberCount: 0,
        createdAt: new Date()
      };
    } catch (error) {
      logger.error('Get room data error:', error);
      return null;
    }
  }

  /**
   * Get performance statistics
   */
  public getPerformanceStats(): {
    connections: number;
    users: number;
    rooms: number;
    typingDebounces: number;
    memoryUsage: NodeJS.MemoryUsage;
  } {
    const totalConnections = Array.from(this.connectionPool.values())
      .reduce((total, sockets) => total + sockets.size, 0);

    return {
      connections: totalConnections,
      users: this.connectionPool.size,
      rooms: this.io.sockets.adapter.rooms.size,
      typingDebounces: this.typingDebounceMap.size,
      memoryUsage: process.memoryUsage()
    };
  }

  /**
   * Cleanup resources
   */
  public cleanup(): void {
    // Clear all typing debounces
    for (const debounceInfo of this.typingDebounceMap.values()) {
      clearTimeout(debounceInfo.timeout);
    }
    this.typingDebounceMap.clear();
    
    // Clear all room presence heartbeat intervals
    for (const [roomId, interval] of this.roomPresenceHeartbeatIntervals.entries()) {
      clearInterval(interval);
      logger.debug(`Cleared presence heartbeat for room ${roomId}`);
    }
    this.roomPresenceHeartbeatIntervals.clear();
    
    // Clear presence cache
    this.lastBroadcastedPresence.clear();
    
    this.connectionPool.clear();

    logger.info('Optimized socket handlers cleaned up');
  }
}

export default OptimizedSocketHandlers;