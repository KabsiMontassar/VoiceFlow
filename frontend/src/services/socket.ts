import io, { Socket } from 'socket.io-client';
import {
  SOCKET_EVENTS,
  SOCKET_RESPONSES,
  Message,
  UserPresence,
  RTCSignalingMessage,
  UserPresenceStatus,
} from '../../../shared/src';

export interface SocketClientConfig {
  url: string;
  accessToken: string;
  refreshToken?: string;
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
  private currentConfig: SocketClientConfig | null = null;

  connect(config: SocketClientConfig): Promise<void> {
    return new Promise((resolve, reject) => {
      try {
        this.currentConfig = config;
        
        this.socket = io(config.url, {
          auth: {
            token: config.accessToken,
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
          
          // If disconnected due to auth error, don't try to reconnect automatically
          if (reason === 'io server disconnect') {
            console.warn('[Socket] Server disconnected - likely authentication issue');
          }
        });

        this.socket.on('connect_error', (error: Error) => {
          console.error('[Socket] Connection error:', error);
          if (this.reconnectAttempts === 0) {
            reject(error);
          }
          this.reconnectAttempts++;
        });

        // Handle authentication errors
        this.socket.on('auth_error', (error) => {
          console.error('[Socket] Authentication error:', error);
          this.disconnect();
          reject(new Error('Authentication failed'));
        });

        // Handle token expiry
        this.socket.on('token_expired', () => {
          console.warn('[Socket] Token expired, need to refresh');
          // Emit event that frontend can listen to for token refresh
          this.socket?.emit('internal_token_expired');
        });

      } catch (error) {
        reject(error);
      }
    });
  }

  /**
   * Update authentication token for existing connection
   */
  updateAuth(accessToken: string): void {
    if (this.socket && this.currentConfig) {
      this.currentConfig.accessToken = accessToken;
      this.socket.auth = { token: accessToken };
      
      // Re-authenticate with new token
      this.socket.emit('authenticate', { token: accessToken });
    }
  }

  /**
   * Reconnect with new authentication
   */
  reconnectWithAuth(config: SocketClientConfig): Promise<void> {
    this.disconnect();
    return this.connect(config);
  }

  disconnect(): void {
    if (this.socket) {
      this.stopHeartbeat();
      this.clearTypingDebounces();
      this.socket.disconnect();
      this.socket = null;
      this.isOnline = false;
      this.currentConfig = null;
    }
  }

  /**
   * Setup optimized event handlers
   */
  private setupEventHandlers(): void {
    if (!this.socket) return;

    // Authentication events
    this.socket.on('authenticated', (data) => {
      console.log('[Socket] Authenticated successfully:', data);
    });

    this.socket.on('auth_error', (error) => {
      console.error('[Socket] Authentication error:', error);
    });

    this.socket.on('token_expired', () => {
      console.warn('[Socket] Token expired');
    });

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

    // Enhanced presence events with new status system
    this.socket.on('presence_update', (data) => {
      console.debug('[Socket] Presence update:', data);
    });

    this.socket.on('room_presence_update', (data) => {
      console.debug('[Socket] Room presence update:', data);
    });

    this.socket.on('room_presence', (data) => {
      console.debug('[Socket] Initial room presence:', data);
    });

    // Note: user_status_changed removed - status is now managed by auth service

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
      console.log('[Socket] User left room:', data);
    });

    // Friend system events
    this.socket.on('friend_request_received', (data) => {
      console.log('[Socket] Friend request received:', data);
      // Reload pending requests to show new request
      import('../stores/friendStore').then(({ useFriendStore }) => {
        useFriendStore.getState().loadPendingRequests();
      });
    });

    this.socket.on('friend_request_accepted', (data) => {
      console.log('[Socket] Friend request accepted:', data);
      // Reload friends list and sent requests
      import('../stores/friendStore').then(({ useFriendStore }) => {
        useFriendStore.getState().loadFriends();
        useFriendStore.getState().loadSentRequests();
      });
    });

