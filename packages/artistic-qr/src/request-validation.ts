/** Complete runtime and safety validation at the pre-provider trust boundary. */
import { generateMatrix, type NormalizedPayload } from '@qr/qr-core';
import type { GenerationRequest } from './types.js';

const MODES = new Set(['deterministic_template', 'provider_generative']);
const PAYLOAD_MODES = new Set(['url', 'text', 'email', 'phone', 'wifi']);
const ECLS = new Set(['L', 'M', 'Q', 'H']);
const ART_DIRECTIONS = new Set([
  'editorial-illustration', 'organic-botanical', 'architectural-geometric',
  'photographic-cinematic', 'premium-minimal', 'playful-character',
]);
const FOCAL_AREAS = new Set(['center', 'top', 'bottom', 'left', 'right', 'balanced']);
const MIME_TYPES = new Set(['image/png', 'image/jpeg', 'image/webp']);
const PALETTE_FAMILIES = new Set(['rainbow', 'pride', 'trans', 'bi', 'berry', 'forest']);
const PALETTE_PATTERNS = new Set(['solid', 'horizontalGradient', 'verticalGradient', 'diagonalGradient', 'flagRows', 'spiral', 'radialRings']);
const COLOR_INTENSITIES = new Set(['mellow', 'balanced', 'punchy']);
const MODULE_SHAPES = new Set(['square', 'rounded', 'circle', 'vertical-bars', 'horizontal-bars', 'notched', 'shield']);
const LEGACY_EYE_SHAPES = new Set(['square', 'rounded', 'circle', 'squircle', 'chamfered', 'hex']);
const EYE_FRAME_SHAPES = new Set(['square', 'rounded', 'circle', 'squircle', 'chamfered', 'diamond', 'hex', 'leaf-frame', 'opposing-leaf-frame', 'd-frame', 'inset-leaf-frame']);
const EYE_BALL_SHAPES = new Set(['square', 'rounded', 'circle', 'squircle', 'chamfered', 'hex', 'vertical-capsule', 'horizontal-capsule', 'star', 'diamond']);
const REQUEST_KEYS = new Set(['normalizedPayload', 'mode', 'artDirectionId', 'prompt', 'referenceImage', 'artisticStrength', 'palette', 'paletteFamily', 'palettePattern', 'colorIntensity', 'cornerColor', 'moduleShape', 'eyeShape', 'eyeFrameShape', 'eyeBallShape', 'composition', 'seed']);
const PAYLOAD_KEYS = new Set(['canonical', 'mode', 'byteLength', 'version', 'errorCorrectionLevel', 'maskPattern']);
const PALETTE_KEYS = new Set(['primary', 'secondary', 'accent', 'background']);
const COMPOSITION_KEYS = new Set(['focalArea', 'qrProminence']);
const REFERENCE_KEYS = new Set(['mimeType', 'width', 'height', 'hash']);
const HEX_COLOR = /^#(?:[0-9a-f]{3}|[0-9a-f]{6}|[0-9a-f]{8})$/i;
const OPAQUE_HEX_COLOR = /^#(?:[0-9a-f]{3}|[0-9a-f]{6})$/i;
const SHA256 = /^[0-9a-f]{64}$/i;

export class GenerationRequestError extends Error {
  constructor(public readonly code: 'MALFORMED_PAYLOAD' | 'UNSUPPORTED_MODE' | 'SAFETY_REJECTED', safeMessage: string) {
    super(`${code}: ${safeMessage}`);
    this.name = 'GenerationRequestError';
  }
}

export interface SafetyVerdict {
  safe: boolean;
  reasonCode?: string;
}

export type SafetyEvaluator = (request: Readonly<GenerationRequest>) => SafetyVerdict | Promise<SafetyVerdict>;

