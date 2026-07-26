/**
 * @qr/design-system — UI Components
 * 
 * Accessible, theme-aware primitives for the Artistic QR Studio.
 * No framework dependency — plain CSS class generators + ARIA helpers.
 */

import { colors, typography, spacing, radii, shadows, motion, zIndex } from '../tokens/index.js';

// ---------------------------------------------------------------------------
// Accessibility helpers
// ---------------------------------------------------------------------------

export const a11y = {
  focusVisible: `outline: none; box-shadow: ${shadows.focus};`,
  focusVisibleError: `outline: none; box-shadow: ${shadows.focusError};`,
  srOnly: `position: absolute; width: 1px; height: 1px; padding: 0; margin: -1px; overflow: hidden; clip: rect(0,0,0,0); white-space: nowrap; border: 0;`,
  skipLink: `position: absolute; top: -40px; left: 0; background: ${colors.neutral[900]}; color: ${colors.neutral[0]}; padding: ${spacing[2]} ${spacing[4]}; z-index: ${zIndex.toast}; transition: top ${motion.duration.fast} ${motion.easing.default};`,
};

export function ariaLiveRegion(id, level = 'polite') {
  return {
    id,
    role: 'status',
    'aria-live': level,
    'aria-atomic': 'true',
    class: 'sr-only',
  };
}

// ---------------------------------------------------------------------------
// Button styles
// ---------------------------------------------------------------------------

export const button = {
  base: `
    display: inline-flex; align-items: center; justify-content: center; gap: ${spacing[2]};
    font-family: ${typography.fontFamily.sans}; font-weight: ${typography.fontWeight.medium};
    border-radius: ${radii.md}; cursor: pointer; transition: all ${motion.duration.fast} ${motion.easing.default};
    outline: none;
  `,
  primary: `
    background: ${colors.accent[600]}; color: ${colors.neutral[0]}; border: 1px solid ${colors.accent[600]};
    padding: ${spacing[3]} ${spacing[5]}; font-size: ${typography.fontSize.base.rem};
  `,
  secondary: `
    background: transparent; color: ${colors.accent[600]}; border: 1px solid ${colors.accent[300]};
    padding: ${spacing[3]} ${spacing[5]}; font-size: ${typography.fontSize.base.rem};
  `,
  ghost: `
    background: transparent; color: ${colors.neutral[700]}; border: 1px solid transparent;
    padding: ${spacing[2]} ${spacing[4]}; font-size: ${typography.fontSize.sm.rem};
  `,
  disabled: `
    opacity: 0.5; cursor: not-allowed;
  `,
};

// ---------------------------------------------------------------------------
// Card / surface styles
// ---------------------------------------------------------------------------

export const surface = {
  card: `
    border-radius: ${radii.lg}; border: 1px solid ${colors.neutral[200]};
    background: ${colors.neutral[0]}; box-shadow: ${shadows.sm};
    transition: box-shadow ${motion.duration.normal} ${motion.easing.default};
  `,
  cardHover: `
    box-shadow: ${shadows.md};
  `,
  cardSelected: `
    border-color: ${colors.accent[400]}; box-shadow: ${shadows.focus};
  `,
  panel: `
    border-radius: ${radii.lg}; border: 1px solid ${colors.neutral[200]};
    background: ${colors.neutral[50]}; padding: ${spacing[6]};
  `,
};

// ---------------------------------------------------------------------------
// Candidate comparison grid
// ---------------------------------------------------------------------------

export const candidateGrid = {
  container: `
    display: grid;
    grid-template-columns: repeat(2, 1fr);
    gap: ${spacing[4]};
  `,
  containerResponsive: `
    @media (min-width: 1024px) {
      grid-template-columns: repeat(4, 1fr);
    }
    @media (max-width: 640px) {
      grid-template-columns: 1fr;
    }
  `,
  item: `
    position: relative; border-radius: ${radii.lg}; overflow: hidden;
    border: 2px solid transparent; cursor: pointer;
    transition: border-color ${motion.duration.fast} ${motion.easing.default},
                transform ${motion.duration.fast} ${motion.easing.default};
  `,
  itemSelected: `
    border-color: ${colors.accent[500]};
  `,
  itemHover: `
    transform: translateY(-2px);
  `,
  thumbnail: `
    aspect-ratio: 1 / 1; width: 100%; object-fit: cover;
    background: ${colors.preview.checker};
  `,
  overlay: `
    position: absolute; bottom: 0; left: 0; right: 0;
    padding: ${spacing[3]} ${spacing[4]};
    background: linear-gradient(to top, rgba(0,0,0,0.6), transparent);
    color: ${colors.neutral[0]}; display: flex; align-items: center; gap: ${spacing[2]};
  `,
};

