/** Uploaded-image readiness analysis, prepared asset handoff, and proof-through-generation. */
import { createHash } from 'node:crypto';
import { PNG } from 'pngjs';
import { normalizePayload } from '@qr/qr-core';
import { generateCandidates } from './api/index.js';
import type {
  AssetRef,
  CleanupAction,
  ImageReadinessReport,
  ImageReadinessRequest,
  ReadinessDecision,
  ReadinessIssue,
} from './types.js';
import type { GenerationEngineOptions } from './engine.js';

const SHA256 = /^[a-f0-9]{64}$/;
const MIME_TYPES = new Set(['image/png', 'image/jpeg', 'image/webp', 'image/svg+xml']);
const INTENDED_USES = new Set(['level2-image-fit', 'logo-overlay', 'reference-image']);
const READINESS_THRESHOLD_PX = 512;
const PROOF_THRESHOLD_VERSION = 'mvp-l2-readiness-v1';

export interface StoredImageAsset {
  ref: AssetRef;
  bytes: Buffer;
}

export interface ImageAssetStore {
  get(ref: AssetRef): Promise<StoredImageAsset> | StoredImageAsset;
  putPreparedPng(bytes: Buffer, metadata: { width: number; height: number }): Promise<StoredImageAsset> | StoredImageAsset;
}

export interface ImageReadinessOptions {
  store: ImageAssetStore;
  generation?: GenerationEngineOptions;
  now?: () => Date;
}

export async function assessImageReadiness(
  value: unknown,
  options: ImageReadinessOptions,
): Promise<ImageReadinessReport> {
  const request = validateImageReadinessRequest(value);
  const source = await options.store.get(request.sourceAsset);
  verifyAssetBytes(source.ref, source.bytes);

  const sourceSubjectRegion = source.ref.mimeType === 'image/png' ? detectPngSubjectRegion(source.bytes) : undefined;
  const issues = analyzeSource(source.ref);
  const cleanupActions: CleanupAction[] = [];
  let proofAsset = source.ref;
  let decision: ReadinessDecision = issues.some((issue) => issue.severity === 'blocking') ? 'needs_user_replacement' : 'ready';

  if (decision !== 'needs_user_replacement' && issues.some((issue) => issue.code === 'LOW_RESOLUTION' || issue.code === 'SUBJECT_OFF_CENTER')) {
    const prepared = await preparePngAsset(source, options.store, sourceSubjectRegion, request.constraints?.maxPreparedDimension);
    if (prepared) {
      proofAsset = prepared.ref;
      decision = 'prepared';
      cleanupActions.push(...prepared.actions);
    } else {
      issues.push({ code: 'CLEANUP_FAILED', severity: 'blocking', message: 'Readiness cleanup could not produce a PNG prepared asset.' });
      decision = 'rejected';
    }
  }

  const proof = decision === 'ready' || decision === 'prepared'
    ? await proveThroughGeneration(request, proofAsset, options.generation)
    : { attempted: false, pass: false, failureReason: 'Readiness decision blocked generation proof.' };

  if ((decision === 'ready' || decision === 'prepared') && !proof.pass) {
    issues.push({ code: 'PROOF_GENERATION_FAILED', severity: 'blocking', message: proof.failureReason ?? 'Prepared asset failed proof-through-generation.' });
    decision = 'rejected';
  }

  const report: ImageReadinessReport = {
    requestId: request.requestId,
    decision,
    sourceAsset: source.ref,
    preparedAsset: proofAsset.sha256 === source.ref.sha256 ? undefined : proofAsset,
    issues,
    cleanupActions,
    dominantColors: source.ref.mimeType === 'image/png' ? dominantPngColors(source.bytes) : [],
    subjectRegion: sourceSubjectRegion?.region ?? { x: 0, y: 0, width: 1, height: 1 },
    proof,
    createdAt: (options.now ?? (() => new Date()))().toISOString(),
  };
  enforceReadinessInvariants(report);
  return report;
}

export function validateImageReadinessRequest(value: unknown): ImageReadinessRequest {
  const request = requireRecord(value, 'Image readiness request');
  rejectUnknown(request, new Set(['requestId', 'sourceAsset', 'intendedUse', 'payloadPreview', 'constraints']), 'image readiness request');
  if (typeof request.requestId !== 'string' || request.requestId.length < 1 || request.requestId.length > 160) throw readinessError('requestId is invalid');
  if (typeof request.intendedUse !== 'string' || !INTENDED_USES.has(request.intendedUse)) throw readinessError('intendedUse is invalid');
  if (request.payloadPreview !== undefined && (typeof request.payloadPreview !== 'string' || request.payloadPreview.length > 256)) throw readinessError('payloadPreview is invalid');
  if (request.constraints !== undefined) validateConstraints(request.constraints);
  return { ...request, sourceAsset: validateAssetRef(request.sourceAsset) } as ImageReadinessRequest;
}