export function validateGenerationRequest(value: unknown): GenerationRequest {
  const request = requireRecord(value, 'Generation request');
  rejectUnknown(request, REQUEST_KEYS, 'generation request');
  if (typeof request.mode !== 'string' || !MODES.has(request.mode)) {
    throw new GenerationRequestError('UNSUPPORTED_MODE', 'Generation mode is invalid');
  }
  const normalizedPayload = validateNormalizedPayload(request.normalizedPayload);

  optionalString(request, 'artDirectionId', 1, 128);
  if (request.artDirectionId !== undefined && !ART_DIRECTIONS.has(request.artDirectionId as string)) {
    throw malformed('Art direction is invalid');
  }
  optionalString(request, 'prompt', 0, 2000);
  optionalFiniteRange(request, 'artisticStrength', 0, 1);
  optionalEnum(request, 'paletteFamily', PALETTE_FAMILIES);
  optionalEnum(request, 'palettePattern', PALETTE_PATTERNS);
  optionalEnum(request, 'colorIntensity', COLOR_INTENSITIES);
  if (request.cornerColor !== undefined && (typeof request.cornerColor !== 'string' || !OPAQUE_HEX_COLOR.test(request.cornerColor))) {
    throw malformed('cornerColor must be an opaque hex color');
  }
  optionalEnum(request, 'moduleShape', MODULE_SHAPES);
  optionalEnum(request, 'eyeShape', LEGACY_EYE_SHAPES);
  optionalEnum(request, 'eyeFrameShape', EYE_FRAME_SHAPES);
  optionalEnum(request, 'eyeBallShape', EYE_BALL_SHAPES);
  if (request.seed !== undefined && (!Number.isSafeInteger(request.seed) || Math.abs(request.seed as number) > 2_147_483_647)) {
    throw malformed('Seed is invalid');
  }

  if (request.palette !== undefined) validatePalette(request.palette);
  if (request.composition !== undefined) validateComposition(request.composition);
  if (request.referenceImage !== undefined) validateReference(request.referenceImage);

  return { ...request, normalizedPayload } as unknown as GenerationRequest;
}

export async function enforceGenerationSafety(request: GenerationRequest, evaluator?: SafetyEvaluator): Promise<void> {
  const verdict = await (evaluator ?? defaultSafetyEvaluator)(request);
  if (!verdict || verdict.safe !== true) {
    throw new GenerationRequestError('SAFETY_REJECTED', 'Prompt or reference image failed safety checks');
  }
}

export const defaultSafetyEvaluator: SafetyEvaluator = (request) => {
  const prompt = request.prompt?.normalize('NFKC').toLowerCase() ?? '';
  // Narrow, deterministic MVP deny rules. Integrations can inject a stronger image/content classifier.
  const unsafePatterns = [
    /\b(?:child|minor|underage)\b.{0,32}\b(?:nude|nudity|sexual|porn)/,
    /\b(?:sexual|pornographic)\b.{0,32}\b(?:child|minor|underage)\b/,
    /\b(?:graphic gore|dismemberment|beheading)\b/,
    /\b(?:terrorist propaganda|extremist recruitment)\b/,
    /\b(?:suicide instructions|how to self[- ]?harm)\b/,
  ];
  return { safe: !unsafePatterns.some((pattern) => pattern.test(prompt)) };
};

function validateNormalizedPayload(value: unknown): NormalizedPayload {
  const payload = requireRecord(value, 'normalizedPayload');
  rejectUnknown(payload, PAYLOAD_KEYS, 'normalizedPayload');
  if (typeof payload.canonical !== 'string' || payload.canonical.length === 0 || payload.canonical.length > 12_000) {
    throw malformed('Normalized payload canonical value is invalid');
  }
  if (typeof payload.mode !== 'string' || !PAYLOAD_MODES.has(payload.mode)) throw malformed('Normalized payload mode is invalid');
  if (!Number.isInteger(payload.byteLength) || (payload.byteLength as number) < 1) throw malformed('Normalized payload byteLength is invalid');
  if (new TextEncoder().encode(payload.canonical).length !== payload.byteLength) throw malformed('Normalized payload byteLength does not match canonical bytes');
  if (!Number.isInteger(payload.version) || (payload.version as number) < 1 || (payload.version as number) > 40) throw malformed('Normalized payload version is invalid');
  if (typeof payload.errorCorrectionLevel !== 'string' || !ECLS.has(payload.errorCorrectionLevel)) throw malformed('Normalized payload error correction level is invalid');
  if (!Number.isInteger(payload.maskPattern) || (payload.maskPattern as number) < 0 || (payload.maskPattern as number) > 7) throw malformed('Normalized payload mask pattern is invalid');

  const normalized = payload as unknown as NormalizedPayload;
  try {
    const matrix = generateMatrix(normalized);
    if (matrix.version !== normalized.version || matrix.maskPattern !== normalized.maskPattern || matrix.errorCorrectionLevel !== normalized.errorCorrectionLevel) {
      throw malformed('Normalized payload QR invariants do not match the generated matrix');
    }
  } catch (error) {
    if (error instanceof GenerationRequestError) throw error;
    throw malformed('Normalized payload cannot produce a standards-correct QR matrix');
  }
  return normalized;
}

