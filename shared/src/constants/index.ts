// Socket.IO Events - Client to Server
export const SOCKET_EVENTS = {
  // Auth
  AUTH: 'auth',
  DISCONNECT: 'disconnect',

  // Room
  ROOM_JOIN: 'room:join',
  ROOM_LEAVE: 'room:leave',
  ROOM_CREATE: 'room:create',
  ROOM_UPDATE: 'room:update',
  ROOM_DELETE: 'room:delete',
  ROOM_LIST: 'room:list',
  ROOM_GET: 'room:get',

  // Messaging
  MESSAGE_SEND: 'message:send',
  MESSAGE_EDIT: 'message:edit',
  MESSAGE_DELETE: 'message:delete',
  MESSAGE_HISTORY: 'message:history',
  TYPING_START: 'typing:start',
  TYPING_STOP: 'typing:stop',

  // Presence
  PRESENCE_UPDATE: 'presence:update',
  PRESENCE_REQUEST: 'presence:request',

  // Voice/WebRTC
  VOICE_JOIN: 'voice:join',
  VOICE_LEAVE: 'voice:leave',
  VOICE_SIGNAL: 'voice:signal',
  VOICE_MUTE: 'voice:mute',
  VOICE_UNMUTE: 'voice:unmute',
  VOICE_DEAFEN: 'voice:deafen',
  VOICE_UNDEAFEN: 'voice:undeafen',
  VOICE_SPEAKING: 'voice:speaking',

  // Notifications
  NOTIFICATION_ACK: 'notification:ack',
} as const;

// Socket.IO Events - Server to Client
export const SOCKET_RESPONSES = {
  // Connection
  CONNECT_SUCCESS: 'connect:success',
  CONNECT_ERROR: 'connect:error',

  // Room
  ROOM_JOINED: 'room:joined',
  ROOM_LEFT: 'room:left',
  ROOM_UPDATED: 'room:updated',
  ROOM_DELETED: 'room:deleted',
  ROOM_USER_JOINED: 'room:user_joined',
  ROOM_USER_LEFT: 'room:user_left',
  ROOM_MEMBERS: 'room:members',

  // Messaging
  MESSAGE_RECEIVED: 'message:received',
  MESSAGE_EDITED: 'message:edited',
  MESSAGE_DELETED: 'message:deleted',
  USER_TYPING: 'user:typing',
  USER_STOPPED_TYPING: 'user:stopped_typing',

  // Presence
  USER_PRESENCE_CHANGED: 'user:presence_changed',
  PRESENCE_LIST: 'presence:list',

  // Voice/WebRTC
  VOICE_USER_JOINED: 'voice:user_joined',
  VOICE_USER_LEFT: 'voice:user_left',
  VOICE_USER_MUTED: 'voice:user_muted',
  VOICE_USER_DEAFENED: 'voice:user_deafened',
  VOICE_USER_SPEAKING: 'voice:user_speaking',
  VOICE_PARTICIPANTS: 'voice:participants',
  VOICE_ERROR: 'voice:error',
  VOICE_SIGNAL: 'voice:signal',
  VOICE_CONNECTION_QUALITY: 'voice:connection_quality',
  
  // User voice activity in text rooms
  USER_VOICE_JOINED: 'user:voice_joined',
  USER_VOICE_LEFT: 'user:voice_left',
  USER_VOICE_MUTED: 'user:voice_muted',

  // Errors
  ERROR: 'error',
  PERMISSION_DENIED: 'permission:denied',
  NOT_FOUND: 'not:found',
  VALIDATION_ERROR: 'validation:error',
} as const;

// HTTP API Routes
export const API_ROUTES = {
  // Auth
  AUTH_LOGIN: '/api/v1/auth/login',
  AUTH_REGISTER: '/api/v1/auth/register',
  AUTH_REFRESH: '/api/v1/auth/refresh',
  AUTH_LOGOUT: '/api/v1/auth/logout',
  AUTH_VERIFY: '/api/v1/auth/verify',

  // Users
  USERS_ME: '/api/v1/users/me',
  USERS_UPDATE: '/api/v1/users/:id',
  USERS_GET: '/api/v1/users/:id',
  USERS_AVATAR: '/api/v1/users/:id/avatar',

  // Rooms
  ROOMS_CREATE: '/api/v1/rooms',
  ROOMS_LIST: '/api/v1/rooms',
  ROOMS_GET: '/api/v1/rooms/:id',
  ROOMS_UPDATE: '/api/v1/rooms/:id',
  ROOMS_DELETE: '/api/v1/rooms/:id',
  ROOMS_JOIN: '/api/v1/rooms/:code/join',
  ROOMS_LEAVE: '/api/v1/rooms/:id/leave',
  ROOMS_MEMBERS: '/api/v1/rooms/:id/members',

  // Messages
  MESSAGES_SEND: '/api/v1/messages',
  MESSAGES_LIST: '/api/v1/rooms/:roomId/messages',
  MESSAGES_GET: '/api/v1/messages/:id',
  MESSAGES_DELETE: '/api/v1/messages/:id',

  // Files
  FILES_UPLOAD: '/api/v1/files/upload',
  FILES_GET: '/api/v1/files/:id',
  FILES_DELETE: '/api/v1/files/:id',

  // Notifications
  NOTIFICATIONS_LIST: '/api/v1/notifications',
  NOTIFICATIONS_MARK_READ: '/api/v1/notifications/:id/read',
} as const;

