/**
 * @qr/design-system — Design Tokens
 * 
 * Owned by WS-02 (Design System / Artistic Direction).
 * Frozen against contracts/schemas/artistic-qr-api.v1.json
 * 
 * Provides: colors, typography, spacing, radii, shadows, motion, breakpoints.
 * Constraints: WCAG 2.2 AA, light/dark themes, single-accent system.
 */

export const colors = {
  // Brand accent — used sparingly for primary actions, active states, artistic highlights
  accent: {
    50:  '#f0f4ff',
    100: '#d9e2ff',
    200: '#b3c5ff',
    300: '#7d9aff',
    400: '#4666ff',
    500: '#1f3cf0',
    600: '#152bd1',
    700: '#1321a8',
    800: '#162082',
    900: '#172065',
  },

  // Neutral scale — backgrounds, surfaces, text
  neutral: {
    0:   '#ffffff',
    50:  '#f8f9fa',
    100: '#f1f3f5',
    200: '#e9ecef',
    300: '#dee2e6',
    400: '#ced4da',
    500: '#adb5bd',
    600: '#868e96',
    700: '#495057',
    800: '#343a40',
    900: '#212529',
    950: '#121214',
  },

  // Semantic — scan confidence, status, feedback
  semantic: {
    success:  '#2b8a3e',
    successBg:'#d3f9d8',
    warning:  '#f08c00',
    warningBg:'#fff3bf',
    error:    '#c92a2a',
    errorBg:  '#ffe3e3',
    info:     '#1971c2',
    infoBg:   '#d0ebff',
  },

  // Scan confidence palette — honest, non-guarantee
  confidence: {
    threshold_met: { fg: '#2b8a3e', bg: '#d3f9d8', ring: '#2b8a3e' },
    high:          { fg: '#2f9e44', bg: '#d3f9d8', ring: '#2f9e44' },
    moderate:      { fg: '#f08c00', bg: '#fff3bf', ring: '#f08c00' },
    low:           { fg: '#e8590c', bg: '#ffe8cc', ring: '#e8590c' },
    untested:      { fg: '#868e96', bg: '#f1f3f5', ring: '#adb5bd' },
  },

  // Artistic preview backgrounds
  preview: {
    light: '#ffffff',
    dark:  '#121214',
    checker: 'repeating-conic-gradient(#e9ecef 0% 25% transparent 0% 50%) 50% / 16px 16px',
  },
};

export const typography = {
  fontFamily: {
    sans:  '"Inter", system-ui, -apple-system, sans-serif',
    mono:  '"JetBrains Mono", "SF Mono", monospace',
    display: '"Inter", system-ui, sans-serif',
  },
  fontSize: {
    xs:   { px: 12, rem: '0.75rem',  line: 1.4 },
    sm:   { px: 14, rem: '0.875rem', line: 1.5 },
    base: { px: 16, rem: '1rem',     line: 1.6 },
    md:   { px: 18, rem: '1.125rem', line: 1.5 },
    lg:   { px: 20, rem: '1.25rem',  line: 1.4 },
    xl:   { px: 24, rem: '1.5rem',   line: 1.3 },
    '2xl':{ px: 32, rem: '2rem',     line: 1.2 },
    '3xl':{ px: 40, rem: '2.5rem',   line: 1.15 },
  },
  fontWeight: {
    normal: 400,
    medium: 500,
    semibold: 600,
    bold: 700,
  },
  letterSpacing: {
    tight: '-0.02em',
    normal: '0',
    wide: '0.02em',
  },
};

export const spacing = {
  0:  '0',
  1:  '0.25rem',   // 4px
  2:  '0.5rem',    // 8px
  3:  '0.75rem',   // 12px
  4:  '1rem',      // 16px
  5:  '1.25rem',   // 20px
  6:  '1.5rem',    // 24px
  8:  '2rem',      // 32px
  10: '2.5rem',    // 40px
  12: '3rem',      // 48px
  16: '4rem',      // 64px
  20: '5rem',      // 80px
  24: '6rem',      // 96px
};

export const radii = {
  none: '0',
  sm:   '0.25rem',
  md:   '0.5rem',
  lg:   '0.75rem',
  xl:   '1rem',
  full: '9999px',
};

export const shadows = {
  sm:  '0 1px 2px 0 rgba(0,0,0,0.05)',
  md:  '0 4px 6px -1px rgba(0,0,0,0.07), 0 2px 4px -2px rgba(0,0,0,0.05)',
  lg:  '0 10px 15px -3px rgba(0,0,0,0.08), 0 4px 6px -4px rgba(0,0,0,0.05)',
  xl:  '0 20px 25px -5px rgba(0,0,0,0.08), 0 8px 10px -6px rgba(0,0,0,0.05)',
  focus: '0 0 0 3px rgba(31,60,240,0.25)',
  focusError: '0 0 0 3px rgba(201,42,42,0.25)',
};

export const motion = {
  duration: {
    fast:   '120ms',
    normal: '200ms',
    slow:   '300ms',
    slower: '500ms',
  },
  easing: {
    default: 'cubic-bezier(0.4, 0, 0.2, 1)',
    enter:   'cubic-bezier(0, 0, 0.2, 1)',
    exit:    'cubic-bezier(0.4, 0, 1, 1)',
    bounce:  'cubic-bezier(0.34, 1.56, 0.64, 1)',
  },
};

export const breakpoints = {
  sm: '640px',
  md: '768px',
  lg: '1024px',
  xl: '1280px',
  '2xl': '1536px',
};

export const zIndex = {
  base: 0,
  dropdown: 100,
  sticky: 200,
  overlay: 300,
  modal: 400,
  toast: 500,
};
