#!/usr/bin/env node
import { chmodSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { normalizePayload } from '../../qr-core/dist/index.js';
import { generateCandidates } from '../dist/api/index.js';

const ROOT = resolve(new URL('../../..', import.meta.url).pathname);
const EVIDENCE = resolve(ROOT, 'docs/program/evidence/level2-provider-generative-q4');
const livePath = resolve(EVIDENCE, 'live-provider-evidence.json');
const live = JSON.parse(readFileSync(livePath, 'utf8'));
const first = live.results.find((item) => item.status === 'succeeded');
if (!first) throw new Error('No provider result available for replay');
const artifact = readFileSync(resolve(EVIDENCE, first.artifact)).toString('base64');
const replayBoard = {
  boardId: '00000000-0000-4000-8000-000000000010',
  request: {},
  candidates: [{
    candidateId: '00000000-0000-4000-8000-000000000011',
    matrixRef: 'q4-live-replay',
    rendered: { format: 'png-dataurl', data: `data:image/png;base64,${artifact}`, width: 768, height: 768 },
    scanResults: [{ pass: true, decoder: 'untrusted-provider-claim', version: '0', thresholdVersion: 'none', scannedPayload: live.payload, tests: [], overallConfidence: 'high' }],
    exportAllowed: true,
    artisticScore: 0.9,
    provenance: { generationMode: 'provider_generative', provider: 'replicate-replay', modelVersion: first.model, adapterVersion: first.adapter, validationVersion: 'untrusted-provider-claim', createdAt: new Date().toISOString() },
  }],
  status: 'completed', failure: null, totalLatencyMs: first.provider_latency_ms, totalCostEstimate: first.cost_estimate_usd,
};
const replayPath = resolve(EVIDENCE, '.provider-replay.py');
writeFileSync(replayPath, `#!/usr/bin/env python3\nimport json,sys\n_ = sys.stdin.read()\nprint(${JSON.stringify(JSON.stringify(replayBoard))})\n`);
chmodSync(replayPath, 0o700);
try {
  const normalizedPayload = normalizePayload({ mode: 'url', content: live.payload, errorCorrectionLevel: 'H' });
  const board = await generateCandidates({
    normalizedPayload, mode: 'provider_generative', prompt: first.sanitized_prompt,
    referenceImage: { mimeType: 'image/jpeg', width: first.source_dimensions.width, height: first.source_dimensions.height, hash: first.source_sha256 },
    artisticStrength: 0.72, seed: first.seed,
  }, { provider: { scriptPath: replayPath, maxAttempts: 1, timeoutMs: 30_000 } });
  const evidence = {
    replayed_provider_artifact: first.artifact,
    provider_claimed_export_allowed: true,
    core_board_status: board.status,
    core_returned_candidate_count: board.candidates.length,
    core_rejected_provider_artifact: board.candidates.every((candidate) => candidate.provenance?.provider === 'local-safe-fallback'),
    fallback_candidates: board.candidates.map((candidate) => ({
      provider: candidate.provenance?.provider,
      model: candidate.provenance?.modelVersion,
      export_allowed: candidate.exportAllowed,
      scan_pass: candidate.scanResults[0]?.pass,
      checks: `${candidate.scanResults[0]?.tests.filter((test)=>test.pass).length}/${candidate.scanResults[0]?.tests.length}`,
      payload_match: candidate.scanResults[0]?.scannedPayload === live.payload,
    })),
  };
  writeFileSync(resolve(EVIDENCE, 'deterministic-fallback-proof.json'), JSON.stringify(evidence, null, 2)+'\n');
  console.log(JSON.stringify(evidence, null, 2));
} finally {
  rmSync(replayPath, { force: true });
}
