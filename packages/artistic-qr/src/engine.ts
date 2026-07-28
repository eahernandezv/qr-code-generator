/** Artistic QR generation engine with objective validation and safe fallback. */
import { createHash, randomUUID } from 'node:crypto';
import type { GenerationRequest, GenerationBoard, Candidate } from './types.js';
import {
  type NormalizedPayload,
  type RenderOptions,
  generateMatrix,
  renderDeterministic,
} from '@qr/qr-core';
import {
  callProviderGenerative,
  ProviderAdapterError,
  type ProviderCallOptions,
  type PythonCandidate,
} from './provider-adapter.js';
import { runValidation } from './validation.js';
import { registerCandidateAuthority } from './candidate-context.js';
import {
  enforceGenerationSafety,
  validateGenerationRequest,
  type SafetyEvaluator,
} from './request-validation.js';

export interface GenerationEngineOptions {
  provider?: ProviderCallOptions;
  fallbackOnProviderFailure?: boolean;
  safetyEvaluator?: SafetyEvaluator;
}

export async function buildBoard(
  boardId: string,
  request: GenerationRequest,
  options: GenerationEngineOptions = {},
): Promise<GenerationBoard> {
  const validated = validateGenerationRequest(request);
  await enforceGenerationSafety(validated, options.safetyEvaluator);
  if (validated.mode === 'provider_generative') return buildGenerativeBoard(boardId, validated, options);
  return buildDeterministicBoard(boardId, validated);
}

function buildDeterministicBoard(
  boardId: string,
  request: GenerationRequest,
  originalRequest: GenerationRequest = request,
): GenerationBoard {
  const normalized = requireNormalizedPayload(request.normalizedPayload);
  const matrix = generateMatrix(normalized);
  const matrixDigest = createHash('sha256')
    .update(JSON.stringify({ payload: normalized.canonical, version: matrix.version, mask: matrix.maskPattern }))
    .digest('hex')
    .slice(0, 24);

  const candidates: Candidate[] = [];
  for (let index = 0; index < 4; index += 1) {
    const rendered = renderDeterministic(matrix, computeRenderOptions(request, index));
    const candidate: Candidate = {
      candidateId: randomUUID(),
      matrixRef: `qr:${matrix.version}:${matrix.maskPattern}:${matrixDigest}`,
      rendered: {
        format: rendered.format,
        data: rendered.data,
        width: rendered.width,
        height: rendered.height,
      },
      scanResults: [],
      exportAllowed: false,
      artisticScore: computeArtisticScore(request, index),
      provenance: {
        generationMode: 'deterministic_template',
        provider: originalRequest.mode === 'provider_generative' ? 'local-safe-fallback' : 'local',
        modelVersion: 'qr-core-v1',
        adapterVersion: 'artistic-qr-v1',
        validationVersion: 'scan-v1-real-75pct',
        createdAt: new Date().toISOString(),
      },
    };
    const validation = runValidation(candidate, normalized.canonical);
    candidate.scanResults = [validation];
    candidate.exportAllowed = validation.pass;
    registerCandidateAuthority(candidate, normalized.canonical, validation);
    candidates.push(candidate);
  }

  return { boardId, request: originalRequest, candidates, status: 'completed' };
}

function computeRenderOptions(request: GenerationRequest, index: number): RenderOptions {
  const palette = request.palette;
  const variants: Array<{ shape: RenderOptions['shape']; eyeShape: RenderOptions['eyeShape'] }> = [
    { shape: 'square', eyeShape: 'square' },
    { shape: 'rounded', eyeShape: 'square' },
    { shape: 'circle', eyeShape: 'square' },
    { shape: 'rounded', eyeShape: 'rounded' },
  ];
  const variant = variants[index % variants.length];
  return {
    format: 'svg',
    moduleSize: 8 + index,
    margin: 4,
    colorDark: palette?.primary ?? '#1a1a2e',
    colorLight: palette?.background ?? '#ffffff',
    shape: variant.shape,
    eyeShape: variant.eyeShape,
  };
}

function computeArtisticScore(request: GenerationRequest, index: number): number {
  const strength = request.artisticStrength ?? 0.5;
  return Math.min(1, Math.max(0, strength + (index % 2 === 0 ? 0.05 : -0.05)));
}

