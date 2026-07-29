import { afterEach, describe, expect, it } from 'vitest';
import { mkdtempSync, rmSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { tmpdir } from 'node:os';
import { callProviderGenerative, ProviderAdapterError } from './provider-adapter.js';

const dirs: string[] = [];
function script(body: string): string {
  const dir = mkdtempSync(join(tmpdir(), 'qr-provider-test-'));
  dirs.push(dir);
  const path = join(dir, 'provider.py');
  writeFileSync(path, body);
  return path;
}
afterEach(() => { while (dirs.length) rmSync(dirs.pop()!, { recursive: true, force: true }); });

const request = { mode: 'provider_generative', normalizedPayload: { canonical: 'https://example.com' } };
const valid = JSON.stringify({ boardId: '00000000-0000-4000-8000-000000000001', request, candidates: [], status: 'failed', failure: { code: 'NO_OUTPUT', message: 'none', retryable: false, safeFallbackAvailable: true }, totalLatencyMs: 1, totalCostEstimate: 0 });

describe('bounded provider subprocess adapter', () => {
  it('parses a valid bounded result from an explicitly configured script', async () => {
    const path = script(`import sys\nsys.stdin.read()\nprint(${JSON.stringify(valid)})\n`);
    const result = await callProviderGenerative(request, { scriptPath: path, timeoutMs: 2000 });
    expect(result.status).toBe('failed');
  });

  it('classifies malformed output', async () => {
    const path = script("print('not json')\n");
    await expect(callProviderGenerative(request, { scriptPath: path, timeoutMs: 2000 })).rejects.toMatchObject({ code: 'MALFORMED_PROVIDER_OUTPUT' });
  });

  it('rejects a completed candidate with malformed provenance or dimensions', async () => {
    const malformed = JSON.stringify({ boardId: 'board', request, status: 'completed', totalLatencyMs: 1, totalCostEstimate: 0, candidates: [{ candidateId: 'candidate', matrixRef: 'matrix', rendered: { format: 'png-dataurl', data: 'x', width: -1, height: 10 }, scanResults: [], exportAllowed: true, artisticScore: 0.5, provenance: {} }] });
    const path = script(`print(${JSON.stringify(malformed)})\n`);
    await expect(callProviderGenerative(request, { scriptPath: path })).rejects.toMatchObject({ code: 'MALFORMED_PROVIDER_OUTPUT' });
  });

  it('enforces timeout and terminates the child', async () => {
    const path = script('import time\ntime.sleep(10)\n');
    await expect(callProviderGenerative(request, { scriptPath: path, timeoutMs: 50, killGraceMs: 10 })).rejects.toMatchObject({ code: 'PROVIDER_TIMEOUT' });
  });

  it('supports AbortSignal cancellation', async () => {
    const path = script('import time\ntime.sleep(10)\n');
    const controller = new AbortController();
    setTimeout(() => controller.abort(), 20);
    await expect(callProviderGenerative(request, { scriptPath: path, timeoutMs: 2000, signal: controller.signal, killGraceMs: 10 })).rejects.toMatchObject({ code: 'CANCELLED' });
  });

  it('bounds provider output', async () => {
    const path = script("print('x' * 10000)\n");
    await expect(callProviderGenerative(request, { scriptPath: path, timeoutMs: 2000, maxOutputBytes: 256 })).rejects.toMatchObject({ code: 'PROVIDER_OUTPUT_LIMIT' });
  });

  it('retries a transient provider failure within the configured bound', async () => {
    const path = script(`import os,sys\nmarker=os.path.join(os.path.dirname(__file__),'attempted')\nif not os.path.exists(marker):\n open(marker,'w').write('1')\n sys.exit(1)\nprint(${JSON.stringify(valid)})\n`);
    const result = await callProviderGenerative(request, { scriptPath: path, maxAttempts: 2 });
    expect(result.status).toBe('failed');
  });

  it('reports an unavailable configured script truthfully', async () => {
    await expect(callProviderGenerative(request, { scriptPath: '/definitely/missing/provider.py' })).rejects.toBeInstanceOf(ProviderAdapterError);
    await expect(callProviderGenerative(request, { scriptPath: '/definitely/missing/provider.py' })).rejects.toMatchObject({ code: 'PROVIDER_UNAVAILABLE' });
  });
});
