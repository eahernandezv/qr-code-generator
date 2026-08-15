export const Q8_VISUAL_WEIGHTS = {
  target_recognizability: 25,
  composition_placement: 15,
  image_qr_harmony: 15,
  scan_robustness_margin: 15,
  palette_fidelity: 10,
  protected_region_elegance: 10,
  premium_polish: 10,
} as const;

export type Q8VisualCategory = keyof typeof Q8_VISUAL_WEIGHTS;
export type Q8ProducerVisualScores = Omit<Record<Q8VisualCategory, number>, 'scan_robustness_margin'>;

export interface Q8HardGateEvidence {
  payloadEqual: boolean;
  rawDecode: boolean;
  checksPassed: number;
  checksTotal: number;
  protectedViolations: number;
  contractValid: boolean;
  deterministic: boolean;
  exportParity: 'proven' | 'not_claimed_export_locked' | 'not_proven';
}

export interface Q8VisualQualityInput {
  candidate: string;
  hardGates: Q8HardGateEvidence;
  producerScores: Q8ProducerVisualScores;
}

export interface Q8VisualQualityResult {
  candidate: string;
  hardGatePass: boolean;
  gateFailures: string[];
  leaderboardEligible: boolean;
  scores: Record<Q8VisualCategory, number>;
  total: number | null;
  thresholdChecks: {
    total75: boolean;
    recognizability18: boolean;
    scanMargin12: boolean;
    everyCategoryHalf: boolean;
  };
  verdict: 'gate_fail' | 'below_q8_bar' | 'producer_threshold_met';
}

export function scoreQ8VisualQuality(input: Q8VisualQualityInput): Q8VisualQualityResult {
  const { hardGates } = input;
  if (!Number.isInteger(hardGates.checksPassed) || !Number.isInteger(hardGates.checksTotal)
    || hardGates.checksTotal < 1 || hardGates.checksPassed < 0 || hardGates.checksPassed > hardGates.checksTotal) {
    throw new Error('Q8 decoder check counts are invalid');
  }
  for (const [category, maximum] of Object.entries(Q8_VISUAL_WEIGHTS)) {
    if (category === 'scan_robustness_margin') continue;
    const score = input.producerScores[category as keyof Q8ProducerVisualScores];
    if (!Number.isInteger(score) || score < 0 || score > maximum) throw new Error(`Q8 ${category} score must be an integer from 0 to ${maximum}`);
  }
  const gateFailures: string[] = [];
  if (!hardGates.payloadEqual) gateFailures.push('payload_equality_failed');
  if (!hardGates.rawDecode) gateFailures.push('raw_decode_failed');
  if (hardGates.checksPassed < 6 || hardGates.checksPassed / hardGates.checksTotal < 0.75) gateFailures.push('decoder_threshold_failed');
  if (hardGates.protectedViolations !== 0) gateFailures.push('protected_region_violation');
  if (!hardGates.contractValid) gateFailures.push('contract_invalid');
  if (!hardGates.deterministic) gateFailures.push('determinism_failed');
  if (hardGates.exportParity === 'not_proven') gateFailures.push('export_parity_not_proven');

  const scanMargin = scanRobustnessMargin(hardGates.checksPassed, hardGates.checksTotal);
  const scores: Record<Q8VisualCategory, number> = { ...input.producerScores, scan_robustness_margin: scanMargin };
  const rawTotal = Object.values(scores).reduce((sum, value) => sum + value, 0);
  const hardGatePass = gateFailures.length === 0;
  const thresholdChecks = {
    total75: rawTotal >= 75,
    recognizability18: scores.target_recognizability >= 18,
    scanMargin12: scanMargin >= 12,
    everyCategoryHalf: (Object.keys(Q8_VISUAL_WEIGHTS) as Q8VisualCategory[])
      .every((category) => scores[category] >= Q8_VISUAL_WEIGHTS[category] / 2),
  };
  const producerThresholdMet = hardGatePass && Object.values(thresholdChecks).every(Boolean);
  return {
    candidate: input.candidate,
    hardGatePass,
    gateFailures,
    leaderboardEligible: hardGatePass,
    scores,
    total: hardGatePass ? rawTotal : null,
    thresholdChecks,
    verdict: !hardGatePass ? 'gate_fail' : producerThresholdMet ? 'producer_threshold_met' : 'below_q8_bar',
  };
}

function scanRobustnessMargin(checksPassed: number, checksTotal: number): number {
  if (checksPassed < 6 || checksPassed / checksTotal < 0.75) return 0;
  if (checksPassed === checksTotal) return 15;
  if (checksPassed === checksTotal - 1) return 13;
  return 12;
}
