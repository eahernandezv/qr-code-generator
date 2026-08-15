import { afterEach, describe, expect, it } from 'vitest';
import type { AddressInfo } from 'node:net';
import { normalizePayload } from '@qr/qr-core';
import { InMemoryCandidateAuthorityStore, type CandidateAuthorityRecord } from './candidate-context.js';
import { createArtisticQrHttpService, type ArtisticQrHttpService } from './http-service.js';
import type { Candidate, ExportArtifact, GenerationBoard, GenerationRequest } from './types.js';
import { runValidation } from './validation.js';
import * as AjvModule from 'ajv';
import * as formatsModule from 'ajv-formats';
import { mkdtempSync, readFileSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';

const services: ArtisticQrHttpService[] = [];
const normalized = normalizePayload({ mode: 'url', content: 'https://example.com/b1c-authority', errorCorrectionLevel: 'H' });
const request: GenerationRequest = { normalizedPayload: normalized, mode: 'deterministic_template', seed: 41 };

// Schema validator for image-fit-qr-api.v1
const schemaPath = new URL('../../contracts/schemas/image-fit-qr-api.v1.json', import.meta.url);
const schema = JSON.parse(readFileSync(schemaPath, 'utf8'));
type AjvConstructor = new (options?: import('ajv').Options) => import('ajv').default;
const Ajv = ((AjvModule as unknown as { default?: AjvConstructor }).default ?? AjvModule) as AjvConstructor;
const addFormats = ((formatsModule as unknown as { default?: typeof import('ajv-formats').default }).default ?? formatsModule) as typeof import('ajv-formats').default;
const ajv = new Ajv({ allErrors: true, strict: false });
addFormats(ajv);
const validateResponse = ajv.compile(schema);

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

describe('POST /image-fit/candidates', () => {
  const TEST_IMAGE_REF = 'fixtures/test-target.png';
  const TEST_IMAGE_SHA = 'db41519156394cb47b94569d402c7bddd1d867c39e1c3e2c7abff28ea29e90b0';

  it('succeeds for a valid controlled fixture and returns contract-valid image-fit-qr-api.v1', async () => {
    const running = await start();
    const response = await post(running.url, '/image-fit/candidates', buildImageFitRequest(TEST_IMAGE_REF, TEST_IMAGE_SHA));
    expect(response.status).toBe(200);
    const payload = await response.json() as { success: true; result: Record<string, unknown>; authorized_fallback: { artifact: { uri: string; sha256: string }; payload_sha256: string; scan_evidence: { verdict: string } } };
    expect(payload.success).toBe(true);
    // Validate against frozen schema
    expect(validateResponse(payload.result)).toBe(true);
    // Assert expected contract fields
    const result = payload.result;
    expect(result.schema_version).toBe('image-fit-qr-api.v1');
    const candidates = result.candidates as Array<Record<string, unknown>>;
    expect(candidates.length).toBeGreaterThan(0);
    // All candidates must be locked for preview
    for (const candidate of candidates) {
      const authority = (candidate as Record<string, unknown>).export_authority as Record<string, unknown>;
      expect(authority.export_allowed).toBe(false);
      expect(authority.preview_export_parity).toBe('not_proven');
      const artifacts = (candidate as Record<string, unknown>).artifacts as Array<Record<string, unknown>>;
      expect(artifacts[0].uri).toMatch(/^data:image\/svg\+xml;base64,/);
      expect(artifacts[0].uri).not.toContain('artifact://');
    }
    expect(payload.authorized_fallback.artifact.uri).toMatch(/^data:image\/svg\+xml;base64,/);
    expect(payload.authorized_fallback.artifact.sha256).toMatch(/^[a-f0-9]{64}$/);
    expect(payload.authorized_fallback.payload_sha256).toBe((candidates[0].qr_settings as Record<string, unknown>).payload_sha256);
    expect(payload.authorized_fallback.scan_evidence.verdict).toBe('pass');
  }, 30_000);

  it('fails closed for a missing target image with structured error', async () => {
    const running = await start();
    const bad = buildImageFitRequest('fixtures/nonexistent.png', 'a'.repeat(64)) as Record<string, unknown>;
    delete (bad as Record<string, unknown>).target_image;
    const response = await post(running.url, '/image-fit/candidates', bad);
    expect(response.status).toBe(400);
    const body = await response.json() as { success: false; code: string; message: string };
    expect(body.success).toBe(false);
    expect(body.code).toBe('VALIDATION_FAILED');
    expect(body.message).toContain('target_image');
  });

  it('fails closed for path traversal in image_ref', async () => {
    const running = await start();
    const bad = buildImageFitRequest('../etc/passwd', TEST_IMAGE_SHA);
    const response = await post(running.url, '/image-fit/candidates', bad);
    expect(response.status).toBe(400);
    const body = await response.json() as { success: false; code: string; message: string };
    expect(body.success).toBe(false);
    expect(body.code).toBe('VALIDATION_FAILED');
    expect(body.message).toContain('traversal');
  });

  it('fails closed for image_ref outside MVP-safe controlled paths', async () => {
    const running = await start();
    const bad = buildImageFitRequest('/etc/passwd', TEST_IMAGE_SHA);
    const response = await post(running.url, '/image-fit/candidates', bad);
    expect(response.status).toBe(400);
    const body = await response.json() as { success: false; code: string; message: string };
    expect(body.success).toBe(false);
    expect(body.code).toBe('VALIDATION_FAILED');
    expect(body.message).toContain('controlled path');
  });

  it('accepts a browser-uploaded PNG target and uses it for candidate generation', async () => {
    const uploadDir = mkdtempSync(join(tmpdir(), 'qr-image-fit-upload-test-'));
    const service = createArtisticQrHttpService({ uploadDir });
    services.push(service);
    await new Promise<void>((resolve) => service.server.listen(0, '127.0.0.1', resolve));
    const address = service.server.address() as AddressInfo;
    const url = `http://127.0.0.1:${address.port}`;
    try {
      const bytes = readFileSync(new URL('../fixtures/test-target.png', import.meta.url));
      const uploaded = await post(url, '/image-fit/uploads', { data_url: `data:image/png;base64,${bytes.toString('base64')}` });
      expect(uploaded.status).toBe(200);
      const uploadPayload = await uploaded.json() as { success: true; target_image: { image_ref: string; sha256: string } };
      expect(uploadPayload.success).toBe(true);
      expect(uploadPayload.target_image.image_ref).toBe(`uploads/${uploadPayload.target_image.sha256}.png`);

      const generated = await post(url, '/image-fit/candidates', buildImageFitRequest(uploadPayload.target_image.image_ref, uploadPayload.target_image.sha256));
      expect(generated.status).toBe(200);
      const payload = await generated.json() as { success: true; result: Record<string, unknown> };
      expect(payload.success).toBe(true);
      expect(validateResponse(payload.result)).toBe(true);
    } finally {
      rmSync(uploadDir, { recursive: true, force: true });
    }
  }, 30_000);

  it('reserves a deterministic short-link slug in optimized_short_link mode without committing it', async () => {
    const running = await start();
    const req = buildImageFitRequest(TEST_IMAGE_REF, TEST_IMAGE_SHA) as Record<string, unknown>;
    (req.user_controls as Record<string, unknown>).link_mode = 'optimized_short_link';
    const response = await post(running.url, '/image-fit/candidates', req);
    expect(response.status).toBe(200);
    const payload = await response.json() as { success: true; result: Record<string, unknown> };
    expect(payload.success).toBe(true);
    const candidates = payload.result.candidates as Array<Record<string, unknown>>;
    expect(candidates.length).toBeGreaterThan(0);
    for (const candidate of candidates) {
      const qrSettings = candidate.qr_settings as Record<string, unknown>;
      expect(qrSettings.payload_mode).toBe('optimized_short_link');
      const shortLink = qrSettings.short_link as Record<string, unknown> | undefined;
      expect(shortLink).toBeDefined();
      expect(shortLink!.state).toBe('reserved');
      expect(typeof shortLink!.slug).toBe('string');
      expect(typeof shortLink!.route).toBe('string');
    }
  }, 30_000);

  it('preserves export_authority locked for public preview (export_allowed = false)', async () => {
    const running = await start();
    const response = await post(running.url, '/image-fit/candidates', buildImageFitRequest(TEST_IMAGE_REF, TEST_IMAGE_SHA));
    expect(response.status).toBe(200);
    const payload = await response.json() as { success: true; result: Record<string, unknown> };
    const result = payload.result;
    expect(result.selection_policy).toEqual({
      default_mode: 'balanced',
      export_requires_entitlement: true,
      image_first_default_export_allowed: false,
    });
    const candidates = result.candidates as Array<Record<string, unknown>>;
    for (const candidate of candidates) {
      const authority = candidate.export_authority as Record<string, unknown>;
      expect(authority.export_allowed).toBe(false);
      expect(authority.requires_payment_or_internal_entitlement).toBe(true);
    }
  }, 30_000);
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

// Helper to build a minimal valid image-fit request
function buildImageFitRequest(imageRef: string, sha256: string): unknown {
  return {
    request_id: 'l2req-test-0001',
    destination: {
      kind: 'url',
      normalized_url: 'https://example.com/products/summer-collection?source=printed-menu',
      display_url: 'https://example.com/products/summer-collection?...',
      safety: { verdict: 'pass', policy_version: 'destination-safety-v1' },
    },
    target_image: {
      image_ref: imageRef,
      mime_type: 'image/png',
      width_px: 4,
      height_px: 4,
      sha256,
      complexity: 'simple_mark',
    },
    user_controls: {
      treatment: 'pixel_blend',
      strength: 'balanced',
      detail: 'detailed',
      link_mode: 'original_url',
    },
    constraints: {
      max_candidates: 12,
      max_search_ms: 45000,
      allowed_ecc: ['Q', 'H'],
      allowed_masks: [0, 1, 2, 3, 4, 5, 6, 7],
      allowed_versions: [8, 9, 10, 11, 12],
    },
    entitlement_context: {
      mode: 'preview',
      export_entitled: false,
    },
  };
}
