/**
 * Valero Design System - Color Configuration
 * 
 * Centralized color palette for programmatic access.
 * Use these colors in components that need dynamic color assignment or Tailwind classes.
 */

export const colors = {
  // Primary Palette
  primary: '#2A6EDB',        // Vibrant Blue - primary actions
  secondary: '#7AAFCF',      // Softer Sky Blue - secondary accents

  // Text Colors
  text: {
    primary: '#E4E8EC',      // Soft Light Gray - primary text
    muted: '#A3A9AF',        // Muted Gray - secondary text
  },

  // Background Colors
  background: {
    primary: '#0D1014',      // Deep Dark - main background
    secondary: '#1B1F23',    // Dark Panel - secondary background
    tertiary: '#24292E',     // Card Background - tertiary background
  },

  // Semantic Colors
  surface: '#24292E',        // Surface for cards & panels
  border: {
    default: '#3A434A',      // Standard border color
    subtle: '#2A3137',       // Subtle divider lines
  },

  // State Colors
  success: '#5FBFA2',        // Seafoam Green - success state
  warning: '#E0B85A',        // Warm Amber - warning state
  error: '#D97B7B',          // Coral Red - error state
  info: '#1E5BC7',           // Deep Blue - info state
} as const;

/**
 * Gradients - Predefined gradient combinations
 */
export const gradients = {
  // Primary to Secondary gradient
  primaryToSecondary: 'linear-gradient(180deg, #2A6EDB 0%, #7AAFCF 100%)',
  
  // For use with gradient-text class
  textGradient: {
    primary: 'linear-gradient(180deg, #2A6EDB 0%, #7AAFCF 100%)',
    accent: 'linear-gradient(135deg, #2A6EDB 0%, #1E5BC7 100%)',
  },

  // For use with gradient-bg class
  backgroundGradient: {
    primary: 'linear-gradient(180deg, #2A6EDB 0%, #7AAFCF 100%)',
    subtle: 'linear-gradient(180deg, #1B1F23 0%, #24292E 100%)',
  },
} as const;

/**
 * Semantic color mappings for different use cases
 */
export const semanticColors = {
  action: {
    primary: colors.primary,
    secondary: colors.secondary,
    disabled: colors.text.muted,
  },
  interactive: {
    hover: colors.secondary,
    active: colors.primary,
    focus: colors.primary,
  },
  feedback: {
    success: colors.success,
    warning: colors.warning,
    error: colors.error,
    info: colors.info,
  },
  surface: {
    background: colors.background.primary,
    panel: colors.background.secondary,
    card: colors.background.tertiary,
    raised: colors.surface,
  },
  border: {
    default: colors.border.default,
    subtle: colors.border.subtle,
    emphasis: colors.primary,
  },
  text: {
    primary: colors.text.primary,
    secondary: colors.text.muted,
    disabled: colors.text.muted,
  },
} as const;

/**
 * Utility function to apply gradient text styling
 * Usage: `style={getGradientTextStyle()}`
 */
export function getGradientTextStyle() {
  return {
    backgroundImage: gradients.textGradient.primary,
    WebkitBackgroundClip: 'text' as const,
    WebkitTextFillColor: 'transparent',
    backgroundClip: 'text' as const,
  };
}

/**
 * Utility function to apply gradient background styling
 * Usage: `style={getGradientBackgroundStyle()}`
 */
export function getGradientBackgroundStyle() {
  return {
    backgroundImage: gradients.backgroundGradient.primary,
  };
}

/**
 * Get color with opacity
 * Usage: `getColorWithOpacity(colors.primary, 0.5)`
 */
export function getColorWithOpacity(color: string, opacity: number): string {
  // Convert hex to RGB
  const hex = color.replace('#', '');
  const r = parseInt(hex.substring(0, 2), 16);
  const g = parseInt(hex.substring(2, 4), 16);
  const b = parseInt(hex.substring(4, 6), 16);
  
  return `rgba(${r}, ${g}, ${b}, ${opacity})`;
}

/**
 * Type exports for strict typing
 */
export type Color = typeof colors;
export type Gradient = typeof gradients;
export type SemanticColor = typeof semanticColors;
