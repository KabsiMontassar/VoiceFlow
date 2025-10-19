import { ROOM_CODE_CHARSET, ROOM_CODE_LENGTH, ROOM_CODE_PREFIX } from '../constants/index';
/**
 * Generates a unique room code (e.g., "TEAM-X7B9K2")
 */
export const generateRoomCode = () => {
    const chars = ROOM_CODE_CHARSET;
    let code = '';
    for (let i = 0; i < ROOM_CODE_LENGTH; i++) {
        code += chars.charAt(Math.floor(Math.random() * chars.length));
    }
    return `${ROOM_CODE_PREFIX}-${code}`;
};
/**
 * Generates a UUID v4
 */
export const generateUUID = () => {
    return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, (c) => {
        const r = (Math.random() * 16) | 0;
        const v = c === 'x' ? r : (r & 0x3) | 0x8;
        return v.toString(16);
    });
};
/**
 * Validates UUID format
 */
export const isValidUUID = (uuid) => {
    const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
    return uuidRegex.test(uuid);
};
/**
 * Validates room code format
 */
export const isValidRoomCode = (code) => {
    const roomCodeRegex = new RegExp(`^${ROOM_CODE_PREFIX}-[A-Z0-9]{${ROOM_CODE_LENGTH}}$`);
    return roomCodeRegex.test(code);
};
/**
 * Formats a date to ISO string
 */
export const formatDate = (date) => {
    return new Date(date).toISOString();
};
/**
 * Calculates time elapsed since a given date
 */
export const getTimeElapsed = (date) => {
    const diff = Date.now() - new Date(date).getTime();
    const seconds = Math.floor(diff / 1000);
    const minutes = Math.floor(seconds / 60);
    const hours = Math.floor(minutes / 60);
    const days = Math.floor(hours / 24);
    if (days > 0)
        return `${days}d ago`;
    if (hours > 0)
        return `${hours}h ago`;
    if (minutes > 0)
        return `${minutes}m ago`;
    if (seconds > 0)
        return `${seconds}s ago`;
    return 'just now';
};
/**
 * Truncates text with ellipsis
 */
export const truncateText = (text, maxLength) => {
    if (text.length <= maxLength)
        return text;
    return `${text.substring(0, maxLength)}...`;
};
/**
 * Sanitizes HTML to prevent XSS
 */
export const sanitizeHtml = (html) => {
    // Basic HTML sanitization - removes script tags and other dangerous content
    return html
        .replace(/<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi, '')
        .replace(/on\w+\s*=\s*"[^"]*"/gi, '')
        .replace(/on\w+\s*=\s*'[^']*'/gi, '');
};
/**
 * Checks if a string is a valid email
 */
export const isValidEmail = (email) => {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return emailRegex.test(email);
};
/**
 * Formats file size in human-readable format
 */
export const formatFileSize = (bytes) => {
    if (bytes === 0)
        return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
};
/**
 * Sleeps for a given number of milliseconds
 */
export const sleep = (ms) => {
    return new Promise((resolve) => setTimeout(resolve, ms));
};
/**
 * Creates a debounced version of a function
 */
export const debounce = (func, wait) => {
    let timeout = null;
    return function executedFunction(...args) {
        const later = () => {
            timeout = null;
            func(...args);
        };
        if (timeout)
            clearTimeout(timeout);
        timeout = setTimeout(later, wait);
    };
};
/**
 * Creates a throttled version of a function
 */
export const throttle = (func, limit) => {
    let inThrottle;
    return function executedFunction(...args) {
        if (!inThrottle) {
            func(...args);
            inThrottle = true;
            setTimeout(() => (inThrottle = false), limit);
        }
    };
};
/**
 * Retries a promise-returning function with exponential backoff
 */
export const retryWithBackoff = async (fn, maxAttempts = 3, initialDelay = 1000) => {
    let lastError = null;
    for (let attempt = 0; attempt < maxAttempts; attempt++) {
        try {
            return await fn();
        }
        catch (error) {
            lastError = error;
            if (attempt < maxAttempts - 1) {
                const delay = initialDelay * Math.pow(2, attempt);
                await sleep(delay);
            }
        }
    }
    throw lastError;
};
/**
 * Converts query parameters to string
 */
export const buildQueryString = (params) => {
    const pairs = [];
    Object.entries(params).forEach(([key, value]) => {
        if (value !== undefined && value !== null) {
            pairs.push(`${encodeURIComponent(key)}=${encodeURIComponent(String(value))}`);
        }
    });
    return pairs.join('&');
};
/**
 * Deeply clones an object
 */
export const deepClone = (obj) => {
    return JSON.parse(JSON.stringify(obj));
};
/**
 * Checks if two objects are deeply equal
 */
export const isDeepEqual = (obj1, obj2) => {
    return JSON.stringify(obj1) === JSON.stringify(obj2);
};
//# sourceMappingURL=index.js.map