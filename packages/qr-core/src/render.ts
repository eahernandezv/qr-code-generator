/** Deterministic QR rendering entry points. PNG remains server-only. */
import type { EyeShape, QrMatrix, RenderOptions, RenderedArtifact } from './types.js';
import { PNG } from 'pngjs';
import { renderSvg } from './svg-renderer.js';
import { resolveModuleColor } from './patterned-palette.js';
import { pointInShape } from './finder-geometry.js';
import { pointInModuleShape } from './module-geometry.js';

export { renderSvg } from './svg-renderer.js';

const MODULE_SHAPES = new Set(['square', 'circle', 'rounded', 'vertical-bars', 'horizontal-bars', 'notched', 'shield']);
const EYE_FRAME_SHAPES = new Set(['square', 'circle', 'rounded', 'squircle', 'chamfered', 'diamond', 'hex', 'leaf-frame', 'opposing-leaf-frame', 'd-frame', 'inset-leaf-frame']);
const EYE_BALL_SHAPES = new Set(['square', 'circle', 'rounded', 'squircle', 'chamfered', 'hex', 'vertical-capsule', 'horizontal-capsule', 'star', 'diamond']);

type Color = [number, number, number, number];

export function renderPng(matrix: QrMatrix, options: RenderOptions): RenderedArtifact {
  const moduleSize = options.moduleSize ?? 4;
  const margin = options.margin ?? 4;
  const colorLight = parseColor(options.colorLight ?? '#ffffff');
  const shape = options.shape ?? 'square';
  const legacyEyeShape = options.eyeShape ?? 'square';
  const eyeFrameShape = options.eyeFrameShape ?? legacyEyeShape;
  const eyeBallShape = options.eyeBallShape ?? legacyEyeShape;
  if (!MODULE_SHAPES.has(shape)) throw new Error(`Unsupported module shape: ${shape}`);
  if (!EYE_FRAME_SHAPES.has(eyeFrameShape)) throw new Error(`Unsupported eye frame shape: ${eyeFrameShape}`);
  if (!EYE_BALL_SHAPES.has(eyeBallShape)) throw new Error(`Unsupported eye ball shape: ${eyeBallShape}`);
  const totalSize = (matrix.size + margin * 2) * moduleSize;
  if (!Number.isInteger(totalSize) || totalSize < 1 || totalSize > 8192) {
    throw new Error(`PNG dimensions must be between 1 and 8192 pixels, got ${totalSize}`);
  }
  const png = new PNG({ width: totalSize, height: totalSize });
  fillPng(png, colorLight);
  const isFinder = (x: number, y: number): boolean => matrix.functionalRegions.finderPatterns.some(
    (finder) => x >= finder.x && x < finder.x + finder.size && y >= finder.y && y < finder.y + finder.size,
  );

  for (let row = 0; row < matrix.size; row += 1) {
    for (let column = 0; column < matrix.size; column += 1) {
      if (matrix.modules[row][column] !== 1 || isFinder(column, row)) continue;
      drawModule(png, (column + margin) * moduleSize, (row + margin) * moduleSize, moduleSize, shape,
        parseColor(resolveModuleColor(matrix, column, row, options)));
    }
  }
  for (const finder of matrix.functionalRegions.finderPatterns) {
    const x = (finder.x + margin) * moduleSize;
    const y = (finder.y + margin) * moduleSize;
    const dark = parseColor(resolveModuleColor(matrix, finder.x, finder.y, options));
    if (eyeFrameShape === 'circle') {
      drawCircleModuleFrame(png, x, y, moduleSize, dark);
      drawEyeShape(png, x + moduleSize, y + moduleSize, 5 * moduleSize, 'square', colorLight);
    } else {
      drawEyeShape(png, x, y, 7 * moduleSize, eyeFrameShape, dark);
      drawEyeShape(png, x + moduleSize, y + moduleSize, 5 * moduleSize, eyeFrameShape, colorLight);
    }
    drawEyeShape(png, x + 2 * moduleSize, y + 2 * moduleSize, 3 * moduleSize, eyeBallShape, dark);
  }

  const encoded = PNG.sync.write(png);
  return {
    format: 'png-dataurl', data: `data:image/png;base64,${encoded.toString('base64')}`,
    width: totalSize, height: totalSize,
    metadata: {
      version: matrix.version, errorCorrectionLevel: matrix.errorCorrectionLevel,
      maskPattern: matrix.maskPattern, moduleSize, margin: margin * moduleSize,
    },
  };
}

function fillPng(png: PNG, color: Color): void {
  for (let offset = 0; offset < png.data.length; offset += 4) png.data.set(color, offset);
}

function parseColor(value: string): Color {
  const hex = value.trim().match(/^#([0-9a-f]{3}|[0-9a-f]{6}|[0-9a-f]{8})$/i);
  if (hex) {
    const expanded = hex[1].length === 3 ? [...hex[1]].map((part) => part + part).join('') : hex[1];
    return [Number.parseInt(expanded.slice(0, 2), 16), Number.parseInt(expanded.slice(2, 4), 16),
      Number.parseInt(expanded.slice(4, 6), 16), expanded.length === 8 ? Number.parseInt(expanded.slice(6, 8), 16) : 255];
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

function drawCircleModuleFrame(png: PNG, startX: number, startY: number, moduleSize: number, color: Color): void {
  for (let row = 0; row < 7; row += 1) for (let column = 0; column < 7; column += 1) {
    if (row !== 0 && row !== 6 && column !== 0 && column !== 6) continue;
    drawModule(png, startX + column * moduleSize, startY + row * moduleSize, moduleSize, 'circle', color);
  }
}

function drawEyeShape(png: PNG, startX: number, startY: number, size: number, shape: EyeShape, color: Color): void {
  for (let y = 0; y < size; y += 1) for (let x = 0; x < size; x += 1) {
    if (pointInShape(shape, x, y, size)) setPixel(png, startX + x, startY + y, color);
  }
}

function drawModule(png: PNG, startX: number, startY: number, size: number, shape: string, color: Color): void {
  const center = (size - 1) / 2;
  const radius = size / 2;
  for (let y = 0; y < size; y += 1) for (let x = 0; x < size; x += 1) {
    let draw = true;
    if (shape === 'circle') draw = Math.hypot(x - center, y - center) <= radius;
    if (shape === 'rounded') draw = pointInShape('rounded', x, y, size);
    if (shape === 'vertical-bars') draw = Math.abs(x - center) <= size * 3 / 8;
    if (shape === 'horizontal-bars') draw = Math.abs(y - center) <= size * 3 / 8;
    if (shape === 'notched' || shape === 'shield') draw = pointInModuleShape(shape, x, y, size);
    if (draw) setPixel(png, startX + x, startY + y, color);
  }
}

function setPixel(png: PNG, x: number, y: number, color: Color): void {
  const offset = (y * png.width + x) * 4;
  png.data.set(color, offset);
}
