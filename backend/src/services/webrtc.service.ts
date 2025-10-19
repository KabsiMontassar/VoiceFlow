/**
 * WebRTC Service - Handles voice chat signaling and management
 */

import { Server, Socket } from 'socket.io';
import { RTCSignalingMessage, SOCKET_EVENTS, SOCKET_RESPONSES } from '../../../shared/src';
import { socketSendSuccess, socketSendError } from '../utils/responses';
import logger from '../utils/logger';

interface VoiceRoom {
  roomId: string;
  participants: Set<string>; // User IDs
  socketMap: Map<string, string>; // userId -> socketId
  createdAt: Date;
}

interface AuthenticatedSocket extends Socket {
  userId?: string;
  currentRoom?: string;
  isInVoice?: boolean;
}

class WebRTCService {
  private voiceRooms: Map<string, VoiceRoom> = new Map();
  private userSockets: Map<string, string> = new Map(); // userId -> socketId
  private io: Server | null = null;

  /**
   * Initialize WebRTC service with Socket.IO server
   */
  initialize(io: Server): void {
    this.io = io;
    logger.info('WebRTC service initialized');
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
      if (socket.isInVoice && socket.currentRoom) {
        await this.leaveVoiceRoom(socket, socket.currentRoom);
      }

      // Get or create voice room
      let voiceRoom = this.voiceRooms.get(roomId);
      if (!voiceRoom) {
        voiceRoom = {
          roomId,
          participants: new Set(),
          socketMap: new Map(),
          createdAt: new Date(),
        };
        this.voiceRooms.set(roomId, voiceRoom);
      }

      // Add user to voice room
      voiceRoom.participants.add(userId);
      voiceRoom.socketMap.set(userId, socket.id);
      this.userSockets.set(userId, socket.id);

      // Update socket state
      socket.isInVoice = true;
      socket.currentRoom = roomId;

      // Join Socket.IO room for voice
      await socket.join(`voice:${roomId}`);

      // Notify existing participants about new user
      socket.to(`voice:${roomId}`).emit(SOCKET_RESPONSES.VOICE_USER_JOINED, {
        userId,
        socketId: socket.id,
        timestamp: Date.now(),
      });

      // Send current participants to new user
      const participants = Array.from(voiceRoom.participants).filter(id => id !== userId);
      socket.emit(SOCKET_RESPONSES.VOICE_PARTICIPANTS, socketSendSuccess({
        participants,
        roomId,
      }));

      // Notify in text room about voice activity
      this.io.to(roomId).emit(SOCKET_RESPONSES.USER_VOICE_JOINED, {
        userId,
        timestamp: Date.now(),
      });

      logger.info(`User ${userId} joined voice room ${roomId}`);

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
      voiceRoom.socketMap.delete(userId);
      this.userSockets.delete(userId);

      // Update socket state
      socket.isInVoice = false;
      socket.currentRoom = undefined;

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

      logger.info(`User ${userId} left voice room ${roomId}`);

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
      const targetSocketId = this.userSockets.get(to);
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
  async handleMuteToggle(socket: AuthenticatedSocket, isMuted: boolean): Promise<void> {
    try {
      if (!this.io || !socket.isInVoice || !socket.currentRoom) {
        return;
      }

      const { userId } = socket;
      const roomId = socket.currentRoom;

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
   * Get voice room participants
   */
  getVoiceParticipants(roomId: string): string[] {
    const voiceRoom = this.voiceRooms.get(roomId);
    return voiceRoom ? Array.from(voiceRoom.participants) : [];
  }

  /**
   * Check if user is in voice
   */
  isUserInVoice(userId: string): boolean {
    return this.userSockets.has(userId);
  }

  /**
   * Get voice room statistics
   */
  getVoiceRoomStats(): { totalRooms: number; totalParticipants: number } {
    const totalRooms = this.voiceRooms.size;
    const totalParticipants = Array.from(this.voiceRooms.values())
      .reduce((sum, room) => sum + room.participants.size, 0);

    return { totalRooms, totalParticipants };
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

      if (socket.isInVoice && socket.currentRoom) {
        await this.leaveVoiceRoom(socket, socket.currentRoom);
      }

      // Remove from user sockets map
      this.userSockets.delete(userId);

      logger.debug(`Cleaned up voice data for user ${userId}`);

    } catch (error) {
      logger.error('Error cleaning up user voice data:', error);
    }
  }

  /**
   * Clean up inactive voice rooms
   */
  cleanupInactiveRooms(maxAge: number = 24 * 60 * 60 * 1000): number { // 24 hours default
    let cleaned = 0;
    const now = Date.now();

    for (const [roomId, voiceRoom] of this.voiceRooms.entries()) {
      if (voiceRoom.participants.size === 0 && 
          (now - voiceRoom.createdAt.getTime()) > maxAge) {
        this.voiceRooms.delete(roomId);
        cleaned++;
      }
    }

    if (cleaned > 0) {
      logger.info(`Cleaned up ${cleaned} inactive voice rooms`);
    }

    return cleaned;
  }
}

export const webrtcService = new WebRTCService();
export default webrtcService;