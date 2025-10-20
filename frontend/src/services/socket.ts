import io, { Socket } from 'socket.io-client';
import {
  SOCKET_EVENTS,
  SOCKET_RESPONSES,
  Message,
  UserPresence,
  RTCSignalingMessage,
} from '../../../shared/src';

export interface SocketClientConfig {
  url: string;
  token: string;
}

export class SocketClient {
  private socket: Socket | null = null;
  private reconnectAttempts = 0;
  private maxReconnectAttempts = 5;
  private reconnectDelay = 1000;

  connect(config: SocketClientConfig): Promise<void> {
    return new Promise((resolve, reject) => {
      try {
        this.socket = io(config.url, {
          auth: {
            token: config.token,
          },
          reconnection: true,
          reconnectionDelay: this.reconnectDelay,
          reconnectionDelayMax: 5000,
          reconnectionAttempts: this.maxReconnectAttempts,
          transports: ['websocket', 'polling'],
        });

        this.socket.on('connect', () => {
          this.reconnectAttempts = 0;
          console.log('[Socket] Connected:', this.socket?.id);
          resolve();
        });

        this.socket.on('disconnect', (reason: string) => {
          console.log('[Socket] Disconnected:', reason);
        });

        this.socket.on('connect_error', (error: Error) => {
          console.error('[Socket] Connection error:', error);
          if (this.reconnectAttempts === 0) {
            reject(error);
          }
          this.reconnectAttempts++;
        });
      } catch (error) {
        reject(error);
      }
    });
  }

  disconnect(): void {
    if (this.socket) {
      this.socket.disconnect();
      this.socket = null;
    }
  }

  isConnected(): boolean {
    return this.socket?.connected || false;
  }

  // Room events
  joinRoom(roomId: string): Promise<any> {
    return new Promise((resolve, reject) => {
      if (!this.socket) {
        reject(new Error('Socket not connected'));
        return;
      }

      this.socket.emit(SOCKET_EVENTS.ROOM_JOIN, { roomId }, (response: any) => {
        if (response && response.success) {
          resolve(response);
        } else {
          reject(new Error(response?.message || 'Failed to join room'));
        }
      });
    });
  }

  leaveRoom(roomId: string): Promise<any> {
    return new Promise((resolve, reject) => {
      if (!this.socket) {
        reject(new Error('Socket not connected'));
        return;
      }

      this.socket.emit(SOCKET_EVENTS.ROOM_LEAVE, { roomId }, (response: any) => {
        if (response && response.success) {
          resolve(response);
        } else {
          reject(new Error(response?.message || 'Failed to leave room'));
        }
      });
    });
  }

  // Message events
  sendMessage(roomId: string, content: string, type: string = 'text'): Promise<any> {
    return new Promise((resolve, reject) => {
      if (!this.socket) {
        reject(new Error('Socket not connected'));
        return;
      }

      this.socket.emit(SOCKET_EVENTS.MESSAGE_SEND, {
        roomId,
        content,
        type,
      }, (response: any) => {
        if (response && response.success) {
          resolve(response);
        } else {
          reject(new Error(response?.message || 'Failed to send message'));
        }
      });
    });
  }

  onMessageReceive(callback: (message: Message) => void): void {
    this.on(SOCKET_RESPONSES.MESSAGE_RECEIVED, callback);
  }

  onMessageUpdated(callback: (message: Message) => void): void {
    this.on(SOCKET_RESPONSES.MESSAGE_EDITED, callback);
  }

  onMessageDeleted(callback: (data: { messageId: string }) => void): void {
    this.on(SOCKET_RESPONSES.MESSAGE_DELETED, callback);
  }

  // Typing indicators
  typingStart(roomId: string): void {
    this.emit(SOCKET_EVENTS.TYPING_START, { roomId });
  }

  typingStop(roomId: string): void {
    this.emit(SOCKET_EVENTS.TYPING_STOP, { roomId });
  }

  onUserTyping(callback: (data: { userId: string; username: string }) => void): void {
    this.on(SOCKET_EVENTS.TYPING_START, callback);
  }

  onUserStoppedTyping(callback: (data: { userId: string }) => void): void {
    this.on(SOCKET_EVENTS.TYPING_STOP, callback);
  }

  // Presence events
  setPresence(status: 'online' | 'away' | 'offline', roomId?: string): void {
    this.emit(SOCKET_EVENTS.PRESENCE_UPDATE, {
      status,
      roomId,
      timestamp: Date.now(),
    });
  }

  onPresenceUpdate(callback: (presence: UserPresence) => void): void {
    this.on(SOCKET_EVENTS.PRESENCE_UPDATE, callback);
  }

  // Voice/WebRTC events
  joinVoiceRoom(roomId: string): void {
    this.emit(SOCKET_EVENTS.VOICE_JOIN, { roomId });
  }

  leaveVoiceRoom(roomId: string): void {
    this.emit(SOCKET_EVENTS.VOICE_LEAVE, { roomId });
  }

  sendRTCSignal(targetUserId: string, signal: RTCSignalingMessage): void {
    this.emit(SOCKET_EVENTS.VOICE_SIGNAL, {
      targetUserId,
      signal,
    });
  }

  onRTCSignal(callback: (data: { from: string; signal: RTCSignalingMessage }) => void): void {
    this.on(SOCKET_RESPONSES.VOICE_SIGNAL, callback);
  }

  onUserJoinedVoice(callback: (data: { userId: string; username: string }) => void): void {
    this.on(SOCKET_EVENTS.VOICE_JOIN, callback);
  }

  onUserLeftVoice(callback: (data: { userId: string }) => void): void {
    this.on(SOCKET_EVENTS.VOICE_LEAVE, callback);
  }

  // Generic methods
  on(event: string, callback: (...args: any[]) => void): void {
    if (this.socket) {
      this.socket.on(event, callback);
    }
  }

  off(event: string, callback?: (...args: any[]) => void): void {
    if (this.socket) {
      this.socket.off(event, callback);
    }
  }

  emit(event: string, data?: any): void {
    if (this.socket) {
      this.socket.emit(event, data);
    }
  }

  once(event: string, callback: (...args: any[]) => void): void {
    if (this.socket) {
      this.socket.once(event, callback);
    }
  }
}

export const socketClient = new SocketClient();
export default socketClient;
