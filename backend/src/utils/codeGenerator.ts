/**
 * Code generation utilities for friend codes and room codes
 */

/**
 * Generates a unique friend code (12 characters)
 * Format: ABC-DEF-GHI-J (uppercase letters and numbers)
 */
export const generateFriendCode = (): string => {
  const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789'; // Excluded confusing characters
  let code = '';
  
  for (let i = 0; i < 12; i++) {
    if (i > 0 && i % 3 === 0) {
      code += '-';
    }
    code += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  
  return code; // e.g., "ABC-DEF-GHI-J"
};

/**
 * Generates a unique room code (8-12 characters)
 * Format: TEAM-X7B9K2 (uppercase letters and numbers)
 */
export const generateRoomCode = (): string => {
  const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
  const length = Math.floor(Math.random() * 5) + 8; // 8-12 chars
  let code = '';
  
  for (let i = 0; i < length; i++) {
    code += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  
  return code.toUpperCase();
};

/**
 * Validates friend code format
 */
export const isValidFriendCode = (code: string): boolean => {
  // Format: XXX-XXX-XXX-X (12 chars + 3 dashes = 15 total)
  const friendCodeRegex = /^[A-HJ-NP-Z2-9]{3}-[A-HJ-NP-Z2-9]{3}-[A-HJ-NP-Z2-9]{3}-[A-HJ-NP-Z2-9]$/;
  return friendCodeRegex.test(code);
};

/**
 * Validates room code format
 */
export const isValidRoomCode = (code: string): boolean => {
  // Alphanumeric, 6-20 characters
  const roomCodeRegex = /^[A-Z0-9]{6,20}$/;
  return roomCodeRegex.test(code.toUpperCase());
};

/**
 * Sanitizes and formats room code
 */
export const sanitizeRoomCode = (code: string): string => {
  return code.toUpperCase().replace(/[^A-Z0-9]/g, '');
};

/**
 * Sanitizes and formats friend code
 */
export const sanitizeFriendCode = (code: string): string => {
  // Remove all non-alphanumeric characters
  const cleaned = code.toUpperCase().replace(/[^A-HJ-NP-Z2-9]/g, '');
  
  // Add dashes in the correct positions
  if (cleaned.length === 12) {
    return `${cleaned.slice(0, 3)}-${cleaned.slice(3, 6)}-${cleaned.slice(6, 9)}-${cleaned.slice(9)}`;
  }
  
  return cleaned;
};

export default {
  generateFriendCode,
  generateRoomCode,
  isValidFriendCode,
  isValidRoomCode,
  sanitizeRoomCode,
  sanitizeFriendCode,
};
