import { describe, expect, it } from 'vitest';
import { scoreQ8VisualQuality, type Q8VisualQualityInput } from './visual-quality.js';

function input(): Q8VisualQualityInput {
  return {
    candidate: 'q8-test',
    hardGates: {
      payloadEqual: true, rawDecode: true, checksPassed: 8, checksTotal: 8,
      protectedViolations: 0, contractValid: true, deterministic: true,
      exportParity: 'not_claimed_export_locked',
    },
    producerScores: {
      target_recognizability: 20, composition_placement: 12, image_qr_harmony: 11,
      palette_fidelity: 8, protected_region_elegance: 9, premium_polish: 8,
    },
  };
}

describe('Q8 visual-quality scoring harness', () => {
  it('computes the frozen 100-point rubric and producer threshold', () => {
    const result = scoreQ8VisualQuality(input());
    expect(result.scores.scan_robustness_margin).toBe(15);
    expect(result.total).toBe(83);
    expect(result.verdict).toBe('producer_threshold_met');
    expect(result.thresholdChecks).toEqual({ total75: true, recognizability18: true, scanMargin12: true, everyCategoryHalf: true });
  });

  it.each([[8,15],[7,13],[6,12]] as const)('maps %s/8 scan checks to %s points', (checksPassed, expected) => {
    const value = input(); value.hardGates.checksPassed = checksPassed;
    expect(scoreQ8VisualQuality(value).scores.scan_robustness_margin).toBe(expected);
  });

  it('invalidates the leaderboard score when any hard gate fails', () => {
    const value = input(); value.hardGates.payloadEqual = false; value.hardGates.protectedViolations = 1;
    const result = scoreQ8VisualQuality(value);
    expect(result).toMatchObject({ hardGatePass: false, leaderboardEligible: false, total: null, verdict: 'gate_fail' });
    expect(result.gateFailures).toEqual(['payload_equality_failed','protected_region_violation']);
  });

  it('rejects out-of-range producer scoring instead of silently clamping', () => {
    const value = input(); value.producerScores.target_recognizability = 26;
    expect(() => scoreQ8VisualQuality(value)).toThrow(/0 to 25/);
  });

  it('does not treat locked preview output as an export-parity failure when no export is claimed', () => {
    expect(scoreQ8VisualQuality(input()).gateFailures).not.toContain('export_parity_not_proven');
    const value = input(); value.hardGates.exportParity = 'not_proven';
    expect(scoreQ8VisualQuality(value).gateFailures).toContain('export_parity_not_proven');
  });
});
