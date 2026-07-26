/**
 * @qr/design-system — Themes
 * 
 * Light and dark themes using the single-accent design system.
 * All theme values reference tokens; no hard-coded colors.
 */

import { colors, shadows } from '../tokens/index.js';

const base = {
  accent: colors.accent,
  neutral: colors.neutral,
  semantic: colors.semantic,
  confidence: colors.confidence,
  preview: colors.preview,
};

export const lightTheme = {
  ...base,
  name: 'light',
  surface: {
    bg: colors.neutral[0],
    elevated: colors.neutral[50],
    overlay: 'rgba(255,255,255,0.92)',
    inset: colors.neutral[100],
    input: colors.neutral[0],
  },
  text: {
    primary: colors.neutral[900],
    secondary: colors.neutral[700],
    tertiary: colors.neutral[600],
    disabled: colors.neutral[500],
    inverse: colors.neutral[0],
    accent: colors.accent[600],
  },
  border: {
    subtle: colors.neutral[200],
    default: colors.neutral[300],
    strong: colors.neutral[400],
    focus: colors.accent[400],
  },
  shadow: {
    sm: shadows.sm,
    md: shadows.md,
    lg: shadows.lg,
    xl: shadows.xl,
    focus: shadows.focus,
  },
  qr: {
    module: colors.neutral[900],
    quietZone: colors.neutral[0],
    finder: colors.neutral[900],
    overlayBlend: 'multiply',
  },
};

export const darkTheme = {
  ...base,
  name: 'dark',
  surface: {
    bg: colors.neutral[950],
    elevated: colors.neutral[900],
    overlay: 'rgba(18,18,20,0.92)',
    inset: colors.neutral[800],
    input: colors.neutral[900],
  },
  text: {
    primary: colors.neutral[0],
    secondary: colors.neutral[300],
    tertiary: colors.neutral[400],
    disabled: colors.neutral[600],
    inverse: colors.neutral[900],
    accent: colors.accent[400],
  },
  border: {
    subtle: colors.neutral[800],
    default: colors.neutral[700],
    strong: colors.neutral[600],
    focus: colors.accent[400],
  },
  shadow: {
    sm: '0 1px 2px 0 rgba(0,0,0,0.30)',
    md: '0 4px 6px -1px rgba(0,0,0,0.40), 0 2px 4px -2px rgba(0,0,0,0.30)',
    lg: '0 10px 15px -3px rgba(0,0,0,0.50), 0 4px 6px -4px rgba(0,0,0,0.40)',
    xl: '0 20px 25px -5px rgba(0,0,0,0.60), 0 8px 10px -6px rgba(0,0,0,0.50)',
    focus: shadows.focus,
  },
  qr: {
    module: colors.neutral[0],
    quietZone: colors.neutral[950],
    finder: colors.neutral[0],
    overlayBlend: 'screen',
  },
};

export function getTheme(name) {
  if (name === 'dark') return darkTheme;
  if (name === 'light') return lightTheme;
  // Respect system preference when no explicit theme given
  if (name === 'system') {
    const prefersDark = typeof window !== 'undefined' && window.matchMedia && window.matchMedia('(prefers-color-scheme: dark)').matches;
    return prefersDark ? darkTheme : lightTheme;
  }
  return lightTheme;
}
