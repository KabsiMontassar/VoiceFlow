/**
 * Generates a unique room code (e.g., "TEAM-X7B9K2")
 */
export declare const generateRoomCode: () => string;
/**
 * Generates a UUID v4
 */
export declare const generateUUID: () => string;
/**
 * Validates UUID format
 */
export declare const isValidUUID: (uuid: string) => boolean;
/**
 * Validates room code format
 */
export declare const isValidRoomCode: (code: string) => boolean;
/**
 * Formats a date to ISO string
 */
export declare const formatDate: (date: Date | string | number) => string;
/**
 * Calculates time elapsed since a given date
 */
export declare const getTimeElapsed: (date: Date | string | number) => string;
/**
 * Truncates text with ellipsis
 */
export declare const truncateText: (text: string, maxLength: number) => string;
/**
 * Sanitizes HTML to prevent XSS
 */
export declare const sanitizeHtml: (html: string) => string;
/**
 * Checks if a string is a valid email
 */
export declare const isValidEmail: (email: string) => boolean;
/**
 * Formats file size in human-readable format
 */
export declare const formatFileSize: (bytes: number) => string;
/**
 * Sleeps for a given number of milliseconds
 */
export declare const sleep: (ms: number) => Promise<void>;
/**
 * Creates a debounced version of a function
 */
export declare const debounce: <T extends (...args: unknown[]) => unknown>(func: T, wait: number) => (...args: Parameters<T>) => void;
/**
 * Creates a throttled version of a function
 */
export declare const throttle: <T extends (...args: unknown[]) => unknown>(func: T, limit: number) => (...args: Parameters<T>) => void;
/**
 * Retries a promise-returning function with exponential backoff
 */
export declare const retryWithBackoff: <T>(fn: () => Promise<T>, maxAttempts?: number, initialDelay?: number) => Promise<T>;
/**
 * Converts query parameters to string
 */
export declare const buildQueryString: (params: Record<string, unknown>) => string;
/**
 * Deeply clones an object
 */
export declare const deepClone: <T>(obj: T) => T;
/**
 * Checks if two objects are deeply equal
 */
export declare const isDeepEqual: (obj1: unknown, obj2: unknown) => boolean;
//# sourceMappingURL=index.d.ts.map