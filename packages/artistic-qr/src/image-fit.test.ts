import { readFileSync } from 'node:fs';
import * as AjvModule from 'ajv';
import * as formatsModule from 'ajv-formats';
import { describe, expect, it } from 'vitest';
import { optimizeImageFitQr, type ImageFitOptimizerInput } from './image-fit.js';
import { runValidation } from './validation.js';
import type { ScanValidationResult } from './types.js';

const fixturePath = new URL('../../contracts/fixtures/image-fit-qr/valid-balanced-response.v1.json', import.meta.url);
const schemaPath = new URL('../../contracts/schemas/image-fit-qr-api.v1.json', import.meta.url);
const fixture = JSON.parse(readFileSync(fixturePath, 'utf8')) as { request: ImageFitOptimizerInput['request'] };
const schema = JSON.parse(readFileSync(schemaPath, 'utf8'));
type AjvConstructor = new (options?: import('ajv').Options) => import('ajv').default;
const Ajv = ((AjvModule as unknown as { default?: AjvConstructor }).default ?? AjvModule) as AjvConstructor;
const addFormats = ((formatsModule as unknown as { default?: typeof import('ajv-formats').default }).default ?? formatsModule) as typeof import('ajv-formats').default;
const ajv = new Ajv({ allErrors: true, strict: false });
addFormats(ajv);
const validateResponse = ajv.compile(schema);

function input(): ImageFitOptimizerInput {
  return {
    schema_version: 'image-fit-qr-api.v1',
    request: structuredClone(fixture.request),
    encoded_payload: 'https://placeholder-online.com/r/bD7xQ2',
    short_link: { slug: 'bD7xQ2', state: 'reserved', route: '/r/bD7xQ2' },
    target_luma: {
      width: 2,
      height: 2,
      values: [0, 255, 255, 0],
      source_image_sha256: fixture.request.target_image.sha256,
    },
  };
}

function forcedFailure(): ScanValidationResult {
  return {
    pass: false, decoder: 'forced-test-decoder', version: '1', thresholdVersion: 'forced-fail-v1',
    scannedPayload: '', overallConfidence: 'failed',
    tests: [{ name: 'forced_failure', pass: false, scale: 1, perturbation: 'none' }],
  };
}

describe('Level 2 Image-Fit optimizer', () => {
  it('produces contract-valid Readable, Balanced, and experimental Image-first metadata', () => {
    const result = optimizeImageFitQr(input());
    expect(validateResponse(result.response), JSON.stringify(validateResponse.errors)).toBe(true);
    expect(result.response.candidates.map((candidate) => candidate.mode)).toEqual(['readable', 'balanced', 'image_first']);
    expect(result.response.candidates.slice(0, 2).every((candidate) => candidate.status === 'validated')).toBe(true);
    expect(result.response.candidates[2].status).toBe('experimental');
    expect(result.response.candidates[2].export_authority.export_allowed).toBe(false);
    expect(result.response.candidates.every((candidate) => candidate.protected_regions.alignment)).toBe(true);
    expect(result.response.candidates.every((candidate) => candidate.protected_regions.violations.length === 0)).toBe(true);
    expect(result.response.candidates.every((candidate) => candidate.scan_evidence.checks_total === 8)).toBe(true);
    expect(result.response.candidates.every((candidate) => candidate.scan_evidence.physical_scan === 'not_performed')).toBe(true);
    expect(result.response.candidates.every((candidate) => candidate.scan_evidence.print_scan === 'not_performed')).toBe(true);
    expect(result.response.candidates.every((candidate) => candidate.qr_settings.payload_sha256.length === 64)).toBe(true);
    expect(result.response.candidates.every((candidate) => candidate.export_authority.blockers.includes('preview_not_paid'))).toBe(true);
    expect(result.fallback_scan_evidence.verdict).toBe('pass');
  }, 30_000);

  it('is stable for payload, QR settings, candidate IDs, and artifact bytes', () => {
    const stableValidation = (): ScanValidationResult => ({
      pass: true,
      decoder: 'deterministic-test-decoder',
      version: '1',
      thresholdVersion: 'stable-test-v1',
      scannedPayload: 'https://placeholder-online.com/r/bD7xQ2',
      overallConfidence: 'high',
      tests: [{ name: 'stable', pass: true, scale: 1, perturbation: 'none' }],
    });
    const first = optimizeImageFitQr(input(), { validationRunner: stableValidation });
    const second = optimizeImageFitQr(input(), { validationRunner: stableValidation });
    const select = (result: typeof first) => result.response.candidates.map((candidate) => ({
      candidate_id: candidate.candidate_id,
      qr_settings: candidate.qr_settings,
      protected_regions: candidate.protected_regions,
      artifact: candidate.artifacts[0],
    }));
    expect(select(first)).toEqual(select(second));
    expect(first.fallback_artifact.sha256).toBe(second.fallback_artifact.sha256);
    for (const candidate of first.response.candidates) {
      expect(resultHash(first, candidate.candidate_id)).toBe(candidate.artifacts[0].sha256);
    }
  });

  it('returns the deterministic Level 1 fallback when every image-fit candidate fails', () => {
    const result = optimizeImageFitQr(input(), {
      validationRunner(candidate, expectedPayload) {
        return candidate.candidateId.startsWith('validation-')
          ? forcedFailure()
          : runValidation(candidate, expectedPayload);
      },
    });
    expect(result.response.candidates.every((candidate) => candidate.scan_evidence.verdict === 'fail')).toBe(true);
    expect(result.response.candidates.every((candidate) => candidate.status === 'failed')).toBe(true);
    expect(result.response.fallback).toEqual({
      available: true,
      kind: 'level1_styled_qr',
      reason: 'No image-fit candidate passed; use the deterministic Level 1 styled QR.',
    });
    expect(result.fallback_scan_evidence.verdict).toBe('pass');
    expect(result.fallback_artifact.sha256).toMatch(/^[a-f0-9]{64}$/);
  }, 30_000);

  it('fails closed when optimized payload bytes do not match the reserved route', () => {
    const malformed = input();
    malformed.encoded_payload = 'https://example.com/wrong';
    expect(() => optimizeImageFitQr(malformed)).toThrow(/exactly match/);
  });

  it('requires a bounded image representation bound to the declared source hash', () => {
    const missing = input() as ImageFitOptimizerInput & { target_luma?: ImageFitOptimizerInput['target_luma'] };
    delete missing.target_luma;
    expect(() => optimizeImageFitQr(missing as ImageFitOptimizerInput)).toThrow(/target_luma/);
    const mismatched = input();
    mismatched.target_luma.source_image_sha256 = 'f'.repeat(64);
    expect(() => optimizeImageFitQr(mismatched)).toThrow(/source hash/);
  });
});

function resultHash(result: ReturnType<typeof optimizeImageFitQr>, candidateId: string): string {
  return result.artifacts[candidateId].sha256;
}
