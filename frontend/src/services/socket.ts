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

interface TypingDebounceInfo {
  timeout: NodeJS.Timeout | null;
  isTyping: boolean;
}

export class SocketClient {
  private socket: Socket | null = null;
  private reconnectAttempts = 0;
  private maxReconnectAttempts = 5;
  private reconnectDelay = 1000;
  private heartbeatInterval: NodeJS.Timeout | null = null;
  private typingDebounce = new Map<string, TypingDebounceInfo>();
  private messageQueue: any[] = [];
  private isOnline = false;

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
          forceNew: false,
          upgrade: true,
          timeout: 20000
        });

        this.setupEventHandlers();

        this.socket.on('connect', () => {
          this.reconnectAttempts = 0;
          this.isOnline = true;
          console.log('[Socket] Connected:', this.socket?.id);
          this.startHeartbeat();
          this.processMessageQueue();
          resolve();
        });

        this.socket.on('disconnect', (reason: string) => {
          this.isOnline = false;
          console.log('[Socket] Disconnected:', reason);
          this.stopHeartbeat();
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
      this.stopHeartbeat();
      this.clearTypingDebounces();
      this.socket.disconnect();
      this.socket = null;
      this.isOnline = false;
    }
  }

  /**
   * Setup optimized event handlers
   */
  private setupEventHandlers(): void {
    if (!this.socket) return;

    // Performance optimization events
    this.socket.on('rate_limit_exceeded', (data) => {
      console.warn('[Socket] Rate limit exceeded:', data);
      // Handle rate limiting gracefully
    });

    this.socket.on('server_metrics', (metrics) => {
      console.debug('[Socket] Server metrics:', metrics);
    });

    // Heartbeat for connection health
    this.socket.on('heartbeat_ack', (data) => {
      const latency = Date.now() - data.timestamp;
      console.debug(`[Socket] Heartbeat latency: ${latency}ms`);
    });

    // Enhanced presence events
    this.socket.on('presence_update', (data) => {
      console.debug('[Socket] Presence update:', data);
    });

    this.socket.on('room_presence_update', (data) => {
      console.debug('[Socket] Room presence update:', data);
    });

    // Enhanced messaging events
    this.socket.on('new_message', (message) => {
      console.debug('[Socket] New message received:', message);
    });

    this.socket.on('message_sent', (data) => {
      console.debug('[Socket] Message sent confirmation:', data);
    });

    // Enhanced typing events
    this.socket.on('user_typing', (data) => {
      console.debug('[Socket] User typing:', data);
    });

    // Offline message delivery
    this.socket.on('offline_messages', (messages) => {
      console.log(`[Socket] Received ${messages.length} offline messages`);
    });

    // Room events
    this.socket.on('room_joined', (data) => {
      console.debug('[Socket] Room joined:', data);
    });

    this.socket.on('room_left', (data) => {
      console.debug('[Socket] Room left:', data);
    });

    this.socket.on('user_joined_room', (data) => {
      console.debug('[Socket] User joined room:', data);
    });

    this.socket.on('user_left_room', (data) => {
      console.debug('[Socket] User left room:', data);
    });

    // Error handling
    this.socket.on('error', (error) => {
      console.error('[Socket] Server error:', error);
    });

    // Connection errors
    this.socket.on('connect_error', (error) => {
      console.error('[Socket] Connection error:', error);
    });

    // Authentication errors
    this.socket.on('disconnect', (reason) => {
      console.warn('[Socket] Disconnected:', reason);
      if (reason === 'io server disconnect') {
        console.error('[Socket] Server disconnected the client (likely auth error)');
      }
    });
  }

  /**
   * Start heartbeat for connection monitoring
   */
  private startHeartbeat(): void {
    this.stopHeartbeat();
    this.heartbeatInterval = setInterval(() => {
      if (this.socket && this.socket.connected) {
        this.socket.emit('heartbeat', { timestamp: Date.now() });
      }
    }, 30000); // Every 30 seconds
  }

  /**
   * Stop heartbeat
   */
  private stopHeartbeat(): void {
    if (this.heartbeatInterval) {
      clearInterval(this.heartbeatInterval);
      this.heartbeatInterval = null;
    }
  }

  /**
   * Process queued messages when connection is restored
   */
  private processMessageQueue(): void {
    if (this.messageQueue.length === 0) return;

    console.log(`[Socket] Processing ${this.messageQueue.length} queued messages`);
    
    const queue = [...this.messageQueue];
    this.messageQueue = [];

    queue.forEach(message => {
      if (this.socket && this.socket.connected) {
        this.socket.emit(message.event, message.data);
      }
    });
  }

  /**
   * Queue message when offline
   */
  private queueMessage(event: string, data: any): void {
    this.messageQueue.push({ event, data, timestamp: Date.now() });
    
    // Limit queue size
    if (this.messageQueue.length > 50) {
      this.messageQueue = this.messageQueue.slice(-50);
    }
  }

  /**
   * Clear typing debounce timers
   */
  private clearTypingDebounces(): void {
    for (const debounce of this.typingDebounce.values()) {
      if (debounce.timeout) {
        clearTimeout(debounce.timeout);
      }
    }
    this.typingDebounce.clear();
  }

  isConnected(): boolean {
    return this.socket?.connected || false;
  }

  getOnlineStatus(): boolean {
    return this.isOnline && this.isConnected();
  }

  // Enhanced room events
  joinRoom(roomId: string): void {
    if (this.socket && this.socket.connected) {
      this.socket.emit('join_room', { roomId });
    } else {
      this.queueMessage('join_room', { roomId });
    }
  }

  leaveRoom(roomId: string): void {
    if (this.socket && this.socket.connected) {
      this.socket.emit('leave_room', { roomId });
    }
    
    // Clear typing for this room
    this.typingStop(roomId);
  }

  // Enhanced message events with offline queueing
  sendMessage(roomId: string, content: string, type: string = 'text', tempId?: string): void {
    const messageData = {
      roomId,
      content,
      messageType: type,
      tempId: tempId || Date.now().toString(),
      timestamp: Date.now()
    };

    if (this.socket && this.socket.connected) {
      this.socket.emit('send_message', messageData);
    } else {
      // Queue message for when connection is restored
      this.queueMessage('send_message', messageData);
      console.log('[Socket] Message queued for delivery when connection restored');
    }
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

  // Enhanced typing indicators with debouncing
  typingStart(roomId: string): void {
    const debounceKey = roomId;
    const existingDebounce = this.typingDebounce.get(debounceKey);

    // Clear existing timeout
    if (existingDebounce?.timeout) {
      clearTimeout(existingDebounce.timeout);
    }

    // Send typing start if not already typing
    if (!existingDebounce?.isTyping) {
      this.emit('typing_start', { roomId });
    }

    // Set auto-stop timeout
    const timeout = setTimeout(() => {
      this.typingStop(roomId);
    }, 3000); // Auto-stop after 3 seconds

    this.typingDebounce.set(debounceKey, {
      timeout,
      isTyping: true
    });
  }

  typingStop(roomId: string): void {
    const debounceKey = roomId;
    const existingDebounce = this.typingDebounce.get(debounceKey);

    if (existingDebounce) {
      if (existingDebounce.timeout) {
        clearTimeout(existingDebounce.timeout);
      }
      this.typingDebounce.delete(debounceKey);
      this.emit('typing_stop', { roomId });
    }
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
