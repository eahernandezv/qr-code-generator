#!/usr/bin/env node
import { createHash } from 'node:crypto';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { PNG } from 'pngjs';
const root = resolve(new URL('../../..', import.meta.url).pathname);
const cycleDir = process.argv[2];
if (!cycleDir || !/^cycle-[0-4]-[a-z0-9-]+$/.test(cycleDir)) throw new Error('usage: validate-q8-quality-cycle.mjs cycle-N-name');
const dir = resolve(root, 'docs/program/evidence/q8-quality-loop', cycleDir);
const objective = JSON.parse(readFileSync(resolve(dir, 'objective-evidence.json'), 'utf8'));
const scores = JSON.parse(readFileSync(resolve(dir, 'scores.json'), 'utf8'));
const hash = (bytes) => createHash('sha256').update(bytes).digest('hex');
const objectiveCandidates = objective.targets
  ? objective.targets.flatMap((target) => target.candidates.map((candidate) => ({ ...candidate, target_id: target.id })))
  : objective.candidates;
const scoreCandidates = scores.targets ? scores.targets.flatMap((target) => target.candidates) : scores.candidates;
const fallbackEntries = objective.targets
  ? objective.targets.map((target) => ({ ...target.fallback, path: `${target.id}/artifacts/fallback` }))
  : [{ ...objective.fallback, path: 'artifacts/fallback' }];
for (const path of [
  'contact-sheet.png',
  ...objectiveCandidates.flatMap((candidate) => [candidate.artifact.path, candidate.artifact.path.replace(/\.svg$/, '.png')]),
  ...fallbackEntries.flatMap((fallback) => [`${fallback.path}.svg`, `${fallback.path}.png`]),
]) readFileSync(resolve(dir, path));
PNG.sync.read(readFileSync(resolve(dir, 'contact-sheet.png')));
for (const candidate of objectiveCandidates) {
  const evidence = candidate.independent_validation;
  const hardPass = evidence.pass && evidence.payload_equal && evidence.raw_decode
    && evidence.checks_passed >= 6 && evidence.checks_passed / evidence.checks_total >= 0.75;
  const score = scoreCandidates.find((entry) => entry.candidate_id === candidate.candidate_id);
  if (!score) throw new Error(`missing score evidence: ${candidate.candidate_id}`);
  if (hardPass !== score.hardGatePass || hardPass !== score.leaderboardEligible) throw new Error(`hard-gate/leaderboard mismatch: ${candidate.candidate_id}`);
  if (!hardPass && score.total !== null) throw new Error(`failed candidate retained a score: ${candidate.candidate_id}`);
  if (candidate.protected_violations.length !== 0 || !candidate.deterministic) throw new Error(`integrity gate failed: ${candidate.candidate_id}`);
  if (candidate.export_parity !== 'not_claimed_export_locked') throw new Error(`export parity state invalid: ${candidate.candidate_id}`);
  if (hash(readFileSync(resolve(dir, candidate.artifact.path))) !== candidate.artifact.sha256) throw new Error(`artifact hash mismatch: ${candidate.candidate_id}`);
}
for (const fallback of fallbackEntries) {
  if (!fallback.independent_validation.pass || !fallback.independent_validation.payload_equal
    || !fallback.independent_validation.raw_decode || !fallback.deterministic) throw new Error(`fallback gate failed: ${fallback.path}`);
}
for (const candidate of scoreCandidates) {
  if (candidate.total === null) continue;
  const total = Object.values(candidate.scores).reduce((sum, value) => sum + value, 0);
  if (total !== candidate.total) throw new Error(`score arithmetic mismatch: ${candidate.candidate}`);
}
const expected = [...scoreCandidates].filter((candidate) => candidate.leaderboardEligible)
  .sort((a,b) => b.total-a.total).map((candidate) => candidate.candidate);
const actual = scores.leaderboard.map((entry) => typeof entry === 'string' ? entry : entry.candidate);
if (JSON.stringify(expected) !== JSON.stringify(actual)) throw new Error('leaderboard order mismatch');
console.log(JSON.stringify({
  pass: true, cycle: cycleDir,
  candidates: scoreCandidates.map((candidate) => ({ candidate: candidate.candidate, total: candidate.total, hard_gate_pass: candidate.hardGatePass })),
  contact_sheet: 'valid_png', fallbacks: fallbackEntries.length,
}, null, 2));
