/**
 * QR Core API surface
 * Implements: normalizePayload, generateMatrix, renderDeterministic
 */

import {
  type QrPayload,
  type NormalizedPayload,
  type QrMatrix,
  type RenderOptions,
  type RenderedArtifact,
} from '../types.js';
import { generateMatrix as realGenerateMatrix, renderSvg, computeOptimalMask } from '../lib/qrcode-wrapper.js';

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
  const version = payload.version ?? 0; // 0 = auto-detect by qrcode library
  const maskPattern = payload.maskPattern ?? computeOptimalMask(canonical, version, errorCorrectionLevel);

  return {
    canonical,
    mode,
    byteLength,
    version,
    errorCorrectionLevel,
    maskPattern,
  };
}

export async function generateMatrix(normalized: NormalizedPayload): Promise<QrMatrix> {
  return realGenerateMatrix(normalized);
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
