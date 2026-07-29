import { afterEach, describe, expect, it } from 'vitest';
import type { AddressInfo } from 'node:net';
import { normalizePayload } from '@qr/qr-core';
import { InMemoryCandidateAuthorityStore, type CandidateAuthorityRecord } from './candidate-context.js';
import { createArtisticQrHttpService, type ArtisticQrHttpService } from './http-service.js';
import type { Candidate, ExportArtifact, GenerationBoard, GenerationRequest } from './types.js';
import { runValidation } from './validation.js';

const services: ArtisticQrHttpService[] = [];
const normalized = normalizePayload({ mode: 'url', content: 'https://example.com/b1c-authority', errorCorrectionLevel: 'H' });
const request: GenerationRequest = { normalizedPayload: normalized, mode: 'deterministic_template', seed: 41 };

afterEach(async () => {
  while (services.length) await close(services.pop()!);
});

describe('B1C Core export HTTP authority boundary', () => {
  it('POST /candidates generates and stores authoritative Core candidates', async () => {
    const store = new InMemoryCandidateAuthorityStore();
    const running = await start(store);
    const response = await post(running.url, '/candidates', request);
    expect(response.status).toBe(200);
    const payload = await response.json() as { success: boolean; board: GenerationBoard };
    expect(payload.success).toBe(true);
    expect(payload.board.candidates).toHaveLength(4);
    for (const candidate of payload.board.candidates) {
      const authority = store.get(candidate.candidateId);
      expect(authority?.rendered.data).toBe(candidate.rendered.data);
      expect(authority?.expectedPayload).toBe(normalized.canonical);
    }
  });

  it('POST /candidates returns the frozen structured validation failure shape', async () => {
    const running = await start();
    const response = await post(running.url, '/candidates', { mode: 'deterministic_template' });
    expect(response.status).toBe(400);
    await expect(response.json()).resolves.toMatchObject({ success: false, code: 'VALIDATION_FAILED' });
  });

  it('POST /exports loads a stored candidate and returns final-byte-validated Core artifacts', async () => {
    const running = await start();
    const candidate = await generateOne(running.url);
    const response = await post(running.url, '/exports', {
      candidateId: candidate.candidateId,
      formats: ['png', 'svg'],
      sizes: [{ label: 'square', widthPx: 512, heightPx: 512 }],
    });
    expect(response.status).toBe(200);
    const artifact = await response.json() as ExportArtifact;
    expect(artifact.candidateId).toBe(candidate.candidateId);
    expect(artifact.files.map((file) => file.format)).toEqual(['png', 'svg']);
    for (const file of artifact.files) {
      const exported: Candidate = {
        ...candidate,
        rendered: { format: file.format === 'png' ? 'png-dataurl' : 'svg', data: file.data, width: file.width, height: file.height },
      };
      expect(runValidation(exported, normalized.canonical).pass).toBe(true);
    }
  }, 15_000);

  it('rejects unknown IDs and browser-supplied candidate bytes without creating an artifact', async () => {
    const running = await start();
    const unknown = '00000000-0000-4000-8000-000000000001';
    const missing = await post(running.url, '/exports', { candidateId: unknown, formats: ['png'] });
    expect(missing.status).toBe(404);
    await expect(missing.json()).resolves.toMatchObject({ code: 'NOT_FOUND' });

    const forged = await post(running.url, '/exports', {
      candidateId: unknown,
      formats: ['png'],
      candidate: { candidateId: unknown, rendered: { format: 'svg', data: '<svg/>', width: 1, height: 1 }, exportAllowed: true },
    });
    expect(forged.status).toBe(400);
    await expect(forged.json()).resolves.toMatchObject({ code: 'EXPORT_FAILED' });
  });

  it('preserves NOT_VALIDATED and EXPORT_FAILED as structured non-2xx errors', async () => {
    const store = new MutableAuthorityStore();
    const running = await start(store);
    const candidate = await generateOne(running.url);
    store.deny(candidate.candidateId);

    const denied = await post(running.url, '/exports', { candidateId: candidate.candidateId, formats: ['svg'] });
    expect(denied.status).toBe(422);
    await expect(denied.json()).resolves.toMatchObject({ code: 'NOT_VALIDATED' });

    const exportableCandidate = await generateOne(running.url);
    const invalid = await post(running.url, '/exports', {
      candidateId: exportableCandidate.candidateId,
      formats: ['png'],
      sizes: [{ label: 'invalid', widthPx: 0, heightPx: 0 }],
    });
    expect(invalid.status).toBe(400);
    await expect(invalid.json()).resolves.toMatchObject({ code: 'EXPORT_FAILED' });
  }, 15_000);

  it('fails closed after a new service process store loses prior authority', async () => {
    const first = await start();
    const candidate = await generateOne(first.url);
    await close(first.service);
    services.splice(services.indexOf(first.service), 1);

    const restarted = await start();
    const response = await post(restarted.url, '/exports', { candidateId: candidate.candidateId, formats: ['svg'] });
    expect(response.status).toBe(404);
    await expect(response.json()).resolves.toMatchObject({ code: 'NOT_FOUND' });
  });
});

class MutableAuthorityStore extends InMemoryCandidateAuthorityStore {
  deny(candidateId: string): void {
    const record = this.get(candidateId);
    if (!record) throw new Error('missing test authority');
    this.put({ ...record, exportAllowed: false } satisfies CandidateAuthorityRecord);
  }
}

async function start(authorityStore = new InMemoryCandidateAuthorityStore()): Promise<{ service: ArtisticQrHttpService; url: string }> {
  const service = createArtisticQrHttpService({ authorityStore });
  services.push(service);
  await new Promise<void>((resolve) => service.server.listen(0, '127.0.0.1', resolve));
  const address = service.server.address() as AddressInfo;
  return { service, url: `http://127.0.0.1:${address.port}` };
}

async function close(service: ArtisticQrHttpService): Promise<void> {
  if (!service.server.listening) return;
  await new Promise<void>((resolve, reject) => service.server.close((error) => error ? reject(error) : resolve()));
}

async function post(url: string, path: string, body: unknown): Promise<Response> {
  return fetch(`${url}${path}`, { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify(body) });
}

async function generateOne(url: string): Promise<Candidate> {
  const response = await post(url, '/candidates', request);
  expect(response.status).toBe(200);
  const payload = await response.json() as { success: true; board: GenerationBoard };
  const candidate = payload.board.candidates.find((item) => item.exportAllowed);
  if (!candidate) throw new Error('No validated candidate generated');
  return candidate;
}
