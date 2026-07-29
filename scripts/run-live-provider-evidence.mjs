import { mkdirSync, writeFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { normalizePayload } from '../packages/qr-core/dist/index.js';
import { callProviderGenerative } from '../packages/artistic-qr/dist/provider-adapter.js';
import { runValidation } from '../packages/artistic-qr/dist/validation.js';

const outputDir = resolve(process.argv[2] ?? 'artifacts/core-engine');
mkdirSync(outputDir, { recursive: true });
const normalizedPayload = normalizePayload({
  mode: 'url',
  content: 'https://example.com/artistic-qr-live-proof',
  errorCorrectionLevel: 'H',
});
const request = {
  normalizedPayload,
  mode: 'provider_generative',
  prompt: 'A refined Japanese botanical ink illustration, clear QR geometry, white quiet zone, premium editorial composition',
  artisticStrength: 1.0,
  seed: 424242,
};
const started = Date.now();
const board = await callProviderGenerative(request, {
  timeoutMs: 360_000,
  maxOutputBytes: 16 * 1024 * 1024,
  maxAttempts: 1,
});
const report = {
  generatedAt: new Date().toISOString(),
  elapsedMs: Date.now() - started,
  generationRequest: {
    mode: request.mode,
    prompt: request.prompt,
    artisticStrength: request.artisticStrength,
    seed: request.seed,
    canonicalPayload: normalizedPayload.canonical,
  },
  boardId: board.boardId,
  status: board.status,
  candidateCount: board.candidates.length,
  candidates: [],
};
for (const candidate of board.candidates) {
  const validation = runValidation(candidate, normalizedPayload.canonical);
  const dataUrl = candidate.rendered.data;
  if (dataUrl.startsWith('data:image/png;base64,')) {
    const path = resolve(outputDir, `provider-${candidate.candidateId}.png`);
    writeFileSync(path, Buffer.from(dataUrl.slice(dataUrl.indexOf(',') + 1), 'base64'));
  }
  report.candidates.push({
    candidateId: candidate.candidateId,
    matrixRef: candidate.matrixRef,
    provenance: candidate.provenance,
    artisticScore: candidate.artisticScore,
    rendered: {
      format: candidate.rendered.format,
      width: candidate.rendered.width,
      height: candidate.rendered.height,
      byteLength: Buffer.byteLength(candidate.rendered.data, 'utf8'),
    },
    localValidation: validation,
  });
}
const reportPath = resolve(outputDir, 'provider-live-evidence.json');
writeFileSync(reportPath, `${JSON.stringify(report, null, 2)}\n`);
console.log(JSON.stringify({ reportPath, status: board.status, candidateCount: board.candidates.length, validationPasses: report.candidates.map((candidate) => candidate.localValidation.pass) }));
if (board.status !== 'completed' || board.candidates.length === 0) process.exitCode = 1;
