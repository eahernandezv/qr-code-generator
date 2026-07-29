import * as QRCode from 'qrcode';
import type { NormalizedPayload, ErrorCorrectionLevel, QrMatrix } from '../types.js';
import { QrCoreError } from '../types.js';

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
    functionalRegions: functionalRegions(encoded.version, size),
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

function functionalRegions(version: number, size: number): QrMatrix['functionalRegions'] {
  const formatInfo: QrMatrix['functionalRegions']['formatInfo'] = [];
  const topLeft = [
    [8, 0], [8, 1], [8, 2], [8, 3], [8, 4], [8, 5], [8, 7], [8, 8],
    [7, 8], [5, 8], [4, 8], [3, 8], [2, 8], [1, 8], [0, 8],
  ];
  const secondCopy = [
    ...Array.from({ length: 8 }, (_, index) => [size - 1 - index, 8]),
    ...Array.from({ length: 7 }, (_, index) => [8, size - 7 + index]),
  ];
  for (const [x, y] of [...topLeft, ...secondCopy]) {
    formatInfo.push({ x, y, isECI: false });
  }

  const versionInfo: QrMatrix['functionalRegions']['versionInfo'] = [];
  if (version >= 7) {
    for (let index = 0; index < 18; index += 1) {
      const row = Math.floor(index / 3);
      const column = index % 3;
      versionInfo.push({ x: size - 11 + column, y: row });
      versionInfo.push({ x: row, y: size - 11 + column });
    }
  }

  return {
    finderPatterns: [
      { x: 0, y: 0, size: 7 },
      { x: size - 7, y: 0, size: 7 },
      { x: 0, y: size - 7, size: 7 },
    ],
    separators: [
      { x: 0, y: 0, size: 8 },
      { x: size - 8, y: 0, size: 8 },
      { x: 0, y: size - 8, size: 8 },
    ],
    timingPatterns: [
      { orientation: 'horizontal', start: 8, end: size - 9 },
      { orientation: 'vertical', start: 8, end: size - 9 },
    ],
    darkModule: { x: 8, y: 4 * version + 9 },
    formatInfo,
    versionInfo,
  };
}
