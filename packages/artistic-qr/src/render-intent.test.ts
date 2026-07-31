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
});
