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

  const issues = analyzeSource(source.ref);
  const cleanupActions: CleanupAction[] = [];
  let proofAsset = source.ref;
  let decision: ReadinessDecision = issues.some((issue) => issue.severity === 'blocking') ? 'needs_user_replacement' : 'ready';

  if (decision !== 'needs_user_replacement' && issues.some((issue) => issue.code === 'LOW_RESOLUTION' || issue.code === 'SUBJECT_OFF_CENTER')) {
    const prepared = await preparePngAsset(source, options.store);
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
    subjectRegion: { x: 0, y: 0, width: 1, height: 1 },
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

async function preparePngAsset(source: StoredImageAsset, store: ImageAssetStore): Promise<{ ref: AssetRef; actions: CleanupAction[] } | null> {
  if (source.ref.mimeType !== 'image/png') return null;
  const png = PNG.sync.read(source.bytes);
  const size = Math.max(READINESS_THRESHOLD_PX, png.width, png.height);
  const canvas = new PNG({ width: size, height: size, colorType: 6 });
  for (let idx = 0; idx < canvas.data.length; idx += 4) {
    canvas.data[idx] = 255;
    canvas.data[idx + 1] = 255;
    canvas.data[idx + 2] = 255;
    canvas.data[idx + 3] = 255;
  }
  const offsetX = Math.floor((size - png.width) / 2);
  const offsetY = Math.floor((size - png.height) / 2);
  PNG.bitblt(png, canvas, 0, 0, png.width, png.height, offsetX, offsetY);
  const bytes = PNG.sync.write(canvas);
  const stored = await store.putPreparedPng(bytes, { width: size, height: size });
  return {
    ref: stored.ref,
    actions: [
      { action: png.width === png.height ? 'resize' : 'pad', applied: true, reason: 'Normalize uploaded image to a centered square PNG for Level 2 generation proof.', parameters: { width: size, height: size } },
      { action: 'center_subject', applied: true, reason: 'Center source pixels within prepared asset.', parameters: { offsetX, offsetY } },
    ],
  };
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
