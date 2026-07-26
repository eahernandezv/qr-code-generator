/**
 * QR Core API surface
 * Implements: normalizePayload, generateMatrix, renderDeterministic, decodeMatrix
 */

import {
  type QrPayload,
  type NormalizedPayload,
  type QrMatrix,
  type RenderOptions,
  type RenderedArtifact,
} from '../types.js';
import { buildMatrix, computeOptimalMask } from '../matrix.js';
import { renderSvg } from '../render.js';

export function normalizePayload(payload: QrPayload): NormalizedPayload {
  const mode = payload.mode;
  let canonical = payload.content.trim();

  if (mode === 'url') {
    canonical = canonical.toLowerCase();
    if (!/^https?:\/\//.test(canonical) && !/^mailto:|^tel:/.test(canonical)) {
      canonical = 'https://' + canonical.replace(/^\/+/, '');
    }
  }

  const byteLength = new TextEncoder().encode(canonical).length;
  const errorCorrectionLevel: NormalizedPayload['errorCorrectionLevel'] = payload.errorCorrectionLevel ?? 'M';

  // Compute minimal version (simplified; real implementation needs mode-specific capacity tables)
  const version = payload.version ?? estimateVersion(byteLength, errorCorrectionLevel);
  const maskPattern = payload.maskPattern ?? computeOptimalMask(canonical, version, errorCorrectionLevel);

  if (byteLength > capacityForVersion(version, errorCorrectionLevel)) {
    throw new Error('PAYLOAD_TOO_LONG: Payload exceeds maximum capacity');
  }

  return {
    canonical,
    mode,
    byteLength,
    version,
    errorCorrectionLevel,
    maskPattern,
  };
}

export function generateMatrix(normalized: NormalizedPayload): QrMatrix {
  return buildMatrix(normalized);
}

export function renderDeterministic(
  matrix: QrMatrix,
  options: RenderOptions = {}
): RenderedArtifact {
  const format = options.format ?? 'svg';
  if (format !== 'svg' && format !== 'png-dataurl') {
    throw new Error('UNSUPPORTED_FORMAT: Only svg and png-dataurl are supported');
  }
  return renderSvg(matrix, options);
}

export function decodeMatrix(matrix: QrMatrix): { payload: string; success: boolean } {
  // Stub: deterministic decode for test validation
  // Real implementation would use Reed-Solomon decoding + bit extraction
  return { payload: '', success: false };
}

// Simplified capacity estimation (bytes for alphanumeric/binary modes)
function estimateVersion(byteLength: number, ecl: string): number {
  // Binary mode capacity per version for M (~15%): v1=14, v2=26, v3=42, v5=72, v10=174, v20=370, v40=852
  const capacitiesM = [0, 14, 26, 42, 62, 84, 106, 122, 152, 180, 213, 251, 287, 331, 362, 412, 450, 504, 560, 624, 666, 711, 779, 857, 911, 997, 1059, 1125, 1190, 1264, 1370, 1452, 1538, 1628, 1722, 1809, 1911, 1989, 2099, 2213, 2331];
  for (let v = 1; v <= 40; v++) {
    if (capacitiesM[v] && capacitiesM[v] >= byteLength) return v;
  }
  throw new Error('VERSION_OVERFLOW: Payload requires QR version > 40');
}

function capacityForVersion(version: number, ecl: string): number {
  const capacitiesM = [0, 14, 26, 42, 62, 84, 106, 122, 152, 180, 213, 251, 287, 331, 362, 412, 450, 504, 560, 624, 666, 711, 779, 857, 911, 997, 1059, 1125, 1190, 1264, 1370, 1452, 1538, 1628, 1722, 1809, 1911, 1989, 2099, 2213, 2331];
  const factor = ecl === 'L' ? 1.15 : ecl === 'M' ? 1.0 : ecl === 'Q' ? 0.8 : 0.65;
  return Math.floor((capacitiesM[version] ?? 0) * factor);
}
