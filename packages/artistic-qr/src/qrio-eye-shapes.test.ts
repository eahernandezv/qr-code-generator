import { describe, expect, it } from 'vitest';
import { normalizePayload } from '@qr/qr-core';
import { exportArtifact, generateCandidates, resolveArtisticRenderIntent } from './index.js';
import { validateGenerationRequest } from './request-validation.js';
import type { EyeBallStyle, EyeFrameStyle, GenerationRequest } from './types.js';

const normalizedPayload = normalizePayload({
  mode: 'url',
  content: 'https://example.com/b26/qrio-eye-shapes?scan-safe=true',
  errorCorrectionLevel: 'H',
});

type ShapeCase =
  | { family: 'eye-frame'; value: EyeFrameStyle }
  | { family: 'eye-ball'; value: EyeBallStyle };

const accepted: ShapeCase[] = [
  { family: 'eye-frame', value: 'leaf-frame' },
  { family: 'eye-frame', value: 'opposing-leaf-frame' },
  { family: 'eye-frame', value: 'd-frame' },
  { family: 'eye-frame', value: 'inset-leaf-frame' },
  { family: 'eye-ball', value: 'star' },
  { family: 'eye-ball', value: 'diamond' },
];

function request(shape: ShapeCase): GenerationRequest {
  return {
    normalizedPayload,
    mode: 'deterministic_template',
    moduleShape: 'square',
    eyeFrameShape: shape.family === 'eye-frame' ? shape.value : 'square',
    eyeBallShape: shape.family === 'eye-ball' ? shape.value : 'square',
    palette: { primary: '#111827', background: '#ffffff' },
    artisticStrength: 0.5,
    composition: { focalArea: 'balanced', qrProminence: 0.78 },
    seed: 26026,
  };
}

describe('B26 QR.io-inspired Core-backed eye primitives', () => {
  it.each(accepted)('preserves $family $value in preview and candidate render intents', (shape) => {
    const validated = validateGenerationRequest(request(shape));
    const intent = resolveArtisticRenderIntent(validated);
    const key = shape.family === 'eye-frame' ? 'eyeFrameShape' : 'eyeBallShape';
    expect(intent.previewOptions[key]).toBe(shape.value);
    expect(intent.candidateOptions.every((options) => options[key] === shape.value)).toBe(true);
  });

  it.each(accepted)('passes unchanged objective scan and SVG/PNG export parity for $family $value', async (shape) => {
    const board = await generateCandidates(request(shape));
    expect(board.candidates).toHaveLength(4);
    for (const candidate of board.candidates) {
      expect(candidate.exportAllowed).toBe(true);
      expect(candidate.scanResults[0]).toMatchObject({
        pass: true,
        decoder: 'jsQR',
        version: '1.4.0',
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
    expect(artifact.files.map((file) => file.format)).toEqual(['svg', 'png']);
    const vector = artifact.files.find((file) => file.format === 'svg')?.data ?? '';
    expect(vector).toContain(`data-${shape.family}-shape="${shape.value}"`);
    expect(artifact.provenance.validationVersion).toBe('scan-v1-real-75pct');
  }, 30_000);

  it('rejects plus/cross and burst at the public engine boundary', () => {
    for (const eyeBallShape of ['plus', 'cross', 'burst']) {
      expect(() => validateGenerationRequest({ ...request(accepted[4]), eyeBallShape }))
        .toThrow(/eyeBallShape is invalid/);
    }
  });
});