export function enforceReadinessInvariants(report: ImageReadinessReport): void {
  if ((report.decision === 'ready' || report.decision === 'prepared') && (!report.proof.attempted || !report.proof.pass)) {
    throw readinessError('ready/prepared decisions require successful proof-through-generation');
  }
  if (report.decision === 'prepared' && !report.preparedAsset) throw readinessError('prepared decision requires preparedAsset');
}

function validateAssetRef(value: unknown): AssetRef {
  const ref = requireRecord(value, 'asset ref');
  rejectUnknown(ref, new Set(['assetId', 'uri', 'mimeType', 'sha256', 'width', 'height', 'byteLength']), 'asset ref');
  if (typeof ref.assetId !== 'string' || ref.assetId.length < 1 || ref.assetId.length > 200) throw readinessError('assetId is invalid');
  if (ref.uri !== undefined && (typeof ref.uri !== 'string' || ref.uri.length > 512)) throw readinessError('asset uri is invalid');
  if (typeof ref.mimeType !== 'string' || !MIME_TYPES.has(ref.mimeType)) throw readinessError('asset mimeType is unsupported');
  if (typeof ref.sha256 !== 'string' || !SHA256.test(ref.sha256)) throw readinessError('asset sha256 is invalid');
  if (!Number.isInteger(ref.width) || (ref.width as number) < 1 || (ref.width as number) > 8192) throw readinessError('asset width is invalid');
  if (!Number.isInteger(ref.height) || (ref.height as number) < 1 || (ref.height as number) > 8192) throw readinessError('asset height is invalid');
  if (ref.byteLength !== undefined && (!Number.isInteger(ref.byteLength) || (ref.byteLength as number) < 1 || (ref.byteLength as number) > 25_000_000)) throw readinessError('asset byteLength is invalid');
  return ref as unknown as AssetRef;
}

function validateConstraints(value: unknown): void {
  const constraints = requireRecord(value, 'constraints');
  rejectUnknown(constraints, new Set(['preserveImageColors', 'preserveSubjectCentering', 'allowBackgroundRemoval', 'allowCrop', 'allowUpscale', 'maxPreparedDimension']), 'constraints');
  for (const key of ['preserveImageColors', 'preserveSubjectCentering', 'allowBackgroundRemoval', 'allowCrop', 'allowUpscale']) {
    if (constraints[key] !== undefined && typeof constraints[key] !== 'boolean') throw readinessError(`${key} must be boolean`);
  }
  if (constraints.maxPreparedDimension !== undefined && (!Number.isInteger(constraints.maxPreparedDimension) || (constraints.maxPreparedDimension as number) < 256 || (constraints.maxPreparedDimension as number) > 4096)) {
    throw readinessError('maxPreparedDimension is invalid');
  }
}

function analyzeSource(ref: AssetRef): ReadinessIssue[] {
  const issues: ReadinessIssue[] = [];
  if (ref.width < READINESS_THRESHOLD_PX || ref.height < READINESS_THRESHOLD_PX) {
    issues.push({ code: 'LOW_RESOLUTION', severity: 'warning', message: 'Image is below the preferred Level 2 readiness size and will be normalized before generation proof.' });
  }
  if (ref.width / ref.height > 2 || ref.height / ref.width > 2) {
    issues.push({ code: 'SUBJECT_OFF_CENTER', severity: 'warning', message: 'Image aspect ratio is far from square; pad to a centered square prepared asset.' });
  }
  return issues;
}

