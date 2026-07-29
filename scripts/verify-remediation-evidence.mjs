import { createHash } from 'node:crypto';
import { mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { resolve } from 'node:path';
import jsQR from 'jsqr';
import { PNG } from 'pngjs';
import { normalizePayload } from '../packages/qr-core/dist/index.js';
import { exportArtifact, generateCandidates } from '../packages/artistic-qr/dist/index.js';
import { runValidation } from '../packages/artistic-qr/dist/validation.js';

const out = resolve(process.argv[2] ?? 'artifacts/core-engine/remediation-d1-d2');
mkdirSync(out, { recursive: true });
const canonical = 'https://example.com/Core/Exact?Case=Preserved&gate=D1-D2';
const normalizedPayload = normalizePayload({ mode: 'url', content: canonical, errorCorrectionLevel: 'H' });

const cases = [
  {
    name: 'deterministic',
    request: { normalizedPayload, mode: 'deterministic_template', seed: 101 },
    options: {},
  },
  {
    name: 'artistic-deterministic',
    request: {
      normalizedPayload,
      mode: 'deterministic_template',
      artDirectionId: 'architectural-geometric',
      artisticStrength: 0.65,
      palette: { primary: '#172554', secondary: '#334155', accent: '#d4a853', background: '#ffffff' },
      composition: { focalArea: 'balanced', qrProminence: 0.8 },
      seed: 202,
    },
    options: {},
  },
  {
    name: 'provider-failure-fallback',
    request: {
      normalizedPayload,
      mode: 'provider_generative',
      prompt: 'premium geometric architecture with clear square structure',
      artisticStrength: 0.7,
      seed: 303,
    },
    options: { provider: { scriptPath: '/definitely-missing/provider.py' } },
  },
];

const results = [];
for (const item of cases) {
  const board = await generateCandidates(item.request, item.options);
  const candidate = board.candidates.find((value) => value.exportAllowed);
  if (!candidate) throw new Error(`${item.name}: no export-authorized candidate`);
  const artifact = exportArtifact({ candidateId: candidate.candidateId, formats: ['png'], sizes: [{ label: 'proof', widthPx: 512, heightPx: 512 }] }, candidate);
  const bytes = Buffer.from(artifact.files[0].data.split(',', 2)[1], 'base64');
  const file = `${item.name}.png`;
  writeFileSync(resolve(out, file), bytes);
  const png = PNG.sync.read(bytes);
  const decoded = jsQR(new Uint8ClampedArray(png.data), png.width, png.height, { inversionAttempts: 'attemptBoth' })?.data ?? '';
  if (decoded !== canonical) throw new Error(`${item.name}: independent jsQR exact payload mismatch`);
  results.push({
    name: item.name,
    file,
    boardStatus: board.status,
    requestMode: board.request.mode,
    generationMode: candidate.provenance?.generationMode,
    provider: candidate.provenance?.provider,
    exportAllowed: candidate.exportAllowed,
    jsqrDecodedPayload: decoded,
    exactPayloadMatch: decoded === canonical,
    sha256: createHash('sha256').update(bytes).digest('hex'),
  });
}

const preservedEvidence = JSON.parse(readFileSync(resolve('artifacts/core-engine/high-conditioning/provider-live-evidence.json'), 'utf8'));
const source = preservedEvidence.candidates[0];
const failedBytes = readFileSync(resolve(`artifacts/core-engine/high-conditioning/provider-${source.candidateId}.png`));
const failedCandidate = {
  candidateId: source.candidateId,
  matrixRef: source.matrixRef,
  rendered: { format: 'png-dataurl', data: `data:image/png;base64,${failedBytes.toString('base64')}`, width: 768, height: 768 },
  scanResults: [],
  exportAllowed: false,
  artisticScore: source.artisticScore,
  provenance: source.provenance,
};
const failedValidation = runValidation(failedCandidate, preservedEvidence.generationRequest.canonicalPayload);
const failedPng = PNG.sync.read(failedBytes);
const failedJsqrPayload = jsQR(new Uint8ClampedArray(failedPng.data), failedPng.width, failedPng.height, { inversionAttempts: 'attemptBoth' })?.data ?? '';
let exportDenied = false;
try {
  exportArtifact({ candidateId: failedCandidate.candidateId, formats: ['png'] }, failedCandidate);
} catch (error) {
  exportDenied = /NOT_VALIDATED/.test(error instanceof Error ? error.message : String(error));
}
if (failedValidation.pass || failedCandidate.exportAllowed || !exportDenied) throw new Error('Failed provider artifact did not remain fail-closed');

const report = {
  generatedAt: new Date().toISOString(),
  canonicalPayload: canonical,
  cases: results,
  preservedFailedProvider: {
    file: `../high-conditioning/provider-${source.candidateId}.png`,
    localValidationPass: failedValidation.pass,
    rawJsqrDecodedPayload: failedJsqrPayload,
    exportAllowed: failedCandidate.exportAllowed,
    exportDenied,
    sha256: createHash('sha256').update(failedBytes).digest('hex'),
  },
};
writeFileSync(resolve(out, 'independent-jsqr-evidence.json'), `${JSON.stringify(report, null, 2)}\n`);
console.log(JSON.stringify(report));
