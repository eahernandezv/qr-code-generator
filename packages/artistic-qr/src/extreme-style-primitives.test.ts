import { describe, expect, it } from 'vitest';
import { normalizePayload } from '@qr/qr-core';
import { exportArtifact, generateCandidates, resolveArtisticRenderIntent } from './index.js';
import { validateGenerationRequest } from './request-validation.js';
import type { EyeBallStyle, EyeFrameStyle, GenerationRequest, ModuleStyle } from './types.js';

const normalizedPayload = normalizePayload({ mode: 'url', content: 'https://example.com/b17/extreme-parity', errorCorrectionLevel: 'H' });
type StyleCase =
  | { family: 'module'; value: ModuleStyle }
  | { family: 'eye-frame'; value: EyeFrameStyle }
  | { family: 'eye-ball'; value: EyeBallStyle };
const extremes: StyleCase[] = [
  { family: 'module', value: 'notched' }, { family: 'module', value: 'shield' },
  { family: 'eye-frame', value: 'diamond' }, { family: 'eye-frame', value: 'hex' },
  { family: 'eye-ball', value: 'hex' }, { family: 'eye-ball', value: 'vertical-capsule' }, { family: 'eye-ball', value: 'horizontal-capsule' },
];

function request(style: StyleCase): GenerationRequest {
  return {
    normalizedPayload,
    mode: 'deterministic_template',
    moduleShape: style.family === 'module' ? style.value as ModuleStyle : 'square',
    eyeFrameShape: style.family === 'eye-frame' ? style.value : 'square',
    eyeBallShape: style.family === 'eye-ball' ? style.value : 'square',
    artisticStrength: 0.5,
    composition: { focalArea: 'balanced', qrProminence: 0.65 },
    seed: 17017,
  };
}

function optionValue(style: StyleCase, options: ReturnType<typeof resolveArtisticRenderIntent>['previewOptions']) {
  if (style.family === 'module') return options.shape;
  if (style.family === 'eye-frame') return options.eyeFrameShape;
  return options.eyeBallShape;
}

describe('B17 extreme artistic primitive parity', () => {
  it.each(extremes)('keeps $family $value in preview and every candidate intent', (style) => {
    const intent = resolveArtisticRenderIntent(request(style));
    expect(optionValue(style, intent.previewOptions)).toBe(style.value);
    expect(intent.candidateOptions.every((options) => optionValue(style, options) === style.value)).toBe(true);
  });

  it.each(extremes)('passes unchanged objective scan and final export parity for $family $value', async (style) => {
    const board = await generateCandidates(request(style));
    expect(board.candidates).toHaveLength(4);
    for (const candidate of board.candidates) {
      expect(candidate.exportAllowed).toBe(true);
      expect(candidate.scanResults[0]).toMatchObject({
        pass: true,
        thresholdVersion: 'scan-v1-real-75pct',
        scannedPayload: normalizedPayload.canonical,
      });
      expect(candidate.scanResults[0].tests).toHaveLength(8);
    }
    const candidate = board.candidates[0];
    const artifact = exportArtifact({
      candidateId: candidate.candidateId,
      formats: ['svg', 'png'],
      sizes: [{ label: 'native', widthPx: candidate.rendered.width, heightPx: candidate.rendered.height }],
    }, candidate);
    expect(artifact.files).toHaveLength(2);
    const vector = artifact.files.find((file) => file.format === 'svg')?.data ?? '';
    if (style.family === 'module') expect(vector).toContain(`data-module-shape="${style.value}"`);
    if (style.family === 'eye-frame') expect(vector).toContain(`data-eye-frame-shape="${style.value}"`);
    if (style.family === 'eye-ball') expect(vector).toContain(`data-eye-ball-shape="${style.value}"`);
    expect(artifact.files.every((file) => file.width === candidate.rendered.width && file.height === candidate.rendered.height)).toBe(true);
    expect(artifact.provenance.validationVersion).toBe('scan-v1-real-75pct');
  }, 30_000);

  it('rejects researched candidates that were not promoted', () => {
    for (const moduleShape of ['cut-corner', 'diamond', 'cross', 'slash', 'star', 'inset-grid', 'mosaic']) {
      expect(() => validateGenerationRequest({ ...request(extremes[0]), moduleShape })).toThrow(/moduleShape is invalid/);
    }
    for (const eyeFrameShape of ['plus', 'beaded', 'bracket', 'heavy-rounded']) {
      expect(() => validateGenerationRequest({ ...request(extremes[2]), eyeFrameShape })).toThrow(/eyeFrameShape is invalid/);
    }
    for (const eyeBallShape of ['plus', 'flower', 'slash', 'capsule', 'burst']) {
      expect(() => validateGenerationRequest({ ...request(extremes[5]), eyeBallShape })).toThrow(/eyeBallShape is invalid/);
    }
  });
});
