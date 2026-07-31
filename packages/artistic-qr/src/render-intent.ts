import type { RenderOptions } from '@qr/qr-core';
import type { GenerationRequest, Palette } from './types.js';

type ModuleShape = NonNullable<RenderOptions['shape']>;

export type ArtisticStyleFamily = 'watercolor' | 'geometric' | 'minimalist';
export type ArtisticStrengthTreatment = 'subtle' | 'expressive' | 'bold';
export type ArtisticCompositionTreatmentId = 'classic' | 'soft-frame' | 'bold-frame' | 'poster-frame';
export type QrProminenceTreatment = 'spacious' | 'standard' | 'dominant';

export interface ArtisticCompositionTreatment {
  id: ArtisticCompositionTreatmentId;
  eyeShape: ModuleShape;
  framingModules: number;
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
  palette: { primary: string; background: string };
  candidateOptions: readonly [RenderOptions, RenderOptions, RenderOptions, RenderOptions];
  previewOptions: RenderOptions;
}

const DEFAULT_PRIMARY = '#1a1a2e';
const DEFAULT_BACKGROUND = '#ffffff';

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
  const palette = resolvePalette(request.palette);

  const quietZone = prominenceTreatment === 'dominant' ? 4 : prominenceTreatment === 'standard' ? 5 : 6;
  // Strength framing visibly changes QR-to-canvas ratio without reducing the
  // prominence-owned protected quiet-zone baseline.
  const strengthFramingModules = strengthTreatment === 'subtle' ? 2 : strengthTreatment === 'expressive' ? 1 : 0;
  const margin = quietZone + compositionTreatment.framingModules + strengthFramingModules;
  const shapes = styleVariants(styleFamily, strengthTreatment);
  const strengthScale = strengthTreatment === 'subtle' ? 8 : strengthTreatment === 'expressive' ? 9 : 10;

  const candidateOptions = Array.from({ length: 4 }, (_, index): RenderOptions => ({
    format: 'svg',
    moduleSize: strengthScale + index,
    margin,
    colorDark: palette.primary,
    colorLight: palette.background,
    shape: shapes[index],
    eyeShape: compositionTreatment.eyeShape,
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

function resolvePalette(palette?: Palette): { primary: string; background: string } {
  return {
    primary: palette?.primary ?? palette?.secondary ?? palette?.accent ?? DEFAULT_PRIMARY,
    background: palette?.background ?? DEFAULT_BACKGROUND,
  };
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
