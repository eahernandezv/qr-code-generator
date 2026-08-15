#!/usr/bin/env node
import { createHash, randomUUID } from 'node:crypto';
import { mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { spawnSync } from 'node:child_process';
import { PNG } from 'pngjs';
import { normalizePayload } from '../../qr-core/dist/index.js';
import { runValidation } from '../dist/validation.js';

const ROOT = resolve(new URL('../../..', import.meta.url).pathname);
const EVIDENCE = resolve(ROOT, 'docs/program/evidence/level2-provider-generative-q4');
const ARTIFACTS = resolve(EVIDENCE, 'local-artifacts');
const INPUT_CACHE = '/home/hermes/.hermes/cache/images';
const PROVIDER = resolve(ROOT, 'packages/artistic-qr/provider/provider_generative.py');
mkdirSync(ARTIFACTS, { recursive: true });

const payload = 'https://placeholder-online.com/r/q4Art8';
const normalizedPayload = normalizePayload({ mode: 'url', content: payload, errorCorrectionLevel: 'H' });
const targets = [
  { file: 'img_eb7c8956f853.jpg', id: 'gradient-j', seed: 4101, prompt: 'premium minimal abstract capital J ribbon sculpture, geometric block forms, electric blue cyan violet and orange gradient, centered on clean white field, no words, square modular structure' },
  { file: 'img_f364919a9f11.jpg', id: 'faceted-helmet', seed: 4102, prompt: 'premium minimal faceted geometric helmet emblem, black triangular polygon mosaic, strong bilateral symmetry, centered on clean white field, no words, square modular structure' },
  { file: 'img_1e0fb190b4b2.jpg', id: 'gradient-m-ribbon', seed: 4103, prompt: 'premium minimal abstract capital M made from crossing rounded ribbons, cyan blue violet gradient, centered on clean white field, no words, square modular structure' },
  { file: 'img_dcaa1b3e2d37.jpg', id: 'red-wolf-front', seed: 4104, prompt: 'bold symmetrical front-facing wolf head emblem, angular red and black geometric facets, intense eyes, centered graphic poster, no words, square modular structure' },
  { file: 'img_26ae271affed.jpg', id: 'circular-food-emblem', seed: 4105, prompt: 'playful circular food emblem with a stacked burger icon, bold red yellow black cream palette, centered badge composition, no letters or words, square modular structure' },
  { file: 'img_69cef2893b9c.jpg', id: 'wolf-black-white', seed: 4106, prompt: 'high contrast black and white wolf face illustration, frontal symmetry, sharp fur geometry and luminous eyes, centered square composition, no words, modular graphic style' },
  { file: 'img_8fc2ee0de7fe.jpg', id: 'wolf-profile', seed: 4107, prompt: 'dramatic monochrome wolf profile portrait, detailed layered fur, strong silhouette, centered on dark neutral field, no watermark, no words, square modular composition' },
  { file: 'img_e393e9139ab1.jpg', id: 'calligraphic-j-heart', seed: 4108, prompt: 'elegant black calligraphic capital J with sweeping brush stroke and a small detached heart, minimal white field, centered, no words, preserve thin graceful curves within modular composition' },
];

const sha256 = (data) => createHash('sha256').update(data).digest('hex');
const results = [];
for (const target of targets) {
  const sourcePath = resolve(INPUT_CACHE, target.file);
  const source = readFileSync(sourcePath);
  const dimensions = PNGorJpegDimensions(sourcePath);
  const request = {
    normalizedPayload,
    mode: 'provider_generative',
    artDirectionId: 'premium-minimal',
    prompt: target.prompt,
    referenceImage: { mimeType: 'image/jpeg', width: dimensions.width, height: dimensions.height, hash: sha256(source) },
    artisticStrength: 0.72,
    composition: { focalArea: 'center', qrProminence: 0.72 },
    seed: target.seed,
  };
  const started = Date.now();
  const run = spawnSync('python3', [PROVIDER, '--model', 'zylim'], {
    input: JSON.stringify(request), encoding: 'utf8', maxBuffer: 16 * 1024 * 1024,
    env: { ...process.env, QR_CREATOR_CANDIDATE_COUNT: '1', QR_CREATOR_LOG_DIR: resolve(EVIDENCE, 'private-logs') },
    timeout: 240_000,
  });
  if (run.status !== 0) {
    results.push({ target: target.id, source_sha256: sha256(source), status: 'provider_failed', wall_latency_ms: Date.now()-started, stderr: sanitize(run.stderr) });
    continue;
  }
  const board = JSON.parse(run.stdout);
  const sourceCandidate = board.candidates[0];
  const candidate = {
    candidateId: randomUUID(), matrixRef: sourceCandidate.matrixRef, rendered: sourceCandidate.rendered,
    scanResults: [], exportAllowed: false, artisticScore: sourceCandidate.artisticScore, provenance: sourceCandidate.provenance,
  };
  const validation = runValidation(candidate, payload);
  const base64 = candidate.rendered.data.replace(/^data:image\/png;base64,/, '');
  const bytes = Buffer.from(base64, 'base64');
  const artifactName = `${target.id}--zylim--seed-${target.seed}.png`;
  writeFileSync(resolve(ARTIFACTS, artifactName), bytes);
  results.push({
    target: target.id, source_sha256: sha256(source), source_dimensions: dimensions,
    sanitized_prompt: target.prompt, seed: target.seed, artistic_strength: request.artisticStrength,
    status: 'succeeded', model: candidate.provenance?.modelVersion, adapter: candidate.provenance?.adapterVersion,
    provider_board_id: board.boardId, provider_latency_ms: board.totalLatencyMs,
    wall_latency_ms: Date.now()-started, cost_estimate_usd: board.totalCostEstimate,
    artifact: `local-artifacts/${artifactName}`, artifact_sha256: sha256(bytes), bytes: bytes.length,
    scan: validation, export_allowed_by_core: validation.pass,
  });
  writeFileSync(resolve(EVIDENCE, 'live-provider-evidence.partial.json'), JSON.stringify({ payload, results }, null, 2)+'\n');
  console.log(`${target.id}: ${validation.tests.filter(t=>t.pass).length}/${validation.tests.length} raw=${validation.tests[0]?.pass} latency=${board.totalLatencyMs}ms`);
}
writeFileSync(resolve(EVIDENCE, 'live-provider-evidence.json'), JSON.stringify({
  schema_version: 'provider-generative-q4-evidence.v1', payload, threshold_version: 'scan-v1-real-75pct',
  rights: 'user-supplied references bound by hash only; prompts are sanitized and do not request trademark text', results,
}, null, 2)+'\n');
console.log(JSON.stringify({ total: results.length, provider_succeeded: results.filter(r=>r.status==='succeeded').length, core_scan_passed: results.filter(r=>r.export_allowed_by_core).length, estimated_cost_usd: results.reduce((n,r)=>n+(r.cost_estimate_usd||0),0) }, null, 2));

function sanitize(stderr) { return String(stderr||'').split('\n').filter(Boolean).slice(-3).map(line=>line.replace(/https?:\/\/\S+/g,'[redacted-url]')).join(' | ').slice(0,500); }
function PNGorJpegDimensions(path) {
  const p = spawnSync('python3', ['-c', 'from PIL import Image; import json,sys; im=Image.open(sys.argv[1]); print(json.dumps({"width":im.width,"height":im.height}))', path], { encoding:'utf8' });
  if (p.status !== 0) throw new Error(`Cannot inspect ${path}`);
  return JSON.parse(p.stdout);
}
