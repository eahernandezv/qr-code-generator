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
for (const path of ['contact-sheet.png', ...objective.candidates.flatMap((candidate) => [candidate.artifact.path, candidate.artifact.path.replace(/\.svg$/, '.png')]), 'artifacts/fallback.svg', 'artifacts/fallback.png']) readFileSync(resolve(dir, path));
PNG.sync.read(readFileSync(resolve(dir, 'contact-sheet.png')));
for (const candidate of objective.candidates) {
  const evidence = candidate.independent_validation;
  if (!evidence.pass || !evidence.payload_equal || !evidence.raw_decode || evidence.checks_passed < 6 || evidence.checks_passed / evidence.checks_total < 0.75) throw new Error(`hard scan gate failed: ${candidate.mode}`);
  if (candidate.protected_violations.length !== 0 || !candidate.deterministic) throw new Error(`integrity gate failed: ${candidate.mode}`);
  if (candidate.export_parity !== 'not_claimed_export_locked') throw new Error(`export parity state invalid: ${candidate.mode}`);
  if (hash(readFileSync(resolve(dir, candidate.artifact.path))) !== candidate.artifact.sha256) throw new Error(`artifact hash mismatch: ${candidate.mode}`);
}
if (!objective.fallback.independent_validation.pass || !objective.fallback.independent_validation.payload_equal || !objective.fallback.independent_validation.raw_decode || !objective.fallback.deterministic) throw new Error('fallback gate failed');
for (const candidate of scores.candidates) {
  if (!candidate.hardGatePass || !candidate.leaderboardEligible || candidate.total === null) throw new Error(`scores include failed candidate: ${candidate.candidate}`);
  const total = Object.values(candidate.scores).reduce((sum, value) => sum + value, 0);
  if (total !== candidate.total) throw new Error(`score arithmetic mismatch: ${candidate.candidate}`);
}
const leaderboard = [...scores.candidates].sort((a,b) => b.total-a.total).map((candidate) => candidate.candidate);
if (JSON.stringify(leaderboard) !== JSON.stringify(scores.leaderboard)) throw new Error('leaderboard order mismatch');
console.log(JSON.stringify({ pass: true, cycle: cycleDir, candidates: scores.candidates.map((candidate) => ({ candidate: candidate.candidate, total: candidate.total })), contact_sheet: 'valid_png', fallback: 'pass' }, null, 2));
