import { createHash } from 'node:crypto';
import {
  generateMatrix,
  isProtectedFunctionalModule,
  renderDeterministic,
  type ErrorCorrectionLevel,
  type NormalizedPayload,
  type QrMatrix,
} from '@qr/qr-core';
import type { Candidate, ScanValidationResult } from './types.js';
import { runValidation } from './validation.js';

export type ImageFitMode = 'readable' | 'balanced' | 'image_first';
export type ImageFitEcc = 'Q' | 'H';
export type ShortLinkState = 'reserved' | 'committed' | 'expired' | 'disabled';

export interface ImageFitQrRequestV1 {
  request_id: string;
  destination: {
    kind: 'url'; normalized_url: string; display_url: string;
    safety: { verdict: 'pass' | 'fail'; policy_version: string; blocked_reason?: string };
  };
  target_image: {
    image_ref: string; mime_type: 'image/png' | 'image/jpeg' | 'image/webp' | 'image/svg+xml';
    width_px: number; height_px: number; sha256: string;
    complexity: 'simple_mark' | 'medium_logo' | 'complex_photo_like' | 'high_risk_thin_detail';
  };
  user_controls: {
    treatment: 'logo' | 'pixel_blend' | 'background_image' | 'cutout_perforated';
    strength: ImageFitMode; detail: 'simple' | 'detailed' | 'maximum';
    link_mode: 'optimized_short_link' | 'original_url';
  };
  constraints: {
    max_candidates: number; max_search_ms: number; allowed_ecc: ImageFitEcc[];
    allowed_masks: number[]; allowed_versions: number[];
  };
  entitlement_context: { mode: 'preview' | 'paid_project' | 'internal'; export_entitled: boolean; project_ref?: string };
}

export interface ImageFitOptimizerInput {
  schema_version: 'image-fit-qr-api.v1';
  request: ImageFitQrRequestV1;
  /** Exact URL bytes to encode. Studio supplies a reserved optimized route or the normalized original URL. */
  encoded_payload: string;
  short_link?: { slug: string; state: ShortLinkState; route: string };
  /** Browser/server-preprocessed grayscale target. Values are 0..255, row-major. */
  target_luma: {
    width: number;
    height: number;
    values: readonly number[];
    /** Binds this representation to request.target_image without transporting raw bytes. */
    source_image_sha256: string;
  };
}

export interface ImageFitArtifact {
  kind: 'preview_png' | 'export_png' | 'export_svg' | 'metadata_json';
  uri: string;
  sha256: string;
  media_type: 'image/svg+xml';
  data: string;
}

export interface ImageFitCandidateV1 {
  candidate_id: string;
  mode: ImageFitMode;
  status: 'generated' | 'validated' | 'failed' | 'experimental';
  qr_settings: {
    payload_mode: 'optimized_short_link' | 'original_url';
    short_link?: { slug: string; state: ShortLinkState; route: string };
    encoded_payload_display: string;
    payload_sha256: string;
    version: number; module_count: number; ecc: ImageFitEcc; mask: number;
  };
  image_treatment: {
    kind: 'central_logo_pixel' | 'module_recolor' | 'background_silhouette' | 'cutout_perforated' | 'fallback_level1';
    modified_modules: number; modified_fraction: number;
    luminance_policy_version: string; color_profile: string;
  };
  protected_regions: {
    quiet_zone: true; finder: true; separator: true; timing: true; alignment: true; format: true;
    version_info: boolean; immutable_modules_policy_version: string; violations: string[];
  };
  scan_evidence: {
    verdict: 'pass' | 'fail' | 'not_run'; decoder_suite_version: string;
    checks_passed: number; checks_total: number;
    decoders: Array<{ name: string; version: string; pass: boolean }>;
    physical_scan: 'not_performed' | 'pass' | 'fail';
    print_scan: 'not_performed' | 'pass' | 'fail'; disclaimer: string;
  };
  image_fit_evidence: {
    fit_label: 'readable' | 'balanced' | 'experimental' | 'failed';
    score_version: string; recognition_score: number; protected_zone_conflict_score: number;
  };
  export_authority: {
    export_allowed: boolean; blockers: string[];
    requires_payment_or_internal_entitlement: true;
    preview_export_parity: 'proven' | 'not_proven' | 'not_applicable';
  };
  artifacts: Array<{ kind: ImageFitArtifact['kind']; uri: string; sha256: string }>;
  warnings: Array<{ code: string; message: string; block_export: boolean }>;
}

