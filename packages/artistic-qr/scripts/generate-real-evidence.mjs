#!/usr/bin/env node
/**
 * Level 2 Real Generation Core — Evidence Generation Script
 * Owner: QR Creator
 */

import { readFileSync, mkdirSync, writeFileSync } from 'node:fs';
import { createHash } from 'node:crypto';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';

import { optimizeImageFitQr } from '@qr/artistic-qr';

const __dirname = dirname(fileURLToPath(import.meta.url));
const root = join(__dirname, '../../../');

// Load fixture image and convert to luma
const fixturePath = join(root, 'docs/program/evidence/level2-image-fit-qr-spike/creator-visual-pass/fixtures/bold-diamond.png');

// Read PNG using pngjs
import { PNG } from 'pngjs';
const png = PNG.sync.read(readFileSync(fixturePath));
const { width, height, data } = png;

// Convert to grayscale luma (0-255)
const luma = new Array(width * height);
for (let y = 0; y < height; y++) {
  for (let x = 0; x < width; x++) {
    const idx = (y * width + x) * 4;
    // Standard luma coefficients
    const gray = Math.round(0.299 * data[idx] + 0.587 * data[idx + 1] + 0.114 * data[idx + 2]);
    luma[y * width + x] = gray;
  }
}

// Compute image hash
const imageHash = createHash('sha256').update(readFileSync(fixturePath)).digest('hex');

// Request matching contract fixture
const request = {
  request_id: 'l2req-real-gen-001',
  destination: {
    kind: 'url',
    normalized_url: 'https://example.com/products/summer-collection?source=printed-menu',
    display_url: 'https://example.com/products/summer-collection?...',
    safety: { verdict: 'pass', policy_version: 'destination-safety-v1' },
  },
  target_image: {
    image_ref: 'fixtures/bold-diamond.png',
    mime_type: 'image/png',
    width_px: width,
    height_px: height,
    sha256: imageHash,
    complexity: 'simple_mark',
  },
  user_controls: {
    treatment: 'pixel_blend',
    strength: 'balanced',
    detail: 'detailed',
    link_mode: 'optimized_short_link',
  },
  constraints: {
    max_candidates: 12,
    max_search_ms: 45000,
    allowed_ecc: ['Q', 'H'],
    allowed_masks: [0, 1, 2, 3, 4, 5, 6, 7],
    allowed_versions: [8, 9, 10, 11, 12],
  },
  entitlement_context: { mode: 'preview', export_entitled: false },
};

// Optimized short-link payload
const encodedPayload = 'https://placeholder-online.com/r/bD7xQ2';
const shortLink = { slug: 'bD7xQ2', state: 'reserved', route: '/r/bD7xQ2' };

// Build input
const input = {
  schema_version: 'image-fit-qr-api.v1',
  request,
  encoded_payload: encodedPayload,
  short_link: shortLink,
  target_luma: {
    width,
    height,
    values: luma,
    source_image_sha256: imageHash,
  },
};

console.log('Running Image-Fit QR optimizer with real fixture...');
console.log(`Image: ${width}x${height}, sha256: ${imageHash.slice(0, 16)}...`);

const result = optimizeImageFitQr(input);

// Create evidence directory
const evidenceDir = join(root, 'docs/program/evidence/level2-real-generation-core');
mkdirSync(evidenceDir, { recursive: true });
mkdirSync(join(evidenceDir, 'artifacts'), { recursive: true });

// Write artifacts and collect metadata
const candidateMeta = result.response.candidates.map(candidate => {
  const artifact = result.artifacts[candidate.candidate_id];
  const artifactPath = join(evidenceDir, 'artifacts', `${candidate.candidate_id}.svg`);
  if (artifact) {
    writeFileSync(artifactPath, artifact.data);
  }
  return {
    candidate_id: candidate.candidate_id,
    mode: candidate.mode,
    status: candidate.status,
    qr_settings: candidate.qr_settings,
    image_treatment: candidate.image_treatment,
    scan_evidence: candidate.scan_evidence,
    image_fit_evidence: candidate.image_fit_evidence,
    artifact_sha256: artifact?.sha256,
    artifact_path: artifact ? `artifacts/${candidate.candidate_id}.svg` : null,
  };
});

// Write fallback artifact
const fallbackPath = join(evidenceDir, 'artifacts', 'fallback.svg');
writeFileSync(fallbackPath, result.fallback_artifact.data);

// Generate comparison with original URL
const originalUrl = request.destination.normalized_url;
const originalPayloadLength = Buffer.byteLength(originalUrl, 'utf8');
const optimizedPayloadLength = Buffer.byteLength(encodedPayload, 'utf8');

const evidence = {
  generation_timestamp: new Date().toISOString(),
  schema_version: 'image-fit-qr-api.v1',
  request_id: request.request_id,
  fixture: {
    path: 'docs/program/evidence/level2-image-fit-qr-spike/creator-visual-pass/fixtures/bold-diamond.png',
    sha256: imageHash,
    width_px: width,
    height_px: height,
  },
  payload_comparison: {
    original_url: originalUrl,
    original_url_byte_length: originalPayloadLength,
    optimized_short_link: encodedPayload,
    optimized_byte_length: optimizedPayloadLength,
    byte_savings: originalPayloadLength - optimizedPayloadLength,
    savings_percent: Math.round(((originalPayloadLength - optimizedPayloadLength) / originalPayloadLength) * 1000) / 10,
  },
  candidates: candidateMeta,
  fallback: {
    kind: result.response.fallback.kind,
    available: result.response.fallback.available,
    artifact_sha256: result.fallback_artifact.sha256,
    scan_verdict: result.fallback_scan_evidence.verdict,
  },
  selection_policy: result.response.selection_policy,
};

const evidencePath = join(evidenceDir, 'evidence.json');
writeFileSync(evidencePath, JSON.stringify(evidence, null, 2));

// Compute SHA-256 of all evidence files
const hashes = {};
for (const file of ['evidence.json', 'fallback.svg', ...candidateMeta.map(c => `${c.candidate_id}.svg`)]) {
  const p = join(evidenceDir, file.startsWith('artifacts/') ? '' : '', file);
  try {
    hashes[file] = createHash('sha256').update(readFileSync(p)).digest('hex');
  } catch (e) {
    // skip if artifact missing
  }
}

const shaPath = join(evidenceDir, 'sha256.txt');
writeFileSync(shaPath, Object.entries(hashes).map(([k, v]) => `${v}  ${k}`).join('\n') + '\n');

console.log('\n=== Generation Complete ===');
console.log(`Candidates generated: ${candidateMeta.length}`);
for (const c of candidateMeta) {
  console.log(`  ${c.mode}: ${c.status} | v${c.qr_settings.version} ECC:${c.qr_settings.ecc} mask:${c.qr_settings.mask} | scan:${c.scan_evidence.verdict} | fit:${c.image_fit_evidence.fit_label}`);
}
console.log(`\nPayload optimization: ${originalPayloadLength} → ${optimizedPayloadLength} bytes (${evidence.payload_comparison.savings_percent}% savings)`);
console.log(`Fallback: ${result.response.fallback.kind} | scan: ${result.fallback_scan_evidence.verdict}`);
console.log(`\nEvidence written to: ${evidenceDir}`);
