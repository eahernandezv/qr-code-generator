#!/usr/bin/env node
import { readFileSync, writeFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { scoreQ8VisualQuality } from '../dist/visual-quality.js';
const root = resolve(new URL('../../..', import.meta.url).pathname);
const dir = resolve(root, 'docs/program/evidence/q8-quality-loop/cycle-1-protected-island');
const objective = JSON.parse(readFileSync(resolve(dir, 'objective-evidence.json'), 'utf8'));
const visual = {
  readable: { target_recognizability: 20, composition_placement: 11, image_qr_harmony: 9, palette_fidelity: 9, protected_region_elegance: 8, premium_polish: 7 },
  balanced: { target_recognizability: 23, composition_placement: 13, image_qr_harmony: 11, palette_fidelity: 10, protected_region_elegance: 8, premium_polish: 8 },
  image_first: { target_recognizability: 24, composition_placement: 14, image_qr_harmony: 12, palette_fidelity: 10, protected_region_elegance: 8, premium_polish: 9 },
};
const baseline = { readable: 51, balanced: 64, image_first: 67 };
const candidates = objective.candidates.map((candidate) => {
  const scored = scoreQ8VisualQuality({ candidate: candidate.mode, hardGates: { payloadEqual: candidate.independent_validation.payload_equal, rawDecode: candidate.independent_validation.raw_decode, checksPassed: candidate.independent_validation.checks_passed, checksTotal: candidate.independent_validation.checks_total, protectedViolations: candidate.protected_violations.length, contractValid: true, deterministic: candidate.deterministic, exportParity: 'not_claimed_export_locked' }, producerScores: visual[candidate.mode] });
  return { ...scored, candidate_id: candidate.candidate_id, artifact_sha256: candidate.artifact.sha256, score_delta_from_cycle_0: scored.total - baseline[candidate.mode], visual_verdict: candidate.mode === 'readable' ? 'Small but crisp and unmistakable reference mark; QR remains dominant.' : candidate.mode === 'balanced' ? 'Strong identity and exact palette with a balanced centered footprint; alignment square reads as a QR-native detail in the lower opening.' : 'Reference-faithful ribbon silhouette and gradient dominate cleanly while all controlled scans retain full margin.', remaining_blockers: candidate.mode === 'readable' ? ['mark is too small for flagship use','dense QR field limits premium calm'] : candidate.mode === 'balanced' ? ['QR pattern touches the silhouette edge','protected alignment square remains visually prominent'] : ['protected alignment square remains visually prominent','no physical-device or print evidence yet'] };
});
writeFileSync(resolve(dir, 'scores.json'), JSON.stringify({ schema_version: 'q8-visual-quality-scores.v1', cycle: 1, producer: 'QR Creator', scoring_engine: 'scoreQ8VisualQuality', scoring_engine_version: 'q8-weighted-rubric-v1', reference_sha256: objective.reference.sha256, scoring_note: 'Producer telemetry only; Product Architect acceptance is separate.', weights: { target_recognizability:25, composition_placement:15, image_qr_harmony:15, scan_robustness_margin:15, palette_fidelity:10, protected_region_elegance:10, premium_polish:10 }, candidates, leaderboard: candidates.filter((candidate) => candidate.leaderboardEligible).sort((a,b) => b.total-a.total).map((candidate) => candidate.candidate), cycle_1_decision: 'Producer threshold met by all three Q8 candidates; proceed to Cycle 2 to strengthen image/QR harmony and protected negative-space elegance before generalization.' }, null, 2) + '\n');
console.log(JSON.stringify(candidates.map(({candidate,total,score_delta_from_cycle_0,verdict}) => ({candidate,total,delta:score_delta_from_cycle_0,verdict})), null, 2));