export interface ImageFitOptimizationResult {
  response: {
    schema_version: 'image-fit-qr-api.v1'; request: ImageFitQrRequestV1;
    candidates: ImageFitCandidateV1[];
    selection_policy: {
      default_mode: 'balanced'; export_requires_entitlement: true; image_first_default_export_allowed: false;
    };
    fallback: { available: boolean; kind: 'level1_styled_qr' | 'none'; reason: string };
  };
  artifacts: Record<string, ImageFitArtifact>;
  fallback_artifact: ImageFitArtifact;
  fallback_scan_evidence: ImageFitCandidateV1['scan_evidence'];
}

export interface ImageFitOptimizerOptions {
  validationRunner?: (candidate: Candidate, expectedPayload: string) => ScanValidationResult;
}

const MODE_ORDER: readonly ImageFitMode[] = ['readable', 'balanced', 'image_first'];
const DISCLAIMER = 'Controlled decoder checks are not a universal scan guarantee. No physical-device or print scan was performed.';

/** Deterministic production-shaped Level 2 optimizer. It never mutates matrix bits. */
export function optimizeImageFitQr(
  input: ImageFitOptimizerInput,
  options: ImageFitOptimizerOptions = {},
): ImageFitOptimizationResult {
  validateInput(input);
  const validate = options.validationRunner ?? runValidation;
  const started = performance.now();
  const artifacts: Record<string, ImageFitArtifact> = {};
  const candidates: ImageFitCandidateV1[] = [];
  const modes = MODE_ORDER.slice(0, Math.min(input.request.constraints.max_candidates, MODE_ORDER.length));

  for (const mode of modes) {
    let selected: {
      settings: QrSearchSettings;
      matrix: QrMatrix;
      rendered: ReturnType<typeof renderImageFitSvg>;
      artifact: ImageFitArtifact;
      validation: ScanValidationResult;
    } | undefined;
    for (const settings of settingsCandidatesForMode(input.request, mode)) {
      if (performance.now() - started > input.request.constraints.max_search_ms) break;
      const normalized: NormalizedPayload = {
        canonical: input.encoded_payload,
        mode: 'url',
        byteLength: Buffer.byteLength(input.encoded_payload, 'utf8'),
        version: settings.version,
        errorCorrectionLevel: settings.ecc,
        maskPattern: settings.mask,
      };
      let matrix: QrMatrix;
      try {
        matrix = generateMatrix(normalized);
      } catch {
        continue;
      }
      const target = targetMap(input, matrix.size);
      const rendered = renderImageFitSvg(matrix, target, mode);
      const artifact = makeArtifact(mode, rendered.svg);
      const validation = validate(validationCandidate(artifact, rendered.width, settings, mode), input.encoded_payload);
      selected = { settings, matrix, rendered, artifact, validation };
      if (validation.pass) break;
    }
    if (!selected) continue;
    const { settings, matrix, rendered, artifact, validation } = selected;
    const scanEvidence = mapScanEvidence(validation);
    const candidateId = stableId(input, mode, settings, artifact.sha256);
    artifact.uri = `artifact://image-fit/${candidateId}.svg`;
    artifacts[candidateId] = artifact;
    const blockers = exportBlockers(input, mode, validation.pass, rendered.protectedViolations);
    const fitLabel = !validation.pass ? 'failed' : mode === 'image_first' ? 'experimental' : mode;
    candidates.push({
      candidate_id: candidateId,
      mode,
      status: !validation.pass ? 'failed' : mode === 'image_first' ? 'experimental' : 'validated',
      qr_settings: {
        payload_mode: input.request.user_controls.link_mode,
        ...(input.short_link ? { short_link: { ...input.short_link } } : {}),
        encoded_payload_display: redactPayload(input.encoded_payload),
        payload_sha256: sha256(input.encoded_payload),
        version: matrix.version,
        module_count: matrix.size,
        ecc: settings.ecc,
        mask: matrix.maskPattern,
      },
      image_treatment: {
        kind: treatmentForMode(mode),
        modified_modules: rendered.modifiedModules,
        modified_fraction: round(rendered.modifiedModules / (matrix.size * matrix.size), 6),
        luminance_policy_version: 'image-fit-luma-v1-dark<=64-light>=218',
        color_profile: 'srgb',
      },
      protected_regions: {
        quiet_zone: true, finder: true, separator: true, timing: true, alignment: true, format: true,
        version_info: matrix.version >= 7,
        immutable_modules_policy_version: 'qr-functional-regions-v2-alignment',
        violations: rendered.protectedViolations,
      },
      scan_evidence: scanEvidence,
      image_fit_evidence: {
        fit_label: fitLabel,
        score_version: 'image-fit-target-coverage-v1',
        recognition_score: rendered.recognitionScore,
        protected_zone_conflict_score: rendered.protectedConflictScore,
      },
      export_authority: {
        export_allowed: blockers.length === 0,
        blockers,
        requires_payment_or_internal_entitlement: true,
        preview_export_parity: 'proven',
      },
      artifacts: [{ kind: artifact.kind, uri: artifact.uri, sha256: artifact.sha256 }],
      warnings: mode === 'image_first' ? [{
        code: 'image_fit_image_first_experimental',
        message: 'Image-first remains experimental until stricter launch gates and Product Architect promotion.',
        block_export: true,
      }] : [],
    });
  }

  const fallback = buildFallback(input, validate);
  const anyPass = candidates.some((candidate) => candidate.scan_evidence.verdict === 'pass');
  return {
    response: {
      schema_version: 'image-fit-qr-api.v1',
      request: input.request,
      candidates,
      selection_policy: {
        default_mode: 'balanced', export_requires_entitlement: true, image_first_default_export_allowed: false,
      },
      fallback: {
        available: fallback.scan.verdict === 'pass',
        kind: fallback.scan.verdict === 'pass' ? 'level1_styled_qr' : 'none',
        reason: anyPass
          ? 'Deterministic Level 1 artifact is retained as a safe fallback.'
          : 'No image-fit candidate passed; use the deterministic Level 1 styled QR.',
      },
    },
    artifacts,
    fallback_artifact: fallback.artifact,
    fallback_scan_evidence: fallback.scan,
  };
}

