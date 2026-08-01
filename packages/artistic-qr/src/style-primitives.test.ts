import { describe, expect, it } from 'vitest';
import { normalizePayload } from '@qr/qr-core';
import { exportArtifact, generateCandidates, resolveArtisticRenderIntent } from './index.js';
import { validateGenerationRequest } from './request-validation.js';
import type { EyeStyle, GenerationRequest, ModuleStyle } from './types.js';

const normalizedPayload = normalizePayload({ mode: 'url', content: 'https://example.com/b12/artistic-parity', errorCorrectionLevel: 'H' });
type StyleCase = { family: 'module' | 'eye-frame' | 'eye-ball'; value: ModuleStyle | EyeStyle };
const additions: StyleCase[] = [
  { family: 'module', value: 'vertical-bars' }, { family: 'module', value: 'horizontal-bars' },
  { family: 'eye-frame', value: 'squircle' }, { family: 'eye-frame', value: 'chamfered' },
  { family: 'eye-ball', value: 'squircle' }, { family: 'eye-ball', value: 'chamfered' },
];

function request(style: StyleCase): GenerationRequest {
  return {
    normalizedPayload, mode: 'deterministic_template', moduleShape: style.family === 'module' ? style.value as ModuleStyle : 'square',
    eyeFrameShape: style.family === 'eye-frame' ? style.value as EyeStyle : 'square',
    eyeBallShape: style.family === 'eye-ball' ? style.value as EyeStyle : 'square',
    artisticStrength: 0.5, composition: { focalArea: 'balanced', qrProminence: 0.65 }, seed: 12012,
  };
}
function optionValue(style: StyleCase, options: ReturnType<typeof resolveArtisticRenderIntent>['previewOptions']) {
  if (style.family === 'module') return options.shape;
  if (style.family === 'eye-frame') return options.eyeFrameShape;
  return options.eyeBallShape;
}

describe('expanded artistic style primitive parity', () => {
  it.each(additions)('keeps $family $value in preview and all candidate intents', (style) => {
    const intent = resolveArtisticRenderIntent(request(style));
    expect(optionValue(style, intent.previewOptions)).toBe(style.value);
    expect(intent.candidateOptions.every((options) => optionValue(style, options) === style.value)).toBe(true);
  });

  it.each(additions)('passes unchanged objective scan thresholds and export parity for $family $value', async (style) => {
    const board = await generateCandidates(request(style));
    expect(board.candidates).toHaveLength(4);
    for (const candidate of board.candidates) {
      expect(candidate.exportAllowed).toBe(true);
      expect(candidate.scanResults[0]).toMatchObject({ pass: true, thresholdVersion: 'scan-v1-real-75pct', scannedPayload: normalizedPayload.canonical });
      expect(candidate.scanResults[0].tests).toHaveLength(8);
    }
    const candidate = board.candidates[0];
    const artifact = exportArtifact({ candidateId: candidate.candidateId, formats: ['svg', 'png'], sizes: [{ label: 'native', widthPx: candidate.rendered.width, heightPx: candidate.rendered.height }] }, candidate);
    expect(artifact.files).toHaveLength(2);
    const vector = artifact.files.find((file) => file.format === 'svg')?.data ?? '';
    if (style.family === 'module') expect(vector).toContain(`data-module-shape="${style.value}"`);
    if (style.family === 'eye-frame') expect(vector).toContain(`data-eye-frame-shape="${style.value}"`);
    if (style.family === 'eye-ball') expect(vector).toContain(`data-eye-ball-shape="${style.value}"`);
    expect(artifact.files.every((file) => file.width === candidate.rendered.width && file.height === candidate.rendered.height)).toBe(true);
    expect(artifact.provenance.validationVersion).toBe('scan-v1-real-75pct');
  }, 30_000);

  it('rejects researched unsafe or unsupported primitives at the engine boundary', () => {
    for (const moduleShape of ['diamond', 'inset-grid', 'mosaic']) {
      expect(() => validateGenerationRequest({ ...request(additions[0]), moduleShape })).toThrow(/moduleShape is invalid/);
    }
    expect(() => validateGenerationRequest({ ...request(additions[0]), eyeFrameShape: 'beaded' })).toThrow(/eyeFrameShape is invalid/);
    expect(() => validateGenerationRequest({ ...request(additions[0]), eyeBallShape: 'flower' })).toThrow(/eyeBallShape is invalid/);
  });
});