    this.socket.on('friend_added', (data) => {
      console.log('[Socket] Friend added:', data);
      // Reload friends list when someone accepts your request
      import('../stores/friendStore').then(({ useFriendStore }) => {
        useFriendStore.getState().loadFriends();
      });
    });

    this.socket.on('friendship_ended', (data) => {
      console.log('[Socket] Friendship ended:', data);
      // Reload friends list
      import('../stores/friendStore').then(({ useFriendStore }) => {
        useFriendStore.getState().loadFriends();
      });
    });

    this.socket.on('friend_status_changed', (data) => {
      console.log('[Socket] Friend status changed:', data);
      // Update friend online status
      import('../stores/friendStore').then(({ useFriendStore }) => {
        useFriendStore.getState().updateFriendStatus(data.userId, data.status === 'online');
      });
    });

    // Direct messaging removed - users must create rooms to communicate

    // Room moderation events
    this.socket.on('kicked_from_room', (data) => {
      console.warn('[Socket] You were kicked from room:', data);
      // Show notification and navigate away
      alert(`You were kicked from the room${data.reason ? `: ${data.reason}` : ''}`);
      window.location.href = '/dashboard';
    });

    this.socket.on('banned_from_room', (data) => {
      console.warn('[Socket] You were banned from room:', data);
      // Show notification and navigate away
      alert(`You were banned from the room${data.reason ? `: ${data.reason}` : ''}`);
      window.location.href = '/dashboard';
    });

    this.socket.on('unbanned_from_room', (data) => {
      console.log('[Socket] You were unbanned from room:', data);
      alert('You have been unbanned from the room');
    });

    this.socket.on('user_kicked_from_room', (data) => {
      console.log('[Socket] User kicked from room:', data);
      // Update room member list if in room store
    });

    this.socket.on('user_banned_from_room', (data) => {
      console.log('[Socket] User banned from room:', data);
      // Update room member list if in room store
    });

    // Session management events
    this.socket.on('session_invalidated', () => {
      console.warn('[Socket] Session invalidated by server');
      this.disconnect();
    });

    this.socket.on('concurrent_login', (data) => {
      console.warn('[Socket] Concurrent login detected:', data);
    });

    // Error handling
    this.socket.on('error', (error) => {
      console.error('[Socket] Server error:', error);
    });

    // Connection errors
    this.socket.on('connect_error', (error) => {
      console.error('[Socket] Connection error:', error);
    });

    // Disconnection handling
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
    }, 25000); // Every 25 seconds - optimized to match server ping interval
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

  // Presence events with new status system
  setPresence(status: UserPresenceStatus, roomId?: string): void {
    this.emit(SOCKET_EVENTS.PRESENCE_UPDATE, {
      status,
      roomId,
      timestamp: Date.now(),
    });
  }

  /**
   * @deprecated User status is now managed by the auth service (login/logout).
   * This method no longer affects global user status and should not be used.
   */
  setUserStatus(_status: UserPresenceStatus): void {
    console.warn('[Socket] setUserStatus is deprecated. User status is managed by auth service.');
    // No-op: Status is now managed by auth service in Redis
  }

  onPresenceUpdate(callback: (presence: UserPresence) => void): void {
    this.on(SOCKET_EVENTS.PRESENCE_UPDATE, callback);
  }

  /**
   * @deprecated User status changes are now managed by auth service, not socket events.
   */
  onUserStatusChanged(_callback: (data: { userId: string; status: UserPresenceStatus }) => void): void {
    console.warn('[Socket] onUserStatusChanged is deprecated. User status is managed by auth service.');
    // No-op: Status changes are managed by auth service
  }

  onRoomPresenceUpdate(callback: (data: { roomId: string; users: UserPresence[] }) => void): void {
    this.on('room_presence_update', callback);
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