// ---------------------------------------------------------------------------
// Confidence display patterns
// ---------------------------------------------------------------------------

export const confidenceDisplay = {
  badgeBase: `
    display: inline-flex; align-items: center; gap: ${spacing[1]};
    padding: ${spacing[1]} ${spacing[3]}; border-radius: ${radii.full};
    font-size: ${typography.fontSize.xs.rem}; font-weight: ${typography.fontWeight.semibold};
    letter-spacing: ${typography.letterSpacing.wide}; text-transform: uppercase;
  `,
  barContainer: `
    width: 100%; height: 6px; border-radius: ${radii.full};
    background: ${colors.neutral[200]}; overflow: hidden;
  `,
  barFill: (level) => {
    const widths = { threshold_met: '100%', high: '85%', moderate: '60%', low: '35%', untested: '0%' };
    const c = colors.confidence[level] || colors.confidence.untested;
    return `width: ${widths[level] || '0%'}; height: 100%; background: ${c.fg}; border-radius: ${radii.full}; transition: width ${motion.duration.slow} ${motion.easing.default};`;
  },
  detailList: `
    list-style: none; margin: 0; padding: 0;
    font-size: ${typography.fontSize.sm.rem}; color: ${colors.neutral[700]};
  `,
  detailItem: `
    display: flex; align-items: center; justify-content: space-between;
    padding: ${spacing[2]} 0; border-bottom: 1px solid ${colors.neutral[200]};
  `,
  detailItemLast: `
    border-bottom: none;
  `,
};

// ---------------------------------------------------------------------------
// Slider / control styles
// ---------------------------------------------------------------------------

export const control = {
  sliderTrack: `
    width: 100%; height: 6px; border-radius: ${radii.full};
    background: ${colors.neutral[200]}; appearance: none; outline: none;
  `,
  sliderThumb: `
    appearance: none; width: 18px; height: 18px; border-radius: 50%;
    background: ${colors.accent[500]}; border: 2px solid ${colors.neutral[0]};
    box-shadow: ${shadows.sm}; cursor: pointer; margin-top: -6px;
    transition: transform ${motion.duration.fast} ${motion.easing.bounce};
  `,
  sliderThumbHover: `
    transform: scale(1.15);
  `,
  label: `
    display: block; font-size: ${typography.fontSize.sm.rem};
    font-weight: ${typography.fontWeight.medium}; color: ${colors.neutral[800]};
    margin-bottom: ${spacing[2]};
  `,
  helper: `
    display: block; font-size: ${typography.fontSize.xs.rem};
    color: ${colors.neutral[600]}; margin-top: ${spacing[1]};
  `,
};

// ---------------------------------------------------------------------------
// Preview stage
// ---------------------------------------------------------------------------

export const previewStage = {
  container: `
    position: relative; display: flex; align-items: center; justify-content: center;
    padding: ${spacing[8]}; border-radius: ${radii.xl}; background: ${colors.preview.light};
    border: 1px solid ${colors.neutral[200]};
  `,
  containerDark: `
    background: ${colors.preview.dark}; border-color: ${colors.neutral[800]};
  `,
  qrWrapper: `
    position: relative; width: 256px; height: 256px;
    border-radius: ${radii.lg}; overflow: hidden;
    box-shadow: ${shadows.lg};
  `,
  quietZone: `
    position: absolute; inset: 0; border: 4px solid transparent;
    border-radius: ${radii.lg}; pointer-events: none;
  `,
  quietZoneValid: `
    border-color: ${colors.semantic.success};
  `,
  quietZoneInvalid: `
    border-color: ${colors.semantic.error};
  `,
};
