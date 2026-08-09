import * as QRCode from 'qrcode';
import type { NormalizedPayload, ErrorCorrectionLevel, QrMatrix } from '../types.js';
import { QrCoreError } from '../types.js';
import { getFunctionalRegions } from '../functional-regions.js';

const isMaskPattern = (value: number): value is 0 | 1 | 2 | 3 | 4 | 5 | 6 | 7 =>
  Number.isInteger(value) && value >= 0 && value <= 7;

/** Generate an ISO/IEC 18004 QR matrix through the audited `qrcode` encoder. */
export function generateMatrix(payload: NormalizedPayload): QrMatrix {
  if (!isMaskPattern(payload.maskPattern)) {
    throw new QrCoreError('MATRIX_GENERATION_FAILED', `Invalid mask pattern ${payload.maskPattern}`);
  }

  let encoded: QRCode.QRCode;
  try {
    encoded = QRCode.create(payload.canonical, {
      version: payload.version,
      errorCorrectionLevel: payload.errorCorrectionLevel,
      maskPattern: payload.maskPattern,
    });
  } catch (error) {
    throw new QrCoreError(
      'MATRIX_GENERATION_FAILED',
      error instanceof Error ? error.message : 'QR encoder rejected the normalized payload',
    );
  }

  const size = encoded.modules.size;
  const modules = Array.from({ length: size }, (_, row) =>
    Array.from({ length: size }, (_, column) => encoded.modules.get(row, column)),
  );

  return {
    size,
    modules,
    version: encoded.version,
    errorCorrectionLevel: payload.errorCorrectionLevel,
    maskPattern: encoded.maskPattern ?? payload.maskPattern,
    functionalRegions: getFunctionalRegions(encoded.version),
  };
}

/** Select the ISO penalty-minimizing mask used by the encoder. */
export function computeOptimalMask(
  canonical: string,
  version: number,
  errorCorrectionLevel: ErrorCorrectionLevel,
): number {
  try {
    const encoded = QRCode.create(canonical, { version, errorCorrectionLevel });
    if (encoded.maskPattern === undefined) {
      throw new Error('encoder did not return a mask pattern');
    }
    return encoded.maskPattern;
  } catch (error) {
    throw new QrCoreError(
      'MATRIX_GENERATION_FAILED',
      error instanceof Error ? error.message : 'Unable to select a mask pattern',
    );
  }
}
