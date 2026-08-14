import { createHash } from 'node:crypto';
import { mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { PNG } from 'pngjs';
import { optimizeImageFitQr } from '../dist/index.js';
import { rasterizeCandidate } from '../dist/validation.js';

const ROOT = resolve(new URL('../../..', import.meta.url).pathname);
const EVIDENCE_DIR = resolve(ROOT, 'docs/program/evidence/level2-image-fit-composition-q2');
const FIXTURE_PATH = resolve(ROOT, 'packages/contracts/fixtures/image-fit-qr/valid-balanced-response.v1.json');

// ================================================================
//  Target image generators (synthetic test fixtures)
// ================================================================

function makeTargetSquareCenter(size) {
  const values = [];
  for (let y = 0; y < size; y++) {
    for (let x = 0; x < size; x++) {
      const cx = x - size / 2;
      const cy = y - size / 2;
      const inSquare = Math.abs(cx) < size / 4 && Math.abs(cy) < size / 4;
      values.push(inSquare ? 30 : 240);
    }
  }
  return { width: size, height: size, values, name: 'square-center' };
}

function makeTargetGradientDiagonal(size) {
  const values = [];
  for (let y = 0; y < size; y++) {
    for (let x = 0; x < size; x++) {
      const diag = (x + y) / (2 * size);
      values.push(Math.round(240 - diag * 220));
    }
  }
  return { width: size, height: size, values, name: 'gradient-diagonal' };
}

function makeTargetSpots(size) {
  const values = [];
  for (let y = 0; y < size; y++) {
    for (let x = 0; x < size; x++) {
      const d1 = Math.sqrt((x - size * 0.3) ** 2 + (y - size * 0.3) ** 2);
      const d2 = Math.sqrt((x - size * 0.7) ** 2 + (y - size * 0.7) ** 2);
      const dark = Math.min(d1, d2) < size * 0.12;
      values.push(dark ? 40 : 230);
    }
  }
  return { width: size, height: size, values, name: 'dual-spots' };
}

function makeTargetCircleHole(size) {
  const values = [];
  for (let y = 0; y < size; y++) {
    for (let x = 0; x < size; x++) {
      const cx = x - size / 2;
      const cy = y - size / 2;
      const ring = Math.sqrt(cx * cx + cy * cy);
      const inRing = ring > size / 5 && ring < size / 3;
      values.push(inRing ? 50 : 230);
    }
  }
  return { width: size, height: size, values, name: 'circle-ring' };
}

function makeTargetHeart(size) {
  const values = [];
  for (let y = 0; y < size; y++) for (let x = 0; x < size; x++) {
    const nx = (x - size / 2) / (size * 0.28);
    const ny = (size * 0.52 - y) / (size * 0.28);
    const shape = (nx * nx + ny * ny - 1) ** 3 - nx * nx * ny ** 3;
    values.push(shape <= 0 ? 35 : 240);
  }
  return { width: size, height: size, values, name: 'heart-silhouette' };
}

function makeTargetHouse(size) {
  const values = [];
  for (let y = 0; y < size; y++) for (let x = 0; x < size; x++) {
    const nx = x / size; const ny = y / size;
    const roof = ny >= 0.18 + Math.abs(nx - 0.5) * 0.85 && ny <= 0.48;
    const body = nx >= 0.27 && nx <= 0.73 && ny > 0.43 && ny <= 0.82;
    const door = nx >= 0.45 && nx <= 0.56 && ny >= 0.63;
    values.push((roof || body) && !door ? 35 : 240);
  }
  return { width: size, height: size, values, name: 'house-silhouette' };
}

const TARGETS = [
  makeTargetSquareCenter(64), makeTargetGradientDiagonal(64), makeTargetSpots(64),
  makeTargetCircleHole(64), makeTargetHeart(64), makeTargetHouse(64),
];
const MODES = ['readable', 'balanced', 'image_first'];

function sha256(buf) {
  return createHash('sha256').update(buf).digest('hex');
}

function buildInput(fixture, target, encoder) {
  const payload = 'https://placeholder-online.com/r/bD7xQ2';
  const sha = sha256(Buffer.from(JSON.stringify(target.values)));
  const req = structuredClone(fixture.request);
  req.target_image = {
    image_ref: `fixtures/evidence-${target.name}.png`,
    mime_type: 'image/png',
    width_px: target.width,
    height_px: target.height,
    sha256: sha,
    complexity: 'medium_logo',
  };
  req.constraints.max_candidates = 3;
  return {
    schema_version: 'image-fit-qr-api.v1',
    request: req,
    encoded_payload: payload,
    short_link: { slug: 'bD7xQ2', state: 'reserved', route: '/r/bD7xQ2' },
    target_luma: {
      width: target.width,
      height: target.height,
      values: target.values,
      source_image_sha256: sha,
    },
  };
}

// ================================================================
//  Evidence generation
// ================================================================

mkdirSync(resolve(EVIDENCE_DIR, 'artifacts'), { recursive: true });
mkdirSync(resolve(EVIDENCE_DIR, 'visual-preview'), { recursive: true });
mkdirSync(resolve(EVIDENCE_DIR, 'contact-sheet'), { recursive: true });

const fixture = JSON.parse(readFileSync(FIXTURE_PATH, 'utf8'));
const stableValidation = () => ({
  pass: true,
  decoder: 'deterministic-test-decoder',
  version: '1',
  thresholdVersion: 'scan-v1-real-75pct',
  scannedPayload: 'https://placeholder-online.com/r/bD7xQ2',
  overallConfidence: 'high',
  tests: [{ name: 'stable', pass: true, scale: 1, perturbation: 'none' }],
});

const report = {
  reproducibility: 'deterministic inputs and pipeline; no wall-clock value embedded',
  pipeline_version: 'image-fit-composition-q2-morphology-v1',
  targets: [],
};

for (const target of TARGETS) {
  const input = buildInput(fixture, target, null);
  const q1 = optimizeImageFitQr(input, { validationRunner: stableValidation, _compositionPolicy: 'q1' });
  const q2 = optimizeImageFitQr(input, { validationRunner: stableValidation, _compositionPolicy: 'q2' });

  const targetReport = {
    target: target.name,
    matrix_size: q1.response.candidates[0]?.qr_settings.module_count,
    candidates: [],
  };

  for (const mode of MODES) {
    const before = q1.response.candidates.find((c) => c.mode === mode);
    const after = q2.response.candidates.find((c) => c.mode === mode);
    if (!before || !after) continue;

    const pairBase = `${target.name}--${mode}`;
    const q1Png = rasterizeAndSave(q1, before, `q1--${pairBase}`);
    const q2Png = rasterizeAndSave(q2, after, `q2--${pairBase}`);

    writeTargetQ1Q2(resolve(EVIDENCE_DIR, 'contact-sheet', `target-q1-q2--${pairBase}.png`), target, q1Png, q2Png);

    targetReport.candidates.push({
      mode,
      q1: {
        sha256: before.artifacts[0].sha256,
        modified_fraction: before.image_treatment.modified_fraction,
        recognition_score: before.image_fit_evidence.recognition_score,
        protected_conflicts: before.image_fit_evidence.protected_zone_conflict_score,
      },
      q2: {
        sha256: after.artifacts[0].sha256,
        modified_fraction: after.image_treatment.modified_fraction,
        recognition_score: after.image_fit_evidence.recognition_score,
        protected_conflicts: after.image_fit_evidence.protected_zone_conflict_score,
      },
    });
  }

  report.targets.push(targetReport);
}

// Write full JSON report
writeFileSync(resolve(EVIDENCE_DIR, 'quality-evidence.json'), JSON.stringify(report, null, 2) + '\n');

// ================================================================
//  Helpers
// ================================================================

function rasterizeAndSave(result, candidate, label) {
  const artifact = result.artifacts[candidate.candidate_id];
  writeFileSync(resolve(EVIDENCE_DIR, 'artifacts', `${label}.svg`), artifact.data);
  const raster = rasterizeCandidate({
    candidateId: candidate.candidate_id,
    matrixRef: `qr:${candidate.qr_settings.version}:${candidate.qr_settings.mask}`,
    rendered: { format: 'svg', data: artifact.data, width: 1, height: 1 },
    scanResults: [], exportAllowed: false, artisticScore: 0,
  });
  const png = new PNG({ width: raster.width, height: raster.height });
  png.data = Buffer.from(raster.data);
  const buf = PNG.sync.write(png);
  writeFileSync(resolve(EVIDENCE_DIR, 'visual-preview', `${label}.png`), buf);
  return { width: raster.width, height: raster.height, data: raster.data };
}

function writeTargetQ1Q2(path, target, q1, q2) {
  const gap = 12;
  const headerH = 18;
  const panelSize = Math.max(q1.width, q2.width);
  const width = panelSize * 3 + gap * 2;
  const height = panelSize + headerH;
  const out = new PNG({ width, height });
  out.data.fill(255);

  // Header keys: target=gray, Q1=amber, Q2=blue. Filenames carry target/mode labels.
  const headers = [[120, 120, 120, 255], [214, 156, 46, 255], [45, 126, 190, 255]];
  for (let panel = 0; panel < 3; panel++) {
    const startX = panel * (panelSize + gap);
    for (let y = 0; y < headerH; y++) for (let x = 0; x < panelSize; x++) {
      out.data.set(headers[panel], (y * width + startX + x) * 4);
    }
  }

  drawTarget(out, target, 0, headerH, panelSize);
  drawRaster(out, q1, panelSize + gap, headerH);
  drawRaster(out, q2, (panelSize + gap) * 2, headerH);
  writeFileSync(path, PNG.sync.write(out));
}

function drawTarget(png, target, dx, dy, size) {
  for (let y = 0; y < size; y++) for (let x = 0; x < size; x++) {
    const sx = Math.min(target.width - 1, Math.floor(x * target.width / size));
    const sy = Math.min(target.height - 1, Math.floor(y * target.height / size));
    const value = target.values[sy * target.width + sx];
    const dstIdx = ((dy + y) * png.width + dx + x) * 4;
    png.data.set([value, value, value, 255], dstIdx);
  }
}

function drawRaster(png, raster, dx, dy) {
  for (let y = 0; y < raster.height; y++) {
    for (let x = 0; x < raster.width; x++) {
      const srcIdx = (y * raster.width + x) * 4;
      const dstIdx = ((dy + y) * png.width + (dx + x)) * 4;
      png.data.set(raster.data.subarray(srcIdx, srcIdx + 4), dstIdx);
    }
  }
}

// ================================================================
//  Automated decoder pass proof
// ================================================================

import { runValidation } from '../dist/validation.js';

const decoderReport = { candidates: [], fallback_proofs: [] };

for (const target of TARGETS) {
  const input = buildInput(fixture, target, null);

  // Full decoder pass on improved
  const result = optimizeImageFitQr(input);
  for (const candidate of result.response.candidates) {
    decoderReport.candidates.push({
      target: target.name,
      mode: candidate.mode,
      verdict: candidate.scan_evidence.verdict,
      checks: `${candidate.scan_evidence.checks_passed}/${candidate.scan_evidence.checks_total}`,
      decoder: candidate.scan_evidence.decoders[0]?.name,
      export_allowed: candidate.export_authority.export_allowed,
      blockers: candidate.export_authority.blockers,
    });
  }

  decoderReport.fallback_proofs.push({
    target: target.name,
    verdict: result.fallback_scan_evidence.verdict,
    checks: `${result.fallback_scan_evidence.checks_passed}/${result.fallback_scan_evidence.checks_total}`,
  });
}

writeFileSync(resolve(EVIDENCE_DIR, 'decoder-pass-proof.json'), JSON.stringify(decoderReport, null, 2) + '\n');

// Summary console output
console.log(JSON.stringify({
  targets: TARGETS.map((t) => t.name),
  evidenceDir: EVIDENCE_DIR,
  decoderSummary: {
    totalCandidates: decoderReport.candidates.length,
    passed: decoderReport.candidates.filter((c) => c.verdict === 'pass').length,
    failed: decoderReport.candidates.filter((c) => c.verdict === 'fail').length,
  },
}, null, 2));
