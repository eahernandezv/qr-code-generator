import { createHash } from 'node:crypto';
import { mkdirSync, writeFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { normalizePayload } from '../packages/qr-core/dist/index.js';
import { exportArtifact, generateCandidates } from '../packages/artistic-qr/dist/index.js';

const outputDir = resolve(process.argv[2] ?? 'artifacts/core-engine');
mkdirSync(outputDir, { recursive: true });
const normalizedPayload = normalizePayload({
  mode: 'url',
  content: 'https://example.com/artistic-qr-safe-fallback',
  errorCorrectionLevel: 'H',
});
const board = await generateCandidates({
  normalizedPayload,
  mode: 'deterministic_template',
  palette: { primary: '#101820', background: '#ffffff', accent: '#d4a853' },
  seed: 424242,
});
const selected = board.candidates.find((candidate) => candidate.exportAllowed);
if (!selected) throw new Error('No export-allowed deterministic candidate');
const artifact = exportArtifact({
  candidateId: selected.candidateId,
  formats: ['png', 'svg'],
  sizes: [
    { label: 'web', widthPx: 512, heightPx: 512 },
    { label: 'print', widthPx: 1024, heightPx: 1024, dpi: 300 },
  ],
}, selected);
const files = [];
for (const file of artifact.files) {
  const extension = file.format;
  const name = `fallback-${file.width}x${file.height}.${extension}`;
  const path = resolve(outputDir, name);
  const bytes = file.format === 'png'
    ? Buffer.from(file.data.slice(file.data.indexOf(',') + 1), 'base64')
    : Buffer.from(file.data, 'utf8');
  writeFileSync(path, bytes);
  files.push({ name, width: file.width, height: file.height, format: file.format, bytes: bytes.length, sha256: createHash('sha256').update(bytes).digest('hex') });
}
const evidence = {
  generatedAt: new Date().toISOString(),
  normalizedPayload,
  board: {
    boardId: board.boardId,
    status: board.status,
    candidateCount: board.candidates.length,
    candidates: board.candidates.map((candidate) => ({
      candidateId: candidate.candidateId,
      exportAllowed: candidate.exportAllowed,
      artisticScore: candidate.artisticScore,
      provenance: candidate.provenance,
      scanResults: candidate.scanResults,
    })),
  },
  selectedCandidateId: selected.candidateId,
  artifactId: artifact.artifactId,
  files,
};
const reportPath = resolve(outputDir, 'deterministic-fallback-evidence.json');
writeFileSync(reportPath, `${JSON.stringify(evidence, null, 2)}\n`);
console.log(JSON.stringify({ reportPath, boardStatus: board.status, exportAllowed: selected.exportAllowed, files }));
