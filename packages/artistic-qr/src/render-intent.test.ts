import { describe, expect, it } from 'vitest';
import { normalizePayload } from '@qr/qr-core';
import { generateCandidates, resolveArtisticRenderIntent } from './index.js';
import type { GenerationRequest } from './types.js';

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

describe('artistic render intent', () => {
  it('honors Berry palette in both preview intent and generated candidates', async () => {
    const intent = resolveArtisticRenderIntent(berry);
    expect(intent.styleFamily).toBe('watercolor');
    expect(intent.previewOptions).toMatchObject({ colorDark: '#c9184a', colorLight: '#f9e8ef' });

    const board = await generateCandidates(berry);
    expect(board.candidates).toHaveLength(4);
    expect(board.candidates[0].rendered.data).toContain('fill="#f9e8ef"');
    expect(board.candidates[0].rendered.data).toContain('fill="#c9184a"');
    expect(board.candidates.every((candidate) => candidate.exportAllowed === candidate.scanResults[0].pass)).toBe(true);
  });

  it('maps template, strength, composition, and prominence to deterministic visible options', () => {
    const base = resolveArtisticRenderIntent(berry);
    const geometric = resolveArtisticRenderIntent({ ...berry, artDirectionId: 'architectural-geometric', prompt: undefined });
    const subtle = resolveArtisticRenderIntent({ ...berry, artisticStrength: 0.1 });
    const balanced = resolveArtisticRenderIntent({ ...berry, composition: { ...berry.composition, focalArea: 'balanced' } });
    const quiet = resolveArtisticRenderIntent({ ...berry, composition: { ...berry.composition, qrProminence: 0.1 } });

    expect(geometric.previewOptions.shape).not.toBe(base.previewOptions.shape);
    expect(subtle.previewOptions.shape).not.toBe(base.previewOptions.shape);
    expect(balanced.previewOptions.eyeShape).not.toBe(base.previewOptions.eyeShape);
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
});
