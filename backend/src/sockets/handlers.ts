/**
 * Socket.IO Event Handlers for Real-time Features
 */

import { Server, Socket } from 'socket.io';
import { SOCKET_EVENTS, SOCKET_RESPONSES, Message, AuthPayload, UserPresenceStatus, RTCSignalingMessage } from '../../../shared/src';
import { socketSendSuccess, socketSendError } from '../utils/responses';
import { verifyAccessToken } from '../utils/jwt';
import { webrtcService } from '../services/webrtc.service';
import logger from '../utils/logger';

interface AuthenticatedSocket extends Socket {
  userId?: string;
  currentRoom?: string;
}

/**
 * Message handlers for Socket.IO events
 */
export const setupSocketHandlers = (io: Server): void => {
  // Initialize WebRTC service
  webrtcService.initialize(io);

  io.use((socket: AuthenticatedSocket, next) => {
    const token = socket.handshake.auth.token;

    if (!token) {
      return next(new Error('Authentication token required'));
    }

    try {
      const decoded = verifyAccessToken(token) as AuthPayload;
      socket.userId = decoded.userId;
      next();
    } catch (error) {
      logger.error('Socket authentication failed', error);
      next(new Error('Invalid token'));
    }
  });

  io.on('connection', (socket: AuthenticatedSocket) => {
    logger.info(`User ${socket.userId} connected with socket ${socket.id}`);

    // Join room handler
    socket.on(SOCKET_EVENTS.ROOM_JOIN, async (data: { roomId: string }, callback) => {
      try {
        const { roomId } = data;

        if (!socket.userId) {
          callback(socketSendError('UNAUTHORIZED', 'User not authenticated'));
          return;
        }

        // Store current room
        socket.currentRoom = roomId;

        // Join Socket.IO room
        socket.join(roomId);

        // Notify others in room
        socket.to(roomId).emit(SOCKET_RESPONSES.ROOM_USER_JOINED, {
          userId: socket.userId,
          socketId: socket.id,
          timestamp: Date.now(),
        });

        callback(socketSendSuccess({ joined: true, roomId }));

        logger.info(`User ${socket.userId} joined room ${roomId}`);
      } catch (error) {
        logger.error('Error joining room', error);
        callback(
          socketSendError('ROOM_JOIN_ERROR', 'Failed to join room', {
            details: error instanceof Error ? error.message : 'Unknown error',
          }),
        );
      }
    });

    // Leave room handler
    socket.on(SOCKET_EVENTS.ROOM_LEAVE, async (data: { roomId: string }, callback) => {
      try {
        const { roomId } = data;

        socket.leave(roomId);
        socket.currentRoom = undefined;

        // Notify others in room
        socket.to(roomId).emit(SOCKET_RESPONSES.ROOM_USER_LEFT, {
          userId: socket.userId,
          socketId: socket.id,
          timestamp: Date.now(),
        });

        callback(socketSendSuccess({ left: true }));

        logger.info(`User ${socket.userId} left room ${roomId}`);
      } catch (error) {
        logger.error('Error leaving room', error);
        callback(socketSendError('ROOM_LEAVE_ERROR', 'Failed to leave room'));
      }
    });

    // Message sending handler
    socket.on(
      SOCKET_EVENTS.MESSAGE_SEND,
      async (data: { roomId: string; content: string; type: string }, callback) => {
        try {
          if (!socket.userId) {
            callback(socketSendError('UNAUTHORIZED', 'User not authenticated'));
            return;
          }

          const { roomId, content, type } = data;

          const message: Partial<Message> = {
            roomId,
            userId: socket.userId,
            content,
            type: type as Message['type'],
            createdAt: new Date(),
          };

          // Broadcast message to room
          io.to(roomId).emit(SOCKET_RESPONSES.MESSAGE_RECEIVED, message);

          callback(socketSendSuccess(message));

          logger.info(`Message sent to room ${roomId} by ${socket.userId}`);
        } catch (error) {
          logger.error('Error sending message', error);
          callback(socketSendError('MESSAGE_SEND_ERROR', 'Failed to send message'));
        }
      },
    );

    // Typing indicator handlers
    socket.on(SOCKET_EVENTS.TYPING_START, (data: { roomId: string }) => {
      const { roomId } = data;
      socket.to(roomId).emit(SOCKET_RESPONSES.USER_TYPING, {
        userId: socket.userId,
        timestamp: Date.now(),
      });
    });

    socket.on(SOCKET_EVENTS.TYPING_STOP, (data: { roomId: string }) => {
      const { roomId } = data;
      socket.to(roomId).emit(SOCKET_RESPONSES.USER_STOPPED_TYPING, {
        userId: socket.userId,
        timestamp: Date.now(),
      });
    });

    // Presence update handler
    socket.on(SOCKET_EVENTS.PRESENCE_UPDATE, (data: { roomId: string; status: UserPresenceStatus }) => {
      const { roomId, status } = data;
      io.to(roomId).emit(SOCKET_RESPONSES.USER_PRESENCE_CHANGED, {
        userId: socket.userId,
        status,
        timestamp: Date.now(),
      });
    });

    // WebRTC/Voice Chat handlers
    socket.on(SOCKET_EVENTS.VOICE_JOIN, async (data: { roomId: string }) => {
      try {
        await webrtcService.joinVoiceRoom(socket, data.roomId);
        socket.emit(SOCKET_RESPONSES.VOICE_USER_JOINED, socketSendSuccess({
          roomId: data.roomId,
          participants: webrtcService.getVoiceParticipants(data.roomId),
        }));
      } catch (error) {
        socket.emit(SOCKET_RESPONSES.VOICE_ERROR, socketSendError(
          'VOICE_JOIN_FAILED',
          'Failed to join voice room'
        ));
      }
    });

    socket.on(SOCKET_EVENTS.VOICE_LEAVE, async (data: { roomId: string }) => {
      try {
        await webrtcService.leaveVoiceRoom(socket, data.roomId);
        socket.emit(SOCKET_RESPONSES.VOICE_USER_LEFT, socketSendSuccess({
          roomId: data.roomId,
        }));
      } catch (error) {
        socket.emit(SOCKET_RESPONSES.VOICE_ERROR, socketSendError(
          'VOICE_LEAVE_FAILED',
          'Failed to leave voice room'
        ));
      }
    });

    socket.on(SOCKET_EVENTS.VOICE_SIGNAL, async (message: RTCSignalingMessage) => {
      try {
        await webrtcService.handleSignaling(socket, message);
      } catch (error) {
        socket.emit(SOCKET_RESPONSES.VOICE_ERROR, socketSendError(
          'SIGNALING_FAILED',
          'Failed to process signaling message'
        ));
      }
    });

    socket.on(SOCKET_EVENTS.VOICE_MUTE, async (data: { isMuted: boolean }) => {
      try {
        await webrtcService.handleMuteToggle(socket, data.isMuted);
      } catch (error) {
        socket.emit(SOCKET_RESPONSES.VOICE_ERROR, socketSendError(
          'MUTE_FAILED',
          'Failed to toggle mute state'
        ));
      }
    });

    socket.on(SOCKET_EVENTS.VOICE_UNMUTE, async () => {
      try {
        await webrtcService.handleMuteToggle(socket, false);
      } catch (error) {
        socket.emit(SOCKET_RESPONSES.VOICE_ERROR, socketSendError(
          'UNMUTE_FAILED',
          'Failed to unmute'
        ));
      }
    });

    // WebRTC signaling handler
    socket.on(SOCKET_EVENTS.VOICE_SIGNAL, (data: unknown) => {
      const signalData = data as { to: string; data: unknown };
      if (signalData.to) {
        io.to(signalData.to).emit(SOCKET_RESPONSES.VOICE_SIGNAL, {
          from: socket.userId,
          data: signalData.data,
          timestamp: Date.now(),
        });
      }
    });

    // Disconnect handler
    socket.on(SOCKET_EVENTS.DISCONNECT, async () => {
      if (socket.currentRoom) {
        socket.to(socket.currentRoom).emit(SOCKET_RESPONSES.ROOM_USER_LEFT, {
          userId: socket.userId,
          socketId: socket.id,
          timestamp: Date.now(),
        });
      }

      // Clean up WebRTC connections
      await webrtcService.cleanupUser(socket);

      logger.info(`User ${socket.userId} disconnected`);
    });
  });
};

export default setupSocketHandlers;