type QrSearchSettings = { version: number; ecc: ImageFitEcc; mask: number };

function settingsCandidatesForMode(request: ImageFitQrRequestV1, mode: ImageFitMode): QrSearchSettings[] {
  const versions = [...request.constraints.allowed_versions].sort((a, b) => a - b);
  const preferredVersion = mode === 'readable' ? versions[0] : mode === 'balanced'
    ? versions[Math.floor((versions.length - 1) / 2)] : versions[versions.length - 1];
  const preferredEcc: ImageFitEcc = request.constraints.allowed_ecc.includes(mode === 'readable' ? 'H' : 'Q')
    ? (mode === 'readable' ? 'H' : 'Q') : request.constraints.allowed_ecc[0];
  const preferredMask = request.constraints.allowed_masks.includes(mode === 'readable' ? 3 : mode === 'balanced' ? 1 : 0)
    ? (mode === 'readable' ? 3 : mode === 'balanced' ? 1 : 0) : request.constraints.allowed_masks[0];
  const orderedVersions = [preferredVersion, ...versions.filter((value) => value !== preferredVersion)];
  const orderedEcc = [preferredEcc, ...request.constraints.allowed_ecc.filter((value) => value !== preferredEcc)];
  const masks = [...request.constraints.allowed_masks].sort((a, b) => a - b);
  const orderedMasks = [preferredMask, ...masks.filter((value) => value !== preferredMask)];
  const result: QrSearchSettings[] = [];
  for (const version of orderedVersions) for (const ecc of orderedEcc) for (const mask of orderedMasks) {
    result.push({ version, ecc, mask });
  }
  return result;
}

function targetMap(input: ImageFitOptimizerInput, size: number): boolean[][] {
  const result = Array.from({ length: size }, () => Array<boolean>(size).fill(false));
  const source = input.target_luma;
  for (let y = 0; y < size; y += 1) for (let x = 0; x < size; x += 1) {
    const sx = Math.min(source.width - 1, Math.floor((x + 0.5) * source.width / size));
    const sy = Math.min(source.height - 1, Math.floor((y + 0.5) * source.height / size));
    result[y][x] = source.values[sy * source.width + sx] < 160;
  }
  return result;
}

