import { createHash } from 'node:crypto';
import { mkdir, writeFile } from 'node:fs/promises';
import path from 'node:path';
import { normalizePayload } from '../packages/qr-core/dist/index.js';
import { exportArtifact, generateCandidates } from '../packages/artistic-qr/dist/index.js';
import { PNG } from 'pngjs';
import { rasterizeCandidate, resizeRasterTo, runValidation } from '../packages/artistic-qr/dist/validation.js';

const label = process.argv[2] ?? 'current';
const evidenceRoot = path.resolve('.work-loop/evidence/creator-b6-core-patterned-palette-acceptance-rate');
const outputRoot = path.join(evidenceRoot, label);
await mkdir(outputRoot, { recursive: true });

const allPayloads = [
  'https://example.com/production-runtime-proof',
  'https://placeholder-online.com/artistic-qr',
  'https://ernesto.example/qr-demo',
];
const allPresets = [
  { id: 'rainbow-diagonal-punchy', paletteFamily: 'rainbow', palettePattern: 'diagonalGradient', colorIntensity: 'punchy' },
  { id: 'trans-diagonal-balanced', paletteFamily: 'trans', palettePattern: 'diagonalGradient', colorIntensity: 'balanced' },
  { id: 'pride-rows-balanced', paletteFamily: 'pride', palettePattern: 'flagRows', colorIntensity: 'balanced' },
  { id: 'berry-spiral-punchy', paletteFamily: 'berry', palettePattern: 'spiral', colorIntensity: 'punchy' },
  { id: 'forest-diagonal-balanced', paletteFamily: 'forest', palettePattern: 'diagonalGradient', colorIntensity: 'balanced' },
];
const payloads = process.env.B6_PAYLOAD_FILTER
  ? allPayloads.filter((payload) => payload.includes(process.env.B6_PAYLOAD_FILTER))
  : allPayloads;
const presets = process.env.B6_PRESET_FILTER
  ? allPresets.filter((preset) => preset.id === process.env.B6_PRESET_FILTER)
  : allPresets;
const sizes = process.env.B6_ALL_SIZES === '1' ? [512, 1200, 2400, 3600] : [512];
const sha256 = (data) => createHash('sha256').update(data).digest('hex');
const rows = [];

for (const preset of presets) {
  for (const payload of payloads) {
    const normalizedPayload = normalizePayload({ mode: 'url', content: payload, errorCorrectionLevel: 'M' });
    const request = {
      normalizedPayload,
      mode: 'deterministic_template',
      artDirectionId: 'organic-botanical',
      artisticStrength: 0.5,
      palette: { background: '#f0f4ff' },
      paletteFamily: preset.paletteFamily,
      palettePattern: preset.palettePattern,
      colorIntensity: preset.colorIntensity,
      composition: { focalArea: 'center', qrProminence: 0.7 },
      seed: 42,
    };
    const board = await generateCandidates(request);
    const candidateEvidence = board.candidates.map((candidate, index) => ({
      index,
      exportAllowed: candidate.exportAllowed,
      confidence: candidate.scanResults[0].overallConfidence,
      passCount: candidate.scanResults[0].tests.filter((test) => test.pass).length,
      testCount: candidate.scanResults[0].tests.length,
      failedTests: candidate.scanResults[0].tests.filter((test) => !test.pass).map((test) => test.name),
      svgSha256: sha256(candidate.rendered.data),
      width: candidate.rendered.width,
    }));
    const selectedIndex = board.candidates.findIndex((candidate) => candidate.exportAllowed);
    const exports = [];
    if (selectedIndex >= 0 && payload === allPayloads[0]) {
      const selected = board.candidates[selectedIndex];
      for (const format of ['svg', 'png']) for (const size of sizes) {
        try {
          const artifact = exportArtifact({
            candidateId: selected.candidateId,
            formats: [format],
            sizes: [{ label: `${size}`, widthPx: size, heightPx: size }],
          }, selected);
          const file = artifact.files[0];
          const bytes = format === 'png'
            ? Buffer.from(file.data.slice(file.data.indexOf(',') + 1), 'base64')
            : Buffer.from(file.data);
          exports.push({ format, size, pass: true, bytes: bytes.length, sha256: sha256(bytes) });
          if (size === 512 && payload === allPayloads[0]) {
            await writeFile(path.join(outputRoot, `${preset.id}.${format}`), bytes);
          }
        } catch (error) {
          const detail = { format, size, pass: false, error: error instanceof Error ? error.message : String(error) };
          if (format === 'png') {
            const raster = resizeRasterTo(rasterizeCandidate(selected), size, size);
            const png = new PNG({ width: size, height: size });
            png.data = Buffer.from(raster.data);
            const data = `data:image/png;base64,${PNG.sync.write(png, { colorType: 6 }).toString('base64')}`;
            const validation = runValidation({ ...selected, rendered: { format: 'png-dataurl', data, width: size, height: size } }, normalizedPayload.canonical);
            detail.failedTests = validation.tests.filter((test) => !test.pass).map((test) => test.name);
            detail.passCount = validation.tests.filter((test) => test.pass).length;
          }
          exports.push(detail);
        }
      }
    }
    rows.push({
      preset: preset.id,
      payload,
      candidateCount: board.candidates.length,
      validatedCount: board.candidates.filter((candidate) => candidate.exportAllowed).length,
      candidates: candidateEvidence,
      selectedIndex,
      exports,
    });
    console.log(`${label} ${preset.id} ${payload}: ${rows.at(-1).validatedCount}/4; exports ${exports.filter((item) => item.pass).length}/${exports.length}`);
  }
}
const summary = {
  label,
  generatedAt: new Date().toISOString(),
  cases: rows.length,
  candidates: rows.reduce((sum, row) => sum + row.candidateCount, 0),
  validatedCandidates: rows.reduce((sum, row) => sum + row.validatedCount, 0),
  exportAttempts: rows.reduce((sum, row) => sum + row.exports.length, 0),
  validatedExports: rows.reduce((sum, row) => sum + row.exports.filter((item) => item.pass).length, 0),
};
await writeFile(path.join(evidenceRoot, `${label}-acceptance.json`), `${JSON.stringify({ summary, rows }, null, 2)}\n`);
console.log(JSON.stringify(summary));
