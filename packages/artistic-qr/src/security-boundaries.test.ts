import { afterEach, describe, expect, it } from 'vitest';
import { existsSync, mkdtempSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { normalizePayload } from '@qr/qr-core';
import { exportArtifact, generateCandidates, repairCandidate, validateCandidate } from './index.js';
import { resetCandidateAuthorityStore } from './candidate-context.js';
import { runValidation } from './validation.js';
import type { Candidate, GenerationRequest } from './types.js';

const dirs: string[] = [];
afterEach(() => { while (dirs.length) rmSync(dirs.pop()!, { recursive: true, force: true }); });

const normalized = normalizePayload({ mode: 'url', content: 'https://example.com/D1?Case=Exact', errorCorrectionLevel: 'H' });
const deterministicRequest: GenerationRequest = { normalizedPayload: normalized, mode: 'deterministic_template', seed: 91 };
const providerRequest: GenerationRequest = { ...deterministicRequest, mode: 'provider_generative', prompt: 'geometric city blocks' };

async function authorizedCandidate(): Promise<Candidate> {
  const board = await generateCandidates(deterministicRequest);
  return board.candidates.find((candidate) => candidate.exportAllowed)!;
}

function markerProvider(): { scriptPath: string; markerPath: string } {
  const dir = mkdtempSync(join(tmpdir(), 'qr-pre-provider-'));
  dirs.push(dir);
  const markerPath = join(dir, 'spawned');
  const scriptPath = join(dir, 'provider.py');
  writeFileSync(scriptPath, `from pathlib import Path\nimport sys\nPath(${JSON.stringify(markerPath)}).write_text('spawned')\nsys.stdin.read()\nprint('not-json')\n`);
  return { scriptPath, markerPath };
}

describe('D1 exact-byte candidate authority and SVG safety', () => {
  it.each([
    ['script', '<script>alert(1)</script>'],
    ['event handler', '<g onload="alert(1)"></g>'],
    ['foreignObject', '<foreignObject><div>active</div></foreignObject>'],
    ['external href', '<rect href="https://attacker.invalid/x" width="1" height="1"/>'],
    ['external xlink href', '<rect xlink:href="https://attacker.invalid/x" width="1" height="1"/>'],
  ])('rejects modified SVG containing %s and returns no export', async (_name, injection) => {
    const genuine = await authorizedCandidate();
    const mutated: Candidate = {
      ...genuine,
      rendered: { ...genuine.rendered, data: genuine.rendered.data.replace('</svg>', `${injection}</svg>`) },
      exportAllowed: true,
    };
    expect(validateCandidate(mutated).pass).toBe(false);
    expect(runValidation(mutated, normalized.canonical).pass).toBe(false);
    expect(() => exportArtifact({ candidateId: mutated.candidateId, formats: ['svg'] }, mutated)).toThrow(/NOT_VALIDATED/);
  });

  it('rejects a one-module byte mutation even when the image still decodes', async () => {
    const genuine = await authorizedCandidate();
    const mutatedData = genuine.rendered.data.replace(/(<rect x=")([0-9.]+)/, (_all, prefix, value) => `${prefix}${Number(value) + 1}`);
    const mutated: Candidate = { ...genuine, rendered: { ...genuine.rendered, data: mutatedData }, exportAllowed: true };
    expect(runValidation(mutated, normalized.canonical).pass).toBe(true);
    expect(validateCandidate(mutated).pass).toBe(false);
    expect(() => exportArtifact({ candidateId: mutated.candidateId, formats: ['svg'] }, mutated)).toThrow(/NOT_VALIDATED/);
  });

  it.each([
    ['dimensions', (candidate: Candidate): Candidate => ({ ...candidate, rendered: { ...candidate.rendered, width: candidate.rendered.width + 1 } })],
    ['format', (candidate: Candidate): Candidate => ({ ...candidate, rendered: { ...candidate.rendered, format: 'png-dataurl' } })],
  ])('rejects replayed candidate ID with different %s', async (_name, mutate) => {
    const genuine = await authorizedCandidate();
    const replay = mutate(genuine);
    expect(validateCandidate(replay).pass).toBe(false);
    expect(() => exportArtifact({ candidateId: replay.candidateId, formats: ['png'] }, replay)).toThrow(/NOT_VALIDATED/);
  });

  it('exports genuine unchanged authoritative bytes and independently decodes the PNG', async () => {
    const genuine = await authorizedCandidate();
    const artifact = exportArtifact({ candidateId: genuine.candidateId, formats: ['png'], sizes: [{ label: 'proof', widthPx: 512, heightPx: 512 }] }, genuine);
    expect(artifact.files).toHaveLength(1);
    const exported: Candidate = { ...genuine, rendered: { format: 'png-dataurl', data: artifact.files[0].data, width: 512, height: 512 } };
    expect(runValidation(exported, normalized.canonical).scannedPayload).toBe(normalized.canonical);
  }, 10_000);

  it.each(['png', 'svg'] as const)('rejects a non-square %s after the final export transform', async (format) => {
    const genuine = await authorizedCandidate();
    expect(() => exportArtifact({
      candidateId: genuine.candidateId,
      formats: [format],
      sizes: [{ label: 'distorted', widthPx: 512, heightPx: 256 }],
    }, genuine)).toThrow(/NOT_VALIDATED.*post-transform scan validation/i);
  });

  it('fails a multi-file export closed when a later transformed file is invalid', async () => {
    const genuine = await authorizedCandidate();
    expect(() => exportArtifact({
      candidateId: genuine.candidateId,
      formats: ['png'],
      sizes: [
        { label: 'valid-first', widthPx: 512, heightPx: 512 },
        { label: 'invalid-second', widthPx: 512, heightPx: 256 },
      ],
    }, genuine)).toThrow(/NOT_VALIDATED.*post-transform scan validation/i);
  }, 10_000);

  it('preserves valid square PNG and SVG exports after final-byte validation', async () => {
    const genuine = await authorizedCandidate();
    const artifact = exportArtifact({
      candidateId: genuine.candidateId,
      formats: ['png', 'svg'],
      sizes: [{ label: 'square', widthPx: 512, heightPx: 512 }],
    }, genuine);
    expect(artifact.files.map((file) => file.format)).toEqual(['png', 'svg']);
    for (const file of artifact.files) {
      const exported: Candidate = {
        ...genuine,
        rendered: {
          format: file.format === 'png' ? 'png-dataurl' : 'svg',
          data: file.data,
          width: file.width,
          height: file.height,
        },
      };
      expect(runValidation(exported, normalized.canonical).pass).toBe(true);
    }
  }, 15_000);

  it('denies export after simulated process restart loses the default authority record', async () => {
    const genuine = await authorizedCandidate();
    resetCandidateAuthorityStore();
    expect(validateCandidate(genuine).pass).toBe(false);
    expect(() => exportArtifact({ candidateId: genuine.candidateId, formats: ['svg'] }, genuine)).toThrow(/NOT_VALIDATED/);
    expect(() => repairCandidate(genuine, 'contrast_boost')).toThrow(/REPAIR_FAILED/);
  });
});

describe('D2 complete validation and safety before provider spawn', () => {
  async function expectRejectedBeforeSpawn(request: unknown, expectedCode = /MALFORMED_PAYLOAD|UNSUPPORTED_MODE/): Promise<void> {
    const marker = markerProvider();
    await expect(generateCandidates(request as GenerationRequest, { provider: { scriptPath: marker.scriptPath } })).rejects.toThrow(expectedCode);
    expect(existsSync(marker.markerPath)).toBe(false);
  }

  it('rejects missing and malformed normalized payload before provider spawn', async () => {
    await expectRejectedBeforeSpawn({ mode: 'provider_generative' });
    await expectRejectedBeforeSpawn({ ...providerRequest, normalizedPayload: { canonical: normalized.canonical } });
    await expectRejectedBeforeSpawn({ ...providerRequest, normalizedPayload: { ...normalized, byteLength: normalized.byteLength + 1 } });
  });

  it.each([
    ['oversized prompt', { ...providerRequest, prompt: 'x'.repeat(2001) }],
    ['NaN strength', { ...providerRequest, artisticStrength: Number.NaN }],
    ['infinite strength', { ...providerRequest, artisticStrength: Number.POSITIVE_INFINITY }],
    ['string strength', { ...providerRequest, artisticStrength: '0.5' }],
    ['low strength', { ...providerRequest, artisticStrength: -0.01 }],
    ['high strength', { ...providerRequest, artisticStrength: 1.01 }],
    ['malformed palette', { ...providerRequest, palette: { primary: 'red' } }],
    ['invalid mode', { ...providerRequest, mode: 'surprise_mode' }],
    ['unknown request field', { ...providerRequest, unexpected: true }],
    ['invalid composition', { ...providerRequest, composition: { focalArea: 'diagonal' } }],
    ['invalid reference', { ...providerRequest, referenceImage: { mimeType: 'image/svg+xml', width: 10, height: 10, hash: 'x' } }],
  ])('rejects %s before provider spawn', async (_name, request) => {
    await expectRejectedBeforeSpawn(request);
  });

  it('returns stable SAFETY_REJECTED for unsafe prompt without provider spawn or fallback', async () => {
    const marker = markerProvider();
    const unsafe = { ...providerRequest, prompt: 'create graphic gore and dismemberment' };
    await expect(generateCandidates(unsafe, { provider: { scriptPath: marker.scriptPath } })).rejects.toThrow(/SAFETY_REJECTED/);
    expect(existsSync(marker.markerPath)).toBe(false);
  });

  it('honors an injected unsafe reference verdict before provider spawn', async () => {
    const marker = markerProvider();
    const withReference: GenerationRequest = {
      ...providerRequest,
      referenceImage: { mimeType: 'image/png', width: 100, height: 100, hash: 'a'.repeat(64) },
    };
    await expect(generateCandidates(withReference, {
      provider: { scriptPath: marker.scriptPath },
      safetyEvaluator: () => ({ safe: false, reasonCode: 'REFERENCE_UNSAFE' }),
    })).rejects.toThrow(/SAFETY_REJECTED/);
    expect(existsSync(marker.markerPath)).toBe(false);
  });

  it('spawns provider only after a valid safe request and preserves genuine failure fallback', async () => {
    const marker = markerProvider();
    const board = await generateCandidates(providerRequest, { provider: { scriptPath: marker.scriptPath } });
    expect(existsSync(marker.markerPath)).toBe(true);
    expect(board.status).toBe('completed');
    expect(board.candidates.some((candidate) => candidate.exportAllowed)).toBe(true);
    expect(board.candidates.every((candidate) => candidate.provenance?.provider === 'local-safe-fallback')).toBe(true);
  });
});