// Error Codes
export const ERROR_CODES = {
  // Auth
  INVALID_CREDENTIALS: 'INVALID_CREDENTIALS',
  TOKEN_EXPIRED: 'TOKEN_EXPIRED',
  UNAUTHORIZED: 'UNAUTHORIZED',
  USER_NOT_FOUND: 'USER_NOT_FOUND',

  // Room
  ROOM_NOT_FOUND: 'ROOM_NOT_FOUND',
  ROOM_FULL: 'ROOM_FULL',
  INVALID_ROOM_CODE: 'INVALID_ROOM_CODE',
  ALREADY_IN_ROOM: 'ALREADY_IN_ROOM',

  // Messages
  MESSAGE_NOT_FOUND: 'MESSAGE_NOT_FOUND',
  MESSAGE_TOO_LONG: 'MESSAGE_TOO_LONG',

  // Files
  FILE_NOT_FOUND: 'FILE_NOT_FOUND',
  FILE_TOO_LARGE: 'FILE_TOO_LARGE',
  INVALID_FILE_TYPE: 'INVALID_FILE_TYPE',

  // General
  INTERNAL_ERROR: 'INTERNAL_ERROR',
  VALIDATION_ERROR: 'VALIDATION_ERROR',
  PERMISSION_DENIED: 'PERMISSION_DENIED',
  RATE_LIMIT_EXCEEDED: 'RATE_LIMIT_EXCEEDED',
} as const;

// Room Codes Generation
export const ROOM_CODE_LENGTH = 9;
export const ROOM_CODE_PREFIX = 'ROOM';
export const ROOM_CODE_CHARSET = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';

// Pagination Defaults
export const DEFAULT_PAGE = 1;
export const DEFAULT_LIMIT = 20;
export const MAX_LIMIT = 100;
export const MIN_LIMIT = 1;

// Timeouts and Intervals
export const TYPING_INDICATOR_TIMEOUT = 3000; // 3 seconds
export const PRESENCE_UPDATE_INTERVAL = 30000; // 30 seconds
export const HEARTBEAT_INTERVAL = 45000; // 45 seconds
export const MESSAGE_DELETE_DELAY = 86400000; // 24 hours (for soft deletes)

// Constraints
export const CONSTRAINTS = {
  USERNAME_MIN_LENGTH: 3,
  USERNAME_MAX_LENGTH: 20,
  ROOM_NAME_MIN_LENGTH: 3,
  ROOM_NAME_MAX_LENGTH: 100,
  MESSAGE_MAX_LENGTH: 4000,
  FILE_MAX_SIZE: 50 * 1024 * 1024, // 50 MB
  DESCRIPTION_MAX_LENGTH: 500,
  MAX_ROOM_USERS: 500,
  MIN_ROOM_USERS: 2,
} as const;

// Mime Types
export const ALLOWED_FILE_TYPES = [
  'image/jpeg',
  'image/png',
  'image/gif',
  'image/webp',
  'application/pdf',
  'application/msword',
  'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
  'application/vnd.ms-excel',
  'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
  'text/plain',
  'text/csv',
  'audio/mpeg',
  'audio/wav',
  'video/mp4',
] as const;

// WebRTC Configuration
export const WEBRTC_CONFIG = {
  ICE_SERVERS: [
    { urls: 'stun:stun.l.google.com:19302' },
    { urls: 'stun:stun1.l.google.com:19302' },
    { urls: 'stun:stun2.l.google.com:19302' },
    { urls: 'stun:stun3.l.google.com:19302' },
    { urls: 'stun:stun4.l.google.com:19302' },
  ],
  OFFER_OPTIONS: {
    offerToReceiveAudio: true,
    offerToReceiveVideo: false,
  },
  PEER_CONNECTION_CONFIG: {
    iceServers: [
      { urls: 'stun:stun.l.google.com:19302' },
      { urls: 'stun:stun1.l.google.com:19302' },
    ],
    iceCandidatePoolSize: 10,
  },
  AUDIO_CONSTRAINTS: {
    audio: {
      echoCancellation: true,
      noiseSuppression: true,
      autoGainControl: true,
      sampleRate: 48000,
      channelCount: 1,
    },
    video: false,
  },
  // Voice activity detection thresholds
  VOICE_ACTIVITY_THRESHOLD: 0.1, // Normalized level (0-1)
  SPEAKING_DETECTION_DELAY: 100, // ms
  SPEAKING_STOP_DELAY: 500, // ms
  // Connection quality thresholds (RTT in ms)
  CONNECTION_QUALITY: {
    EXCELLENT: 50,
    GOOD: 150,
    FAIR: 300,
    POOR: 500,
  },
} as const;