async function preparePngAsset(
  source: StoredImageAsset,
  store: ImageAssetStore,
  subject: PngSubjectRegion | undefined,
  maxPreparedDimension?: number,
): Promise<{ ref: AssetRef; actions: CleanupAction[] } | null> {
  if (source.ref.mimeType !== 'image/png') return null;
  const png = PNG.sync.read(source.bytes);
  const size = Math.min(maxPreparedDimension ?? READINESS_THRESHOLD_PX, Math.max(READINESS_THRESHOLD_PX, png.width, png.height));
  const canvas = new PNG({ width: size, height: size, colorType: 6 });
  for (let idx = 0; idx < canvas.data.length; idx += 4) {
    canvas.data[idx] = 255;
    canvas.data[idx + 1] = 255;
    canvas.data[idx + 2] = 255;
    canvas.data[idx + 3] = 255;
  }

  const bounds = subject?.bounds ?? { minX: 0, minY: 0, maxX: png.width - 1, maxY: png.height - 1 };
  const subjectWidth = bounds.maxX - bounds.minX + 1;
  const subjectHeight = bounds.maxY - bounds.minY + 1;
  const pad = Math.max(4, Math.round(Math.max(subjectWidth, subjectHeight) * 0.08));
  const cropX = Math.max(0, bounds.minX - pad);
  const cropY = Math.max(0, bounds.minY - pad);
  const cropW = Math.min(png.width - cropX, subjectWidth + pad * 2);
  const cropH = Math.min(png.height - cropY, subjectHeight + pad * 2);
  const targetOccupancy = 0.70;
  const drawScale = Math.min((size * targetOccupancy) / cropW, (size * targetOccupancy) / cropH);
  const drawW = Math.max(1, Math.round(cropW * drawScale));
  const drawH = Math.max(1, Math.round(cropH * drawScale));
  const offsetX = Math.floor((size - drawW) / 2);
  const offsetY = Math.floor((size - drawH) / 2);
  blitScaled(png, canvas, cropX, cropY, cropW, cropH, offsetX, offsetY, drawW, drawH);
  const bytes = PNG.sync.write(canvas);
  const stored = await store.putPreparedPng(bytes, { width: size, height: size });
  return {
    ref: stored.ref,
    actions: [
      { action: png.width === png.height ? 'resize' : 'pad', applied: true, reason: 'Normalize uploaded image to a centered square PNG for Level 2 generation proof.', parameters: { width: size, height: size } },
      { action: 'crop', applied: true, reason: 'Crop to detected foreground and increase subject occupancy for stronger Image-Fit generation proof.', parameters: { cropX, cropY, cropW, cropH, targetOccupancy } },
      { action: 'center_subject', applied: true, reason: 'Center detected foreground within prepared asset.', parameters: { offsetX, offsetY, drawW, drawH } },
    ],
  };
}

interface PngSubjectRegion {
  region: { x: number; y: number; width: number; height: number };
  bounds: { minX: number; minY: number; maxX: number; maxY: number };
}

function detectPngSubjectRegion(bytes: Buffer): PngSubjectRegion | undefined {
  try {
    const png = PNG.sync.read(bytes);
    const pixel = (x: number, y: number): [number, number, number, number] => {
      const offset = (y * png.width + x) * 4;
      return [png.data[offset], png.data[offset + 1], png.data[offset + 2], png.data[offset + 3]];
    };
    const border: Array<[number, number, number]> = [];
    for (let x = 0; x < png.width; x++) {
      const top = pixel(x, 0), bottom = pixel(x, png.height - 1);
      if (top[3] >= 128) border.push([top[0], top[1], top[2]]);
      if (bottom[3] >= 128) border.push([bottom[0], bottom[1], bottom[2]]);
    }
    for (let y = 1; y < png.height - 1; y++) {
      const left = pixel(0, y), right = pixel(png.width - 1, y);
      if (left[3] >= 128) border.push([left[0], left[1], left[2]]);
      if (right[3] >= 128) border.push([right[0], right[1], right[2]]);
    }
    const median = (channel: number): number => {
      const values = border.map((rgb) => rgb[channel]).sort((a, b) => a - b);
      return values[Math.floor(values.length / 2)] ?? 255;
    };
    const background: [number, number, number] = [median(0), median(1), median(2)];
    const distances = border.map((rgb) => Math.hypot(rgb[0] - background[0], rgb[1] - background[1], rgb[2] - background[2])).sort((a, b) => a - b);
    const threshold = Math.max(28, (distances[Math.floor(distances.length * 0.75)] ?? 0) * 2.5);
    let minX = png.width, minY = png.height, maxX = -1, maxY = -1;
    for (let y = 0; y < png.height; y++) for (let x = 0; x < png.width; x++) {
      const [r, g, b, a] = pixel(x, y);
      if (a < 128) continue;
      if (Math.hypot(r - background[0], g - background[1], b - background[2]) <= threshold) continue;
      minX = Math.min(minX, x); minY = Math.min(minY, y); maxX = Math.max(maxX, x); maxY = Math.max(maxY, y);
    }
    if (maxX < minX || maxY < minY) return undefined;
    return {
      bounds: { minX, minY, maxX, maxY },
      region: {
        x: roundRegion(minX / png.width),
        y: roundRegion(minY / png.height),
        width: roundRegion((maxX - minX + 1) / png.width),
        height: roundRegion((maxY - minY + 1) / png.height),
      },
    };
  } catch {
    return undefined;
  }
}