function validatePalette(value: unknown): void {
  const palette = requireRecord(value, 'palette');
  rejectUnknown(palette, PALETTE_KEYS, 'palette');
  for (const key of PALETTE_KEYS) {
    if (palette[key] !== undefined && (typeof palette[key] !== 'string' || !HEX_COLOR.test(palette[key] as string))) {
      throw malformed('Palette contains an invalid color');
    }
  }
}

function validateComposition(value: unknown): void {
  const composition = requireRecord(value, 'composition');
  rejectUnknown(composition, COMPOSITION_KEYS, 'composition');
  if (composition.focalArea !== undefined && (typeof composition.focalArea !== 'string' || !FOCAL_AREAS.has(composition.focalArea))) {
    throw malformed('Composition focal area is invalid');
  }
  optionalFiniteRange(composition, 'qrProminence', 0, 1);
}

function validateReference(value: unknown): void {
  const reference = requireRecord(value, 'referenceImage');
  rejectUnknown(reference, REFERENCE_KEYS, 'referenceImage');
  if (typeof reference.mimeType !== 'string' || !MIME_TYPES.has(reference.mimeType)) throw malformed('Reference image MIME type is invalid');
  if (!Number.isInteger(reference.width) || (reference.width as number) < 1 || (reference.width as number) > 8192) throw malformed('Reference image width is invalid');
  if (!Number.isInteger(reference.height) || (reference.height as number) < 1 || (reference.height as number) > 8192) throw malformed('Reference image height is invalid');
  if ((reference.width as number) * (reference.height as number) > 40_000_000) throw malformed('Reference image dimensions exceed the safety bound');
  if (typeof reference.hash !== 'string' || !SHA256.test(reference.hash)) throw malformed('Reference image hash is invalid');
}

function optionalString(record: Record<string, unknown>, key: string, minimum: number, maximum: number): void {
  const value = record[key];
  if (value !== undefined && (typeof value !== 'string' || value.length < minimum || value.length > maximum)) throw malformed(`${key} is invalid`);
}

function optionalFiniteRange(record: Record<string, unknown>, key: string, minimum: number, maximum: number): void {
  const value = record[key];
  if (value !== undefined && (typeof value !== 'number' || !Number.isFinite(value) || value < minimum || value > maximum)) throw malformed(`${key} is invalid`);
}

function optionalEnum(record: Record<string, unknown>, key: string, values: Set<string>): void {
  const value = record[key];
  if (value !== undefined && (typeof value !== 'string' || !values.has(value))) throw malformed(`${key} is invalid`);
}

function requireRecord(value: unknown, label: string): Record<string, unknown> {
  if (typeof value !== 'object' || value === null || Array.isArray(value)) throw malformed(`${label} must be an object`);
  return value as Record<string, unknown>;
}

function rejectUnknown(record: Record<string, unknown>, allowed: Set<string>, label: string): void {
  if (Object.keys(record).some((key) => !allowed.has(key))) throw malformed(`${label} contains an unknown field`);
}

function malformed(message: string): GenerationRequestError {
  return new GenerationRequestError('MALFORMED_PAYLOAD', message);
}
