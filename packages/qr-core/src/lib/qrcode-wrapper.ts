import QRCode from 'qrcode';
import type { NormalizedPayload, QrMatrix, RenderOptions, RenderedArtifact } from '../types.js';

/**
 * Generate a real QR code matrix using the battle-tested `qrcode` library.
 * This wraps qrcode to conform to our qr-core-api.v1.json contract.
 */
export async function generateMatrix(normalized: NormalizedPayload): Promise<QrMatrix> {
  const { canonical, errorCorrectionLevel, version: requestedVersion } = normalized;

  const options: QRCode.QRCodeOptions = {
    errorCorrectionLevel: errorCorrectionLevel.toLowerCase() as QRCode.QRCodeErrorCorrectionLevel,
    type: 'svg' as any, // we extract the matrix, not the SVG
  };

  if (requestedVersion) {
    (options as any).version = requestedVersion;
  }

  // Use qrcode's internal Data module to get the bit matrix
  const qrData = QRCode.create(canonical, options);
  const size = qrData.modules.size;
  const modules: number[][] = [];

  for (let y = 0; y < size; y++) {
    const row: number[] = [];
    for (let x = 0; x < size; x++) {
      row.push(qrData.modules.get(x, y) ? 1 : 0);
    }
    modules.push(row);
  }

  return {
    size,
    modules,
    version: qrData.version,
    errorCorrectionLevel: normalized.errorCorrectionLevel,
    maskPattern: (qrData as any).maskPattern ?? 0,
    functionalRegions: {
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
        { orientation: 'horizontal', start: 8, end: size - 8 },
        { orientation: 'vertical', start: 8, end: size - 8 },
      ],
      darkModule: { x: 8, y: 4 * qrData.version + 9 },
      formatInfo: [],
      versionInfo: [],
    },
  };
}

/**
 * Render a QR matrix to SVG using our style config.
 */
export function renderSvg(matrix: QrMatrix, options: RenderOptions = {}): RenderedArtifact {
  const moduleSize = options.moduleSize ?? 4;
  const margin = options.margin ?? 4;
  const colorDark = options.colorDark ?? '#000000';
  const colorLight = options.colorLight ?? '#ffffff';
  const shape = options.shape ?? 'square';

  const contentSize = matrix.size * moduleSize;
  const totalSize = contentSize + margin * moduleSize * 2;
  const m = margin * moduleSize;

  let svg = `<?xml version="1.0" encoding="UTF-8"?>`;
  svg += `<svg xmlns="http://www.w3.org/2000/svg" width="${totalSize}" height="${totalSize}" viewBox="0 0 ${totalSize} ${totalSize}">`;
  svg += `<rect width="${totalSize}" height="${totalSize}" fill="${colorLight}"/>`;

  for (let y = 0; y < matrix.size; y++) {
    for (let x = 0; x < matrix.size; x++) {
      if (matrix.modules[y][x] === 1) {
        const cx = m + x * moduleSize + moduleSize / 2;
        const cy = m + y * moduleSize + moduleSize / 2;
        const s = moduleSize;

        if (shape === 'circle') {
          svg += `<circle cx="${cx}" cy="${cy}" r="${s / 2}" fill="${colorDark}"/>`;
        } else if (shape === 'rounded') {
          const r = s / 4;
          svg += `<rect x="${m + x * moduleSize}" y="${m + y * moduleSize}" width="${s}" height="${s}" rx="${r}" ry="${r}" fill="${colorDark}"/>`;
        } else {
          svg += `<rect x="${m + x * moduleSize}" y="${m + y * moduleSize}" width="${s}" height="${s}" fill="${colorDark}"/>`;
        }
      }
    }
  }

  svg += `</svg>`;

  return {
    format: 'svg',
    data: svg,
    width: totalSize,
    height: totalSize,
    metadata: {
      version: matrix.version,
      errorCorrectionLevel: matrix.errorCorrectionLevel,
      maskPattern: matrix.maskPattern,
      moduleSize,
      margin: margin * moduleSize,
    },
  };
}

/**
 * Compute optimal mask pattern.
 * For MVP: returns the mask used by qrcode library.
 */
export function computeOptimalMask(_canonical: string, _version: number, _ecl: string): number {
  return 2; // placeholder
}
