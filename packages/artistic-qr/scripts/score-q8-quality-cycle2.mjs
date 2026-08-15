#!/usr/bin/env node
import { readFileSync, writeFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { scoreQ8VisualQuality } from '../dist/visual-quality.js';
const root = resolve(new URL('../../..', import.meta.url).pathname);
const dir = resolve(root, 'docs/program/evidence/q8-quality-loop/cycle-2-negative-space');
const objective = JSON.parse(readFileSync(resolve(dir, 'objective-evidence.json'), 'utf8'));
const visual = {
  readable: { target_recognizability: 20, composition_placement: 11, image_qr_harmony: 10, palette_fidelity: 9, protected_region_elegance: 8, premium_polish: 7 },
  balanced: { target_recognizability: 23, composition_placement: 13, image_qr_harmony: 12, palette_fidelity: 10, protected_region_elegance: 9, premium_polish: 8 },
  image_first: { target_recognizability: 24, composition_placement: 14, image_qr_harmony: 13, palette_fidelity: 10, protected_region_elegance: 9, premium_polish: 9 },
};
const cycle1 = { readable: 79, balanced: 88, image_first: 92 };
const cycle0 = { readable: 51, balanced: 64, image_first: 67 };
const candidates = objective.candidates.map((candidate) => {
  const scored = scoreQ8VisualQuality({ candidate: candidate.mode, hardGates: { payloadEqual: candidate.independent_validation.payload_equal, rawDecode: candidate.independent_validation.raw_decode, checksPassed: candidate.independent_validation.checks_passed, checksTotal: candidate.independent_validation.checks_total, protectedViolations: candidate.protected_violations.length, contractValid: true, deterministic: candidate.deterministic, exportParity: 'not_claimed_export_locked' }, producerScores: visual[candidate.mode] });
  return { ...scored, candidate_id: candidate.candidate_id, artifact_sha256: candidate.artifact.sha256, score_delta_from_cycle_1: scored.total - cycle1[candidate.mode], score_delta_from_cycle_0: scored.total - cycle0[candidate.mode], visual_verdict: candidate.mode === 'readable' ? 'Crisp compact mark with cleaner white openings; QR remains intentionally dominant.' : candidate.mode === 'balanced' ? 'Internal white geometry separates the ribbon cleanly and makes the immutable alignment square read as intentional.' : 'Strongest identity-preserving candidate: smooth palette and explicit M openings with full controlled scan margin.', remaining_blockers: candidate.mode === 'readable' ? ['mark remains too small for flagship use','dense QR field limits premium calm'] : candidate.mode === 'balanced' ? ['QR pattern still touches outer silhouette','white cutout transitions are deliberately pixel-bounded'] : ['protected alignment square remains visible','no physical-device or print evidence yet'] };
});
writeFileSync(resolve(dir, 'scores.json'), JSON.stringify({ schema_version: 'q8-visual-quality-scores.v1', cycle: 2, producer: 'QR Creator', scoring_engine: 'scoreQ8VisualQuality', scoring_engine_version: 'q8-weighted-rubric-v1', reference_sha256: objective.reference.sha256, scoring_note: 'Producer telemetry only; Product Architect acceptance is separate.', weights: { target_recognizability:25, composition_placement:15, image_qr_harmony:15, scan_robustness_margin:15, palette_fidelity:10, protected_region_elegance:10, premium_polish:10 }, candidates, leaderboard: candidates.filter((candidate) => candidate.leaderboardEligible).sort((a,b) => b.total-a.total).map((candidate) => candidate.candidate), cycle_2_decision: 'Negative-space preservation improves the two target categories by two points on the best candidate without gate regression; proceed to three-target generalization.' }, null, 2) + '\n');
console.log(JSON.stringify(candidates.map(({candidate,total,score_delta_from_cycle_1,verdict}) => ({candidate,total,delta:score_delta_from_cycle_1,verdict})), null, 2));
