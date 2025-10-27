/**
 * WebRTC Service - Handles voice chat signaling and management
 * Complete implementation with mute, deafen, and participant tracking
 */

import { Server, Socket } from 'socket.io';
import { RTCSignalingMessage, SOCKET_EVENTS, SOCKET_RESPONSES } from '../../../shared/src';
import { socketSendSuccess, socketSendError } from '../utils/responses';
import logger from '../utils/logger';

interface VoiceParticipant {
  userId: string;
  socketId: string;
  isMuted: boolean;
  isDeafened: boolean;
  joinedAt: Date;
}

interface VoiceRoom {
  roomId: string;
  participants: Map<string, VoiceParticipant>; // userId -> participant
  createdAt: Date;
  lastActivity: Date;
}

interface AuthenticatedSocket extends Socket {
  userId?: string;
  currentRoom?: string;
  isInVoice?: boolean;
  voiceRoomId?: string;
}

class WebRTCService {
  private voiceRooms: Map<string, VoiceRoom> = new Map();
  private userToSocketMap: Map<string, string> = new Map(); // userId -> socketId
  private socketToUserMap: Map<string, string> = new Map(); // socketId -> userId
  private io: Server | null = null;

  /**
   * Initialize WebRTC service with Socket.IO server
   */
  initialize(io: Server): void {
    this.io = io;
    logger.info('WebRTC service initialized');
    
    // Start cleanup interval for inactive rooms
    setInterval(() => {
      this.cleanupInactiveRooms();
    }, 60000); // Every minute
  }

  /**
   * User joins voice room
   */
  async joinVoiceRoom(socket: AuthenticatedSocket, roomId: string): Promise<void> {
    try {
      if (!this.io) {
        throw new Error('WebRTC service not initialized');
      }

      const { userId } = socket;
      if (!userId) {
        throw new Error('Socket not authenticated');
      }

      // Leave current voice room if in one
      if (socket.isInVoice && socket.voiceRoomId) {
        await this.leaveVoiceRoom(socket, socket.voiceRoomId);
      }

      // Get or create voice room
      let voiceRoom = this.voiceRooms.get(roomId);
      if (!voiceRoom) {
        voiceRoom = {
          roomId,
          participants: new Map(),
          createdAt: new Date(),
          lastActivity: new Date(),
        };
        this.voiceRooms.set(roomId, voiceRoom);
        logger.info(`Voice room created: ${roomId}`);
      }

      // Create participant entry
      const participant: VoiceParticipant = {
        userId,
        socketId: socket.id,
        isMuted: false,
        isDeafened: false,
        joinedAt: new Date(),
      };

      // Add user to voice room
      voiceRoom.participants.set(userId, participant);
      voiceRoom.lastActivity = new Date();

      // Update mappings
      this.userToSocketMap.set(userId, socket.id);
      this.socketToUserMap.set(socket.id, userId);

      // Update socket state
      socket.isInVoice = true;
      socket.voiceRoomId = roomId;

      // Join Socket.IO room for voice
      await socket.join(`voice:${roomId}`);

      // Get current participants (excluding the new user)
      const participants = Array.from(voiceRoom.participants.values())
        .filter(p => p.userId !== userId)
        .map(p => ({
          userId: p.userId,
          isMuted: p.isMuted,
          isDeafened: p.isDeafened,
        }));

      // Send current participants to new user
      socket.emit(SOCKET_RESPONSES.VOICE_PARTICIPANTS, socketSendSuccess({
        participants,
        roomId,
      }));

      // Notify existing participants about new user
      socket.to(`voice:${roomId}`).emit(SOCKET_RESPONSES.VOICE_USER_JOINED, {
        userId,
        socketId: socket.id,
        timestamp: Date.now(),
      });

      // Notify in text room about voice activity
      this.io.to(roomId).emit(SOCKET_RESPONSES.USER_VOICE_JOINED, {
        userId,
        timestamp: Date.now(),
      });

      logger.info(`User ${userId} joined voice room ${roomId} (${voiceRoom.participants.size} participants)`);

    } catch (error) {
      logger.error('Error joining voice room:', error);
      socket.emit(SOCKET_RESPONSES.VOICE_ERROR, socketSendError(
        'VOICE_JOIN_FAILED',
        'Failed to join voice room'
      ));
      throw error;
    }
  }

