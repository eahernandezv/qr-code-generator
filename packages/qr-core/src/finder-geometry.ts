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
  if (shape === 'squircle' || shape === 'chamfered' || shape === 'diamond' || shape === 'hex'
    || shape === 'vertical-capsule' || shape === 'horizontal-capsule'
    || shape === 'leaf-frame' || shape === 'opposing-leaf-frame' || shape === 'd-frame'
    || shape === 'inset-leaf-frame' || shape === 'star') {
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
  if (shape === 'diamond') return dx + dy <= 0.76;
  if (shape === 'hex') return dx * 0.55 + dy <= 0.64;
  if (shape === 'leaf-frame') return !outsideRoundedCorner(x, y, 'top-right', 0.46);
  if (shape === 'opposing-leaf-frame') {
    return !outsideRoundedCorner(x, y, 'top-right', 0.46)
      && !outsideRoundedCorner(x, y, 'bottom-left', 0.46);
  }
  if (shape === 'd-frame') return x <= 0.5 || (x - 0.5) ** 2 + dy ** 2 <= 0.25;
  if (shape === 'inset-leaf-frame') {
    return !outsideRoundedCorner(x, y, 'top-right', 0.34)
      && !outsideRoundedCorner(x, y, 'bottom-right', 0.34)
      && !outsideRoundedCorner(x, y, 'bottom-left', 0.34);
  }
  // A solid core anchors the 3x3 finder ball while the five tips retain a clear star silhouette.
  if (shape === 'star') return (dx <= 0.40 && dy <= 0.40)
    || radialPolygonContains(x, y, 5, 0.5, 0.30, -Math.PI / 2);

  if (shape === 'vertical-capsule') return capsuleContains(dx, dy, true);
  if (shape === 'horizontal-capsule') return capsuleContains(dx, dy, false);
  if (shape === 'rounded') {
    const radius = 0.18;
    const cornerX = Math.max(dx - (0.5 - radius), 0);
    const cornerY = Math.max(dy - (0.5 - radius), 0);
    return cornerX * cornerX + cornerY * cornerY <= radius * radius;
  }
  return true;
}

type Corner = 'top-right' | 'bottom-right' | 'bottom-left';

function outsideRoundedCorner(x: number, y: number, corner: Corner, radius: number): boolean {
  const right = corner !== 'bottom-left';
  const bottom = corner !== 'top-right';
  const centerX = right ? 1 - radius : radius;
  const centerY = bottom ? 1 - radius : radius;
  const inCornerX = right ? x > centerX : x < centerX;
  const inCornerY = bottom ? y > centerY : y < centerY;
  return inCornerX && inCornerY && (x - centerX) ** 2 + (y - centerY) ** 2 > radius ** 2;
}

function radialPolygonContains(
  x: number,
  y: number,
  points: number,
  outerRadius: number,
  innerRadius: number,
  rotation: number,
): boolean {
  const angle = Math.atan2(y - 0.5, x - 0.5) - rotation;
  const radius = Math.hypot(x - 0.5, y - 0.5);
  const sector = Math.PI / points;
  const folded = Math.abs((((angle + sector) % (2 * sector)) + 2 * sector) % (2 * sector) - sector);
  const boundary = innerRadius + (outerRadius - innerRadius) * (1 - folded / sector);
  return radius <= boundary;
}

function capsuleContains(dx: number, dy: number, vertical: boolean): boolean {
  const cross = vertical ? dx : dy;
  const along = vertical ? dy : dx;
  const radius = 0.38;
  const capCenter = 0.5 - radius;
  if (along <= capCenter) return cross * cross + (along - capCenter) ** 2 <= radius ** 2;
  return cross <= radius;
}