function blitScaled(source: PNG, target: PNG, sx: number, sy: number, sw: number, sh: number, dx: number, dy: number, dw: number, dh: number): void {
  for (let y = 0; y < dh; y++) for (let x = 0; x < dw; x++) {
    const sourceX = sx + Math.min(sw - 1, Math.floor((x + 0.5) * sw / dw));
    const sourceY = sy + Math.min(sh - 1, Math.floor((y + 0.5) * sh / dh));
    const sourceOffset = (sourceY * source.width + sourceX) * 4;
    const targetX = dx + x, targetY = dy + y;
    if (targetX < 0 || targetY < 0 || targetX >= target.width || targetY >= target.height) continue;
    const targetOffset = (targetY * target.width + targetX) * 4;
    target.data[targetOffset] = source.data[sourceOffset];
    target.data[targetOffset + 1] = source.data[sourceOffset + 1];
    target.data[targetOffset + 2] = source.data[sourceOffset + 2];
    target.data[targetOffset + 3] = source.data[sourceOffset + 3];
  }
}

function roundRegion(value: number): number {
  return Math.max(0, Math.min(1, Math.round(value * 1000) / 1000));
}

async function proveThroughGeneration(
  request: ImageReadinessRequest,
  asset: AssetRef,
  generation?: GenerationEngineOptions,
): Promise<ImageReadinessReport['proof']> {
  try {
    const canonical = request.payloadPreview?.trim() || 'https://example.com/qr-readiness-proof';
    const normalizedPayload = normalizePayload({ mode: canonical.startsWith('http') ? 'url' : 'text', content: canonical, errorCorrectionLevel: 'H' });
    const board = await generateCandidates({
      normalizedPayload,
      mode: 'deterministic_template',
      referenceImage: { mimeType: asset.mimeType === 'image/svg+xml' ? 'image/png' : asset.mimeType, width: asset.width, height: asset.height, hash: asset.sha256 },
      artisticStrength: 0.6,
      composition: { focalArea: 'center', qrProminence: 0.65 },
      seed: 1024,
    }, generation);
    const passed = board.candidates.filter((candidate) => candidate.exportAllowed).length;
    const failed = board.candidates.length - passed;
    return {
      attempted: true,
      pass: board.status === 'completed' && passed > 0,
      appOrCorePath: 'assessImageReadiness -> generateCandidates(deterministic_template) -> runValidation(jsQR)',
      boardId: board.boardId,
      candidateIds: board.candidates.map((candidate) => candidate.candidateId),
      artifactRefs: [asset],
      scanSummary: { decoder: 'jsQR', passed, failed, thresholdVersion: PROOF_THRESHOLD_VERSION },
      failureReason: passed > 0 ? undefined : 'No generated candidate passed scan validation.',
    };
  } catch (error) {
    return { attempted: true, pass: false, failureReason: error instanceof Error ? error.message : 'Generation proof failed.' };
  }
}

function verifyAssetBytes(ref: AssetRef, bytes: Buffer): void {
  const actual = createHash('sha256').update(bytes).digest('hex');
  if (actual !== ref.sha256) throw readinessError('Stored image bytes do not match source sha256');
  if (ref.byteLength !== undefined && ref.byteLength !== bytes.length) throw readinessError('Stored image byteLength does not match source asset');
}

function dominantPngColors(bytes: Buffer): string[] {
  try {
    const png = PNG.sync.read(bytes);
    const counts = new Map<string, number>();
    for (let idx = 0; idx < png.data.length; idx += 16) {
      if (png.data[idx + 3] < 128) continue;
      const color = `#${hex(png.data[idx])}${hex(png.data[idx + 1])}${hex(png.data[idx + 2])}`;
      counts.set(color, (counts.get(color) ?? 0) + 1);
    }
    return [...counts.entries()].sort((a, b) => b[1] - a[1]).slice(0, 5).map(([color]) => color);
  } catch {
    return [];
  }
}

function hex(value: number): string {
  return value.toString(16).padStart(2, '0');
}

function requireRecord(value: unknown, label: string): Record<string, unknown> {
  if (typeof value !== 'object' || value === null || Array.isArray(value)) throw readinessError(`${label} must be an object`);
  return value as Record<string, unknown>;
}

function rejectUnknown(record: Record<string, unknown>, allowed: Set<string>, label: string): void {
  if (Object.keys(record).some((key) => !allowed.has(key))) throw readinessError(`${label} contains an unknown field`);
}

function readinessError(message: string): Error {
  return new Error(`IMAGE_READINESS_FAILED: ${message}`);
}
