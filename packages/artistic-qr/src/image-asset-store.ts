/** Safe local storage adapter for uploaded and prepared image readiness assets. */
import { createHash } from 'node:crypto';
import { mkdirSync, readFileSync, renameSync, writeFileSync } from 'node:fs';
import { basename, extname, join, resolve } from 'node:path';
import type { AssetRef } from './types.js';
import type { ImageAssetStore, StoredImageAsset } from './image-readiness.js';

const EXTENSIONS: Record<AssetRef['mimeType'], string> = {
  'image/png': '.png',
  'image/jpeg': '.jpg',
  'image/webp': '.webp',
  'image/svg+xml': '.svg',
};

export class FileSystemImageAssetStore implements ImageAssetStore {
  constructor(private readonly root: string) {
    mkdirSync(root, { recursive: true, mode: 0o700 });
  }

  get(ref: AssetRef): StoredImageAsset {
    const path = safeStoredAssetPath(this.root, ref);
    const bytes = readFileSync(path);
    const actual = sha256(bytes);
    if (actual !== ref.sha256) throw new Error('IMAGE_ASSET_HASH_MISMATCH: stored asset bytes do not match ref');
    return { ref, bytes };
  }

  putPreparedPng(bytes: Buffer, metadata: { width: number; height: number }): StoredImageAsset {
    const digest = sha256(bytes);
    const filename = `${digest}.png`;
    const path = safePathUnderRoot(this.root, filename);
    const tmp = safePathUnderRoot(this.root, `${digest}.${process.pid}.${Date.now()}.tmp`);
    writeFileSync(tmp, bytes, { mode: 0o600 });
    renameSync(tmp, path);
    return {
      ref: {
        assetId: `sha256:${digest}`,
        uri: `uploads/${filename}`,
        mimeType: 'image/png',
        sha256: digest,
        width: metadata.width,
        height: metadata.height,
        byteLength: bytes.length,
      },
      bytes,
    };
  }
}

export function assetRefForStoredUpload(uri: string, bytes: Buffer, metadata: { mimeType: AssetRef['mimeType']; width: number; height: number }): AssetRef {
  const digest = sha256(bytes);
  return {
    assetId: `sha256:${digest}`,
    uri,
    mimeType: metadata.mimeType,
    sha256: digest,
    width: metadata.width,
    height: metadata.height,
    byteLength: bytes.length,
  };
}

export function safeStoredAssetPath(root: string, ref: AssetRef): string {
  const expected = `${ref.sha256}${EXTENSIONS[ref.mimeType] ?? extname(ref.uri ?? '')}`;
  const candidate = ref.uri?.startsWith('uploads/') ? basename(ref.uri) : expected;
  if (candidate !== expected && candidate !== `${ref.sha256}.png`) throw new Error('IMAGE_ASSET_PATH_REJECTED: asset uri does not match content hash');
  return safePathUnderRoot(root, candidate);
}

function safePathUnderRoot(root: string, filename: string): string {
  if (filename.includes('/') || filename.includes('\\') || filename.includes('..')) throw new Error('IMAGE_ASSET_PATH_REJECTED: invalid asset filename');
  const base = resolve(root);
  const target = resolve(join(base, filename));
  if (!target.startsWith(`${base}/`) && target !== base) throw new Error('IMAGE_ASSET_PATH_REJECTED: asset path escapes upload root');
  return target;
}

function sha256(bytes: Buffer): string {
  return createHash('sha256').update(bytes).digest('hex');
}
