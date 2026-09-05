import { createHash } from 'node:crypto';
import { mkdtempSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { PNG } from 'pngjs';
import { describe, expect, it } from 'vitest';
import {
  assessImageReadiness,
  enforceReadinessInvariants,
  FileSystemImageAssetStore,
  type AssetRef,
  type ImageAssetStore,
  type ImageReadinessReport,
  type StoredImageAsset,
} from './index.js';

class MemoryStore implements ImageAssetStore {
  assets = new Map<string, StoredImageAsset>();

  constructor(initial: StoredImageAsset) {
    this.assets.set(initial.ref.sha256, initial);
  }

  get(ref: AssetRef): StoredImageAsset {
    const asset = this.assets.get(ref.sha256);
    if (!asset) throw new Error('missing asset');
    return asset;
  }

  putPreparedPng(bytes: Buffer, metadata: { width: number; height: number }): StoredImageAsset {
    const digest = createHash('sha256').update(bytes).digest('hex');
    const ref: AssetRef = {
      assetId: `sha256:${digest}`,
      uri: `uploads/${digest}.png`,
      mimeType: 'image/png',
      sha256: digest,
      width: metadata.width,
      height: metadata.height,
      byteLength: bytes.length,
    };
    const asset = { ref, bytes };
    this.assets.set(ref.sha256, asset);
    return asset;
  }
}

describe('image readiness agent', () => {
  it('requires proof-through-generation before a ready report is accepted', () => {
    const report = {
      requestId: 'proofless',
      decision: 'ready',
      sourceAsset: refForPng(pngFixture(512, 512, [200, 100, 50, 255]), 'source'),
      issues: [],
      cleanupActions: [],
      proof: { attempted: true, pass: false },
    } satisfies ImageReadinessReport;

    expect(() => enforceReadinessInvariants(report)).toThrow(/proof-through-generation/);
  });

  it('passes a ready image only after current Core generation proof succeeds', async () => {
    const bytes = pngFixture(512, 512, [210, 120, 60, 255]);
    const source: StoredImageAsset = { ref: refForPng(bytes, 'fox-ready'), bytes };
    const report = await assessImageReadiness({
      requestId: 'fox-ready',
      sourceAsset: source.ref,
      intendedUse: 'level2-image-fit',
      payloadPreview: 'https://example.com/fox',
    }, { store: new MemoryStore(source), now: () => new Date('2026-08-30T21:00:00Z') });

    expect(report.decision).toBe('ready');
    expect(report.proof.attempted).toBe(true);
    expect(report.proof.pass).toBe(true);
    expect(report.proof.candidateIds?.length).toBe(4);
    expect(report.proof.scanSummary?.passed).toBeGreaterThan(0);
    expect(report.preparedAsset).toBeUndefined();
  }, 15_000);

  it('creates a centered prepared asset for low-resolution source images before proof', async () => {
    const bytes = pngFixture(128, 96, [120, 120, 200, 255]);
    const source: StoredImageAsset = { ref: refForPng(bytes, 'wolf-small'), bytes };
    const store = new MemoryStore(source);
    const report = await assessImageReadiness({
      requestId: 'wolf-small',
      sourceAsset: source.ref,
      intendedUse: 'level2-image-fit',
      payloadPreview: 'https://example.com/wolf',
    }, { store, now: () => new Date('2026-08-30T21:01:00Z') });

    expect(report.decision).toBe('prepared');
    expect(report.preparedAsset?.width).toBe(512);
    expect(report.preparedAsset?.height).toBe(512);
    expect(report.preparedAsset?.sha256).not.toBe(source.ref.sha256);
    expect(report.cleanupActions.map((action) => action.action)).toContain('center_subject');
    expect(report.proof.pass).toBe(true);
  }, 15_000);



  it('reports real foreground bounds and scales low-resolution prepared assets for stronger occupancy', async () => {
    const bytes = foregroundFixture(180, 132, [250, 250, 247, 255], { x: 50, y: 18, width: 82, height: 86, color: [219, 96, 32, 255] });
    const source: StoredImageAsset = { ref: refForPng(bytes, 'fox-foreground'), bytes };
    const store = new MemoryStore(source);
    const report = await assessImageReadiness({
      requestId: 'fox-foreground',
      sourceAsset: source.ref,
      intendedUse: 'level2-image-fit',
      payloadPreview: 'https://example.com/fox-foreground',
    }, { store, now: () => new Date('2026-09-05T07:45:00Z') });

    expect(report.decision).toBe('prepared');
    expect(report.subjectRegion?.x).toBeGreaterThan(0.2);
    expect(report.subjectRegion?.x).toBeLessThan(0.35);
    expect(report.subjectRegion?.y).toBeGreaterThan(0.1);
    expect(report.subjectRegion?.width).toBeGreaterThan(0.4);
    expect(report.subjectRegion?.width).toBeLessThan(0.55);
    expect(report.subjectRegion?.height).toBeGreaterThan(0.6);
    expect(report.cleanupActions.map((action) => action.action)).toContain('crop');
    const prepared = store.get(report.preparedAsset!);
    const preparedRegion = foregroundBounds(PNG.sync.read(prepared.bytes), [255, 255, 255]);
    expect(preparedRegion.width / prepared.ref.width).toBeGreaterThan(0.55);
    expect(report.proof.pass).toBe(true);
  }, 15_000);

  it('stores prepared assets content-addressed under the controlled upload root', () => {
    const root = mkdtempSync(join(tmpdir(), 'qr-readiness-'));
    const store = new FileSystemImageAssetStore(root);
    const bytes = pngFixture(16, 16, [0, 0, 0, 255]);
    const stored = store.putPreparedPng(bytes, { width: 16, height: 16 });
    const reread = store.get(stored.ref);

    expect(stored.ref.uri).toBe(`uploads/${stored.ref.sha256}.png`);
    expect(reread.bytes.equals(bytes)).toBe(true);
  });
});

function refForPng(bytes: Buffer, assetId: string): AssetRef {
  const png = PNG.sync.read(bytes);
  const digest = createHash('sha256').update(bytes).digest('hex');
  return {
    assetId,
    uri: `uploads/${digest}.png`,
    mimeType: 'image/png',
    sha256: digest,
    width: png.width,
    height: png.height,
    byteLength: bytes.length,
  };
}



function foregroundFixture(
  width: number,
  height: number,
  background: [number, number, number, number],
  foreground: { x: number; y: number; width: number; height: number; color: [number, number, number, number] },
): Buffer {
  const png = new PNG({ width, height, colorType: 6 });
  for (let idx = 0; idx < png.data.length; idx += 4) {
    png.data[idx] = background[0];
    png.data[idx + 1] = background[1];
    png.data[idx + 2] = background[2];
    png.data[idx + 3] = background[3];
  }
  for (let y = foreground.y; y < foreground.y + foreground.height; y++) for (let x = foreground.x; x < foreground.x + foreground.width; x++) {
    const idx = (y * width + x) * 4;
    png.data[idx] = foreground.color[0];
    png.data[idx + 1] = foreground.color[1];
    png.data[idx + 2] = foreground.color[2];
    png.data[idx + 3] = foreground.color[3];
  }
  return PNG.sync.write(png);
}

function foregroundBounds(png: PNG, background: [number, number, number]): { width: number; height: number } {
  let minX = png.width, minY = png.height, maxX = -1, maxY = -1;
  for (let y = 0; y < png.height; y++) for (let x = 0; x < png.width; x++) {
    const idx = (y * png.width + x) * 4;
    const distance = Math.hypot(png.data[idx] - background[0], png.data[idx + 1] - background[1], png.data[idx + 2] - background[2]);
    if (png.data[idx + 3] < 128 || distance < 20) continue;
    minX = Math.min(minX, x); minY = Math.min(minY, y); maxX = Math.max(maxX, x); maxY = Math.max(maxY, y);
  }
  return { width: maxX - minX + 1, height: maxY - minY + 1 };
}

function pngFixture(width: number, height: number, color: [number, number, number, number]): Buffer {
  const png = new PNG({ width, height, colorType: 6 });
  for (let idx = 0; idx < png.data.length; idx += 4) {
    png.data[idx] = color[0];
    png.data[idx + 1] = color[1];
    png.data[idx + 2] = color[2];
    png.data[idx + 3] = color[3];
  }
  return PNG.sync.write(png);
}