function renderImageFitSvg(matrix: QrMatrix, target: boolean[][], mode: ImageFitMode): {
  svg: string; width: number; modifiedModules: number; recognitionScore: number;
  protectedConflictScore: number; protectedViolations: string[];
} {
  const moduleSize = 8;
  const margin = 4;
  const width = (matrix.size + margin * 2) * moduleSize;
  const offset = margin * moduleSize;
  let svg = `<?xml version="1.0" encoding="UTF-8"?><svg xmlns="http://www.w3.org/2000/svg" width="${width}" height="${width}" viewBox="0 0 ${width} ${width}"><rect width="${width}" height="${width}" fill="#ffffff"/>`;
  let modifiedModules = 0;
  let targetCount = 0;
  let representedTargetCount = 0;
  let protectedTargetCount = 0;
  const protectedViolations: string[] = [];
  for (let y = 0; y < matrix.size; y += 1) for (let x = 0; x < matrix.size; x += 1) {
    const active = matrix.modules[y][x] === 1;
    const targetCell = target[y]?.[x] === true;
    const protectedCell = isProtectedFunctionalModule(matrix.functionalRegions, x, y);
    if (targetCell) targetCount += 1;
    if (targetCell && protectedCell) protectedTargetCount += 1;
    let fill = active ? '#000000' : '#ffffff';
    if (targetCell && !protectedCell) {
      const next = treatmentColor(mode, active);
      if (next !== fill) modifiedModules += 1;
      fill = next;
      if (mode !== 'readable' || !active) representedTargetCount += 1;
    }
    if (protectedCell && fill !== (active ? '#000000' : '#ffffff')) protectedViolations.push(`${x},${y}`);
    if (active || fill !== '#ffffff') {
      svg += `<rect x="${offset + x * moduleSize}" y="${offset + y * moduleSize}" width="${moduleSize}" height="${moduleSize}" fill="${fill}"/>`;
    }
  }
  svg += '</svg>';
  return {
    svg, width, modifiedModules,
    recognitionScore: targetCount === 0 ? 0 : round(representedTargetCount / targetCount, 6),
    protectedConflictScore: targetCount === 0 ? 0 : round(protectedTargetCount / targetCount, 6),
    protectedViolations,
  };
}

function treatmentColor(mode: ImageFitMode, active: boolean): string {
  if (mode === 'readable') return active ? '#000000' : '#eef2f6';
  if (mode === 'balanced') return active ? '#193b5a' : '#e3edf5';
  return active ? '#0b2948' : '#d9e8f4';
}

function treatmentForMode(mode: ImageFitMode): ImageFitCandidateV1['image_treatment']['kind'] {
  if (mode === 'readable') return 'background_silhouette';
  if (mode === 'balanced') return 'module_recolor';
  return 'central_logo_pixel';
}

function validationCandidate(
  artifact: ImageFitArtifact, width: number,
  settings: { version: number; ecc: ImageFitEcc; mask: number }, mode: ImageFitMode,
): Candidate {
  return {
    candidateId: `validation-${mode}`,
    matrixRef: `qr:${settings.version}:${settings.mask}`,
    rendered: { format: 'svg', data: artifact.data, width, height: width },
    scanResults: [], exportAllowed: false, artisticScore: 0,
  };
}

function mapScanEvidence(validation: ScanValidationResult): ImageFitCandidateV1['scan_evidence'] {
  return {
    verdict: validation.pass ? 'pass' : 'fail',
    decoder_suite_version: validation.thresholdVersion,
    checks_passed: validation.tests.filter((test) => test.pass).length,
    checks_total: validation.tests.length,
    decoders: [{ name: validation.decoder, version: validation.version, pass: validation.pass }],
    physical_scan: 'not_performed', print_scan: 'not_performed', disclaimer: DISCLAIMER,
  };
}

function exportBlockers(
  input: ImageFitOptimizerInput,
  mode: ImageFitMode,
  scanPass: boolean,
  protectedViolations: readonly string[],
): string[] {
  const blockers: string[] = [];
  if (input.request.destination.safety.verdict !== 'pass') blockers.push('destination_safety_failed');
  if (!scanPass) blockers.push('automated_decoder_threshold_failed');
  if (protectedViolations.length > 0) blockers.push('protected_region_violation');
  if (!input.request.entitlement_context.export_entitled) blockers.push('preview_not_paid');
  if (input.request.user_controls.link_mode === 'optimized_short_link' && input.short_link?.state !== 'committed') {
    blockers.push('short_link_not_committed');
  }
  if (mode === 'image_first') blockers.push('image_first_experimental');
  return blockers;
}