async function buildGenerativeBoard(
  boardId: string,
  request: GenerationRequest,
  options: GenerationEngineOptions,
): Promise<GenerationBoard> {
  const fallbackEnabled = options.fallbackOnProviderFailure !== false;
  try {
    const result = await callProviderGenerative(request as unknown as Record<string, unknown>, options.provider);
    if (result.status === 'cancelled') return cancelledBoard(boardId, request, 'Provider generation was cancelled');
    if (result.status === 'failed') {
      if (fallbackEnabled) return deterministicFallback(boardId, request);
      const code = result.failure?.code ?? 'GENERATION_FAILED';
      return failedBoard(boardId, request, code, safeProviderFailureMessage(code), result.failure?.retryable ?? true);
    }

    const expectedPayload = requireNormalizedPayload(request.normalizedPayload).canonical;
    const candidates = result.candidates.map((candidate) => mapAndValidateProviderCandidate(candidate, expectedPayload));
    if (!candidates.some((candidate) => candidate.exportAllowed)) {
      if (fallbackEnabled) return deterministicFallback(boardId, request);
      return failedBoard(boardId, request, 'VALIDATION_FAILED', 'No provider candidate passed objective scan validation', false);
    }
    return { boardId, request, candidates, status: 'completed' };
  } catch (error) {
    if (error instanceof ProviderAdapterError && error.code === 'CANCELLED') return cancelledBoard(boardId, request, 'Provider generation was cancelled');
    if (fallbackEnabled) return deterministicFallback(boardId, request);
    const code = error instanceof ProviderAdapterError ? error.code : 'GENERATION_FAILED';
    return failedBoard(boardId, request, code, safeProviderFailureMessage(code), error instanceof ProviderAdapterError ? error.retryable : true);
  }
}

function mapAndValidateProviderCandidate(source: PythonCandidate, expectedPayload: string): Candidate {
  const renderedFormat = source.rendered.format === 'svg' ? 'svg' : 'png-dataurl';
  const candidate: Candidate = {
    // Provider identifiers are evidence only; issue a fresh opaque engine-owned authority key.
    candidateId: randomUUID(),
    matrixRef: source.matrixRef,
    rendered: {
      format: renderedFormat,
      data: source.rendered.data,
      width: source.rendered.width,
      height: source.rendered.height,
    },
    scanResults: [],
    exportAllowed: false,
    artisticScore: Math.min(1, Math.max(0, source.artisticScore)),
    provenance: {
      generationMode: 'provider_generative',
      provider: source.provenance.provider,
      modelVersion: source.provenance.modelVersion,
      adapterVersion: source.provenance.adapterVersion,
      validationVersion: 'scan-v1-real-75pct',
      createdAt: source.provenance.createdAt,
    },
  };
  const validation = runValidation(candidate, expectedPayload);
  candidate.scanResults = [validation];
  candidate.exportAllowed = validation.pass;
  registerCandidateAuthority(candidate, expectedPayload, validation);
  return candidate;
}

function safeProviderFailureMessage(code: string): string {
  const messages: Record<string, string> = {
    PROVIDER_UNAVAILABLE: 'Generative provider is unavailable',
    PROVIDER_TIMEOUT: 'Generative provider timed out',
    PROVIDER_OUTPUT_LIMIT: 'Generative provider exceeded the output safety bound',
    MALFORMED_PROVIDER_OUTPUT: 'Generative provider returned an invalid response',
    PROVIDER_FAILED: 'Generative provider failed',
  };
  return messages[code] ?? 'Candidate generation failed';
}

function deterministicFallback(boardId: string, request: GenerationRequest): GenerationBoard {
  const fallbackRequest: GenerationRequest = { ...request, mode: 'deterministic_template' };
  return buildDeterministicBoard(boardId, fallbackRequest, request);
}

function cancelledBoard(boardId: string, request: GenerationRequest, message: string): GenerationBoard {
  return terminalBoardWithFallback(boardId, request, 'cancelled', 'CANCELLED', message, false);
}

function failedBoard(boardId: string, request: GenerationRequest, code: string, message: string, retryable: boolean): GenerationBoard {
  return terminalBoardWithFallback(boardId, request, 'failed', code, message, retryable);
}

function terminalBoardWithFallback(
  boardId: string,
  request: GenerationRequest,
  status: 'failed' | 'cancelled',
  code: string,
  message: string,
  retryable: boolean,
): GenerationBoard {
  const fallbackRequest: GenerationRequest = { ...request, mode: 'deterministic_template' };
  const fallback = buildDeterministicBoard(boardId, fallbackRequest, request);
  return {
    ...fallback,
    status,
    failure: { code, message, retryable, safeFallbackAvailable: true },
  };
}

function requireNormalizedPayload(value: unknown): NormalizedPayload {
  if (
    typeof value !== 'object' || value === null ||
    typeof (value as NormalizedPayload).canonical !== 'string' ||
    typeof (value as NormalizedPayload).version !== 'number' ||
    typeof (value as NormalizedPayload).maskPattern !== 'number'
  ) throw new Error('MALFORMED_PAYLOAD: normalizedPayload does not match qr-core-api.v1');
  return value as NormalizedPayload;
}
