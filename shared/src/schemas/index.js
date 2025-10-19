import { z } from 'zod';
// Auth Schemas
export const LoginSchema = z.object({
    email: z.string().email('Invalid email address'),
    password: z.string().min(6, 'Password must be at least 6 characters'),
});
export const RegisterSchema = z.object({
    username: z.string().min(3, 'Username must be at least 3 characters').max(20),
    email: z.string().email('Invalid email address'),
    password: z.string().min(8, 'Password must be at least 8 characters'),
    confirmPassword: z.string(),
}).refine((data) => data.password === data.confirmPassword, {
    message: 'Passwords do not match',
    path: ['confirmPassword'],
});
// Room Schemas
export const RoomSettingsSchema = z.object({
    isPublic: z.boolean().default(true),
    allowGuests: z.boolean().default(false),
    requireApproval: z.boolean().default(false),
    recordMessages: z.boolean().default(true),
});
export const CreateRoomSchema = z.object({
    name: z.string().min(3, 'Room name must be at least 3 characters').max(100),
    description: z.string().max(500).optional().nullable(),
    maxUsers: z.number().int().min(2).max(500).default(100),
    settings: RoomSettingsSchema.optional(),
});
export const UpdateRoomSchema = z.object({
    name: z.string().min(3).max(100).optional(),
    description: z.string().max(500).optional().nullable(),
    maxUsers: z.number().int().min(2).max(500).optional(),
    settings: RoomSettingsSchema.optional(),
});
// Message Schemas
export const CreateMessageSchema = z.object({
    content: z.string().min(1, 'Message cannot be empty').max(4000),
    fileId: z.string().optional().nullable(),
    type: z.enum(['text', 'file', 'voice_note']).default('text'),
});
// Pagination Schemas
export const PaginationSchema = z.object({
    page: z.number().int().positive().default(1),
    limit: z.number().int().min(1).max(100).default(20),
});
// File Upload Schema
export const FileUploadSchema = z.object({
    fileName: z.string().min(1),
    fileSize: z.number().positive(),
    mimeType: z.string(),
    uploadedBy: z.string().uuid(),
});
// User Update Schema
export const UpdateUserSchema = z.object({
    username: z.string().min(3).max(20).optional(),
    email: z.string().email().optional(),
    avatarUrl: z.string().url().optional().nullable(),
});
// Validation helper
export const validateSchema = (schema, data) => {
    return schema.parse(data);
};
export const validateSchemaAsync = async (schema, data) => {
    return schema.parseAsync(data);
};
//# sourceMappingURL=index.js.map