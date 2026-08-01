import { describe, expect, it } from 'vitest';
import * as jsQRModule from 'jsqr';
import { PNG } from 'pngjs';
import {
  generateMatrix,
  isFunctionalModule,
  normalizePayload,
  renderDeterministic,
} from './index.js';

const payload = 'https://example.com/b25a/corner-color';
const matrix = generateMatrix(normalizePayload({ mode: 'url', content: payload, errorCorrectionLevel: 'H' }));
const moduleSize = 10;
const margin = 4;
const bodyColor = '#004fc4';
const cornerColor = '#7020a8';

type Decoder = (data: Uint8ClampedArray, width: number, height: number) => { data: string } | null;
const decoder = ((jsQRModule as unknown as { default?: Decoder }).default ?? jsQRModule) as Decoder;

function readPng(dataUrl: string): PNG {
  return PNG.sync.read(Buffer.from(dataUrl.slice(dataUrl.indexOf(',') + 1), 'base64'));
}

function pixelAtModule(png: PNG, x: number, y: number): string {
  const pixelX = (margin + x) * moduleSize + Math.floor(moduleSize / 2);
  const pixelY = (margin + y) * moduleSize + Math.floor(moduleSize / 2);
  const offset = (pixelY * png.width + pixelX) * 4;
  return `#${[0, 1, 2].map((index) => png.data[offset + index].toString(16).padStart(2, '0')).join('')}`;
}

function firstBodyModule(): [number, number] {
  for (let y = 0; y < matrix.size; y += 1) for (let x = 0; x < matrix.size; x += 1) {
    if (matrix.modules[y][x] === 1 && !isFunctionalModule(matrix, x, y)) return [x, y];
  }
  throw new Error('Expected at least one active body module');
}

describe('Core functional/corner color behavior', () => {
  it('preserves default rendering exactly when functionalColor is omitted', () => {
    const base = { moduleSize, margin, modulePalette: [bodyColor], palettePattern: 'solid' as const };
    expect(renderDeterministic(matrix, { ...base, format: 'svg' }))
      .toEqual(renderDeterministic(matrix, { ...base, format: 'svg', functionalColor: bodyColor }));
    expect(renderDeterministic(matrix, { ...base, format: 'png-dataurl' }))
      .toEqual(renderDeterministic(matrix, { ...base, format: 'png-dataurl', functionalColor: bodyColor }));
  });

  it('applies functionalColor independently to finder frame/ball and other functional modules in SVG and PNG', () => {
    const base = { moduleSize, margin, modulePalette: [bodyColor], palettePattern: 'solid' as const, functionalColor: cornerColor };
    const svg = renderDeterministic(matrix, { ...base, format: 'svg', eyeFrameShape: 'rounded', eyeBallShape: 'circle' });
    const pngArtifact = renderDeterministic(matrix, { ...base, format: 'png-dataurl', eyeFrameShape: 'rounded', eyeBallShape: 'circle' });
    const png = readPng(pngArtifact.data);
    const [bodyX, bodyY] = firstBodyModule();

    expect(svg.data).toMatch(new RegExp(`data-eye-part="frame"[^>]+fill="${cornerColor}"`));
    expect(svg.data).toMatch(new RegExp(`data-eye-part="ball"[^>]+fill="${cornerColor}"`));
    expect(svg.data).toContain(`fill="${bodyColor}"`);
    expect(pixelAtModule(png, 0, 0)).toBe(cornerColor);
    expect(pixelAtModule(png, 3, 3)).toBe(cornerColor);
    expect(pixelAtModule(png, bodyX, bodyY)).toBe(bodyColor);
    expect(decoder(new Uint8ClampedArray(png.data), png.width, png.height)?.data).toBe(payload);
  });
});