function buildFallback(
  input: ImageFitOptimizerInput,
  validate: (candidate: Candidate, expectedPayload: string) => ScanValidationResult,
): { artifact: ImageFitArtifact; scan: ImageFitCandidateV1['scan_evidence'] } {
  const version = [...input.request.constraints.allowed_versions].sort((a, b) => a - b)[0];
  const ecc: ErrorCorrectionLevel = input.request.constraints.allowed_ecc.includes('H') ? 'H' : input.request.constraints.allowed_ecc[0];
  const mask = input.request.constraints.allowed_masks[0];
  const matrix = generateMatrix({
    canonical: input.encoded_payload, mode: 'url', byteLength: Buffer.byteLength(input.encoded_payload),
    version, errorCorrectionLevel: ecc, maskPattern: mask,
  });
  const rendered = renderDeterministic(matrix, {
    format: 'svg', moduleSize: 8, margin: 4, colorDark: '#111827', colorLight: '#ffffff', shape: 'square',
  });
  const artifact = makeArtifact('fallback', rendered.data);
  artifact.uri = `artifact://image-fit/fallback-${artifact.sha256.slice(0, 16)}.svg`;
  const candidate: Candidate = {
    candidateId: 'level1-fallback-validation', matrixRef: `qr:${version}:${mask}`,
    rendered: { format: 'svg', data: rendered.data, width: rendered.width, height: rendered.height },
    scanResults: [], exportAllowed: false, artisticScore: 0,
  };
  return { artifact, scan: mapScanEvidence(validate(candidate, input.encoded_payload)) };
}

function makeArtifact(label: string, data: string): ImageFitArtifact {
  const digest = sha256(data);
  return {
    kind: 'export_svg', uri: `artifact://image-fit/${label}-${digest.slice(0, 16)}.svg`,
    sha256: digest, media_type: 'image/svg+xml', data,
  };
}

function stableId(
  input: ImageFitOptimizerInput, mode: ImageFitMode,
  settings: { version: number; ecc: ImageFitEcc; mask: number }, artifactHash: string,
): string {
  return `${mode.replace('_', '-')}-${sha256(JSON.stringify({
    request: input.request.request_id, payload: sha256(input.encoded_payload), mode, settings, artifactHash,
  })).slice(0, 20)}`;
}

function redactPayload(payload: string): string {
  if (payload.length <= 96) return payload;
  return `${payload.slice(0, 93)}...`;
}

function validateInput(input: ImageFitOptimizerInput): void {
  if (input.schema_version !== 'image-fit-qr-api.v1') throw new Error('Unsupported Image-Fit schema version');
  if (!input.encoded_payload.startsWith('https://') && !input.encoded_payload.startsWith('http://')) {
    throw new Error('Image-Fit encoded payload must be an HTTP(S) URL');
  }
  const constraints = input.request.constraints;
  if (!Number.isInteger(constraints.max_candidates) || constraints.max_candidates < 1 || constraints.max_candidates > 12) {
    throw new Error('max_candidates must be from 1 to 12');
  }
  if (!Number.isInteger(constraints.max_search_ms) || constraints.max_search_ms < 1000 || constraints.max_search_ms > 60000) {
    throw new Error('max_search_ms must be from 1000 to 60000');
  }
  if (constraints.allowed_versions.length === 0 || constraints.allowed_versions.some((v) => !Number.isInteger(v) || v < 1 || v > 40)) {
    throw new Error('allowed_versions must contain QR versions 1..40');
  }
  if (constraints.allowed_masks.length === 0 || constraints.allowed_masks.some((v) => !Number.isInteger(v) || v < 0 || v > 7)) {
    throw new Error('allowed_masks must contain masks 0..7');
  }
  if (constraints.allowed_ecc.length === 0 || constraints.allowed_ecc.some((v) => v !== 'Q' && v !== 'H')) {
    throw new Error('allowed_ecc must contain Q or H');
  }
  if (input.request.user_controls.link_mode === 'optimized_short_link') {
    if (!input.short_link || input.encoded_payload !== `https://placeholder-online.com${input.short_link.route}`) {
      throw new Error('Optimized short-link payload must exactly match the supplied route');
    }
  } else if (input.encoded_payload !== input.request.destination.normalized_url) {
    throw new Error('Original-url payload must exactly match destination.normalized_url');
  }
  const target = input.target_luma;
  if (!target || !Number.isInteger(target.width) || !Number.isInteger(target.height)
    || target.width < 1 || target.height < 1 || target.width > 4096 || target.height > 4096
    || target.width * target.height > 16_777_216
    || target.values.length !== target.width * target.height
    || target.values.some((value) => !Number.isFinite(value) || value < 0 || value > 255)) {
    throw new Error('target_luma dimensions and values are invalid');
  }
  if (!/^[a-f0-9]{64}$/.test(target.source_image_sha256)
    || target.source_image_sha256 !== input.request.target_image.sha256) {
    throw new Error('target_luma source hash must match request.target_image.sha256');
  }
}

function sha256(value: string): string {
  return createHash('sha256').update(value, 'utf8').digest('hex');
}

function round(value: number, places: number): number {
  const factor = 10 ** places;
  return Math.round(value * factor) / factor;
}
