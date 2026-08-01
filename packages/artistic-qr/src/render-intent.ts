import type { RenderOptions } from '@qr/qr-core';
import type { ColorIntensity, GenerationRequest, Palette, PaletteFamily, PalettePattern } from './types.js';

type ModuleShape = NonNullable<RenderOptions['shape']>;
type FinderShape = NonNullable<RenderOptions['eyeShape']>;

export type ArtisticStyleFamily = 'watercolor' | 'geometric' | 'minimalist';
export type ArtisticStrengthTreatment = 'subtle' | 'expressive' | 'bold';
export type ArtisticCompositionTreatmentId = 'classic' | 'soft-frame' | 'bold-frame' | 'poster-frame';
export type QrProminenceTreatment = 'spacious' | 'standard' | 'dominant';

export interface ArtisticCompositionTreatment {
  id: ArtisticCompositionTreatmentId;
  eyeShape: FinderShape;
  framingModules: number;
}

export interface PatternedPaletteIntent {
  primary: string;
  background: string;
  family?: PaletteFamily;
  pattern: PalettePattern;
  intensity: ColorIntensity;
  moduleColors: readonly string[];
  functionalColor: string;
}

export interface CornerColorResolution {
  requested?: string;
  effective: string;
  behavior: 'match-body' | 'accepted' | 'adapted';
  contrastRatio: number;
  minimumContrastRatio: 4.5;
  reason?: 'insufficient-background-contrast';
}

export interface ArtisticRenderIntent {
  styleFamily: ArtisticStyleFamily;
  /** Template is the module-shape visual language. */
  templateTreatment: ArtisticStyleFamily;
  artisticStrength: number;
  /** Strength selects a visible stage within the template's shape language. */
  strengthTreatment: ArtisticStrengthTreatment;
  focalArea: NonNullable<NonNullable<GenerationRequest['composition']>['focalArea']>;
  /**
   * The deterministic renderer cannot express artwork placement. Composition is therefore
   * truthfully reduced to a QR frame treatment, not presented here as spatial artwork layout.
   */
  compositionTreatment: ArtisticCompositionTreatment;
  qrProminence: number;
  /** Prominence independently controls the protected quiet-zone baseline. */
  prominenceTreatment: QrProminenceTreatment;
  palette: PatternedPaletteIntent;
  /** Public `cornerColor` resolved to Core `functionalColor`, with adaptation evidence. */
  cornerColor: CornerColorResolution;
  candidateOptions: readonly [RenderOptions, RenderOptions, RenderOptions, RenderOptions];
  previewOptions: RenderOptions;
}

const DEFAULT_PRIMARY = '#1a1a2e';
const DEFAULT_BACKGROUND = '#ffffff';

export const PATTERNED_PALETTE_PRESETS = [
  ['rainbow', 'horizontalGradient'], ['rainbow', 'verticalGradient'], ['rainbow', 'diagonalGradient'],
  ['pride', 'flagRows'], ['pride', 'diagonalGradient'], ['bi', 'verticalGradient'],
  ['berry', 'spiral'], ['forest', 'diagonalGradient'], ['rainbow', 'radialRings'],
  ['trans', 'diagonalGradient'],
] as const satisfies readonly (readonly [PaletteFamily, PalettePattern])[];

const CURATED_PALETTES: Record<PaletteFamily, Record<ColorIntensity, readonly string[]>> = {
  rainbow: {
    mellow: ['#814653', '#875433', '#756521', '#38684b', '#3f5f82', '#67517b'],
    balanced: ['#9b2948', '#9a4614', '#7a6200', '#087044', '#175ea8', '#6d35a5'],
    punchy: ['#b00035', '#a83b00', '#806400', '#00733d', '#004fc4', '#7020a8'],
  },
  pride: {
    mellow: ['#814653', '#875433', '#756521', '#38684b', '#3f5f82', '#67517b'],
    balanced: ['#9b2948', '#9a4614', '#7a6200', '#087044', '#175ea8', '#6d35a5'],
    punchy: ['#b00035', '#a83b00', '#806400', '#00733d', '#004fc4', '#7020a8'],
  },
  trans: {
    mellow: ['#42677a', '#805567', '#665d78', '#805567', '#42677a'],
    balanced: ['#176b89', '#984565', '#64538a', '#984565', '#176b89'],
    punchy: ['#006c91', '#b00059', '#6546a8', '#b00059', '#006c91'],
  },
  bi: {
    mellow: ['#82465f', '#67517b', '#3f5f82'], balanced: ['#9f2864', '#70358f', '#175ea8'], punchy: ['#b00069', '#7500a8', '#004fc4'],
  },
  berry: {
    mellow: ['#75465c', '#825066', '#5e526f', '#445d78'], balanced: ['#922451', '#a23b69', '#653b82', '#285887'], punchy: ['#ad004c', '#bd1767', '#6c1b96', '#0055a8'],
  },
  forest: {
    mellow: ['#355f4c', '#486a3e', '#676423', '#345e68'], balanced: ['#126b43', '#3a721d', '#756400', '#006477'], punchy: ['#00713d', '#277900', '#806400', '#00647f'],
  },
};

