import type { PalettePattern, QrMatrix, RenderOptions } from './types.js';

/** Deterministic, browser-safe active-module color mapping shared by preview/export/rendering. */
export function resolveModuleColor(
  matrix: QrMatrix,
  x: number,
  y: number,
  options: RenderOptions,
): string {
  const palette = options.modulePalette?.length ? options.modulePalette : [options.colorDark ?? '#000000'];
  if (isFunctionalModule(matrix, x, y)) return options.functionalColor ?? palette[0];
  const pattern = options.palettePattern ?? 'solid';
  return palette[colorIndex(pattern, x, y, matrix.size, palette.length)];
}

export function isFunctionalModule(matrix: QrMatrix, x: number, y: number): boolean {
  const regions = matrix.functionalRegions;
  if (regions.finderPatterns.some((r) => x >= r.x && x < r.x + r.size && y >= r.y && y < r.y + r.size)) return true;
  if (regions.timingPatterns.some((r) => r.orientation === 'horizontal'
    ? y === 6 && x >= r.start && x <= r.end
    : x === 6 && y >= r.start && y <= r.end)) return true;
  if (regions.formatInfo.some((p) => p.x === x && p.y === y)) return true;
  if (regions.versionInfo.some((p) => p.x === x && p.y === y)) return true;
  return regions.darkModule.x === x && regions.darkModule.y === y;
}

function colorIndex(pattern: PalettePattern, x: number, y: number, size: number, count: number): number {
  if (count <= 1 || pattern === 'solid') return 0;
  const scale = count / Math.max(1, size);
  switch (pattern) {
    case 'horizontalGradient': return clampIndex(Math.floor(x * scale), count);
    case 'verticalGradient': return clampIndex(Math.round(y * (count - 1) / Math.max(1, size - 1)), count);
    case 'diagonalGradient': return clampIndex(Math.floor(((x + y) / 2) * scale), count);
    // Identity stripes preserve palette order and use crisp, evenly sized rows.
    case 'flagRows': return clampIndex(Math.floor(y * scale), count);
    case 'spiral': {
      const center = (size - 1) / 2;
      const angle = Math.atan2(y - center, x - center) + Math.PI;
      const radius = Math.hypot(x - center, y - center);
      return modulo(Math.floor((angle / (Math.PI * 2)) * count + radius / 3), count);
    }
    case 'radialRings': {
      const center = (size - 1) / 2;
      return modulo(Math.floor(Math.hypot(x - center, y - center) / 2), count);
    }
  }
}

function clampIndex(value: number, count: number): number {
  return Math.max(0, Math.min(count - 1, value));
}

function modulo(value: number, count: number): number {
  return ((value % count) + count) % count;
}