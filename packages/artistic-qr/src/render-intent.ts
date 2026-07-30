import type { RenderOptions } from '@qr/qr-core';
import type { GenerationRequest, Palette } from './types.js';

export type ArtisticStyleFamily = 'watercolor' | 'geometric' | 'minimalist';

export interface ArtisticRenderIntent {
  styleFamily: ArtisticStyleFamily;
  artisticStrength: number;
  focalArea: NonNullable<NonNullable<GenerationRequest['composition']>['focalArea']>;
  qrProminence: number;
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
  const palette = resolvePalette(request.palette);

  const quietZone = qrProminence >= 0.72 ? 4 : qrProminence >= 0.38 ? 5 : 6;
  // Keep the proven baseline raster scale; prominence is expressed by quiet-zone ratio.
  const baseModuleSize = 8;
  const focalOffset = ({ balanced: 0, center: 1, top: 2, right: 3, bottom: 1, left: 3 } as const)[focalArea];
  const styles = styleVariants(styleFamily, artisticStrength);

  const candidateOptions = Array.from({ length: 4 }, (_, index): RenderOptions => {
    const style = styles[(index + focalOffset) % styles.length];
    return {
      format: 'svg',
      moduleSize: baseModuleSize + index,
      margin: quietZone,
      colorDark: palette.primary,
      colorLight: palette.background,
      shape: style.shape,
      eyeShape: style.eyeShape,
    };
  }) as unknown as ArtisticRenderIntent['candidateOptions'];

  return {
    styleFamily,
    artisticStrength,
    focalArea,
    qrProminence,
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

function styleVariants(
  family: ArtisticStyleFamily,
  strength: number,
): Array<{ shape: RenderOptions['shape']; eyeShape: RenderOptions['eyeShape'] }> {
  if (strength < 0.25) return [
    { shape: 'square', eyeShape: 'square' },
    { shape: 'square', eyeShape: 'square' },
    { shape: 'rounded', eyeShape: 'square' },
    { shape: 'square', eyeShape: 'rounded' },
  ];
  if (family === 'watercolor') return [
    { shape: 'rounded', eyeShape: 'rounded' },
    { shape: 'circle', eyeShape: 'square' },
    { shape: 'rounded', eyeShape: 'square' },
    { shape: 'circle', eyeShape: 'rounded' },
  ];
  if (family === 'geometric') return [
    { shape: 'square', eyeShape: 'square' },
    { shape: 'rounded', eyeShape: 'square' },
    { shape: 'square', eyeShape: 'rounded' },
    { shape: 'rounded', eyeShape: 'rounded' },
  ];
  return [
    { shape: 'square', eyeShape: 'rounded' },
    { shape: 'rounded', eyeShape: 'rounded' },
    { shape: 'square', eyeShape: 'square' },
    { shape: 'rounded', eyeShape: 'square' },
  ];
}

function clamp01(value: number): number {
  return Math.min(1, Math.max(0, value));
}
