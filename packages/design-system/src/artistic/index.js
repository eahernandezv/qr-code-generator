/**
 * @qr/design-system — Artistic Style Primitives
 * 
 * Owned by WS-02. Frozen against artistic-qr-api.v1.json.
 * 
 * Provides: palette definitions, focal-area helpers, strength/prominence
 * gradients, and art-direction visual metadata for UI presentation.
 */

import { colors } from '../tokens/index.js';

// ---------------------------------------------------------------------------
// Palette presets — each art direction ships with at least one default palette
// ---------------------------------------------------------------------------

export const palettes = {
  minimal: {
    id: 'minimal-default',
    name: 'Monochrome',
    description: 'Pure black modules on white with no additional color.',
    swatches: ['#000000', '#ffffff'],
    primary: '#000000',
    secondary: '#ffffff',
    accent: null,
  },
  gradient_mesh: {
    id: 'gradient-mesh-cool',
    name: 'Cool Mesh',
    description: 'Soft blues and violets flowing across a continuous gradient field.',
    swatches: ['#1f3cf0', '#7d9aff', '#b3c5ff', '#e0e7ff'],
    primary: '#1f3cf0',
    secondary: '#7d9aff',
    accent: '#b3c5ff',
  },
  organic_flora: {
    id: 'organic-flora-forest',
    name: 'Forest',
    description: 'Deep greens and warm earth tones with natural growth gradients.',
    swatches: ['#2b8a3e', '#40c057', '#8ce99a', '#e6fcf5'],
    primary: '#2b8a3e',
    secondary: '#40c057',
    accent: '#8ce99a',
  },
  circuit_board: {
    id: 'circuit-copper',
    name: 'Copper Trace',
    description: 'Warm amber and copper traces on deep charcoal substrate.',
    swatches: ['#e8590c', '#ffa94d', '#ffe8cc', '#212529'],
    primary: '#e8590c',
    secondary: '#ffa94d',
    accent: '#ffe8cc',
  },
  watercolor: {
    id: 'watercolor-sunset',
    name: 'Sunset Wash',
    description: 'Soft warm washes of coral, rose, and gold bleeding at the edges.',
    swatches: ['#c92a2a', '#ff8787', '#ffd8a8', '#fff5f5'],
    primary: '#c92a2a',
    secondary: '#ff8787',
    accent: '#ffd8a8',
  },
  geometric_tessellation: {
    id: 'geo-prism',
    name: 'Prism',
    description: 'Bold saturated triangles and polygons in complementary pairs.',
    swatches: ['#1971c2', '#4dabf7', '#f08c00', '#ffe8cc'],
    primary: '#1971c2',
    secondary: '#4dabf7',
    accent: '#f08c00',
  },
};

// ---------------------------------------------------------------------------
// Focal-area composition helpers — UI labels and visual hints
// ---------------------------------------------------------------------------

export const focalAreas = {
  center:      { label: 'Center',      icon: 'focus-center',      description: 'Artistic detail concentrated in the center, balanced around QR.' },
  top:         { label: 'Top',         icon: 'focus-top',         description: 'Visual weight above the QR module area.' },
  bottom:      { label: 'Bottom',      icon: 'focus-bottom',      description: 'Visual weight below the QR module area.' },
  left:        { label: 'Left',          icon: 'focus-left',        description: 'Visual weight to the left of the QR module area.' },
  right:       { label: 'Right',         icon: 'focus-right',       description: 'Visual weight to the right of the QR module area.' },
  balanced:    { label: 'Balanced',      icon: 'focus-balanced',    description: 'Even distribution of artistic detail across the canvas.' },
  qr_dominant: { label: 'QR Dominant',   icon: 'focus-qr',          description: 'QR functional patterns are the visual focal point; art is subtle accent.' },
};

// ---------------------------------------------------------------------------
// Artistic strength scale — human labels for the 0..1 slider
// ---------------------------------------------------------------------------

export const strengthLabels = [
  { value: 0.0, label: 'Minimal',     description: 'Nearly standard QR with subtle texture.' },
  { value: 0.25, label: 'Subtle',     description: 'Soft artistic overlay preserving clear modules.' },
  { value: 0.5,  label: 'Balanced',   description: 'Equal weight to art and scannability.' },
  { value: 0.75, label: 'Expressive', description: 'Strong artistic integration; modules may blend.' },
  { value: 1.0,  label: 'Maximal',    description: 'Artwork-first; QR is deeply embedded in the scene.' },
];

export function getStrengthLabel(value) {
  let nearest = strengthLabels[0];
  let minDist = Infinity;
  for (const entry of strengthLabels) {
    const dist = Math.abs(entry.value - value);
    if (dist < minDist) {
      minDist = dist;
      nearest = entry;
    }
  }
  return nearest;
}

// ---------------------------------------------------------------------------
// QR prominence scale — how visible the functional QR pattern remains
// ---------------------------------------------------------------------------

export const prominenceLabels = [
  { value: 0.0, label: 'Invisible',   description: 'QR pattern is fully hidden within the artwork.' },
  { value: 0.25, label: 'Faint',     description: 'Finder patterns barely visible; high artistic freedom.' },
  { value: 0.5,  label: 'Balanced',  description: 'Functional patterns and artwork share visual weight.' },
  { value: 0.75, label: 'Clear',     description: 'Finder and modules are clearly readable at a glance.' },
  { value: 1.0,  label: 'Prominent', description: 'QR dominates; art is a decorative frame or texture.' },
];

