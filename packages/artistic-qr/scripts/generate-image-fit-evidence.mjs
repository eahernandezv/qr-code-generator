import { createHash } from 'node:crypto';
import { mkdirSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { PNG } from 'pngjs';
import { optimizeImageFitQr } from '../dist/index.js';

const root = resolve(new URL('../../..', import.meta.url).pathname);
const evidenceDir = resolve(root, 'docs/program/evidence/level2-production-image-fit-core');
const targetPath = resolve(root, 'docs/program/evidence/level2-image-fit-qr-spike/creator-visual-pass/fixtures/bold-diamond.png');
const fixturePath = resolve(root, 'packages/contracts/fixtures/image-fit-qr/valid-balanced-response.v1.json');
const targetBytes = readFileSync(targetPath);
const png = PNG.sync.read(targetBytes);
const values = new Array(png.width * png.height);
for (let index = 0; index < values.length; index += 1) {
  const offset = index * 4;
  const alpha = png.data[offset + 3] / 255;
  const red = png.data[offset] * alpha + 255 * (1 - alpha);
  const green = png.data[offset + 1] * alpha + 255 * (1 - alpha);
  const blue = png.data[offset + 2] * alpha + 255 * (1 - alpha);
  values[index] = Math.round(0.2126 * red + 0.7152 * green + 0.0722 * blue);
}
const fixture = JSON.parse(readFileSync(fixturePath, 'utf8'));
fixture.request.target_image = {
  ...fixture.request.target_image,
  image_ref: 'docs/program/evidence/level2-image-fit-qr-spike/creator-visual-pass/fixtures/bold-diamond.png',
  width_px: png.width,
  height_px: png.height,
  sha256: sha256(targetBytes),
};
const result = optimizeImageFitQr({
  schema_version: 'image-fit-qr-api.v1',
  request: fixture.request,
  encoded_payload: 'https://placeholder-online.com/r/bD7xQ2',
  short_link: { slug: 'bD7xQ2', state: 'reserved', route: '/r/bD7xQ2' },
  target_luma: {
    width: png.width,
    height: png.height,
    values,
    source_image_sha256: fixture.request.target_image.sha256,
  },
});

rmSync(evidenceDir, { recursive: true, force: true });
mkdirSync(resolve(evidenceDir, 'artifacts'), { recursive: true });
const artifactIndex = {};
for (const candidate of result.response.candidates) {
  const artifact = result.artifacts[candidate.candidate_id];
  const relative = `artifacts/${candidate.mode.replace('_', '-')}.svg`;
  writeFileSync(resolve(evidenceDir, relative), artifact.data);
  candidate.artifacts[0].uri = `docs/program/evidence/level2-production-image-fit-core/${relative}`;
  artifactIndex[candidate.candidate_id] = { ...candidate.artifacts[0], mode: candidate.mode };
}
writeFileSync(resolve(evidenceDir, 'artifacts/fallback-level1.svg'), result.fallback_artifact.data);
result.fallback_artifact.uri = 'docs/program/evidence/level2-production-image-fit-core/artifacts/fallback-level1.svg';
writeFileSync(resolve(evidenceDir, 'optimizer-response.json'), `${JSON.stringify(result.response, null, 2)}\n`);
writeFileSync(resolve(evidenceDir, 'artifact-index.json'), `${JSON.stringify({
  target_image: { path: fixture.request.target_image.image_ref, sha256: fixture.request.target_image.sha256 },
  candidates: artifactIndex,
  fallback: {
    uri: result.fallback_artifact.uri,
    sha256: result.fallback_artifact.sha256,
    scan_evidence: result.fallback_scan_evidence,
  },
}, null, 2)}\n`);
writeFileSync(resolve(evidenceDir, 'scan-evidence.json'), `${JSON.stringify({
  decoder_scope: 'Automated jsQR 1.4.0 only; no physical-device or printed scan performed.',
  candidates: result.response.candidates.map(({ candidate_id, mode, scan_evidence, export_authority }) => ({
    candidate_id, mode, scan_evidence, export_authority,
  })),
  fallback: result.fallback_scan_evidence,
}, null, 2)}\n`);
const hashFiles = [
  'artifacts/readable.svg', 'artifacts/balanced.svg', 'artifacts/image-first.svg',
  'artifacts/fallback-level1.svg', 'optimizer-response.json', 'artifact-index.json', 'scan-evidence.json',
];
const hashLines = hashFiles.map((relative) => `${sha256(readFileSync(resolve(evidenceDir, relative)))}  ${relative}`);
writeFileSync(resolve(evidenceDir, 'sha256.txt'), `${hashLines.join('\n')}\n`);
console.log(JSON.stringify({
  evidenceDir,
  candidates: result.response.candidates.map((candidate) => ({
    id: candidate.candidate_id,
    mode: candidate.mode,
    status: candidate.status,
    qr: candidate.qr_settings,
    scan: `${candidate.scan_evidence.checks_passed}/${candidate.scan_evidence.checks_total}`,
    hash: candidate.artifacts[0].sha256,
    exportAllowed: candidate.export_authority.export_allowed,
    blockers: candidate.export_authority.blockers,
  })),
  fallback: { hash: result.fallback_artifact.sha256, scan: result.fallback_scan_evidence },
}, null, 2));

function sha256(value) {
  return createHash('sha256').update(value).digest('hex');
}