/**
 * Authoritative deterministic mapping from Studio art direction to candidate rendering.
 * Studio preview must use previewOptions from this function (or a Core preview endpoint
 * returning the same value) rather than independently interpreting the controls.
 */
export function resolveArtisticRenderIntent(request: GenerationRequest): ArtisticRenderIntent {
  const artisticStrength = clamp01(request.artisticStrength ?? 0.5);
  const qrProminence = clamp01(request.composition?.qrProminence ?? 0.65);
  const focalArea = request.composition?.focalArea ?? 'balanced';
  const styleFamily = resolveStyleFamily(request.artDirectionId, request.prompt);
  const strengthTreatment = resolveStrengthTreatment(artisticStrength);
  const compositionTreatment = resolveCompositionTreatment(focalArea);
  const prominenceTreatment = resolveProminenceTreatment(qrProminence);
  const palette = resolvePalette(request.palette, request.paletteFamily, request.palettePattern, request.colorIntensity);
  const cornerColor = resolveCornerColor(request.cornerColor, palette.functionalColor, palette.background);

  const quietZone = prominenceTreatment === 'dominant' ? 4 : prominenceTreatment === 'standard' ? 5 : 6;
  // Strength framing visibly changes QR-to-canvas ratio without reducing the
  // prominence-owned protected quiet-zone baseline.
  const strengthFramingModules = strengthTreatment === 'subtle' ? 2 : strengthTreatment === 'expressive' ? 1 : 0;
  const margin = quietZone + compositionTreatment.framingModules + strengthFramingModules;
  // Patterned palettes already carry strong visual variation. Keep their data modules
  // square so palette edges are not compounded with rounded-module erosion under
  // downscale/blur perturbations. Finder-eye treatment and palette identity remain.
  const shapes: readonly [ModuleShape, ModuleShape, ModuleShape, ModuleShape] = palette.family && palette.pattern !== 'solid'
    ? ['square', 'square', 'square', 'square']
    : styleVariants(styleFamily, strengthTreatment);
  const strengthScale = strengthTreatment === 'subtle' ? 8 : strengthTreatment === 'expressive' ? 9 : 10;
  const patternedScale = palette.family && palette.pattern !== 'solid';

  const candidateOptions = Array.from({ length: 4 }, (_, index): RenderOptions => ({
    format: 'svg',
    // Ten/eleven-pixel square modules plus two scan-safe quiet-zone framings are
    // stable across the real perturbation matrix. For risky patterned combinations,
    // use these four deterministic render variants rather than emitting a known weak
    // rounded-module candidate or collapsing the board to duplicate bytes.
    moduleSize: patternedScale ? 10 + (index % 2) : strengthScale + index,
    margin: patternedScale ? margin + (index >= 2 ? 2 : 0) : margin,
    colorDark: palette.primary,
    colorLight: palette.background,
    modulePalette: palette.moduleColors,
    palettePattern: palette.pattern,
    functionalColor: cornerColor.effective,
    shape: request.moduleShape ?? shapes[index],
    eyeShape: request.eyeShape ?? compositionTreatment.eyeShape,
    eyeFrameShape: request.eyeFrameShape ?? request.eyeShape ?? compositionTreatment.eyeShape,
    eyeBallShape: request.eyeBallShape ?? request.eyeShape ?? compositionTreatment.eyeShape,
  })) as unknown as ArtisticRenderIntent['candidateOptions'];

  return {
    styleFamily,
    templateTreatment: styleFamily,
    artisticStrength,
    strengthTreatment,
    focalArea,
    compositionTreatment,
    qrProminence,
    prominenceTreatment,
    palette,
    cornerColor,
    candidateOptions,
    previewOptions: candidateOptions[0],
  };
}

function resolveStyleFamily(artDirectionId?: string, prompt?: string): ArtisticStyleFamily {
  const direction = artDirectionId?.toLowerCase() ?? '';
  if (/organic|botanical|editorial|playful/.test(direction)) return 'watercolor';
  if (/architectural|geometric|photographic|cinematic/.test(direction)) return 'geometric';
  if (/minimal/.test(direction)) return 'minimalist';
  const cue = prompt?.toLowerCase() ?? '';
  if (/watercolou?r|paint|wash|organic|botanical|berry/.test(cue)) return 'watercolor';
  if (/geometric|architect|angular|grid|tech/.test(cue)) return 'geometric';
  return 'minimalist';
}

