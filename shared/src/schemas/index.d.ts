import { z } from 'zod';
export declare const LoginSchema: z.ZodObject<{
    email: z.ZodString;
    password: z.ZodString;
}, z.core.$strip>;
export type LoginInput = z.infer<typeof LoginSchema>;
export declare const RegisterSchema: z.ZodObject<{
    username: z.ZodString;
    email: z.ZodString;
    password: z.ZodString;
    confirmPassword: z.ZodString;
}, z.core.$strip>;
export type RegisterInput = z.infer<typeof RegisterSchema>;
export declare const RoomSettingsSchema: z.ZodObject<{
    isPublic: z.ZodDefault<z.ZodBoolean>;
    allowGuests: z.ZodDefault<z.ZodBoolean>;
    requireApproval: z.ZodDefault<z.ZodBoolean>;
    recordMessages: z.ZodDefault<z.ZodBoolean>;
}, z.core.$strip>;
export declare const CreateRoomSchema: z.ZodObject<{
    name: z.ZodString;
    description: z.ZodNullable<z.ZodOptional<z.ZodString>>;
    maxUsers: z.ZodDefault<z.ZodNumber>;
    settings: z.ZodOptional<z.ZodObject<{
        isPublic: z.ZodDefault<z.ZodBoolean>;
        allowGuests: z.ZodDefault<z.ZodBoolean>;
        requireApproval: z.ZodDefault<z.ZodBoolean>;
        recordMessages: z.ZodDefault<z.ZodBoolean>;
    }, z.core.$strip>>;
}, z.core.$strip>;
export type CreateRoomInput = z.infer<typeof CreateRoomSchema>;
export declare const UpdateRoomSchema: z.ZodObject<{
    name: z.ZodOptional<z.ZodString>;
    description: z.ZodNullable<z.ZodOptional<z.ZodString>>;
    maxUsers: z.ZodOptional<z.ZodNumber>;
    settings: z.ZodOptional<z.ZodObject<{
        isPublic: z.ZodDefault<z.ZodBoolean>;
        allowGuests: z.ZodDefault<z.ZodBoolean>;
        requireApproval: z.ZodDefault<z.ZodBoolean>;
        recordMessages: z.ZodDefault<z.ZodBoolean>;
    }, z.core.$strip>>;
}, z.core.$strip>;
export type UpdateRoomInput = z.infer<typeof UpdateRoomSchema>;
export declare const CreateMessageSchema: z.ZodObject<{
    content: z.ZodString;
    fileId: z.ZodNullable<z.ZodOptional<z.ZodString>>;
    type: z.ZodDefault<z.ZodEnum<{
        text: "text";
        file: "file";
        voice_note: "voice_note";
    }>>;
}, z.core.$strip>;
export type CreateMessageInput = z.infer<typeof CreateMessageSchema>;
export declare const PaginationSchema: z.ZodObject<{
    page: z.ZodDefault<z.ZodNumber>;
    limit: z.ZodDefault<z.ZodNumber>;
}, z.core.$strip>;
export type PaginationInput = z.infer<typeof PaginationSchema>;
export declare const FileUploadSchema: z.ZodObject<{
    fileName: z.ZodString;
    fileSize: z.ZodNumber;
    mimeType: z.ZodString;
    uploadedBy: z.ZodString;
}, z.core.$strip>;
export type FileUploadInput = z.infer<typeof FileUploadSchema>;
export declare const UpdateUserSchema: z.ZodObject<{
    username: z.ZodOptional<z.ZodString>;
    email: z.ZodOptional<z.ZodString>;
    avatarUrl: z.ZodNullable<z.ZodOptional<z.ZodString>>;
}, z.core.$strip>;
export type UpdateUserInput = z.infer<typeof UpdateUserSchema>;
export declare const validateSchema: <T>(schema: z.ZodSchema<T>, data: unknown) => T;
export declare const validateSchemaAsync: <T>(schema: z.ZodSchema<T>, data: unknown) => Promise<T>;
//# sourceMappingURL=index.d.ts.map