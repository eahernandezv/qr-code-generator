import { describe, expect, it } from 'vitest';
import {
  alignmentPatternCenters,
  generateMatrix,
  getFunctionalRegions,
  isProtectedFunctionalModule,
  normalizePayload,
} from './index.js';

describe('functional-region contract', () => {
  it('returns ISO alignment centers for selected versions', () => {
    expect(alignmentPatternCenters(1)).toEqual([]);
    expect(alignmentPatternCenters(2)).toEqual([6, 18]);
    expect(alignmentPatternCenters(7)).toEqual([6, 22, 38]);
    expect(alignmentPatternCenters(10)).toEqual([6, 28, 50]);
    expect(alignmentPatternCenters(32)).toEqual([6, 34, 60, 86, 112, 138]);
    expect(alignmentPatternCenters(40)).toEqual([6, 30, 58, 86, 114, 142, 170]);
  });

  it('exports alignment boxes without duplicating finder regions', () => {
    const regions = getFunctionalRegions(10);
    expect(regions.alignmentPatterns).toHaveLength(6);
    expect(regions.alignmentPatterns.map(({ centerX, centerY }) => `${centerX},${centerY}`).sort()).toEqual([
      '6,28', '28,6', '28,28', '28,50', '50,28', '50,50',
    ].sort());
    expect(isProtectedFunctionalModule(regions, 28, 28)).toBe(true);
    expect(isProtectedFunctionalModule(regions, 27, 27)).toBe(true);
    expect(isProtectedFunctionalModule(regions, 25, 25)).toBe(false);
  });

  it('attaches the exported contract to generated matrices', () => {
    const normalized = normalizePayload({
      mode: 'url', content: 'https://example.com/alignment', version: 10,
      errorCorrectionLevel: 'Q', maskPattern: 1,
    });
    const matrix = generateMatrix(normalized);
    expect(matrix.functionalRegions).toEqual(getFunctionalRegions(10));
    expect(matrix.functionalRegions.versionInfo).toHaveLength(36);
  });
});
