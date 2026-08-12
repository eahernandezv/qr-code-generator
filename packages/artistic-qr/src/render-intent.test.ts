import { describe, expect, it } from 'vitest';
import { generateMatrix, normalizePayload, renderDeterministic, resolveModuleColor } from '@qr/qr-core';
import { generateCandidates, PATTERNED_PALETTE_PRESETS, resolveArtisticRenderIntent } from './index.js';
import { validateGenerationRequest } from './request-validation.js';
import type { ColorIntensity, GenerationRequest, PaletteFamily, PalettePattern } from './types.js';

const normalizedPayload = normalizePayload({
  mode: 'url',
  content: 'https://example.com/berry-fidelity',
  errorCorrectionLevel: 'H',
});

const berry: GenerationRequest = {
  normalizedPayload,
  mode: 'deterministic_template',
  artDirectionId: 'organic-botanical',
  prompt: 'watercolor berry wash',
  artisticStrength: 0.72,
  palette: { primary: '#c9184a', background: '#f9e8ef' },
  composition: { focalArea: 'center', qrProminence: 0.78 },
  seed: 42,
};

function contrastRatio(foreground: string, background: string): number {
  const luminance = (hex: string): number => {
    const channels = [1, 3, 5].map((offset) => Number.parseInt(hex.slice(offset, offset + 2), 16) / 255)
      .map((channel) => channel <= 0.04045 ? channel / 12.92 : ((channel + 0.055) / 1.055) ** 2.4);
    return 0.2126 * channels[0] + 0.7152 * channels[1] + 0.0722 * channels[2];
  };
  const foregroundLuminance = luminance(foreground);
  const backgroundLuminance = luminance(background);
  return (Math.max(foregroundLuminance, backgroundLuminance) + 0.05)
    / (Math.min(foregroundLuminance, backgroundLuminance) + 0.05);
}