function resolvePalette(
  palette?: Palette,
  family?: PaletteFamily,
  pattern: PalettePattern = 'solid',
  intensity: ColorIntensity = 'balanced',
): PatternedPaletteIntent {
  if (family) {
    const moduleColors = CURATED_PALETTES[family][intensity];
    return {
      primary: moduleColors[0],
      background: palette?.background ?? DEFAULT_BACKGROUND,
      family, pattern, intensity, moduleColors, functionalColor: '#111827',
    };
  }
  const primary = palette?.primary ?? palette?.secondary ?? palette?.accent ?? DEFAULT_PRIMARY;
  return {
    primary, background: palette?.background ?? DEFAULT_BACKGROUND,
    pattern: 'solid', intensity, moduleColors: [primary], functionalColor: primary,
  };
}

const MINIMUM_CORNER_CONTRAST = 4.5 as const;

function resolveCornerColor(requested: string | undefined, matchBody: string, background: string): CornerColorResolution {
  if (requested === undefined) {
    return {
      effective: matchBody,
      behavior: 'match-body',
      contrastRatio: contrastRatio(matchBody, background),
      minimumContrastRatio: MINIMUM_CORNER_CONTRAST,
    };
  }
  const requestedContrast = contrastRatio(requested, background);
  if (requestedContrast >= MINIMUM_CORNER_CONTRAST) {
    return {
      requested,
      effective: requested,
      behavior: 'accepted',
      contrastRatio: requestedContrast,
      minimumContrastRatio: MINIMUM_CORNER_CONTRAST,
    };
  }
  const fallbackCandidates = [matchBody, '#111827', '#000000', '#ffffff'];
  const effective = fallbackCandidates.reduce((best, candidate) => (
    contrastRatio(candidate, background) > contrastRatio(best, background) ? candidate : best
  ));
  return {
    requested,
    effective,
    behavior: 'adapted',
    contrastRatio: contrastRatio(effective, background),
    minimumContrastRatio: MINIMUM_CORNER_CONTRAST,
    reason: 'insufficient-background-contrast',
  };
}

function contrastRatio(foreground: string, background: string): number {
  const foregroundLuminance = relativeLuminance(foreground);
  const backgroundLuminance = relativeLuminance(background);
  return (Math.max(foregroundLuminance, backgroundLuminance) + 0.05)
    / (Math.min(foregroundLuminance, backgroundLuminance) + 0.05);
}

function relativeLuminance(hex: string): number {
  const raw = hex.slice(1);
  const expanded = raw.length === 3 ? [...raw].map((channel) => channel + channel).join('') : raw.slice(0, 6);
  const channels = [0, 2, 4].map((offset) => Number.parseInt(expanded.slice(offset, offset + 2), 16) / 255)
    .map((channel) => channel <= 0.04045 ? channel / 12.92 : ((channel + 0.055) / 1.055) ** 2.4);
  return 0.2126 * channels[0] + 0.7152 * channels[1] + 0.0722 * channels[2];
}

function resolveStrengthTreatment(strength: number): ArtisticStrengthTreatment {
  if (strength < 0.34) return 'subtle';
  if (strength < 0.67) return 'expressive';
  return 'bold';
}

function resolveProminenceTreatment(prominence: number): QrProminenceTreatment {
  if (prominence >= 0.72) return 'dominant';
  if (prominence >= 0.38) return 'standard';
  return 'spacious';
}

function resolveCompositionTreatment(
  focalArea: NonNullable<NonNullable<GenerationRequest['composition']>['focalArea']>,
): ArtisticCompositionTreatment {
  switch (focalArea) {
    case 'center':
      return { id: 'soft-frame', eyeShape: 'rounded', framingModules: 0 };
    case 'left':
    case 'right':
      return { id: 'bold-frame', eyeShape: 'square', framingModules: 1 };
    case 'top':
    case 'bottom':
      return { id: 'poster-frame', eyeShape: 'square', framingModules: 2 };
    case 'balanced':
      return { id: 'classic', eyeShape: 'square', framingModules: 0 };
  }
}

function styleVariants(
  family: ArtisticStyleFamily,
  strength: ArtisticStrengthTreatment,
): readonly [ModuleShape, ModuleShape, ModuleShape, ModuleShape] {
  // Avoid fully circular data modules: they are materially weaker under the real
  // perturbation suite. The third strength level is also visible in framing and scale.
  const progression: Record<ArtisticStyleFamily, readonly [ModuleShape, ModuleShape, ModuleShape]> = {
    watercolor: ['square', 'rounded', 'rounded'],
    geometric: ['rounded', 'square', 'square'],
    minimalist: ['square', 'square', 'rounded'],
  };
  const strengthIndex = strength === 'subtle' ? 0 : strength === 'expressive' ? 1 : 2;
  const familyShapes = progression[family];
  return [
    familyShapes[strengthIndex],
    familyShapes[(strengthIndex + 1) % familyShapes.length],
    familyShapes[(strengthIndex + 2) % familyShapes.length],
    familyShapes[strengthIndex],
  ];
}

function clamp01(value: number): number {
  return Math.min(1, Math.max(0, value));
}
