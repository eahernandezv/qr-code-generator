import { readFileSync, mkdirSync, writeFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { normalizePayload } from '../packages/qr-core/dist/index.js';
import { generateCandidates } from '../packages/artistic-qr/dist/index.js';

const sourceDir = resolve(process.argv[2] ?? 'artifacts/core-engine/high-conditioning');
const destination = resolve(process.argv[3] ?? 'artifacts/core-engine/provider-fallback-decision.json');
const liveEvidence = JSON.parse(readFileSync(resolve(sourceDir, 'provider-live-evidence.json'), 'utf8'));
const sourceCandidate = liveEvidence.candidates[0];
const imageName = `provider-${sourceCandidate.candidateId}.png`;
const imageData = readFileSync(resolve(sourceDir, imageName)).toString('base64');
const normalizedPayload = normalizePayload({
  mode: 'url',
  content: 'https://example.com/artistic-qr-live-proof',
  errorCorrectionLevel: 'H',
});
const request = {
  normalizedPayload,
  mode: 'provider_generative',
  prompt: 'Revalidate captured live provider output',
  artisticStrength: 1,
  seed: 424242,
};
const providerBoard = {
  boardId: liveEvidence.boardId,
  request,
  status: 'completed',
  totalLatencyMs: liveEvidence.elapsedMs,
  totalCostEstimate: 0.015,
  candidates: [{
    candidateId: sourceCandidate.candidateId,
    matrixRef: sourceCandidate.matrixRef,
    rendered: { format: 'png-dataurl', data: `data:image/png;base64,${imageData}`, width: 768, height: 768 },
    scanResults: [],
    exportAllowed: false,
    artisticScore: sourceCandidate.artisticScore,
    provenance: sourceCandidate.provenance,
  }],
};
const tempDir = resolve('.work-loop/provider-replay');
mkdirSync(tempDir, { recursive: true });
const replayPath = resolve(tempDir, 'provider.py');
writeFileSync(replayPath, `import json\nprint(${JSON.stringify(JSON.stringify(providerBoard))})\n`);
const finalBoard = await generateCandidates(request, { provider: { scriptPath: replayPath, timeoutMs: 30_000 } });
const report = {
  generatedAt: new Date().toISOString(),
  input: {
    liveProviderBoardId: liveEvidence.boardId,
    liveCandidateId: sourceCandidate.candidateId,
    liveValidationPass: sourceCandidate.localValidation.pass,
    liveValidationThreshold: sourceCandidate.localValidation.thresholdVersion,
  },
  decision: {
    finalBoardStatus: finalBoard.status,
    finalCandidateCount: finalBoard.candidates.length,
    finalGenerationModes: [...new Set(finalBoard.candidates.map((candidate) => candidate.provenance?.generationMode))],
    exportAllowed: finalBoard.candidates.map((candidate) => candidate.exportAllowed),
    scannedPayloads: finalBoard.candidates.map((candidate) => candidate.scanResults[0]?.scannedPayload),
  },
};
writeFileSync(destination, `${JSON.stringify(report, null, 2)}\n`);
console.log(JSON.stringify({ destination, decision: report.decision }));
if (report.decision.finalBoardStatus !== 'completed' || report.decision.exportAllowed.some((allowed) => !allowed) || report.decision.finalGenerationModes.some((mode) => mode !== 'deterministic_template')) process.exitCode = 1;
