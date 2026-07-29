/** QR Core API surface matching qr-core-api.v1. */
import * as QRCode from 'qrcode';
import * as jsQRModule from 'jsqr';
import {
  type QrPayload,
  type NormalizedPayload,
  type QrMatrix,
  type RenderOptions,
  type RenderedArtifact,
  QrCoreError,
} from '../types.js';
import { generateMatrix as generateMatrixImpl } from '../lib/matrix.js';
import { renderPng, renderSvg } from '../render.js';

export function normalizePayload(payload: QrPayload): NormalizedPayload {
  let canonical = payload.content.trim();
  if (!canonical) {
    throw new QrCoreError('MALFORMED_PAYLOAD', 'Payload content must not be empty');
  }

  if (payload.mode === 'url') {
    if (!/^[a-z][a-z0-9+.-]*:\/\//i.test(canonical)) {
      canonical = `https://${canonical.replace(/^\/+/, '')}`;
    }
    try {
      const parsed = new URL(canonical);
      if (parsed.protocol !== 'http:' && parsed.protocol !== 'https:') {
        throw new QrCoreError('UNSUPPORTED_SCHEME', `Unsupported URL scheme ${parsed.protocol}`);
      }
      canonical = parsed.toString();
    } catch (error) {
      if (error instanceof QrCoreError) throw error;
      throw new QrCoreError(
        'MALFORMED_PAYLOAD',
        error instanceof Error ? error.message : 'Invalid URL payload',
      );
    }
  }

  const byteLength = new TextEncoder().encode(canonical).length;
  if (byteLength > 2953) {
    throw new QrCoreError('PAYLOAD_TOO_LONG', 'Payload exceeds the contract maximum of 2953 bytes');
  }

  try {
    const encoded = QRCode.create(canonical, {
      version: payload.version,
      errorCorrectionLevel: payload.errorCorrectionLevel ?? 'M',
      maskPattern: payload.maskPattern as QRCode.QRCodeMaskPattern | undefined,
    });
    if (encoded.maskPattern === undefined) {
      throw new Error('QR encoder did not select a mask pattern');
    }
    return {
      canonical,
      mode: payload.mode,
      byteLength,
      version: encoded.version,
      errorCorrectionLevel: payload.errorCorrectionLevel ?? 'M',
      maskPattern: encoded.maskPattern,
    };
  } catch (error) {
    if (error instanceof QrCoreError) throw error;
    const message = error instanceof Error ? error.message : 'QR encoder rejected the payload';
    throw new QrCoreError('PAYLOAD_TOO_LONG', message);
  }
}

export function generateMatrix(normalized: NormalizedPayload): QrMatrix {
  return generateMatrixImpl(normalized);
}

export function renderDeterministic(
  matrix: QrMatrix,
  options: RenderOptions = {},
): RenderedArtifact {
  const format = options.format ?? 'svg';
  try {
    if (format === 'svg') return renderSvg(matrix, options);
    if (format === 'png-dataurl') return renderPng(matrix, options);
    throw new QrCoreError('UNSUPPORTED_FORMAT', `Unsupported deterministic render format: ${String(format)}`);
  } catch (error) {
    if (error instanceof QrCoreError) throw error;
    throw new QrCoreError('RENDER_FAILED', error instanceof Error ? error.message : 'Unable to render QR artifact');
  }
}

/** Decode the rendered module grid with jsQR; this does not trust encoder metadata. */
export function decodeMatrix(matrix: QrMatrix): { payload: string; success: boolean } {
  if (
    !Number.isInteger(matrix.size) ||
    matrix.size < 21 ||
    matrix.modules.length !== matrix.size ||
    matrix.modules.some((row) => row.length !== matrix.size || row.some((value) => value !== 0 && value !== 1))
  ) {
    return { payload: '', success: false };
  }

  const quietZone = 4;
  const modulePixels = 8;
  const width = (matrix.size + quietZone * 2) * modulePixels;
  const pixels = new Uint8ClampedArray(width * width * 4);
  pixels.fill(255);

  for (let row = 0; row < matrix.size; row += 1) {
    for (let column = 0; column < matrix.size; column += 1) {
      if (matrix.modules[row][column] !== 1) continue;
      const startX = (column + quietZone) * modulePixels;
      const startY = (row + quietZone) * modulePixels;
      for (let y = 0; y < modulePixels; y += 1) {
        for (let x = 0; x < modulePixels; x += 1) {
          const offset = ((startY + y) * width + startX + x) * 4;
          pixels[offset] = 0;
          pixels[offset + 1] = 0;
          pixels[offset + 2] = 0;
          pixels[offset + 3] = 255;
        }
      }
    }
  }

  type Decoder = (
    data: Uint8ClampedArray,
    width: number,
    height: number,
    options?: { inversionAttempts?: 'dontInvert' | 'onlyInvert' | 'attemptBoth' | 'invertFirst' },
  ) => { data: string } | null;
  const decoder = ((jsQRModule as unknown as { default?: Decoder }).default ?? jsQRModule) as Decoder;
  const decoded = decoder(pixels, width, width, { inversionAttempts: 'dontInvert' });
  return decoded ? { payload: decoded.data, success: true } : { payload: '', success: false };
}
