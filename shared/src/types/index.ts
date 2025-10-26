// User Types
export interface User {
  id: string;
  username: string;
  email: string;
  avatarUrl: string | null;
  status: UserPresenceStatus;
  friendCode: string;
  age: number | null;
  country: string | null;
  gender: 'male' | 'female' | null;
  bio: string | null;
  lastSeen: Date;
  createdAt: Date;
  updatedAt: Date;
  settings?: UserSettings;
}

export interface UserSettings {
  id: string;
  userId: string;
  allowFriendRequests: boolean;
  showOnlineStatus: boolean;
  createdAt: Date;
  updatedAt: Date;
}

export interface UserWithoutPassword extends User {}

export interface AuthPayload {
  userId: string;
  email: string;
  username: string;
}

// Friend Types
export interface FriendRequest {
  id: string;
  senderId: string;
  receiverId: string;
  status: 'pending' | 'accepted' | 'rejected' | 'cancelled';
  createdAt: Date;
  updatedAt: Date;
  sender?: User;
  receiver?: User;
}

export interface Friendship {
  id: string;
  user1Id: string;
  user2Id: string;
  roomId: string | null;
  createdAt: Date;
  friend?: User; // The other user in the friendship
  privateRoom?: Room;
}

export interface FriendWithStatus extends User {
  friendshipId: string;
  isOnline: boolean;
  privateRoomId: string | null;
}

// Direct Message Types
export interface DirectMessage {
  id: string;
  senderId: string;
  receiverId: string;
  content: string;
  isRead: boolean;
  createdAt: Date;
  updatedAt: Date;
  sender?: User;
  receiver?: User;
}

export interface DMConversation {
  friendId: string;
  friend: User;
  lastMessage: DirectMessage | null;
  unreadCount: number;
}

// Room Types
export interface Room {
  id: string;
  code: string; // e.g., "TEAM-X7B9K2"
  name: string;
  description: string | null;
  createdById: string;
  maxUsers: number;
  settings: RoomSettings;
  createdAt: Date;
  lastActivity: Date;
  isActive: boolean;
  isPrivate?: boolean; // True for 1:1 friend rooms
}

export interface RoomSettings {
  isPublic: boolean;
  allowGuests: boolean;
  requireApproval: boolean;
  recordMessages: boolean;
}

export interface RoomUser {
  id: string;
  roomId: string;
  userId: string;
  role: 'admin' | 'member';
  joinedAt: Date;
}

export interface RoomWithParticipants extends Room {
  participants: (RoomUser & { user: User })[];
  participantCount: number;
}

export interface RoomBan {
  id: string;
  roomId: string;
  userId: string;
  bannedBy: string;
  reason: string | null;
  createdAt: Date;
  bannedUser?: User;
  banner?: User;
}

// Message Types
export enum MessageType {
  TEXT = 'text',
  FILE = 'file',
  SYSTEM = 'system',
  VOICE_NOTE = 'voice_note',
}

export interface Message {
  id: string;
  roomId: string;
  userId: string;
  content: string;
  type: MessageType;
  fileId?: string | null;
  createdAt: Date;
  updatedAt: Date;
}

export interface MessageWithAuthor extends Message {
  author: User;
  file?: FileMetadata | null;
}

// File Types
export interface FileMetadata {
  id: string;
  name: string;
  size: number;
  mimeType: string;
  url: string;
  uploadedBy: string;
  uploadedAt: Date;
}

// Voice/WebRTC Types
export interface VoiceRoom {
  roomId: string;
  participants: string[]; // User IDs
  isActive: boolean;
  createdAt: Date;
}

export interface RTCSignalingMessage {
  type: 'offer' | 'answer' | 'ice-candidate' | 'user-joined' | 'user-left';
  from: string;
  to?: string;
  data?: Record<string, unknown> | null;
  timestamp: number;
}

// Presence Types
export enum UserPresenceStatus {
  ACTIVE = 'active',      // User is logged in and has valid session
  INACTIVE = 'inactive',  // User is not logged in or session expired
  AWAY = 'away',         // User is logged in but inactive
  IN_CALL = 'in_call',   // User is in a voice/video call
}

export interface UserPresence {
  userId: string;
  roomId: string;
  status: UserPresenceStatus;
  isTyping: boolean;
  lastActivity: Date;
  sessionInfo?: {
    sessionId?: string;
    deviceId?: string;
    ipAddress?: string;
    userAgent?: string;
  };
}

export interface TypingIndicator {
  userId: string;
  roomId: string;
  isTyping: boolean;
}

// Socket Event Types
export interface SocketErrorResponse {
  code: string;
  message: string;
  details?: Record<string, unknown>;
}

export interface SocketSuccessResponse<T = unknown> {
  success: true;
  data: T;
  timestamp: number;
}

// Pagination
export interface PaginationParams {
  page: number;
  limit: number;
}

export interface PaginatedResponse<T> {
  data: T[];
  total: number;
  page: number;
  limit: number;
  hasMore: boolean;
}

// API Response Types
export type ApiResponse<T> = {
  success: boolean;
  data?: T;
  error?: {
    code: string;
    message: string;
    details?: Record<string, unknown>;
  };
  timestamp: number;
};

// Auth Response
export interface AuthResponse {
  token: string;
  refreshToken: string;
  user: User;
  expiresIn: number;
}

// Notification Types
export enum NotificationType {
  MESSAGE = 'message',
  ROOM_INVITE = 'room_invite',
  USER_JOINED = 'user_joined',
  USER_LEFT = 'user_left',
  SYSTEM = 'system',
}

export interface Notification {
  id: string;
  userId: string;
  type: NotificationType;
  title: string;
  body: string;
  data: Record<string, unknown>;
  read: boolean;
  createdAt: Date;
}
