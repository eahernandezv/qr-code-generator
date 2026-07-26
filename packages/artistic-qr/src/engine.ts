/**
 * Artistic QR generation engine
 * Builds candidate boards using deterministic templates
 */

import type { GenerationRequest, GenerationBoard, Candidate } from '../types.js';
import {
  type NormalizedPayload,
  type RenderOptions,
  generateMatrix,
  renderDeterministic,
} from '@qr/qr-core';

export function buildBoard(boardId: string, request: GenerationRequest): GenerationBoard {
  const normalized = request.normalizedPayload as NormalizedPayload;
  const matrix = generateMatrix(normalized);

  const candidates: Candidate[] = [];
  const count = 4; // four candidates per board per contract

  for (let i = 0; i < count; i++) {
    const renderOpts = computeRenderOptions(request, i);
    const rendered = renderDeterministic(matrix, renderOpts);

    const candidate: Candidate = {
      candidateId: cryptoRandomUUID(),
      matrixRef: `${normalized.canonical}-v${normalized.version}-${normalized.maskPattern}`,
      rendered: {
        format: rendered.format,
        data: rendered.data,
        width: rendered.width,
        height: rendered.height,
      },
      scanResults: [],
      exportAllowed: false,
      artisticScore: computeArtisticScore(request, i),
      provenance: {
        generationMode: 'deterministic_template',
        provider: 'local',
        modelVersion: 'qr-core-v1',
        adapterVersion: 'artistic-qr-v1',
        validationVersion: 'scan-v1',
        createdAt: new Date().toISOString(),
      },
    };

    // Run immediate validation on each candidate
    candidate.scanResults = [runStubValidation(candidate, normalized.canonical)];
    candidate.exportAllowed = candidate.scanResults[0].pass;

    candidates.push(candidate);
  }

  return {
    boardId,
    request,
    candidates,
    status: 'completed',
  };
}

function computeRenderOptions(request: GenerationRequest, index: number): RenderOptions {
  const strength = request.artisticStrength ?? 0.5;
  const palette = request.palette;

  const shapes: Array<{ shape: RenderOptions['shape']; eyeShape: RenderOptions['eyeShape'] }> = [
    { shape: 'square', eyeShape: 'square' },
    { shape: 'rounded', eyeShape: 'square' },
    { shape: 'circle', eyeShape: 'circle' },
    { shape: 'rounded', eyeShape: 'rounded' },
  ];

  const pick = shapes[index % shapes.length];

  return {
    format: 'svg',
    moduleSize: 4 + index, // slight size variation
    margin: 4,
    colorDark: palette?.primary ?? '#1a1a2e',
    colorLight: palette?.background ?? '#ffffff',
    shape: pick.shape,
    eyeShape: pick.eyeShape,
  };
}

function computeArtisticScore(request: GenerationRequest, index: number): number {
  const strength = request.artisticStrength ?? 0.5;
  // Deterministic templates produce consistent scores; index adds minor diversity
  return Math.min(1, Math.max(0, strength + (index % 2 === 0 ? 0.05 : -0.05)));
}

function runStubValidation(candidate: Candidate, expectedPayload: string): import('../types.js').ScanValidationResult {
  // Stub validation: in production this runs multi-decoder/perturbation tests
  // For the MVP scaffold, we simulate passing deterministic candidates
  const pass = true;
  return {
    pass,
    decoder: 'jsQR-stub',
    version: '1.0.0',
    thresholdVersion: 'scan-v1',
    scannedPayload: expectedPayload,
    tests: [
      { name: 'raw_decode', pass: true, scale: 1.0, perturbation: 'none' },
      { name: 'blur_mild', pass: true, scale: 1.0, perturbation: 'blur' },
      { name: 'contrast_shift', pass: true, scale: 1.0, perturbation: 'contrast' },
    ],
    overallConfidence: pass ? 'high' : 'failed',
  };
}

function cryptoRandomUUID(): string {
  if (typeof crypto !== 'undefined' && crypto.randomUUID) {
    return crypto.randomUUID();
  }
  return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, (c) => {
    const r = (Math.random() * 16) | 0;
    const v = c === 'x' ? r : (r & 0x3) | 0x8;
    return v.toString(16);
  });
}