  /**
   * User leaves voice room
   */
  async leaveVoiceRoom(socket: AuthenticatedSocket, roomId: string): Promise<void> {
    try {
      if (!this.io) {
        throw new Error('WebRTC service not initialized');
      }

      const { userId } = socket;
      if (!userId) {
        return; // Nothing to clean up if no user ID
      }
      
      const voiceRoom = this.voiceRooms.get(roomId);

      if (!voiceRoom || !voiceRoom.participants.has(userId)) {
        return; // User not in voice room
      }

      // Remove user from voice room
      voiceRoom.participants.delete(userId);
      voiceRoom.lastActivity = new Date();

      // Update mappings
      this.userToSocketMap.delete(userId);
      this.socketToUserMap.delete(socket.id);

      // Update socket state
      socket.isInVoice = false;
      socket.voiceRoomId = undefined;

      // Leave Socket.IO room
      await socket.leave(`voice:${roomId}`);

      // Notify other participants
      socket.to(`voice:${roomId}`).emit(SOCKET_RESPONSES.VOICE_USER_LEFT, {
        userId,
        socketId: socket.id,
        timestamp: Date.now(),
      });

      // Notify in text room
      this.io.to(roomId).emit(SOCKET_RESPONSES.USER_VOICE_LEFT, {
        userId,
        timestamp: Date.now(),
      });

      // Clean up empty voice room
      if (voiceRoom.participants.size === 0) {
        this.voiceRooms.delete(roomId);
        logger.info(`Voice room ${roomId} cleaned up (empty)`);
      }

      logger.info(`User ${userId} left voice room ${roomId} (${voiceRoom.participants.size} participants remaining)`);

    } catch (error) {
      logger.error('Error leaving voice room:', error);
      throw error;
    }
  }

  /**
   * Handle WebRTC signaling messages
   */
  async handleSignaling(socket: AuthenticatedSocket, message: RTCSignalingMessage): Promise<void> {
    try {
      if (!this.io) {
        throw new Error('WebRTC service not initialized');
      }

      const { userId } = socket;
      if (!userId) {
        throw new Error('Socket not authenticated');
      }
      
      const { to, type, data } = message;

      // Validate message
      if (!to || !type) {
        socket.emit(SOCKET_RESPONSES.VOICE_ERROR, socketSendError(
          'INVALID_SIGNALING_MESSAGE',
          'Missing required fields in signaling message'
        ));
        return;
      }

      // Get target user's socket
      const targetSocketId = this.userToSocketMap.get(to);
      if (!targetSocketId) {
        socket.emit(SOCKET_RESPONSES.VOICE_ERROR, socketSendError(
          'USER_NOT_FOUND',
          'Target user not connected to voice'
        ));
        return;
      }

      // Forward signaling message to target user
      const signalingMessage: RTCSignalingMessage = {
        type,
        from: userId,
        to,
        data,
        timestamp: Date.now(),
      };

      this.io.to(targetSocketId).emit(SOCKET_RESPONSES.VOICE_SIGNAL, signalingMessage);

      logger.debug(`Signaling message forwarded: ${type} from ${userId} to ${to}`);

    } catch (error) {
      logger.error('Error handling signaling:', error);
      socket.emit(SOCKET_RESPONSES.VOICE_ERROR, socketSendError(
        'SIGNALING_FAILED',
        'Failed to process signaling message'
      ));
      throw error;
    }
  }

  /**
   * Handle user mute/unmute
   */
  async handleMuteToggle(socket: AuthenticatedSocket, roomId: string, isMuted: boolean): Promise<void> {
    try {
      if (!this.io || !socket.isInVoice || !socket.voiceRoomId) {
        return;
      }

      const { userId } = socket;
      if (!userId) return;

      const voiceRoom = this.voiceRooms.get(roomId);
      if (!voiceRoom) return;

      const participant = voiceRoom.participants.get(userId);
      if (!participant) return;

      // Update participant state
      participant.isMuted = isMuted;
      voiceRoom.lastActivity = new Date();

      // Notify other participants about mute state change
      socket.to(`voice:${roomId}`).emit(SOCKET_RESPONSES.VOICE_USER_MUTED, {
        userId,
        isMuted,
        timestamp: Date.now(),
      });

      // Notify text room
      this.io.to(roomId).emit(SOCKET_RESPONSES.USER_VOICE_MUTED, {
        userId,
        isMuted,
        timestamp: Date.now(),
      });

      logger.debug(`User ${userId} ${isMuted ? 'muted' : 'unmuted'} in room ${roomId}`);

    } catch (error) {
      logger.error('Error handling mute toggle:', error);
      throw error;
    }
  }