export function getProminenceLabel(value) {
  let nearest = prominenceLabels[0];
  let minDist = Infinity;
  for (const entry of prominenceLabels) {
    const dist = Math.abs(entry.value - value);
    if (dist < minDist) {
      minDist = dist;
      nearest = entry;
    }
  }
  return nearest;
}

// ---------------------------------------------------------------------------
// Art direction visual metadata — for selection cards, previews, docs
// ---------------------------------------------------------------------------

export const artDirectionMeta = {
  minimal: {
    id: 'minimal',
    name: 'Minimal',
    tagline: 'Quiet precision',
    description: 'Ultra-clean QR with subtle texture or tone-on-tone refinement. No ornament, only proportion and spacing.',
    mood: 'editorial, premium, brand-led',
    defaultPalette: palettes.minimal,
    allowedPalettes: [palettes.minimal],
    visualTraits: ['high contrast', 'large quiet zone', 'geometric purity', 'no gradients'],
    complexity: 'low',
    generationMode: 'deterministic_template',
  },
  gradient_mesh: {
    id: 'gradient_mesh',
    name: 'Gradient Mesh',
    tagline: 'Fluid color fields',
    description: 'Continuous soft gradients that weave through and around the QR structure without breaking module legibility.',
    mood: 'modern, calm, digital-native',
    defaultPalette: palettes.gradient_mesh,
    allowedPalettes: [palettes.gradient_mesh],
    visualTraits: ['smooth color transitions', 'organic edges', 'low texture', 'screen-optimized'],
    complexity: 'medium',
    generationMode: 'deterministic_template',
  },
  organic_flora: {
    id: 'organic_flora',
    name: 'Organic Flora',
    tagline: 'Living growth',
    description: 'Botanical and leaf-like forms that grow around and through the QR pattern, integrating natural shapes with functional geometry.',
    mood: 'warm, handmade, sustainable',
    defaultPalette: palettes.organic_flora,
    allowedPalettes: [palettes.organic_flora],
    visualTraits: ['branching structures', 'asymmetric balance', 'soft edges', 'earth palette'],
    complexity: 'high',
    generationMode: 'provider_generative',
  },
  circuit_board: {
    id: 'circuit_board',
    name: 'Circuit Board',
    tagline: 'Traced intelligence',
    description: 'Copper-trace pathways and component motifs that echo the QR module grid, turning the code into a microchip landscape.',
    mood: 'technical, precise, futuristic',
    defaultPalette: palettes.circuit_board,
    allowedPalettes: [palettes.circuit_board],
    visualTraits: ['grid-aligned traces', 'pad/via accents', 'structured hierarchy', 'dark substrate'],
    complexity: 'high',
    generationMode: 'provider_generative',
  },
  watercolor: {
    id: 'watercolor',
    name: 'Watercolor',
    tagline: 'Soft pigment washes',
    description: 'Transparent pigment bleeds and paper texture that dissolve around finder patterns while preserving enough module edge for scan.',
    mood: 'gentle, artistic, approachable',
    defaultPalette: palettes.watercolor,
    allowedPalettes: [palettes.watercolor],
    visualTraits: ['bleed edges', 'paper grain', 'transparent layers', 'warm palette'],
    complexity: 'high',
    generationMode: 'provider_generative',
  },
  geometric_tessellation: {
    id: 'geometric_tessellation',
    name: 'Geometric Tessellation',
    tagline: 'Tiled precision',
    description: 'Bold repeating polygons and interlocking shapes that tessellate across the canvas, framing the QR as a crystalline object.',
    mood: 'bold, structured, contemporary',
    defaultPalette: palettes.geometric_tessellation,
    allowedPalettes: [palettes.geometric_tessellation],
    visualTraits: ['sharp angles', 'repeating units', 'high contrast pairs', 'vector-ready'],
    complexity: 'medium',
    generationMode: 'deterministic_template',
  },
};

// ---------------------------------------------------------------------------
// Confidence-badge presentation helpers
// ---------------------------------------------------------------------------

export function confidenceBadgeProps(level) {
  const map = {
    threshold_met: {
      label: 'Scan Validated',
      shortLabel: 'Validated',
      icon: 'check-shield',
      color: colors.confidence.threshold_met,
      ariaLabel: 'This candidate passed the scan validation threshold',
    },
    high: {
      label: 'High Confidence',
      shortLabel: 'High',
      icon: 'check',
      color: colors.confidence.high,
      ariaLabel: 'High scan confidence based on decoder matrix results',
    },
    moderate: {
      label: 'Moderate Confidence',
      shortLabel: 'Moderate',
      icon: 'alert-circle',
      color: colors.confidence.moderate,
      ariaLabel: 'Moderate scan confidence; may work on most devices',
    },
    low: {
      label: 'Low Confidence',
      shortLabel: 'Low',
      icon: 'alert-triangle',
      color: colors.confidence.low,
      ariaLabel: 'Low scan confidence; repair or regenerate recommended',
    },
    untested: {
      label: 'Not Tested',
      shortLabel: 'Untested',
      icon: 'help-circle',
      color: colors.confidence.untested,
      ariaLabel: 'Scan validation has not yet been run',
    },
  };
  return map[level] || map.untested;
}
