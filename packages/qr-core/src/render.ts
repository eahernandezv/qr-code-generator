/** Deterministic QR rendering entry points. PNG remains server-only. */
import type { QrMatrix, RenderOptions, RenderedArtifact } from './types.js';
import { PNG } from 'pngjs';
import { renderSvg } from './svg-renderer.js';
import { resolveModuleColor } from './patterned-palette.js';

export { renderSvg } from './svg-renderer.js';

export function renderPng(matrix: QrMatrix, options: RenderOptions): RenderedArtifact {
  const moduleSize = options.moduleSize ?? 4;
  const margin = options.margin ?? 4;
  const colorLight = parseColor(options.colorLight ?? '#ffffff');
  const shape = options.shape ?? 'square';
  const eyeShape = options.eyeShape ?? 'square';
  const totalSize = (matrix.size + margin * 2) * moduleSize;
  if (!Number.isInteger(totalSize) || totalSize < 1 || totalSize > 8192) {
    throw new Error(`PNG dimensions must be between 1 and 8192 pixels, got ${totalSize}`);
  }
  const png = new PNG({ width: totalSize, height: totalSize });

  for (let offset = 0; offset < png.data.length; offset += 4) {
    png.data[offset] = colorLight[0];
    png.data[offset + 1] = colorLight[1];
    png.data[offset + 2] = colorLight[2];
    png.data[offset + 3] = colorLight[3];
  }
  const isFinder = (x: number, y: number): boolean => matrix.functionalRegions.finderPatterns.some(
    (finder) => x >= finder.x && x < finder.x + finder.size && y >= finder.y && y < finder.y + finder.size,
  );
  for (let row = 0; row < matrix.size; row += 1) {
    for (let column = 0; column < matrix.size; column += 1) {
      if (matrix.modules[row][column] !== 1) continue;
      drawModule(
        png,
        (column + margin) * moduleSize,
        (row + margin) * moduleSize,
        moduleSize,
        isFinder(column, row) ? eyeShape : shape,
        parseColor(resolveModuleColor(matrix, column, row, options)),
      );
    }
  }
  const encoded = PNG.sync.write(png);
  return {
    format: 'png-dataurl',
    data: `data:image/png;base64,${encoded.toString('base64')}`,
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

type Color = [number, number, number, number];

function parseColor(value: string): Color {
  const hex = value.trim().match(/^#([0-9a-f]{3}|[0-9a-f]{6}|[0-9a-f]{8})$/i);
  if (hex) {
    const expanded = hex[1].length === 3 ? [...hex[1]].map((part) => part + part).join('') : hex[1];
    return [
      Number.parseInt(expanded.slice(0, 2), 16),
      Number.parseInt(expanded.slice(2, 4), 16),
      Number.parseInt(expanded.slice(4, 6), 16),
      expanded.length === 8 ? Number.parseInt(expanded.slice(6, 8), 16) : 255,
    ];
  }
  const rgb = value.trim().match(/^rgba?\(\s*(\d+)\s*,\s*(\d+)\s*,\s*(\d+)(?:\s*,\s*(0|1|0?\.\d+))?\s*\)$/i);
  if (rgb) {
    const channels = rgb.slice(1, 4).map(Number);
    if (channels.every((channel) => channel >= 0 && channel <= 255)) {
      return [channels[0], channels[1], channels[2], rgb[4] === undefined ? 255 : Math.round(Number(rgb[4]) * 255)];
    }
  }
  throw new Error(`Unsupported color: ${value}`);
}

function drawModule(png: PNG, startX: number, startY: number, size: number, shape: string, color: Color): void {
  const center = (size - 1) / 2;
  const radius = size / 2;
  const cornerRadius = size / 4;
  for (let y = 0; y < size; y += 1) {
    for (let x = 0; x < size; x += 1) {
      let draw = true;
      if (shape === 'circle') draw = Math.hypot(x - center, y - center) <= radius;
      if (shape === 'rounded') {
        const dx = Math.max(cornerRadius - x, 0, x - (size - 1 - cornerRadius));
        const dy = Math.max(cornerRadius - y, 0, y - (size - 1 - cornerRadius));
        draw = dx * dx + dy * dy <= cornerRadius * cornerRadius;
      }
      if (!draw) continue;
      const offset = ((startY + y) * png.width + startX + x) * 4;
      png.data[offset] = color[0];
      png.data[offset + 1] = color[1];
      png.data[offset + 2] = color[2];
      png.data[offset + 3] = color[3];
    }
  }
}
