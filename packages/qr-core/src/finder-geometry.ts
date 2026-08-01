import type { EyeShape } from './types.js';

/** Deterministic geometry shared by SVG and PNG finder rendering. */
export function svgShape(shape: EyeShape, x: number, y: number, size: number, fill: string, marker: string): string {
  const attrs = `data-eye-part="${marker}" data-eye-shape="${shape}" fill="${fill}"`;
  if (shape === 'circle') {
    return `<circle ${attrs} cx="${x + size / 2}" cy="${y + size / 2}" r="${size / 2}"/>`;
  }
  if (shape === 'rounded') {
    const radius = size * 0.18;
    return `<rect ${attrs} x="${x}" y="${y}" width="${size}" height="${size}" rx="${radius}" ry="${radius}"/>`;
  }
  if (shape === 'squircle' || shape === 'chamfered') {
    const rows: string[] = [];
    const pixels = Math.round(size);
    for (let py = 0; py < pixels; py += 1) {
      let first = -1;
      let last = -1;
      for (let px = 0; px < pixels; px += 1) {
        if (!pointInShape(shape, px, py, pixels)) continue;
        if (first < 0) first = px;
        last = px;
      }
      if (first >= 0) rows.push(`<rect ${attrs} x="${x + first}" y="${y + py}" width="${last - first + 1}" height="1"/>`);
    }
    return `<g ${attrs}>${rows.join('')}</g>`;
  }
  return `<rect ${attrs} x="${x}" y="${y}" width="${size}" height="${size}"/>`;
}

export function pointInShape(shape: EyeShape, px: number, py: number, size: number): boolean {
  const x = (px + 0.5) / size;
  const y = (py + 0.5) / size;
  const dx = Math.abs(x - 0.5);
  const dy = Math.abs(y - 0.5);
  if (shape === 'circle') return dx * dx + dy * dy <= 0.25;
  if (shape === 'squircle') return Math.pow(dx / 0.5, 4) + Math.pow(dy / 0.5, 4) <= 1;
  if (shape === 'chamfered') return dx + dy <= 0.82;
  if (shape === 'rounded') {
    const radius = 0.18;
    const cornerX = Math.max(dx - (0.5 - radius), 0);
    const cornerY = Math.max(dy - (0.5 - radius), 0);
    return cornerX * cornerX + cornerY * cornerY <= radius * radius;
  }
  return true;
}
