import type { FunctionalRegions } from './types.js';

/** ISO/IEC 18004 alignment-pattern centers for QR versions 1–40. */
export function alignmentPatternCenters(version: number): number[] {
  assertVersion(version);
  if (version === 1) return [];
  const count = Math.floor(version / 7) + 2;
  const size = version * 4 + 17;
  const step = version === 32
    ? 26
    : Math.floor((version * 4 + count * 2 + 1) / (count * 2 - 2)) * 2;
  const centers = [6];
  for (let index = count - 1; index >= 1; index -= 1) {
    centers.push(size - 7 - (index - 1) * step);
  }
  return centers;
}

/** Browser-safe functional-region contract used before any visual treatment. */
export function getFunctionalRegions(version: number): FunctionalRegions {
  assertVersion(version);
  const size = version * 4 + 17;
  const formatInfo: FunctionalRegions['formatInfo'] = [];
  const topLeft = [
    [8, 0], [8, 1], [8, 2], [8, 3], [8, 4], [8, 5], [8, 7], [8, 8],
    [7, 8], [5, 8], [4, 8], [3, 8], [2, 8], [1, 8], [0, 8],
  ];
  const secondCopy = [
    ...Array.from({ length: 8 }, (_, index) => [size - 1 - index, 8]),
    ...Array.from({ length: 7 }, (_, index) => [8, size - 7 + index]),
  ];
  for (const [x, y] of [...topLeft, ...secondCopy]) formatInfo.push({ x, y, isECI: false });

  const versionInfo: FunctionalRegions['versionInfo'] = [];
  if (version >= 7) {
    for (let index = 0; index < 18; index += 1) {
      const row = Math.floor(index / 3);
      const column = index % 3;
      versionInfo.push({ x: size - 11 + column, y: row });
      versionInfo.push({ x: row, y: size - 11 + column });
    }
  }

  const centers = alignmentPatternCenters(version);
  const alignmentPatterns: FunctionalRegions['alignmentPatterns'] = [];
  for (const centerY of centers) {
    for (const centerX of centers) {
      const overlapsFinder =
        (centerX === 6 && centerY === 6) ||
        (centerX === 6 && centerY === size - 7) ||
        (centerX === size - 7 && centerY === 6);
      if (!overlapsFinder) {
        alignmentPatterns.push({ x: centerX - 2, y: centerY - 2, size: 5, centerX, centerY });
      }
    }
  }

  return {
    finderPatterns: [
      { x: 0, y: 0, size: 7 },
      { x: size - 7, y: 0, size: 7 },
      { x: 0, y: size - 7, size: 7 },
    ],
    separators: [
      { x: 0, y: 0, size: 8 },
      { x: size - 8, y: 0, size: 8 },
      { x: 0, y: size - 8, size: 8 },
    ],
    timingPatterns: [
      { orientation: 'horizontal', start: 8, end: size - 9 },
      { orientation: 'vertical', start: 8, end: size - 9 },
    ],
    alignmentPatterns,
    darkModule: { x: 8, y: 4 * version + 9 },
    formatInfo,
    versionInfo,
  };
}

/** True when a matrix module is immutable for image-fit treatments. */
export function isProtectedFunctionalModule(regions: FunctionalRegions, x: number, y: number): boolean {
  const inBox = (box: { x: number; y: number; size: number }): boolean =>
    x >= box.x && x < box.x + box.size && y >= box.y && y < box.y + box.size;
  return regions.finderPatterns.some(inBox)
    || regions.separators.some(inBox)
    || regions.alignmentPatterns.some(inBox)
    || regions.formatInfo.some((point) => point.x === x && point.y === y)
    || regions.versionInfo.some((point) => point.x === x && point.y === y)
    || (regions.darkModule.x === x && regions.darkModule.y === y)
    || (y === 6 && x >= 8 && x <= regions.timingPatterns[0].end)
    || (x === 6 && y >= 8 && y <= regions.timingPatterns[1].end);
}

function assertVersion(version: number): void {
  if (!Number.isInteger(version) || version < 1 || version > 40) {
    throw new Error(`QR version must be an integer from 1 to 40, got ${version}`);
  }
}
