/**
 * QR Matrix generation — finder patterns, timing, masking, data placement
 */

import type { NormalizedPayload, QrMatrix, FunctionalRegions } from '../types.js';

export function buildMatrix(normalized: NormalizedPayload): QrMatrix {
  const { version, errorCorrectionLevel, maskPattern } = normalized;
  const size = version * 4 + 17;
  const modules: number[][] = Array.from({ length: size }, () => Array(size).fill(0));

  const functionalRegions = placeFunctionalPatterns(modules, size, version);
  placeDataModules(modules, size, normalized);
  applyMask(modules, size, maskPattern);

  return {
    size,
    modules,
    version,
    errorCorrectionLevel,
    maskPattern,
    functionalRegions,
  };
}

export function computeOptimalMask(
  _canonical: string,
  _version: number,
  _ecl: string
): number {
  // Placeholder: in production this evaluates all 8 mask patterns against penalty rules
  return 2;
}

function placeFunctionalPatterns(modules: number[][], size: number, version: number): FunctionalRegions {
  const finderPatterns = [
    { x: 0, y: 0, size: 7 },
    { x: size - 7, y: 0, size: 7 },
    { x: 0, y: size - 7, size: 7 },
  ];
  const separators = [
    { x: 0, y: 0, size: 8 },
    { x: size - 8, y: 0, size: 8 },
    { x: 0, y: size - 8, size: 8 },
  ];

  for (const fp of finderPatterns) {
    drawFinder(modules, fp.x, fp.y);
  }
  for (const sep of separators) {
    drawSeparator(modules, sep.x, sep.y, sep.size);
  }

  // Timing patterns
  const timingPatterns: FunctionalRegions['timingPatterns'] = [
    { orientation: 'horizontal', start: 8, end: size - 8 },
    { orientation: 'vertical', start: 8, end: size - 8 },
  ];
  for (let i = 8; i < size - 8; i++) {
    modules[6][i] = i % 2 === 0 ? 1 : 0;
    modules[i][6] = i % 2 === 0 ? 1 : 0;
  }

  // Dark module
  const darkModule = { x: 8, y: 4 * version + 9 };
  modules[darkModule.y][darkModule.x] = 1;

  // Alignment patterns (simplified: only for versions that need them)
  if (version >= 2) {
    const positions = getAlignmentPatternPositions(version);
    for (const [cx, cy] of positions) {
      drawAlignment(modules, cx, cy);
    }
  }

  // Format info placeholders (near finders)
  const formatInfo: FunctionalRegions['formatInfo'] = [];
  // Simplified: reserve format info regions as light modules
  for (let i = 0; i < 8; i++) {
    formatInfo.push({ x: i, y: 8, isECI: false });
    formatInfo.push({ x: 8, y: i, isECI: false });
    formatInfo.push({ x: size - 1 - i, y: 8, isECI: false });
    formatInfo.push({ x: 8, y: size - 1 - i, isECI: false });
    modules[8][i] = 0;
    modules[i][8] = 0;
    modules[8][size - 1 - i] = 0;
    modules[size - 1 - i][8] = 0;
  }
  modules[8][8] = 0; // timing intersection

  // Version info (versions >=7)
  const versionInfo: FunctionalRegions['versionInfo'] = [];
  if (version >= 7) {
    // Reserve version info area (simplified)
    for (let i = 0; i < 6; i++) {
      for (let j = 0; j < 3; j++) {
        versionInfo.push({ x: size - 9 - j, y: i });
        versionInfo.push({ x: i, y: size - 9 - j });
        modules[i][size - 9 - j] = 0;
        modules[size - 9 - j][i] = 0;
      }
    }
  }

  return {
    finderPatterns,
    separators,
    timingPatterns,
    darkModule,
    formatInfo,
    versionInfo,
  };
}

function drawFinder(m: number[][], x: number, y: number) {
  for (let dy = 0; dy < 7; dy++) {
    for (let dx = 0; dx < 7; dx++) {
      const dark = dy === 0 || dy === 6 || dx === 0 || dx === 6 || (dy >= 2 && dy <= 4 && dx >= 2 && dx <= 4);
      m[y + dy][x + dx] = dark ? 1 : 0;
    }
  }
}

