import type { ModuleShape } from './types.js';

type ExtremeModuleShape = Extract<ModuleShape, 'notched' | 'shield'>;

/** Pixel-exact geometry shared by SVG row runs and PNG module rendering. */
export function pointInModuleShape(shape: ExtremeModuleShape, px: number, py: number, size: number): boolean {
  const x = (px + 0.5) / size;
  const y = (py + 0.5) / size;
  if (shape === 'notched') {
    const top = y < 0.2 && Math.abs(x - 0.5) < (0.2 - y) * 0.8;
    const right = x > 0.8 && Math.abs(y - 0.5) < (x - 0.8) * 0.8;
    const bottom = y > 0.8 && Math.abs(x - 0.5) < (y - 0.8) * 0.8;
    const left = x < 0.2 && Math.abs(y - 0.5) < (0.2 - x) * 0.8;
    return !(top || right || bottom || left);
  }
  return y <= 0.7 || y <= 1 - Math.abs(x - 0.5) * 0.6;
}

export function svgModuleShape(shape: ExtremeModuleShape, x: number, y: number, size: number, fill: string): string {
  const rows: string[] = [];
  const pixels = Math.round(size);
  for (let py = 0; py < pixels; py += 1) {
    let first = -1;
    let last = -1;
    for (let px = 0; px < pixels; px += 1) {
      if (!pointInModuleShape(shape, px, py, pixels)) continue;
      if (first < 0) first = px;
      last = px;
    }
    if (first >= 0) rows.push(`<rect data-module-shape="${shape}" fill="${fill}" x="${x + first}" y="${y + py}" width="${last - first + 1}" height="1"/>`);
  }
  return `<g data-module-shape="${shape}" fill="${fill}">${rows.join('')}</g>`;
}