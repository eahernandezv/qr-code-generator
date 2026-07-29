import { afterEach, describe, expect, it } from 'vitest';
import { mkdtempSync, rmSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { tmpdir } from 'node:os';
import { normalizePayload } from '@qr/qr-core';
import { generateCandidates } from './index.js';

const dirs: string[] = [];
function pythonFor(output: string, prefix = ''): string {
  const dir = mkdtempSync(join(tmpdir(), 'qr-engine-provider-'));
  dirs.push(dir);
  const path = join(dir, 'provider.py');
  writeFileSync(path, `${prefix}\nimport sys\nsys.stdin.read()\nprint(${JSON.stringify(output)})\n`);
  return path;
}
afterEach(() => { while (dirs.length) rmSync(dirs.pop()!, { recursive: true, force: true }); });

const normalized = normalizePayload({ mode: 'url', content: 'https://example.com/fallback', errorCorrectionLevel: 'H' });
const request = { normalizedPayload: normalized, mode: 'provider_generative' as const, prompt: 'geometric mountain', seed: 7 };

function expectSafeFallback(board: Awaited<ReturnType<typeof generateCandidates>>): void {
  expect(board.status).toBe('completed');
  expect(board.request.mode).toBe('provider_generative');
  expect(board.candidates).toHaveLength(4);
  expect(board.candidates.every((candidate) => candidate.provenance?.generationMode === 'deterministic_template')).toBe(true);
  expect(board.candidates.some((candidate) => candidate.exportAllowed)).toBe(true);
  for (const candidate of board.candidates.filter((item) => item.exportAllowed)) {
    expect(candidate.scanResults[0].scannedPayload).toBe(normalized.canonical);
  }
}

describe('provider failure and deterministic fallback', () => {
  it('maps a valid provider candidate but replaces claimed scan evidence with local validation', async () => {
    const sourceBoard = await generateCandidates({ ...request, mode: 'deterministic_template' });
    const source = sourceBoard.candidates.find((candidate) => candidate.exportAllowed)!;
    const providerCandidate = {
      candidateId: '00000000-0000-4000-8000-000000000020',
      matrixRef: 'provider-matrix',
      rendered: source.rendered,
      scanResults: [],
      exportAllowed: false,
      artisticScore: 0.88,
      provenance: { generationMode: 'provider_generative', provider: 'test-provider', modelVersion: 'test-model', adapterVersion: 'test-adapter', validationVersion: 'untrusted', createdAt: new Date(0).toISOString() },
    };
    const providerResult = { boardId: '00000000-0000-4000-8000-000000000021', request, candidates: [providerCandidate], status: 'completed', totalLatencyMs: 12, totalCostEstimate: 0.01 };
    const board = await generateCandidates(request, { provider: { scriptPath: pythonFor(JSON.stringify(providerResult)) } });
    expect(board.status).toBe('completed');
    expect(board.candidates).toHaveLength(1);
    expect(board.candidates[0].provenance?.generationMode).toBe('provider_generative');
    expect(board.candidates[0].scanResults[0].decoder).toBe('jsQR');
    expect(board.candidates[0].scanResults[0].scannedPayload).toBe(normalized.canonical);
    expect(board.candidates[0].exportAllowed).toBe(true);
  });

  it('falls back when provider is unavailable', async () => {
    expectSafeFallback(await generateCandidates(request, { provider: { scriptPath: '/missing/provider.py' } }));
  });

  it('falls back after timeout', async () => {
    const path = pythonFor('{}', 'import time\ntime.sleep(10)');
    expectSafeFallback(await generateCandidates(request, { provider: { scriptPath: path, timeoutMs: 40, killGraceMs: 10 } }));
  });

  it('falls back after malformed provider output', async () => {
    const path = pythonFor('not-json');
    expectSafeFallback(await generateCandidates(request, { provider: { scriptPath: path } }));
  });

  it('falls back when provider output is unscannable and does not trust provider authorization', async () => {
    const badCandidate = {
      candidateId: '00000000-0000-4000-8000-000000000010', matrixRef: 'provider-matrix',
      rendered: { format: 'svg', data: '<svg width="64" height="64"><rect width="64" height="64" fill="#fff"/></svg>', width: 64, height: 64 },
      scanResults: [{ pass: true, decoder: 'claimed', version: 'x', thresholdVersion: 'x', scannedPayload: normalized.canonical, tests: [], overallConfidence: 'high' }],
      exportAllowed: true, artisticScore: 0.9,
      provenance: { generationMode: 'provider_generative', provider: 'test', modelVersion: 'test', adapterVersion: 'test', validationVersion: 'claimed', createdAt: new Date(0).toISOString() },
    };
    const result = { boardId: '00000000-0000-4000-8000-000000000011', request, candidates: [badCandidate], status: 'completed', totalLatencyMs: 1, totalCostEstimate: 0 };
    expectSafeFallback(await generateCandidates(request, { provider: { scriptPath: pythonFor(JSON.stringify(result)) } }));
  });

  it('honors cancellation, stops the provider, and returns contract-valid safe fallback candidates', async () => {
    const path = pythonFor('{}', 'import time\ntime.sleep(10)');
    const controller = new AbortController();
    setTimeout(() => controller.abort(), 20);
    const board = await generateCandidates(request, { provider: { scriptPath: path, signal: controller.signal, timeoutMs: 2000, killGraceMs: 10 } });
    expect(board.status).toBe('cancelled');
    expect(board.candidates).toHaveLength(4);
    expect(board.candidates.every((candidate) => candidate.exportAllowed && candidate.provenance?.generationMode === 'deterministic_template')).toBe(true);
    expect(board.failure?.code).toBe('CANCELLED');
    expect(board.failure?.safeFallbackAvailable).toBe(true);
  });
});
