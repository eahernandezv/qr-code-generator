import type { EyeShape, QrMatrix, RenderOptions, RenderedArtifact } from './types.js';
import { resolveModuleColor } from './patterned-palette.js';
import { svgShape } from './finder-geometry.js';

const MODULE_SHAPES = new Set(['square', 'circle', 'rounded', 'vertical-bars', 'horizontal-bars']);
const EYE_SHAPES = new Set(['square', 'circle', 'rounded', 'squircle', 'chamfered']);

/** Node-free deterministic SVG renderer shared by server and browser exports. */
export function renderSvg(matrix: QrMatrix, options: RenderOptions): RenderedArtifact {
  const moduleSize = options.moduleSize ?? 4;
  const margin = options.margin ?? 4;
  const colorLight = options.colorLight ?? '#ffffff';
  const shape = options.shape ?? 'square';
  const legacyEyeShape = options.eyeShape ?? 'square';
  const eyeFrameShape = options.eyeFrameShape ?? legacyEyeShape;
  const eyeBallShape = options.eyeBallShape ?? legacyEyeShape;
  if (!MODULE_SHAPES.has(shape)) throw new Error(`Unsupported module shape: ${shape}`);
  if (!EYE_SHAPES.has(eyeFrameShape)) throw new Error(`Unsupported eye frame shape: ${eyeFrameShape}`);
  if (!EYE_SHAPES.has(eyeBallShape)) throw new Error(`Unsupported eye ball shape: ${eyeBallShape}`);

  const totalSize = (matrix.size + margin * 2) * moduleSize;
  const m = margin * moduleSize;
  let svg = `<?xml version="1.0" encoding="UTF-8"?>`;
  svg += `<svg xmlns="http://www.w3.org/2000/svg" width="${totalSize}" height="${totalSize}" viewBox="0 0 ${totalSize} ${totalSize}">`;
  svg += `<rect width="${totalSize}" height="${totalSize}" fill="${colorLight}"/>`;

  const isFinder = (x: number, y: number) => matrix.functionalRegions.finderPatterns.some(
    (finder) => x >= finder.x && x < finder.x + finder.size && y >= finder.y && y < finder.y + finder.size,
  );

  for (let y = 0; y < matrix.size; y += 1) {
    for (let x = 0; x < matrix.size; x += 1) {
      if (matrix.modules[y][x] !== 1 || isFinder(x, y)) continue;
      const startX = m + x * moduleSize;
      const startY = m + y * moduleSize;
      const color = resolveModuleColor(matrix, x, y, options);
      if (shape === 'circle') {
        svg += `<circle cx="${startX + moduleSize / 2}" cy="${startY + moduleSize / 2}" r="${moduleSize / 2}" fill="${color}"/>`;
      } else if (shape === 'rounded') {
        svg += `<rect x="${startX}" y="${startY}" width="${moduleSize}" height="${moduleSize}" rx="${moduleSize / 4}" ry="${moduleSize / 4}" fill="${color}"/>`;
      } else if (shape === 'vertical-bars') {
        svg += `<rect data-module-shape="vertical-bars" x="${startX + moduleSize / 8}" y="${startY}" width="${moduleSize * 3 / 4}" height="${moduleSize}" fill="${color}"/>`;
      } else if (shape === 'horizontal-bars') {
        svg += `<rect data-module-shape="horizontal-bars" x="${startX}" y="${startY + moduleSize / 8}" width="${moduleSize}" height="${moduleSize * 3 / 4}" fill="${color}"/>`;
      } else {
        svg += `<rect x="${startX}" y="${startY}" width="${moduleSize}" height="${moduleSize}" fill="${color}"/>`;
      }
    }
  }

  for (const finder of matrix.functionalRegions.finderPatterns) {
    const x = m + finder.x * moduleSize;
    const y = m + finder.y * moduleSize;
    const dark = resolveModuleColor(matrix, finder.x, finder.y, options);
    svg += `<g data-eye-frame-shape="${eyeFrameShape}" data-eye-ball-shape="${eyeBallShape}">`;
    if (eyeFrameShape === 'circle') {
      // Preserve the established scan-safe circle finder treatment: circular outer-ring
      // modules retain every finder sample location instead of removing all four corners.
      svg += circleModuleFrame(x, y, moduleSize, dark);
      svg += svgShape('square', x + moduleSize, y + moduleSize, 5 * moduleSize, colorLight, 'frame-cutout');
    } else {
      svg += svgShape(eyeFrameShape as EyeShape, x, y, 7 * moduleSize, dark, 'frame');
      svg += svgShape(eyeFrameShape as EyeShape, x + moduleSize, y + moduleSize, 5 * moduleSize, colorLight, 'frame-cutout');
    }
    svg += svgShape(eyeBallShape as EyeShape, x + 2 * moduleSize, y + 2 * moduleSize, 3 * moduleSize, dark, 'ball');
    svg += '</g>';
  }
  svg += `</svg>`;

  return {
    format: 'svg', data: svg, width: totalSize, height: totalSize,
    metadata: {
      version: matrix.version, errorCorrectionLevel: matrix.errorCorrectionLevel,
      maskPattern: matrix.maskPattern, moduleSize, margin: margin * moduleSize,
    },
  };
}

function circleModuleFrame(x: number, y: number, moduleSize: number, fill: string): string {
  let frame = '';
  for (let row = 0; row < 7; row += 1) {
    for (let column = 0; column < 7; column += 1) {
      if (row !== 0 && row !== 6 && column !== 0 && column !== 6) continue;
      frame += `<circle data-eye-part="frame" data-eye-shape="circle" fill="${fill}" cx="${x + (column + 0.5) * moduleSize}" cy="${y + (row + 0.5) * moduleSize}" r="${moduleSize / 2}"/>`;
    }
  }
  return frame;
}
