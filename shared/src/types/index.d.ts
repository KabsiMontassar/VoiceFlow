export interface User {
    id: string;
    username: string;
    email: string;
    avatarUrl: string | null;
    createdAt: Date;
    updatedAt: Date;
}
export interface UserWithoutPassword extends User {
}
export interface AuthPayload {
    userId: string;
    email: string;
    username: string;
}
export interface Room {
    id: string;
    code: string;
    name: string;
    description: string | null;
    createdById: string;
    maxUsers: number;
    settings: RoomSettings;
    createdAt: Date;
    lastActivity: Date;
    isActive: boolean;
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
    participants: (RoomUser & {
        user: User;
    })[];
    participantCount: number;
}
export declare enum MessageType {
    TEXT = "text",
    FILE = "file",
    SYSTEM = "system",
    VOICE_NOTE = "voice_note"
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
export interface FileMetadata {
    id: string;
    name: string;
    size: number;
    mimeType: string;
    url: string;
    uploadedBy: string;
    uploadedAt: Date;
}
export interface VoiceRoom {
    roomId: string;
    participants: string[];
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
export declare enum UserPresenceStatus {
    ONLINE = "online",
    AWAY = "away",
    OFFLINE = "offline",
    IN_CALL = "in_call"
}
export interface UserPresence {
    userId: string;
    roomId: string;
    status: UserPresenceStatus;
    isTyping: boolean;
    lastActivity: Date;
}
export interface TypingIndicator {
    userId: string;
    roomId: string;
    isTyping: boolean;
}
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
export interface AuthResponse {
    token: string;
    refreshToken: string;
    user: User;
    expiresIn: number;
}
export declare enum NotificationType {
    MESSAGE = "message",
    ROOM_INVITE = "room_invite",
    USER_JOINED = "user_joined",
    USER_LEFT = "user_left",
    SYSTEM = "system"
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
//# sourceMappingURL=index.d.ts.map