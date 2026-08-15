import { createHash } from 'node:crypto';
import { mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { PNG } from 'pngjs';
import { optimizeImageFitQr } from '../dist/index.js';
import { rasterizeCandidate } from '../dist/validation.js';

const ROOT = resolve(new URL('../../..', import.meta.url).pathname);
const EVIDENCE_DIR = resolve(ROOT, 'docs/program/evidence/level2-image-fit-quality');
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

const TARGETS = [makeTargetSquareCenter(64), makeTargetGradientDiagonal(64), makeTargetSpots(64), makeTargetCircleHole(64)];
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
  generated_at: new Date().toISOString(),
  pipeline_version: 'image-fit-luma-v2-preprocess-edge-saliency',
  targets: [],
};

for (const target of TARGETS) {
  const input = buildInput(fixture, target, null);
  const legacy = optimizeImageFitQr(input, { validationRunner: stableValidation, _legacyNaiveRender: true });
  const improved = optimizeImageFitQr(input, { validationRunner: stableValidation });

  const targetReport = {
    target: target.name,
    matrix_size: legacy.response.candidates[0]?.qr_settings.module_count,
    candidates: [],
  };

  for (const mode of MODES) {
    const leg = legacy.response.candidates.find((c) => c.mode === mode);
    const imp = improved.response.candidates.find((c) => c.mode === mode);
    if (!leg || !imp) continue;

    const pairBase = `${target.name}--${mode}`;
    const legPng = rasterizeAndSave(legacy, leg, `legacy--${pairBase}`);
    const impPng = rasterizeAndSave(improved, imp, `improved--${pairBase}`);

    // Write side-by-side PNG for this pair
    writeSideBySide(resolve(EVIDENCE_DIR, 'contact-sheet', `pair--${pairBase}.png`), legPng, impPng, `${target.name} ${mode}`);

    targetReport.candidates.push({
      mode,
      legacy: {
        sha256: leg.artifacts[0].sha256,
        modified_fraction: leg.image_treatment.modified_fraction,
        recognition_score: leg.image_fit_evidence.recognition_score,
        protected_conflicts: leg.image_fit_evidence.protected_zone_conflict_score,
      },
      improved: {
        sha256: imp.artifacts[0].sha256,
        modified_fraction: imp.image_treatment.modified_fraction,
        recognition_score: imp.image_fit_evidence.recognition_score,
        protected_conflicts: imp.image_fit_evidence.protected_zone_conflict_score,
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

function writeSideBySide(path, left, right, label) {
  const gap = 10;
  const labelH = 24;
  const w = left.width + gap + right.width;
  const h = Math.max(left.height, right.height) + labelH;
  const out = new PNG({ width: w, height: h });
  out.data.fill(255);

  // Colors
  const black = [0, 0, 0, 255];
  const gray = [200, 200, 200, 255];

  // Fill
  for (let y = 0; y < h; y++) {
    for (let x = 0; x < w; x++) {
      const idx = (y * w + x) * 4;
      const col = y < labelH ? gray : [255, 255, 255, 255];
      out.data.set(col, idx);
    }
  }

  // Draw left image
  drawRaster(out, left, 0, labelH);
  // Draw right image
  drawRaster(out, right, left.width + gap, labelH);

  // Labels (simple pixel-drawn text not available, so draw dark block for text area)
  for (let y = 0; y < labelH; y++) {
    for (let x = 0; x < w; x++) {
      const idx = (y * w + x) * 4;
      out.data.set([220, 220, 230, 255], idx);
    }
  }

  writeFileSync(path, PNG.sync.write(out));
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