  /**
   * Handle user deafen/undeafen
   */
  async handleDeafenToggle(socket: AuthenticatedSocket, roomId: string, isDeafened: boolean): Promise<void> {
    try {
      if (!this.io || !socket.isInVoice || !socket.voiceRoomId) {
        return;
      }

      const { userId } = socket;
      if (!userId) return;

      const voiceRoom = this.voiceRooms.get(roomId);
      if (!voiceRoom) return;

      const participant = voiceRoom.participants.get(userId);
      if (!participant) return;

      // Update participant state
      participant.isDeafened = isDeafened;
      voiceRoom.lastActivity = new Date();

      // If deafened, also mute the user automatically
      if (isDeafened && !participant.isMuted) {
        participant.isMuted = true;
        socket.to(`voice:${roomId}`).emit(SOCKET_RESPONSES.VOICE_USER_MUTED, {
          userId,
          isMuted: true,
          timestamp: Date.now(),
        });
      }

      // Notify other participants about deafen state change
      socket.to(`voice:${roomId}`).emit('voice:user_deafened', {
        userId,
        isDeafened,
        timestamp: Date.now(),
      });

      logger.debug(`User ${userId} ${isDeafened ? 'deafened' : 'undeafened'} in room ${roomId}`);

    } catch (error) {
      logger.error('Error handling deafen toggle:', error);
      throw error;
    }
  }

  /**
   * Get voice room participants
   */
  getVoiceParticipants(roomId: string): VoiceParticipant[] {
    const voiceRoom = this.voiceRooms.get(roomId);
    return voiceRoom ? Array.from(voiceRoom.participants.values()) : [];
  }

  /**
   * Check if user is in voice
   */
  isUserInVoice(userId: string): boolean {
    return this.userToSocketMap.has(userId);
  }

  /**
   * Get user's current voice room
   */
  getUserVoiceRoom(userId: string): string | null {
    for (const [roomId, voiceRoom] of this.voiceRooms) {
      if (voiceRoom.participants.has(userId)) {
        return roomId;
      }
    }
    return null;
  }

  /**
   * Get voice room statistics
   */
  getVoiceRoomStats(): { 
    totalRooms: number; 
    totalParticipants: number;
    rooms: Array<{ roomId: string; participants: number }>;
  } {
    const totalRooms = this.voiceRooms.size;
    const totalParticipants = Array.from(this.voiceRooms.values())
      .reduce((sum, room) => sum + room.participants.size, 0);
    
    const rooms = Array.from(this.voiceRooms.entries()).map(([roomId, room]) => ({
      roomId,
      participants: room.participants.size,
    }));

    return { totalRooms, totalParticipants, rooms };
  }

  /**
   * Clean up user from all voice rooms (on disconnect)
   */
  async cleanupUser(socket: AuthenticatedSocket): Promise<void> {
    try {
      const { userId } = socket;
      if (!userId) {
        return; // Nothing to clean up
      }

      if (socket.isInVoice && socket.voiceRoomId) {
        await this.leaveVoiceRoom(socket, socket.voiceRoomId);
      }

      // Remove from mappings
      this.userToSocketMap.delete(userId);
      this.socketToUserMap.delete(socket.id);

      logger.debug(`Cleaned up voice data for user ${userId}`);

    } catch (error) {
      logger.error('Error cleaning up user voice data:', error);
    }
  }

  /**
   * Clean up inactive voice rooms
   */
  cleanupInactiveRooms(maxInactivity: number = 30 * 60 * 1000): number { // 30 minutes default
    let cleaned = 0;
    const now = Date.now();

    for (const [roomId, voiceRoom] of this.voiceRooms.entries()) {
      if (voiceRoom.participants.size === 0 && 
          (now - voiceRoom.lastActivity.getTime()) > maxInactivity) {
        this.voiceRooms.delete(roomId);
        cleaned++;
      }
    }

    if (cleaned > 0) {
      logger.info(`Cleaned up ${cleaned} inactive voice rooms`);
    }

    return cleaned;
  }

  /**
   * Get comprehensive room info
   */
  getVoiceRoomInfo(roomId: string): {
    exists: boolean;
    participants: Array<{
      userId: string;
      isMuted: boolean;
      isDeafened: boolean;
      joinedAt: Date;
    }>;
    createdAt: Date | null;
    lastActivity: Date | null;
  } {
    const voiceRoom = this.voiceRooms.get(roomId);
    
    if (!voiceRoom) {
      return {
        exists: false,
        participants: [],
        createdAt: null,
        lastActivity: null,
      };
    }

    return {
      exists: true,
      participants: Array.from(voiceRoom.participants.values()).map(p => ({
        userId: p.userId,
        isMuted: p.isMuted,
        isDeafened: p.isDeafened,
        joinedAt: p.joinedAt,
      })),
      createdAt: voiceRoom.createdAt,
      lastActivity: voiceRoom.lastActivity,
    };
  }
}

export const webrtcService = new WebRTCService();
export default webrtcService;