describe('artistic render intent', () => {
  it('maps every supported pattern deterministically to distinct shared Core SVG output', () => {
    const matrix = generateMatrix(normalizedPayload);
    const patterns: PalettePattern[] = ['solid', 'horizontalGradient', 'verticalGradient', 'diagonalGradient', 'flagRows', 'spiral', 'radialRings'];
    const outputs = patterns.map((palettePattern) => {
      const options = resolveArtisticRenderIntent({ ...berry, paletteFamily: 'rainbow', palettePattern }).previewOptions;
      const first = renderDeterministic(matrix, options).data;
      expect(renderDeterministic(matrix, options).data).toBe(first);
      return first;
    });
    expect(new Set(outputs)).toHaveLength(patterns.length);
    expect(PATTERNED_PALETTE_PRESETS).toHaveLength(11);
  });

  it('makes every intensity distinct and keeps functional modules high-contrast', () => {
    const matrix = generateMatrix(normalizedPayload);
    const intensities: ColorIntensity[] = ['mellow', 'balanced', 'punchy'];
    for (const family of ['rainbow', 'pride', 'berry', 'trans'] as PaletteFamily[]) {
      const outputs = intensities.map((colorIntensity) => {
        const intent = resolveArtisticRenderIntent({ ...berry, palette: undefined, paletteFamily: family, palettePattern: 'diagonalGradient', colorIntensity });
        expect(resolveModuleColor(matrix, 0, 0, intent.previewOptions)).toBe('#111827');
        expect(contrastRatio(intent.palette.functionalColor, intent.palette.background)).toBeGreaterThanOrEqual(7);
        expect(intent.palette.moduleColors.every((color) => contrastRatio(color, intent.palette.background) >= 4.5)).toBe(true);
        return renderDeterministic(matrix, intent.previewOptions).data;
      });
      expect(new Set(outputs)).toHaveLength(3);
    }
  });

  it('resolves the Dora logo mixed palette as scan-safe active module colors', () => {
    const intent = resolveArtisticRenderIntent({ ...berry, palette: undefined, paletteFamily: 'dora', palettePattern: 'diagonalGradient', colorIntensity: 'balanced' });
    expect(intent.palette).toMatchObject({
      family: 'dora',
      pattern: 'diagonalGradient',
      primary: '#071258',
      functionalColor: '#111827',
    });
    expect(intent.palette.moduleColors).toEqual(['#071258', '#2f66d8', '#6d35c8', '#c01978', '#bf2f46']);
    expect(intent.palette.moduleColors.every((color) => contrastRatio(color, intent.palette.background) >= 4.5)).toBe(true);
  });

  it('adapts Pride/Trans pale identity bands away from active modules without muting all color', () => {
    for (const family of ['pride', 'trans'] as PaletteFamily[]) for (const colorIntensity of ['mellow', 'balanced', 'punchy'] as ColorIntensity[]) {
      const intent = resolveArtisticRenderIntent({ ...berry, paletteFamily: family, palettePattern: 'flagRows', colorIntensity });
      expect(intent.palette.moduleColors.every((color) => !/^#(?:f|e)[0-9a-f]{5}$/i.test(color))).toBe(true);
      expect(new Set(intent.palette.moduleColors).size).toBeGreaterThan(2);
      expect(intent.palette.functionalColor).toBe('#111827');
    }
  });

  it('keeps patterned generation at four objectively validated candidates', async () => {
    const request = { ...berry, paletteFamily: 'trans' as const, palettePattern: 'diagonalGradient' as const, colorIntensity: 'punchy' as const };
    const firstIntent = resolveArtisticRenderIntent(request);
    expect(resolveArtisticRenderIntent(request)).toEqual(firstIntent);
    expect(firstIntent.candidateOptions.map((option) => option.shape)).toEqual(['square', 'square', 'square', 'square']);
    expect(firstIntent.candidateOptions.map((option) => option.moduleSize)).toEqual([10, 11, 10, 11]);
    expect(firstIntent.candidateOptions.map((option) => option.margin)).toEqual([4, 4, 6, 6]);
    const board = await generateCandidates(request);
    expect(board.candidates).toHaveLength(4);
    expect(board.candidates.every((candidate) => candidate.exportAllowed)).toBe(true);
    expect(board.candidates.every((candidate) => candidate.exportAllowed === candidate.scanResults[0].pass)).toBe(true);
  }, 20_000);

  it('honors Berry palette in both preview intent and generated candidates', async () => {
    const intent = resolveArtisticRenderIntent(berry);
    expect(intent.styleFamily).toBe('watercolor');
    expect(intent.previewOptions).toMatchObject({ colorDark: '#c9184a', colorLight: '#f9e8ef' });

    const board = await generateCandidates(berry);
    expect(board.candidates).toHaveLength(4);
    expect(board.candidates[0].rendered.data).toContain('fill="#f9e8ef"');
    expect(board.candidates[0].rendered.data).toContain('fill="#c9184a"');
    expect(board.candidates.every((candidate) => candidate.exportAllowed === candidate.scanResults[0].pass)).toBe(true);
  }, 20_000);

  it('makes Watercolor + Berry + Surround visibly sensitive at low, mid, and high strength', () => {
    const surround = { ...berry, composition: { focalArea: 'top' as const, qrProminence: 0.78 } };
    const low = resolveArtisticRenderIntent({ ...surround, artisticStrength: 0.1 });
    const mid = resolveArtisticRenderIntent({ ...surround, artisticStrength: 0.5 });
    const high = resolveArtisticRenderIntent({ ...surround, artisticStrength: 0.9 });

    expect([low.strengthTreatment, mid.strengthTreatment, high.strengthTreatment]).toEqual([
      'subtle',
      'expressive',
      'bold',
    ]);
    expect(new Set([low.previewOptions, mid.previewOptions, high.previewOptions].map(JSON.stringify))).toHaveLength(3);
    expect(low.previewOptions).not.toEqual(mid.previewOptions);
    expect(mid.previewOptions).not.toEqual(high.previewOptions);
    expect(low.candidateOptions.some((option, index) => option.shape !== mid.candidateOptions[index].shape)).toBe(true);
    expect(mid.candidateOptions.some((option, index) => option.shape !== high.candidateOptions[index].shape)).toBe(true);
  });

  it('changes preview and candidate intent across strength for every Template × Composition combination', () => {
    const templates = ['organic-botanical', 'architectural-geometric', 'premium-minimal'];
    const compositions = ['center', 'right', 'balanced', 'top'] as const;

    for (const artDirectionId of templates) for (const focalArea of compositions) {
      const request = { ...berry, artDirectionId, prompt: undefined, composition: { focalArea, qrProminence: 0.65 } };
      const low = resolveArtisticRenderIntent({ ...request, artisticStrength: 0.1 });
      const mid = resolveArtisticRenderIntent({ ...request, artisticStrength: 0.5 });
      const high = resolveArtisticRenderIntent({ ...request, artisticStrength: 0.9 });
      expect(new Set([low.previewOptions, mid.previewOptions, high.previewOptions].map(JSON.stringify))).toHaveLength(3);
      expect(low.candidateOptions).not.toEqual(mid.candidateOptions);
      expect(mid.candidateOptions).not.toEqual(high.candidateOptions);
    }
  });

  it('keeps template, composition, strength, and prominence as explicit distinct intent dimensions', () => {
    const base = resolveArtisticRenderIntent(berry);
    const geometric = resolveArtisticRenderIntent({ ...berry, artDirectionId: 'architectural-geometric', prompt: undefined });
    const surround = resolveArtisticRenderIntent({ ...berry, composition: { ...berry.composition, focalArea: 'top' } });
    const subtle = resolveArtisticRenderIntent({ ...berry, artisticStrength: 0.1 });
    const quiet = resolveArtisticRenderIntent({ ...berry, composition: { ...berry.composition, qrProminence: 0.1 } });

    expect(geometric.templateTreatment).not.toBe(base.templateTreatment);
    expect(geometric.compositionTreatment).toEqual(base.compositionTreatment);
    expect(geometric.candidateOptions).not.toEqual(base.candidateOptions);
    expect(surround.templateTreatment).toBe(base.templateTreatment);
    expect(surround.compositionTreatment).not.toEqual(base.compositionTreatment);
    expect(surround.previewOptions.eyeShape).not.toBe(base.previewOptions.eyeShape);
    expect(surround.previewOptions.margin).toBeGreaterThan(base.previewOptions.margin!);
    expect(subtle.strengthTreatment).not.toBe(base.strengthTreatment);
    expect(quiet.prominenceTreatment).not.toBe(base.prominenceTreatment);
    expect(quiet.previewOptions.margin).toBeGreaterThan(base.previewOptions.margin!);
    expect(resolveArtisticRenderIntent(berry)).toEqual(base);
  });

  it('keeps four objectively validated candidates across distinct render intents', async () => {
    const requests: GenerationRequest[] = [
      berry,
      { ...berry, artDirectionId: 'architectural-geometric', prompt: undefined, composition: { focalArea: 'balanced', qrProminence: 0.5 } },
      { ...berry, artDirectionId: 'premium-minimal', prompt: undefined, artisticStrength: 0.15, composition: { focalArea: 'right', qrProminence: 0.25 } },
    ];
    for (const request of requests) {
      const board = await generateCandidates(request);
      expect(board.candidates).toHaveLength(4);
      expect(board.candidates.some((candidate) => candidate.exportAllowed)).toBe(true);
      for (const candidate of board.candidates) {
        expect(candidate.scanResults[0].decoder).not.toContain('stub');
        if (candidate.scanResults[0].pass) {
          expect(candidate.scanResults[0].scannedPayload).toBe(normalizedPayload.canonical);
        }
        expect(candidate.exportAllowed).toBe(candidate.scanResults[0].pass);
      }
    }
  }, 20_000);

  it('keeps omitted cornerColor on exact existing Match body functional behavior', () => {
    const intent = resolveArtisticRenderIntent(berry);
    expect(intent.cornerColor).toMatchObject({
      effective: intent.palette.functionalColor,
      behavior: 'match-body',
      minimumContrastRatio: 4.5,
    });
    expect(intent.cornerColor.requested).toBeUndefined();
    expect(intent.previewOptions.functionalColor).toBe(intent.palette.functionalColor);
  });

  it('accepts a safe cornerColor and maps it to Core functionalColor for frame and ball', () => {
    const cornerColor = '#7020a8';
    const request = validateGenerationRequest({ ...berry, cornerColor });
    const intent = resolveArtisticRenderIntent(request);
    const svg = renderDeterministic(generateMatrix(normalizedPayload), intent.previewOptions).data;
    expect(intent.cornerColor).toMatchObject({ requested: cornerColor, effective: cornerColor, behavior: 'accepted' });
    expect(intent.previewOptions.functionalColor).toBe(cornerColor);
    expect(svg).toMatch(new RegExp(`data-eye-part="frame"[^>]+fill="${cornerColor}"`));
    expect(svg).toMatch(new RegExp(`data-eye-part="ball"[^>]+fill="${cornerColor}"`));
    expect(svg).toContain('fill="#c9184a"');
  });

  it('adapts a low-contrast cornerColor deterministically without weakening scan thresholds', async () => {
    const request = { ...berry, cornerColor: '#f8e7ee' };
    const intent = resolveArtisticRenderIntent(request);
    expect(intent.cornerColor).toMatchObject({
      requested: '#f8e7ee',
      behavior: 'adapted',
      reason: 'insufficient-background-contrast',
      minimumContrastRatio: 4.5,
    });
    expect(intent.cornerColor.effective).not.toBe('#f8e7ee');
    expect(intent.cornerColor.contrastRatio).toBeGreaterThanOrEqual(4.5);
    const board = await generateCandidates(request);
    expect(board.candidates).toHaveLength(4);
    expect(board.candidates.every((candidate) => candidate.exportAllowed)).toBe(true);
    expect(board.candidates.every((candidate) => candidate.scanResults[0].thresholdVersion === 'scan-v1-real-75pct')).toBe(true);
  }, 20_000);

  it.each(['red', '#12', '#11223344', 17, null])('rejects malformed/transparent cornerColor %j', (cornerColor) => {
    expect(() => validateGenerationRequest({ ...berry, cornerColor })).toThrow(/cornerColor must be an opaque hex color/);
  });
});