function drawSeparator(m: number[][], x: number, y: number, size: number) {
  for (let dy = 0; dy < size; dy++) {
    for (let dx = 0; dx < size; dx++) {
      if (dy === 0 || dy === size - 1 || dx === 0 || dx === size - 1) {
        m[y + dy][x + dx] = 0;
      }
    }
  }
}

function drawAlignment(m: number[][], cx: number, cy: number) {
  for (let dy = -2; dy <= 2; dy++) {
    for (let dx = -2; dx <= 2; dx++) {
      const dark = Math.abs(dy) === 2 || Math.abs(dx) === 2 || (dx === 0 && dy === 0);
      m[cy + dy][cx + dx] = dark ? 1 : 0;
    }
  }
}

function getAlignmentPatternPositions(version: number): [number, number][] {
  // Simplified: return center positions for common versions
  if (version <= 1) return [];
  const step = version < 7 ? 18 : version < 14 ? 26 : 34;
  const positions: number[] = [];
  const first = 6;
  const last = 4 * version + 10;
  positions.push(first);
  positions.push(last);
  if (version >= 7) {
    const count = Math.floor((last - first) / step) + 1;
    for (let i = 1; i < count - 1; i++) {
      positions.push(first + Math.round((last - first) * i / (count - 1)));
    }
  }
  const coords: [number, number][] = [];
  for (const py of positions) {
    for (const px of positions) {
      // Skip positions overlapping finder patterns
      if ((px === 6 && py === 6) || (px === last && py === 6) || (px === 6 && py === last)) continue;
      coords.push([px, py]);
    }
  }
  return coords;
}

function placeDataModules(modules: number[][], size: number, _normalized: NormalizedPayload) {
  // Placeholder: in a full implementation this encodes segments with proper mode indicators,
  // bit padding, Reed-Solomon error correction codewords, and interleaving.
  // For the MVP scaffold, we fill remaining modules with a deterministic pseudo-random pattern
  // derived from the payload hash so the visual is stable and modules are populated.
  const payloadHash = hashString(_normalized.canonical);
  let bitIndex = 0;
  let direction = -1;
  let col = size - 1;
  while (col > 0) {
    if (col === 6) col -= 1; // skip timing column
    for (let i = 0; i < size; i++) {
      const row = direction === -1 ? size - 1 - i : i;
      for (let c = 0; c < 2; c++) {
        const x = col - c;
        const y = row;
        if (isReserved(y, x, size)) continue;
        modules[y][x] = ((payloadHash[bitIndex % payloadHash.length] + bitIndex) % 2);
        bitIndex++;
      }
    }
    direction *= -1;
    col -= 2;
  }
}

function applyMask(modules: number[][], size: number, maskPattern: number) {
  for (let y = 0; y < size; y++) {
    for (let x = 0; x < size; x++) {
      if (isReserved(y, x, size)) continue;
      if (maskCondition(x, y, maskPattern)) {
        modules[y][x] ^= 1;
      }
    }
  }
}

function maskCondition(x: number, y: number, pattern: number): boolean {
  switch (pattern) {
    case 0: return (y + x) % 2 === 0;
    case 1: return y % 2 === 0;
    case 2: return x % 3 === 0;
    case 3: return (y + x) % 3 === 0;
    case 4: return (Math.floor(y / 2) + Math.floor(x / 3)) % 2 === 0;
    case 5: return ((y * x) % 2) + ((y * x) % 3) === 0;
    case 6: return (((y * x) % 2) + ((y * x) % 3)) % 2 === 0;
    case 7: return (((y + x) % 2) + ((y * x) % 3)) % 2 === 0;
    default: return false;
  }
}

function isReserved(y: number, x: number, size: number): boolean {
  // Finder patterns and separators
  if (x < 9 && y < 9) return true;
  if (x >= size - 8 && y < 9) return true;
  if (x < 9 && y >= size - 8) return true;
  // Timing patterns
  if (x === 6 || y === 6) return true;
  // Dark module
  if (x === 8 && y === 4 * ((size - 17) / 4) + 9) return true;
  return false;
}

function hashString(s: string): number[] {
  // Simple deterministic hash for placeholder data placement
  let h = 0;
  for (let i = 0; i < s.length; i++) {
    h = ((h << 5) - h + s.charCodeAt(i)) | 0;
  }
  const bytes = [];
  for (let i = 0; i < 16; i++) {
    bytes.push((h >>> (i * 2)) & 0xff);
  }
  return bytes;
}
