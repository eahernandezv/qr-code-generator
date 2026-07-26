/**
 * Deterministic QR rendering to SVG
 */

import type { QrMatrix, RenderOptions, RenderedArtifact } from '../types.js';

export function renderSvg(matrix: QrMatrix, options: RenderOptions): RenderedArtifact {
  const moduleSize = options.moduleSize ?? 4;
  const margin = options.margin ?? 4;
  const colorDark = options.colorDark ?? '#000000';
  const colorLight = options.colorLight ?? '#ffffff';
  const shape = options.shape ?? 'square';
  const eyeShape = options.eyeShape ?? 'square';

  const contentSize = matrix.size * moduleSize;
  const totalSize = contentSize + margin * moduleSize * 2;
  const m = margin * moduleSize;

  let svg = `<?xml version="1.0" encoding="UTF-8"?>`;
  svg += `<svg xmlns="http://www.w3.org/2000/svg" width="${totalSize}" height="${totalSize}" viewBox="0 0 ${totalSize} ${totalSize}">`;
  svg += `<rect width="${totalSize}" height="${totalSize}" fill="${colorLight}"/>`;

  const isFinder = (fx: number, fy: number) => {
    for (const fp of matrix.functionalRegions.finderPatterns) {
      if (fx >= fp.x && fx < fp.x + fp.size && fy >= fp.y && fy < fp.y + fp.size) return true;
    }
    return false;
  };

  for (let y = 0; y < matrix.size; y++) {
    for (let x = 0; x < matrix.size; x++) {
      if (matrix.modules[y][x] === 1) {
        const cx = m + x * moduleSize + moduleSize / 2;
        const cy = m + y * moduleSize + moduleSize / 2;
        const s = moduleSize;
        const useEye = isFinder(x, y);
        const moduleShape = useEye ? eyeShape : shape;

        if (moduleShape === 'circle') {
          svg += `<circle cx="${cx}" cy="${cy}" r="${s / 2}" fill="${colorDark}"/>`;
        } else if (moduleShape === 'rounded') {
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
