import { createHash } from 'node:crypto';
import { PNG } from 'pngjs';
import {
  generateMatrix,
  isProtectedFunctionalModule,
  renderDeterministic,
  type NormalizedPayload,
  type QrMatrix,
} from '@qr/qr-core';
import type { Candidate, ScanValidationResult } from './types.js';
import { runValidation } from './validation.js';

export type ImageFitMode = 'readable' | 'balanced' | 'image_first';
export type ImageEmbeddingStyle = 'clean_logo_fit' | 'embedded_image_fit';
export type ImageFitLogoSize = 'small' | 'medium' | 'large';
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
    /** Customer-facing design choice: crisp logo preservation vs visibly embedded QR/art blending. */
    image_embedding_style?: ImageEmbeddingStyle;
    logo_size?: ImageFitLogoSize;
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
  /** Optional internal RGB plane used by the deterministic Q8 visual-island renderer. */
  target_rgb?: {
    width: number;
    height: number;
    /** RGB triplets, 0..255, row-major. This is an engine-boundary representation, not a public contract field. */
    values: readonly number[];
    source_image_sha256: string;
  };
}

export interface ImageFitArtifact {
  kind: 'preview_png' | 'export_png' | 'export_svg' | 'metadata_json';
  uri: string;
  sha256: string;
  media_type: 'image/svg+xml' | 'image/png';
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
    logo_size?: ImageFitLogoSize; logo_size_fraction?: number;
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
  /**
   * When true, use the legacy naive per-module target recolor (luma threshold 160).
   * Used for A/B evidence generation only.
   */
  _legacyNaiveRender?: boolean;
  /** Evidence switch for exact Q1/Q2/Q3 preprocessing comparisons. */
  _compositionPolicy?: 'q1' | 'q2' | 'q3';
  /** Evidence switch for exact Q3 first-pass versus Q7 ranked selection comparisons. */
  _selectionPolicy?: 'q3_first_pass' | 'q7_ranked';
  /** Evidence-gated deterministic foreground-island families. Public contracts remain unchanged. */
  _visualPolicy?: 'q7_module_recolor' | 'q8_protected_island' | 'q8_negative_space_island' | 'q9_negative_space_showcase' | 'q10_raster_image_layer' | 'q11_clean_logo_fit';
}

const MODE_ORDER: readonly ImageFitMode[] = ['readable', 'balanced', 'image_first'];
const LOGO_SIZE_ORDER: readonly ImageFitLogoSize[] = ['small', 'medium', 'large'];
const LOGO_SIZE_FRACTION: Record<ImageFitLogoSize, number> = { small: 0.40, medium: 0.50, large: 0.60 };
const LOGO_SIZE_ATTEMPTS: Record<ImageFitLogoSize, readonly number[]> = {
  small: [0.40, 0.38, 0.36],
  medium: [0.50, 0.48, 0.46],
  large: [0.60, 0.58, 0.56],
};
const MAX_VISUAL_CHALLENGERS_PER_MODE = 2;
const DISCLAIMER = 'Controlled decoder checks are not a universal scan guarantee. No physical-device or print scan was performed.';

/** Deterministic production-shaped Level 2 optimizer. It never mutates matrix bits. */
export function optimizeImageFitQr(
  input: ImageFitOptimizerInput,
  options: ImageFitOptimizerOptions = {},
): ImageFitOptimizationResult {
  validateInput(input);
  const validate = options.validationRunner ?? runValidation;
  const compositionPolicy = options._compositionPolicy ?? 'q3';
  const selectionPolicy = options._selectionPolicy ?? 'q7_ranked';
  const visualPolicy = options._visualPolicy ?? defaultVisualPolicy(input);
  const started = performance.now();
  const artifacts: Record<string, ImageFitArtifact> = {};
  const candidates: ImageFitCandidateV1[] = [];
  const sizeCandidateFlow = (visualPolicy === 'q9_negative_space_showcase' || visualPolicy === 'q10_raster_image_layer' || visualPolicy === 'q11_clean_logo_fit') && Boolean(input.target_rgb);
  const candidateSpecs = sizeCandidateFlow
    ? LOGO_SIZE_ORDER.flatMap((logoSize) => LOGO_SIZE_ATTEMPTS[logoSize].map((logoSizeFraction) => ({ mode: 'balanced' as const, logoSize, logoSizeFraction })))
    : MODE_ORDER.slice(0, Math.min(input.request.constraints.max_candidates, MODE_ORDER.length))
      .map((mode) => ({ mode, logoSize: input.request.user_controls.logo_size ?? 'medium', logoSizeFraction: LOGO_SIZE_FRACTION[input.request.user_controls.logo_size ?? 'medium'] }));

  for (const { mode, logoSize, logoSizeFraction } of candidateSpecs) {
    if (sizeCandidateFlow && candidates.some((candidate) => candidate.image_treatment.logo_size === logoSize)) continue;
    type Evaluated = {
      settings: QrSearchSettings;
      matrix: QrMatrix;
      rendered: RenderedImageFit;
      artifact: ImageFitArtifact;
      validation: ScanValidationResult;
      preference: number;
    };
    let selected: Evaluated | undefined;
    const renderedSettings: Array<Omit<Evaluated, 'validation'>> = [];
    const q8Island = visualPolicy === 'q8_protected_island' || visualPolicy === 'q8_negative_space_island' || visualPolicy === 'q9_negative_space_showcase' || visualPolicy === 'q10_raster_image_layer' || visualPolicy === 'q11_clean_logo_fit';
    const settingsCandidates = settingsCandidatesForMode(input.request, mode, q8Island);
    for (let preference = 0; preference < settingsCandidates.length; preference++) {
      if (performance.now() - started > input.request.constraints.max_search_ms) break;
      const settings = settingsCandidates[preference];
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
      const useLegacy = options._legacyNaiveRender === true;
      const preprocessed = preprocessTarget(input, matrix, mode, compositionPolicy);
      const rendered = q8Island && input.target_rgb
        ? visualPolicy === 'q10_raster_image_layer' || visualPolicy === 'q11_clean_logo_fit'
          ? renderRasterImageLayerPng(matrix, input.target_rgb, mode, input.request.target_image.complexity, logoSize, logoSizeFraction, visualPolicy === 'q11_clean_logo_fit')
          : renderProtectedVisualIslandSvg(matrix, input.target_rgb, mode, visualPolicy === 'q8_negative_space_island' || visualPolicy === 'q9_negative_space_showcase', visualPolicy, input.request.target_image.complexity, logoSize, logoSizeFraction)
        : renderImageFitSvg(matrix, preprocessed.mask, mode, { useLegacy, edgeScore: preprocessed.edgeScore, componentCount: preprocessed.componentCount });
      const artifact = makeArtifact(sizeCandidateFlow ? `${logoSize}-${Math.round(logoSizeFraction * 100)}-${mode}` : mode, rendered.data, rendered.format === 'png-dataurl' ? 'export_png' : 'export_svg');
      renderedSettings.push({ settings, matrix, rendered, artifact, preference });
      if (selectionPolicy === 'q3_first_pass') {
        const validation = validate(validationCandidate(artifact, rendered.width, settings, mode), input.encoded_payload);
        selected = { settings, matrix, rendered, artifact, validation, preference };
        if (validation.pass) break;
      }
    }
    if (selectionPolicy === 'q7_ranked' && renderedSettings.length > 0) {
      const evaluated = new Set<number>();
      // Preserve Q3's safety floor: walk deterministic preference order until the first
      // scan-passing candidate is found. Q7 may improve on that anchor but never replace
      // it with a visually stronger failure.
      for (const entry of renderedSettings) {
        if (selected?.validation.pass) break;
        if (performance.now() - started > input.request.constraints.max_search_ms) break;
        const validation = validate(validationCandidate(entry.artifact, entry.rendered.width, entry.settings, mode), input.encoded_payload);
        evaluated.add(entry.preference);
        const candidate = { ...entry, validation };
        if (!selected || compareEvaluated(candidate, selected) > 0) selected = candidate;
      }

      // Challenge the safety anchor with at most two composition-aware alternatives.
      // Scan verdict/check count remain the leading comparator dimensions.
      const visualOrder = [...renderedSettings].sort((a, b) =>
        b.rendered.recognitionScore - a.rendered.recognitionScore
        || a.rendered.protectedConflictScore - b.rendered.protectedConflictScore
        || a.preference - b.preference,
      );
      let challengers = 0;
      for (const entry of visualOrder) {
        if (challengers >= MAX_VISUAL_CHALLENGERS_PER_MODE) break;
        if (evaluated.has(entry.preference)) continue;
        if (performance.now() - started > input.request.constraints.max_search_ms) break;
        const validation = validate(validationCandidate(entry.artifact, entry.rendered.width, entry.settings, mode), input.encoded_payload);
        const candidate = { ...entry, validation };
        if (!selected || compareEvaluated(candidate, selected) > 0) selected = candidate;
        challengers += 1;
      }
    }
    if (!selected) continue;
    const { settings, matrix, rendered, artifact, validation } = selected;
    if (sizeCandidateFlow && (!validation.pass || rendered.protectedViolations.length > 0)) continue;
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
        logo_size: sizeCandidateFlow ? logoSize : input.request.user_controls.logo_size ?? 'medium',
        logo_size_fraction: logoSizeFraction,
        modified_modules: rendered.modifiedModules,
        modified_fraction: round(rendered.modifiedModules / (matrix.size * matrix.size), 6),
        luminance_policy_version: q8Island && input.target_rgb
          ? visualPolicy === 'q11_clean_logo_fit'
            ? 'clean-logo-fit-q11-preserve-subject'
            : visualPolicy === 'q10_raster_image_layer'
              ? 'image-fit-raster-image-layer-q10-continuous'
              : visualPolicy === 'q9_negative_space_showcase'
                ? 'image-fit-negative-space-showcase-q9-target-aware-centering'
                : visualPolicy === 'q8_negative_space_island'
                  ? 'image-fit-negative-space-island-q8-cycle2'
                  : 'image-fit-protected-rgb-island-q8-cycle1'
          : compositionPolicy === 'q3'
          ? 'image-fit-real-target-foreground-q3'
          : 'image-fit-composition-q2-morphology-v1',
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
        score_version: q8Island && input.target_rgb
          ? visualPolicy === 'q11_clean_logo_fit'
            ? 'clean-logo-fit-q11-preserve-subject'
            : visualPolicy === 'q10_raster_image_layer'
              ? 'image-fit-raster-image-layer-q10-continuous'
              : visualPolicy === 'q9_negative_space_showcase'
                ? 'image-fit-negative-space-showcase-q9-target-aware-centering'
                : visualPolicy === 'q8_negative_space_island'
                  ? 'image-fit-negative-space-island-q8-cycle2'
                  : 'image-fit-protected-rgb-island-q8-cycle1'
          : compositionPolicy === 'q3'
          ? selectionPolicy === 'q7_ranked' ? 'image-fit-scan-first-appearance-q7' : 'image-fit-real-target-coverage-q3'
          : 'image-fit-composition-coverage-q2',
        recognition_score: rendered.recognitionScore,
        protected_zone_conflict_score: rendered.protectedConflictScore,
      },
      export_authority: {
        export_allowed: blockers.length === 0,
        blockers,
        requires_payment_or_internal_entitlement: true,
        preview_export_parity: 'not_proven',
      },
      artifacts: [{ kind: artifact.kind, uri: artifactDataUri(artifact), sha256: artifact.sha256 }],
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

function compareEvaluated(
  left: { validation: ScanValidationResult; rendered: { recognitionScore: number; protectedConflictScore: number }; preference: number },
  right: { validation: ScanValidationResult; rendered: { recognitionScore: number; protectedConflictScore: number }; preference: number },
): number {
  const tuple = (entry: typeof left): number[] => [
    entry.validation.pass ? 1 : 0,
    entry.validation.tests.filter((test) => test.pass).length,
    entry.validation.tests.find((test) => test.name === 'decode_raw')?.pass ? 1 : 0,
    entry.rendered.recognitionScore,
    -entry.rendered.protectedConflictScore,
    -entry.preference,
  ];
  const a = tuple(left), b = tuple(right);
  for (let index = 0; index < a.length; index++) if (a[index] !== b[index]) return a[index] - b[index];
  return 0;
}

function defaultVisualPolicy(input: ImageFitOptimizerInput): NonNullable<ImageFitOptimizerOptions['_visualPolicy']> {
  if (!input.target_rgb) return 'q7_module_recolor';
  return input.request.user_controls.image_embedding_style === 'embedded_image_fit'
    ? 'q10_raster_image_layer'
    : 'q11_clean_logo_fit';
}

function settingsCandidatesForMode(request: ImageFitQrRequestV1, mode: ImageFitMode, q8ProtectedIsland = false): QrSearchSettings[] {
  const versions = [...request.constraints.allowed_versions].sort((a, b) => a - b);
  const preferredVersion = q8ProtectedIsland ? versions[0] : mode === 'readable' ? versions[0] : mode === 'balanced'
    ? versions[Math.floor((versions.length - 1) / 2)] : versions[versions.length - 1];
  const desiredEcc: ImageFitEcc = q8ProtectedIsland ? 'H' : mode === 'readable' ? 'H' : 'Q';
  const preferredEcc: ImageFitEcc = request.constraints.allowed_ecc.includes(desiredEcc)
    ? desiredEcc : request.constraints.allowed_ecc[0];
  const desiredMask = mode === 'readable' ? 3 : mode === 'balanced' ? 1 : q8ProtectedIsland ? 5 : 0;
  const preferredMask = request.constraints.allowed_masks.includes(desiredMask)
    ? desiredMask : request.constraints.allowed_masks[0];
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

/* ================================================================
   Image preprocessing pipeline: square crop → edge/saliency mask
   → connected-component filtering → protected-region exclusion
   ================================================================ */

export interface PreprocessedTarget {
  mask: boolean[][];
  edgeScore: number;
  componentCount: number;
}

interface LumaPlane {
  width: number;
  height: number;
  values: readonly number[];
}

/** Deterministically crops margins and detached captions while retaining dominant central marks. */
export function foregroundAwareCrop(source: LumaPlane): LumaPlane {
  if (source.width < 8 || source.height < 8) return source;
  const border: number[] = [];
  for (let x = 0; x < source.width; x++) border.push(source.values[x], source.values[(source.height - 1) * source.width + x]);
  for (let y = 1; y < source.height - 1; y++) border.push(source.values[y * source.width], source.values[y * source.width + source.width - 1]);
  border.sort((a, b) => a - b);
  const background = border[Math.floor(border.length / 2)] ?? 255;
  const deviations = border.map((value) => Math.abs(value - background)).sort((a, b) => a - b);
  const noise = deviations[Math.floor(deviations.length * 0.6)] ?? 0;
  const threshold = Math.max(24, noise * 2.5);
  const foreground = new Uint8Array(source.width * source.height);
  for (let i = 0; i < foreground.length; i++) if (Math.abs(source.values[i] - background) >= threshold) foreground[i] = 1;

  type Component = { minX: number; minY: number; maxX: number; maxY: number; area: number; score: number };
  const visited = new Uint8Array(foreground.length);
  let components: Component[] = [];
  const centerX = (source.width - 1) / 2, centerY = (source.height - 1) / 2;
  const diagonal = Math.hypot(source.width, source.height);
  for (let y = 0; y < source.height; y++) for (let x = 0; x < source.width; x++) {
    const start = y * source.width + x;
    if (!foreground[start] || visited[start]) continue;
    const stack = [start]; visited[start] = 1;
    let minX = x, minY = y, maxX = x, maxY = y, area = 0;
    while (stack.length > 0) {
      const index = stack.pop()!; area++;
      const px = index % source.width, py = Math.floor(index / source.width);
      minX = Math.min(minX, px); minY = Math.min(minY, py); maxX = Math.max(maxX, px); maxY = Math.max(maxY, py);
      for (let dy = -1; dy <= 1; dy++) for (let dx = -1; dx <= 1; dx++) {
        if (dx === 0 && dy === 0) continue;
        const nx = px + dx, ny = py + dy;
        if (nx < 0 || ny < 0 || nx >= source.width || ny >= source.height) continue;
        const next = ny * source.width + nx;
        if (foreground[next] && !visited[next]) { visited[next] = 1; stack.push(next); }
      }
    }
    const touchesBorder = minX === 0 || minY === 0 || maxX === source.width - 1 || maxY === source.height - 1;
    if ((touchesBorder && (maxX - minX + 1) / source.width > 0.60) || area < Math.max(6, source.width * source.height * 0.00008)) continue;
    const cx = (minX + maxX) / 2, cy = (minY + maxY) / 2;
    const centrality = 1 - Math.min(1, Math.hypot(cx - centerX, cy - centerY) / (diagonal * 0.55));
    components.push({ minX, minY, maxX, maxY, area, score: area * (0.55 + 0.45 * centrality) });
  }
  if (components.length === 0) return source;

  // Merge pieces separated only by narrow design cuts (faceted marks, outlined animals) before
  // ranking. Caption glyphs usually remain farther apart and therefore do not outrank the mark.
  const mergeGap = Math.max(1, Math.round(Math.min(source.width, source.height) * 0.015));
  const parent = components.map((_, index) => index);
  const root = (index: number): number => parent[index] === index ? index : (parent[index] = root(parent[index]));
  const unite = (a: number, b: number): void => { const ra = root(a), rb = root(b); if (ra !== rb) parent[rb] = ra; };
  for (let a = 0; a < components.length; a++) for (let b = a + 1; b < components.length; b++) {
    const left = components[a], right = components[b];
    const gapX = Math.max(0, left.minX - right.maxX - 1, right.minX - left.maxX - 1);
    const gapY = Math.max(0, left.minY - right.maxY - 1, right.minY - left.maxY - 1);
    if (gapX <= mergeGap && gapY <= mergeGap) unite(a, b);
  }
  const clusters = new Map<number, Component>();
  for (let index = 0; index < components.length; index++) {
    const component = components[index], key = root(index), existing = clusters.get(key);
    if (!existing) clusters.set(key, { ...component });
    else {
      existing.minX = Math.min(existing.minX, component.minX); existing.minY = Math.min(existing.minY, component.minY);
      existing.maxX = Math.max(existing.maxX, component.maxX); existing.maxY = Math.max(existing.maxY, component.maxY);
      existing.area += component.area;
    }
  }
  components = [...clusters.values()].map((component) => {
    const cx = (component.minX + component.maxX) / 2, cy = (component.minY + component.maxY) / 2;
    const centrality = 1 - Math.min(1, Math.hypot(cx - centerX, cy - centerY) / (diagonal * 0.55));
    return { ...component, score: component.area * (0.55 + 0.45 * centrality) };
  });
  components.sort((a, b) => b.score - a.score || a.minY - b.minY || a.minX - b.minX);
  const best = components[0].score;
  // Detached caption glyphs are typically individually much smaller than the primary mark.
  // Keep a bounded set of material components so intentional satellites (for example a heart)
  // survive while slogan/caption noise does not determine the crop.
  const selected = components.filter((component, index) => index < 8 && component.score >= best * 0.10);
  let minX = source.width - 1, minY = source.height - 1, maxX = 0, maxY = 0;
  for (const component of selected) {
    minX = Math.min(minX, component.minX); minY = Math.min(minY, component.minY);
    maxX = Math.max(maxX, component.maxX); maxY = Math.max(maxY, component.maxY);
  }
  // Deliberate breathing room keeps the mark away from finder/timing regions after square fit.
  const span = Math.max(maxX - minX + 1, maxY - minY + 1), padding = Math.max(3, Math.round(span * 0.30));
  minX = Math.max(0, minX - padding); minY = Math.max(0, minY - padding);
  maxX = Math.min(source.width - 1, maxX + padding); maxY = Math.min(source.height - 1, maxY + padding);
  const width = maxX - minX + 1, height = maxY - minY + 1;
  const values = new Array<number>(width * height);
  for (let y = 0; y < height; y++) for (let x = 0; x < width; x++) {
    const sourceX = minX + x, sourceY = minY + y;
    const insideSelected = selected.some((component) => sourceX >= component.minX && sourceX <= component.maxX && sourceY >= component.minY && sourceY <= component.maxY);
    const value = source.values[sourceY * source.width + sourceX];
    // Normalize uniform source backgrounds to white and erase rejected caption/watermark components.
    values[y * width + x] = insideSelected && Math.abs(value - background) >= threshold ? value : 255;
  }
  return { width, height, values };
}

/**
 * Produce a square-cropped, edge/saliency-aware target mask aligned to QR modules.
 * When a matrix is supplied, protected regions are excluded during preprocessing as well as rendering,
 * so morphology cannot spend the artistic module budget inside functional regions.
 */
export function preprocessTarget(
  input: ImageFitOptimizerInput,
  matrixOrSize: QrMatrix | number,
  mode: ImageFitMode,
  compositionPolicy: 'q1' | 'q2' | 'q3' = 'q3',
): PreprocessedTarget {
  const matrixSize = typeof matrixOrSize === 'number' ? matrixOrSize : matrixOrSize.size;
  const drawableMask = Array.from({ length: matrixSize }, (_, y) =>
    Array.from({ length: matrixSize }, (_, x) =>
      typeof matrixOrSize === 'number' || !isProtectedFunctionalModule(matrixOrSize.functionalRegions, x, y),
    ),
  );
  const source = compositionPolicy === 'q3' ? foregroundAwareCrop(input.target_luma) : input.target_luma;
  const scale = 2;

  // 1. Square crop / center pad with white
  const squareDim = Math.max(source.width, source.height);
  const lumaSquare = new Float32Array(squareDim * squareDim);
  lumaSquare.fill(255);
  const offX = Math.floor((squareDim - source.width) / 2);
  const offY = Math.floor((squareDim - source.height) / 2);
  for (let y = 0; y < source.height; y++) {
    for (let x = 0; x < source.width; x++) {
      lumaSquare[(y + offY) * squareDim + (x + offX)] = source.values[y * source.width + x];
    }
  }

  // 2. Resize to (matrixSize * scale) for anti-aliased edge work
  const scaledSize = matrixSize * scale;
  const scaled = new Float32Array(scaledSize * scaledSize);
  for (let y = 0; y < scaledSize; y++) {
    for (let x = 0; x < scaledSize; x++) {
      const sx = Math.min(squareDim - 1, Math.floor(x * squareDim / scaledSize));
      const sy = Math.min(squareDim - 1, Math.floor(y * squareDim / scaledSize));
      scaled[y * scaledSize + x] = lumaSquare[sy * squareDim + sx];
    }
  }

  // 3. Edge magnitude (Sobel-like) + local contrast + dark-region coherence
  const edgeMag = new Float32Array(scaledSize * scaledSize);
  const localContrast = new Float32Array(scaledSize * scaledSize);
  const darkCoherence = new Float32Array(scaledSize * scaledSize);
  let maxEdge = 0;
  let maxContrast = 0;
  let maxDC = 0;
  for (let y = 1; y < scaledSize - 1; y++) {
    for (let x = 1; x < scaledSize - 1; x++) {
      const i = y * scaledSize + x;
      const dx = (scaled[i + 1] - scaled[i - 1]) / 2;
      const dy = (scaled[i + scaledSize] - scaled[i - scaledSize]) / 2;
      const mag = Math.sqrt(dx * dx + dy * dy);
      edgeMag[i] = mag;
      if (mag > maxEdge) maxEdge = mag;

      // local contrast (range)
      let minV = 255, maxV = 0;
      for (let dy2 = -1; dy2 <= 1; dy2++) {
        for (let dx2 = -1; dx2 <= 1; dx2++) {
          const v = scaled[i + dy2 * scaledSize + dx2];
          if (v < minV) minV = v;
          if (v > maxV) maxV = v;
        }
      }
      const c = maxV - minV;
      localContrast[i] = c;
      if (c > maxContrast) maxContrast = c;

      // dark-region coherence: high for dark, flat interiors (spots, solid shapes)
      const invNorm = (255 - scaled[i]) / 255;        // 1 = black, 0 = white
      const flatness = 1 - Math.min(c / 128, 1);       // 1 = flat, 0 = high contrast
      const dc = invNorm * flatness;
      darkCoherence[i] = dc;
      if (dc > maxDC) maxDC = dc;
    }
  }

  // 4. Saliency = weighted blend (edge + contrast + dark coherence)
  const saliency = new Float32Array(scaledSize * scaledSize);
  for (let i = 0; i < saliency.length; i++) {
    const e = maxEdge > 0 ? edgeMag[i] / maxEdge : 0;
    const c = maxContrast > 0 ? localContrast[i] / maxContrast : 0;
    const dc = maxDC > 0 ? darkCoherence[i] / maxDC : 0;
    saliency[i] = e * 0.35 + c * 0.15 + dc * 0.50;
  }

  // 5. Adaptive percentile threshold per mode (fraction of modules that become mask)
  const targetFraction = mode === 'readable' ? 0.13 : mode === 'balanced' ? 0.24 : 0.40;
  const sorted = Array.from(saliency).filter((v) => v > 0).sort((a, b) => a - b);
  const pixelTargetPercentile = mode === 'readable' ? 0.50 : mode === 'balanced' ? 0.55 : 0.60;
  const threshIdx = Math.max(0, Math.floor(sorted.length * (1 - pixelTargetPercentile)) - 1);
  const threshold = sorted.length > 0 ? sorted[Math.min(threshIdx, sorted.length - 1)] : 0.5;

  // 6. Initial binary mask at subpixel level
  const binaryMask = new Uint8Array(scaledSize * scaledSize);
  for (let i = 0; i < saliency.length; i++) {
    if (saliency[i] >= threshold) binaryMask[i] = 1;
  }

  // 7. 8-connected flood-fill: remove tiny specks (fewer than 4 pixels ≈ 1 module at 2×)
  const visited = new Uint8Array(scaledSize * scaledSize);
  const minComponentSize = 4;
  for (let y = 0; y < scaledSize; y++) {
    for (let x = 0; x < scaledSize; x++) {
      const idx = y * scaledSize + x;
      if (!binaryMask[idx] || visited[idx]) continue;
      const component: Array<{ x: number; y: number }> = [];
      const stack = [{ x, y }];
      visited[idx] = 1;
      while (stack.length > 0) {
        const p = stack.pop()!;
        component.push(p);
        for (let dy = -1; dy <= 1; dy++) {
          for (let dx = -1; dx <= 1; dx++) {
            if (dx === 0 && dy === 0) continue;
            const nx = p.x + dx, ny = p.y + dy;
            if (nx >= 0 && nx < scaledSize && ny >= 0 && ny < scaledSize) {
              const nidx = ny * scaledSize + nx;
              if (binaryMask[nidx] && !visited[nidx]) {
                visited[nidx] = 1;
                stack.push({ x: nx, y: ny });
              }
            }
          }
        }
      }
      if (component.length < minComponentSize) {
        for (const p of component) binaryMask[p.y * scaledSize + p.x] = 0;
      }
    }
  }

  // 8. Downsample to module grid
  const moduleMask: boolean[][] = Array.from({ length: matrixSize }, () => Array(matrixSize).fill(false));
  for (let my = 0; my < matrixSize; my++) {
    for (let mx = 0; mx < matrixSize; mx++) {
      let hasImage = false;
      for (let sy = 0; sy < scale; sy++) {
        for (let sx = 0; sx < scale; sx++) {
          const px = mx * scale + sx;
          const py = my * scale + sy;
          if (binaryMask[py * scaledSize + px]) {
            hasImage = true;
            break;
          }
        }
        if (hasImage) break;
      }
      moduleMask[my][mx] = hasImage && drawableMask[my][mx];
    }
  }

  // 9. Q2 composition repair: bridge single-module breaks, close narrow gaps, and remove isolated fragments.
  // Morphology is constrained again by drawableMask before budget enforcement; render-time functional-region
  // exclusion remains a second independent safety net.
  if (compositionPolicy !== 'q1') {
    const bridged = bridgeSingleModuleGaps(moduleMask);
    const closed = morphologicalClose(bridged, mode === 'image_first' ? 2 : 1);
    const withoutSpecks = removeSmallMaskComponents(closed, mode === 'readable' ? 2 : 4);
    const consolidated = retainDominantMaskComponents(withoutSpecks, mode === 'readable' ? 3 : 5);
    for (let y = 0; y < matrixSize; y++) {
      for (let x = 0; x < matrixSize; x++) moduleMask[y][x] = consolidated[y][x] && drawableMask[y][x];
    }
  }

  // 10. Module-level cap enforcement: if overshooting the target fraction, remove weakest
  // boundary modules first. Interior modules receive a coherence bonus so circles, spots,
  // and solid silhouettes are not shredded into edge-only fragments.
  const currentFraction = moduleMask.flat().filter(Boolean).length / (matrixSize * matrixSize);
  if (currentFraction > targetFraction) {
    // Build module-level scores from saliency
    const moduleScores = Array.from({ length: matrixSize }, (_, my) =>
      Array.from({ length: matrixSize }, (_, mx) => {
        let sum = 0;
        for (let sy = 0; sy < scale; sy++) {
          for (let sx = 0; sx < scale; sx++) {
            const px = mx * scale + sx;
            const py = my * scale + sy;
            sum += saliency[py * scaledSize + px];
          }
        }
        let coherentNeighbors = 0;
        for (let dy = -1; dy <= 1; dy++) for (let dx = -1; dx <= 1; dx++) {
          if (dx === 0 && dy === 0) continue;
          const nx = mx + dx; const ny = my + dy;
          if (nx >= 0 && nx < matrixSize && ny >= 0 && ny < matrixSize && moduleMask[ny][nx]) coherentNeighbors += 1;
        }
        return sum / (scale * scale) + coherentNeighbors * 0.08;
      })
    );
    const maskedModules: Array<{ x: number; y: number; score: number }> = [];
    for (let y = 0; y < matrixSize; y++) {
      for (let x = 0; x < matrixSize; x++) {
        if (moduleMask[y][x]) maskedModules.push({ x, y, score: moduleScores[y][x] });
      }
    }
    maskedModules.sort((a, b) => a.score - b.score);
    const target = Math.floor(matrixSize * matrixSize * targetFraction);
    for (let k = 0; k < maskedModules.length - target; k++) {
      const m = maskedModules[k];
      moduleMask[m.y][m.x] = false;
    }
  }

  // Count connected components at module level (for diagnostics)
  const moduleVisited = Array.from({ length: matrixSize }, () => Array(matrixSize).fill(false));
  let componentCount = 0;
  for (let y = 0; y < matrixSize; y++) {
    for (let x = 0; x < matrixSize; x++) {
      if (!moduleMask[y][x] || moduleVisited[y][x]) continue;
      componentCount++;
      const stack = [{ x, y }];
      moduleVisited[y][x] = true;
      while (stack.length > 0) {
        const p = stack.pop()!;
        for (let dy = -1; dy <= 1; dy++) {
          for (let dx = -1; dx <= 1; dx++) {
            if (dx === 0 && dy === 0) continue;
            const nx = p.x + dx, ny = p.y + dy;
            if (nx >= 0 && nx < matrixSize && ny >= 0 && ny < matrixSize && moduleMask[ny][nx] && !moduleVisited[ny][nx]) {
              moduleVisited[ny][nx] = true;
              stack.push({ x: nx, y: ny });
            }
          }
        }
      }
    }
  }

  return { mask: moduleMask, edgeScore: round(maxEdge, 2), componentCount };
}

function cloneMask(mask: readonly boolean[][]): boolean[][] {
  return mask.map((row) => [...row]);
}

function bridgeSingleModuleGaps(mask: readonly boolean[][]): boolean[][] {
  const height = mask.length; const width = mask[0]?.length ?? 0;
  const result = cloneMask(mask);
  for (let y = 1; y < height - 1; y++) for (let x = 1; x < width - 1; x++) {
    if (mask[y][x]) continue;
    const horizontal = mask[y][x - 1] && mask[y][x + 1];
    const vertical = mask[y - 1][x] && mask[y + 1][x];
    const diagonalA = mask[y - 1][x - 1] && mask[y + 1][x + 1];
    const diagonalB = mask[y - 1][x + 1] && mask[y + 1][x - 1];
    let neighbors = 0;
    for (let dy = -1; dy <= 1; dy++) for (let dx = -1; dx <= 1; dx++) {
      if ((dx !== 0 || dy !== 0) && mask[y + dy][x + dx]) neighbors += 1;
    }
    if (horizontal || vertical || diagonalA || diagonalB || neighbors >= 5) result[y][x] = true;
  }
  return result;
}

function morphologicalClose(mask: readonly boolean[][], iterations: number): boolean[][] {
  let current = cloneMask(mask);
  const height = current.length; const width = current[0]?.length ?? 0;
  for (let iteration = 0; iteration < iterations; iteration++) {
    const dilated = cloneMask(current);
    for (let y = 0; y < height; y++) for (let x = 0; x < width; x++) {
      if (!current[y][x]) continue;
      for (let dy = -1; dy <= 1; dy++) for (let dx = -1; dx <= 1; dx++) {
        const nx = x + dx; const ny = y + dy;
        if (nx >= 0 && nx < width && ny >= 0 && ny < height) dilated[ny][nx] = true;
      }
    }
    const eroded = cloneMask(dilated);
    for (let y = 1; y < height - 1; y++) for (let x = 1; x < width - 1; x++) {
      if (!dilated[y][x]) continue;
      eroded[y][x] = dilated[y - 1][x] && dilated[y + 1][x] && dilated[y][x - 1] && dilated[y][x + 1];
    }
    current = eroded;
  }
  return current;
}

type MaskComponent = Array<{ x: number; y: number }>;

function maskComponents(mask: readonly boolean[][]): MaskComponent[] {
  const height = mask.length; const width = mask[0]?.length ?? 0;
  const visited = Array.from({ length: height }, () => Array(width).fill(false));
  const components: MaskComponent[] = [];
  for (let y = 0; y < height; y++) for (let x = 0; x < width; x++) {
    if (!mask[y][x] || visited[y][x]) continue;
    const component: MaskComponent = [];
    const stack = [{ x, y }]; visited[y][x] = true;
    while (stack.length > 0) {
      const point = stack.pop()!; component.push(point);
      for (let dy = -1; dy <= 1; dy++) for (let dx = -1; dx <= 1; dx++) {
        if (dx === 0 && dy === 0) continue;
        const nx = point.x + dx; const ny = point.y + dy;
        if (nx >= 0 && nx < width && ny >= 0 && ny < height && mask[ny][nx] && !visited[ny][nx]) {
          visited[ny][nx] = true; stack.push({ x: nx, y: ny });
        }
      }
    }
    components.push(component);
  }
  return components;
}

function removeSmallMaskComponents(mask: readonly boolean[][], minimumArea: number): boolean[][] {
  const result = Array.from({ length: mask.length }, () => Array(mask[0]?.length ?? 0).fill(false));
  for (const component of maskComponents(mask)) {
    if (component.length < minimumArea) continue;
    for (const point of component) result[point.y][point.x] = true;
  }
  return result;
}

function retainDominantMaskComponents(mask: readonly boolean[][], maximumComponents: number): boolean[][] {
  const components = maskComponents(mask).sort((a, b) => b.length - a.length).slice(0, maximumComponents);
  const result = Array.from({ length: mask.length }, () => Array(mask[0]?.length ?? 0).fill(false));
  for (const component of components) for (const point of component) result[point.y][point.x] = true;
  return result;
}

/* ================================================================
   Q8 deterministic protected visual island
   ================================================================ */

type RgbPlane = NonNullable<ImageFitOptimizerInput['target_rgb']>;

type RenderedImageFit = {
  data: string; format: 'svg' | 'png-dataurl'; width: number; modifiedModules: number; recognitionScore: number;
  protectedConflictScore: number; protectedViolations: string[];
};

function renderProtectedVisualIslandSvg(
  matrix: QrMatrix,
  target: RgbPlane,
  mode: ImageFitMode,
  preserveNegativeSpace = false,
  visualPolicy: ImageFitOptimizerOptions['_visualPolicy'] = 'q8_negative_space_island',
  targetComplexity: ImageFitQrRequestV1['target_image']['complexity'] = 'medium_logo',
  logoSize: ImageFitLogoSize = 'medium',
  logoSizeFraction = LOGO_SIZE_FRACTION[logoSize],
): RenderedImageFit {
  const moduleSize = 8, margin = 4;
  const base = renderDeterministic(matrix, {
    format: 'svg', moduleSize, margin, colorDark: '#111827', colorLight: '#ffffff', shape: 'square',
  });
  const borderPixels: Array<[number, number, number]> = [];
  const pixel = (x: number, y: number): [number, number, number] => {
    const index = (y * target.width + x) * 3;
    return [target.values[index], target.values[index + 1], target.values[index + 2]];
  };
  for (let x = 0; x < target.width; x++) {
    borderPixels.push(pixel(x, 0), pixel(x, target.height - 1));
  }
  for (let y = 1; y < target.height - 1; y++) {
    borderPixels.push(pixel(0, y), pixel(target.width - 1, y));
  }
  const medianChannel = (channel: number): number => {
    const values = borderPixels.map((entry) => entry[channel]).sort((a, b) => a - b);
    return values[Math.floor(values.length / 2)] ?? 255;
  };
  const background: [number, number, number] = [medianChannel(0), medianChannel(1), medianChannel(2)];
  const distanceFromBackground = (rgb: readonly number[]): number => Math.hypot(
    rgb[0] - background[0], rgb[1] - background[1], rgb[2] - background[2],
  );
  const borderNoise = borderPixels.map(distanceFromBackground).sort((a, b) => a - b);
  const foregroundThreshold = Math.max(30, (borderNoise[Math.floor(borderNoise.length * 0.6)] ?? 0) * 2.5);

  let minX = target.width, minY = target.height, maxX = -1, maxY = -1;
  for (let y = 0; y < target.height; y++) for (let x = 0; x < target.width; x++) {
    if (distanceFromBackground(pixel(x, y)) <= foregroundThreshold) continue;
    minX = Math.min(minX, x); minY = Math.min(minY, y);
    maxX = Math.max(maxX, x); maxY = Math.max(maxY, y);
  }
  if (maxX < minX || maxY < minY) {
    return { data: base.data, format: 'svg', width: base.width, modifiedModules: 0, recognitionScore: 0, protectedConflictScore: 0, protectedViolations: [] };
  }
  const rowExtents = Array.from({ length: target.height }, () => ({ min: target.width, max: -1 }));
  for (let y = minY; y <= maxY; y++) for (let x = minX; x <= maxX; x++) {
    if (distanceFromBackground(pixel(x, y)) <= foregroundThreshold) continue;
    rowExtents[y].min = Math.min(rowExtents[y].min, x);
    rowExtents[y].max = Math.max(rowExtents[y].max, x);
  }

  const cropWidth = maxX - minX + 1, cropHeight = maxY - minY + 1;
  // Q9 distinguishes meaningful logo holes from exterior/background whitespace.
  // A background-like pixel is preserved as negative space only when it is enclosed
  // by foreground within the crop; background connected to the crop edge is treated
  // as outside-logo whitespace and omitted from the overlay.
  const backgroundConnected = new Uint8Array(cropWidth * cropHeight);
  const isForegroundAt = (x: number, y: number): boolean => distanceFromBackground(pixel(x, y)) > foregroundThreshold;
  const markOutside = (x: number, y: number, stack: number[]): void => {
    if (x < minX || x > maxX || y < minY || y > maxY || isForegroundAt(x, y)) return;
    const index = (y - minY) * cropWidth + (x - minX);
    if (backgroundConnected[index]) return;
    backgroundConnected[index] = 1;
    stack.push(index);
  };
  const stack: number[] = [];
  for (let x = minX; x <= maxX; x++) { markOutside(x, minY, stack); markOutside(x, maxY, stack); }
  for (let y = minY + 1; y < maxY; y++) { markOutside(minX, y, stack); markOutside(maxX, y, stack); }
  while (stack.length > 0) {
    const index = stack.pop() ?? 0;
    const x = minX + (index % cropWidth), y = minY + Math.floor(index / cropWidth);
    markOutside(x + 1, y, stack); markOutside(x - 1, y, stack); markOutside(x, y + 1, stack); markOutside(x, y - 1, stack);
  }

  let foregroundCount = 0, foregroundSumX = 0, foregroundSumY = 0;
  for (let y = minY; y <= maxY; y++) for (let x = minX; x <= maxX; x++) {
    if (!isForegroundAt(x, y)) continue;
    foregroundCount += 1;
    foregroundSumX += x - minX + 0.5;
    foregroundSumY += y - minY + 0.5;
  }

  const inner = matrix.size * moduleSize;
  const q9Showcase = visualPolicy === 'q9_negative_space_showcase';
  const fraction = q9Showcase
    ? logoSizeFraction
    : mode === 'readable' ? 0.32 : mode === 'balanced' ? 0.42 : 0.52;
  const drawWidth = Math.round(inner * fraction);
  const drawHeight = Math.max(1, Math.round(drawWidth * cropHeight / cropWidth));
  const centeredX = margin * moduleSize + (inner - drawWidth) / 2;
  const centeredY = margin * moduleSize + (inner - drawHeight) / 2;
  const clamp = (value: number, low: number, high: number): number => Math.max(low, Math.min(high, value));
  const centroidX = foregroundCount > 0 ? foregroundSumX / foregroundCount : cropWidth / 2;
  const centroidY = foregroundCount > 0 ? foregroundSumY / foregroundCount : cropHeight / 2;
  const centroidDrawX = centroidX * drawWidth / cropWidth;
  const centroidDrawY = centroidY * drawHeight / cropHeight;
  const qrCenterX = margin * moduleSize + inner / 2;
  const qrCenterY = margin * moduleSize + inner / 2;
  const centerOnForeground = q9Showcase && targetComplexity !== 'complex_photo_like' && targetComplexity !== 'high_risk_thin_detail';
  const offsetX = centerOnForeground
    ? clamp(qrCenterX - centroidDrawX, margin * moduleSize, margin * moduleSize + inner - drawWidth)
    : centeredX;
  // Q9 centers simple/logo foregrounds, but preserves the proven scan-safer placement for complex/texture targets.
  const offsetY = centerOnForeground
    ? clamp(qrCenterY - centroidDrawY, margin * moduleSize, margin * moduleSize + inner - drawHeight)
    : centeredY - (matrix.version >= 7 ? drawHeight * 0.12 : 0);
  const sampleStep = q9Showcase ? 2 : 4;
  const modified = new Set<string>();
  let foregroundSamples = 0, protectedSamples = 0, body = '';
  const quantize = (value: number): number => Math.max(0, Math.min(255, Math.round(value / 4) * 4));
  const coordinate = (value: number): string => Number(value.toFixed(2)).toString();

  for (let drawY = 0; drawY < drawHeight; drawY += sampleStep) for (let drawX = 0; drawX < drawWidth; drawX += sampleStep) {
    const sourceX = minX + Math.min(cropWidth - 1, Math.floor(drawX * cropWidth / drawWidth));
    const sourceY = minY + Math.min(cropHeight - 1, Math.floor(drawY * cropHeight / drawHeight));
    const rgb = pixel(sourceX, sourceY);
    const foreground = distanceFromBackground(rgb) > foregroundThreshold;
    const extent = rowExtents[sourceY];
    const sourceIndex = (sourceY - minY) * cropWidth + (sourceX - minX);
    const exteriorBackground = backgroundConnected[sourceIndex] === 1;
    const internalNegativeSpace = preserveNegativeSpace && !foreground && (!q9Showcase || !exteriorBackground)
      && extent.max >= extent.min && sourceX > extent.min && sourceX < extent.max;
    const silhouetteSubstrate = q9Showcase && !foreground && !internalNegativeSpace
      && extent.max >= extent.min && sourceX >= extent.min - 2 && sourceX <= extent.max + 2;
    if (!foreground && !internalNegativeSpace && !silhouetteSubstrate) continue;
    if (foreground || internalNegativeSpace) foregroundSamples += 1;
    const moduleX = Math.floor((offsetX + drawX - margin * moduleSize) / moduleSize);
    const moduleY = Math.floor((offsetY + drawY - margin * moduleSize) / moduleSize);
    if (moduleX < 0 || moduleY < 0 || moduleX >= matrix.size || moduleY >= matrix.size) continue;
    if (isProtectedFunctionalModule(matrix.functionalRegions, moduleX, moduleY)) {
      if (foreground || internalNegativeSpace) protectedSamples += 1;
      continue;
    }
    modified.add(`${moduleX},${moduleY}`);
    const fill = foreground ? `rgb(${quantize(rgb[0])},${quantize(rgb[1])},${quantize(rgb[2])})` : '#ffffff';
    body += `<rect x="${coordinate(offsetX + drawX)}" y="${coordinate(offsetY + drawY)}" width="${sampleStep}" height="${sampleStep}" fill="${fill}"/>`;
  }
  const recognitionScore = foregroundSamples === 0 ? 0 : round((foregroundSamples - protectedSamples) / foregroundSamples, 6);
  const protectedConflictScore = foregroundSamples === 0 ? 0 : round(protectedSamples / foregroundSamples, 6);
  return {
    data: base.data.replace('</svg>', `${body}</svg>`),
    format: 'svg',
    width: base.width,
    modifiedModules: modified.size,
    recognitionScore,
    protectedConflictScore,
    protectedViolations: [],
  };
}

function renderRasterImageLayerPng(
  matrix: QrMatrix,
  target: RgbPlane,
  mode: ImageFitMode,
  targetComplexity: ImageFitQrRequestV1['target_image']['complexity'] = 'medium_logo',
  logoSize: ImageFitLogoSize = 'medium',
  logoSizeFraction = LOGO_SIZE_FRACTION[logoSize],
  cleanLogoFit = false,
): RenderedImageFit {
  const moduleSize = 8, margin = 4;
  const width = (matrix.size + margin * 2) * moduleSize;
  const png = new PNG({ width, height: width });
  for (let offset = 0; offset < png.data.length; offset += 4) {
    png.data[offset] = 255; png.data[offset + 1] = 255; png.data[offset + 2] = 255; png.data[offset + 3] = 255;
  }
  const setPixelRgb = (x: number, y: number, r: number, g: number, b: number): void => {
    if (x < 0 || y < 0 || x >= width || y >= width) return;
    const offset = (y * width + x) * 4;
    png.data[offset] = Math.max(0, Math.min(255, Math.round(r)));
    png.data[offset + 1] = Math.max(0, Math.min(255, Math.round(g)));
    png.data[offset + 2] = Math.max(0, Math.min(255, Math.round(b)));
    png.data[offset + 3] = 255;
  };
  const fillRectRgb = (left: number, top: number, rectWidth: number, rectHeight: number, r: number, g: number, b: number): void => {
    const x0 = Math.max(0, Math.floor(left)), y0 = Math.max(0, Math.floor(top));
    const x1 = Math.min(width, Math.ceil(left + rectWidth)), y1 = Math.min(width, Math.ceil(top + rectHeight));
    for (let y = y0; y < y1; y++) for (let x = x0; x < x1; x++) setPixelRgb(x, y, r, g, b);
  };
  for (let y = 0; y < matrix.size; y++) for (let x = 0; x < matrix.size; x++) {
    if (matrix.modules[y][x] !== 1) continue;
    fillRectRgb((margin + x) * moduleSize, (margin + y) * moduleSize, moduleSize, moduleSize, 17, 24, 39);
  }

  const pixel = (x: number, y: number): [number, number, number] => {
    const index = (y * target.width + x) * 3;
    return [target.values[index], target.values[index + 1], target.values[index + 2]];
  };
  const borderPixels: Array<[number, number, number]> = [];
  for (let x = 0; x < target.width; x++) borderPixels.push(pixel(x, 0), pixel(x, target.height - 1));
  for (let y = 1; y < target.height - 1; y++) borderPixels.push(pixel(0, y), pixel(target.width - 1, y));
  const medianChannel = (channel: number): number => {
    const values = borderPixels.map((entry) => entry[channel]).sort((a, b) => a - b);
    return values[Math.floor(values.length / 2)] ?? 255;
  };
  const background: [number, number, number] = [medianChannel(0), medianChannel(1), medianChannel(2)];
  const distanceFromBackground = (rgb: readonly number[]): number => Math.hypot(rgb[0] - background[0], rgb[1] - background[1], rgb[2] - background[2]);
  const borderNoise = borderPixels.map(distanceFromBackground).sort((a, b) => a - b);
  const foregroundThreshold = Math.max(30, (borderNoise[Math.floor(borderNoise.length * 0.6)] ?? 0) * 2.5);

  let minX = target.width, minY = target.height, maxX = -1, maxY = -1;
  for (let y = 0; y < target.height; y++) for (let x = 0; x < target.width; x++) {
    if (distanceFromBackground(pixel(x, y)) <= foregroundThreshold) continue;
    minX = Math.min(minX, x); minY = Math.min(minY, y); maxX = Math.max(maxX, x); maxY = Math.max(maxY, y);
  }
  if (maxX < minX || maxY < minY) {
    const dataUrl = `data:image/png;base64,${PNG.sync.write(png).toString('base64')}`;
    return { data: dataUrl, format: 'png-dataurl', width, modifiedModules: 0, recognitionScore: 0, protectedConflictScore: 0, protectedViolations: [] };
  }
  const cropWidth = maxX - minX + 1, cropHeight = maxY - minY + 1;
  const rowExtents = Array.from({ length: target.height }, () => ({ min: target.width, max: -1 }));
  const backgroundConnected = new Uint8Array(cropWidth * cropHeight);
  const isForegroundAt = (x: number, y: number): boolean => distanceFromBackground(pixel(x, y)) > foregroundThreshold;
  for (let y = minY; y <= maxY; y++) for (let x = minX; x <= maxX; x++) {
    if (!isForegroundAt(x, y)) continue;
    rowExtents[y].min = Math.min(rowExtents[y].min, x);
    rowExtents[y].max = Math.max(rowExtents[y].max, x);
  }
  const markOutside = (x: number, y: number, stack: number[]): void => {
    if (x < minX || x > maxX || y < minY || y > maxY || isForegroundAt(x, y)) return;
    const index = (y - minY) * cropWidth + (x - minX);
    if (backgroundConnected[index]) return;
    backgroundConnected[index] = 1;
    stack.push(index);
  };
  const stack: number[] = [];
  for (let x = minX; x <= maxX; x++) { markOutside(x, minY, stack); markOutside(x, maxY, stack); }
  for (let y = minY + 1; y < maxY; y++) { markOutside(minX, y, stack); markOutside(maxX, y, stack); }
  while (stack.length > 0) {
    const index = stack.pop() ?? 0;
    const x = minX + (index % cropWidth), y = minY + Math.floor(index / cropWidth);
    markOutside(x + 1, y, stack); markOutside(x - 1, y, stack); markOutside(x, y + 1, stack); markOutside(x, y - 1, stack);
  }
  let foregroundCount = 0, foregroundSumX = 0, foregroundSumY = 0;
  for (let y = minY; y <= maxY; y++) for (let x = minX; x <= maxX; x++) {
    if (!isForegroundAt(x, y)) continue;
    foregroundCount += 1; foregroundSumX += x - minX + 0.5; foregroundSumY += y - minY + 0.5;
  }

  const inner = matrix.size * moduleSize;
  const effectiveLogoSizeFraction = cleanLogoFit ? Math.min(logoSizeFraction, logoSize === 'large' ? 0.54 : logoSizeFraction) : logoSizeFraction;
  const drawWidth = Math.round(inner * effectiveLogoSizeFraction);
  const drawHeight = Math.max(1, Math.round(drawWidth * cropHeight / cropWidth));
  const centeredX = margin * moduleSize + (inner - drawWidth) / 2;
  const centeredY = margin * moduleSize + (inner - drawHeight) / 2;
  const clamp = (value: number, low: number, high: number): number => Math.max(low, Math.min(high, value));
  const centroidX = foregroundCount > 0 ? foregroundSumX / foregroundCount : cropWidth / 2;
  const centroidY = foregroundCount > 0 ? foregroundSumY / foregroundCount : cropHeight / 2;
  const centerOnForeground = targetComplexity !== 'complex_photo_like' && targetComplexity !== 'high_risk_thin_detail';
  const offsetX = centerOnForeground
    ? clamp(margin * moduleSize + inner / 2 - centroidX * drawWidth / cropWidth, margin * moduleSize, margin * moduleSize + inner - drawWidth)
    : centeredX;
  const offsetY = centerOnForeground
    ? clamp(margin * moduleSize + inner / 2 - centroidY * drawHeight / cropHeight, margin * moduleSize, margin * moduleSize + inner - drawHeight)
    : centeredY - (matrix.version >= 7 ? drawHeight * 0.12 : 0);

  const modified = new Set<string>();
  let candidatePixels = 0, protectedPixels = 0;
  const moduleAtPixel = (px: number, py: number): [number, number] => [Math.floor((px - margin * moduleSize) / moduleSize), Math.floor((py - margin * moduleSize) / moduleSize)];
  const canPaint = (px: number, py: number): boolean => {
    const [moduleX, moduleY] = moduleAtPixel(px, py);
    if (moduleX < 0 || moduleY < 0 || moduleX >= matrix.size || moduleY >= matrix.size) return false;
    if (isProtectedFunctionalModule(matrix.functionalRegions, moduleX, moduleY)) { protectedPixels += 1; return false; }
    modified.add(`${moduleX},${moduleY}`);
    return true;
  };
  const sampleBilinear = (sx: number, sy: number): [number, number, number] => {
    const x0 = Math.max(0, Math.min(target.width - 1, Math.floor(sx))), y0 = Math.max(0, Math.min(target.height - 1, Math.floor(sy)));
    const x1 = Math.max(0, Math.min(target.width - 1, x0 + 1)), y1 = Math.max(0, Math.min(target.height - 1, y0 + 1));
    const tx = sx - x0, ty = sy - y0;
    const a = pixel(x0, y0), b = pixel(x1, y0), c = pixel(x0, y1), d = pixel(x1, y1);
    return [0, 1, 2].map((i) => a[i] * (1 - tx) * (1 - ty) + b[i] * tx * (1 - ty) + c[i] * (1 - tx) * ty + d[i] * tx * ty) as [number, number, number];
  };
  for (let dy = 0; dy < drawHeight; dy++) for (let dx = 0; dx < drawWidth; dx++) {
    const px = Math.round(offsetX + dx), py = Math.round(offsetY + dy);
    const sx = minX + (dx + 0.5) * cropWidth / drawWidth;
    const sy = minY + (dy + 0.5) * cropHeight / drawHeight;
    const sourceX = Math.max(minX, Math.min(maxX, Math.floor(sx)));
    const sourceY = Math.max(minY, Math.min(maxY, Math.floor(sy)));
    const sourceIndex = (sourceY - minY) * cropWidth + (sourceX - minX);
    const foreground = isForegroundAt(sourceX, sourceY);
    const extent = rowExtents[sourceY];
    const exteriorBackground = backgroundConnected[sourceIndex] === 1;
    const internalNegativeSpace = !foreground && !exteriorBackground
      && extent.max >= extent.min && sourceX > extent.min && sourceX < extent.max;
    const silhouetteSubstrate = !foreground && !internalNegativeSpace
      && extent.max >= extent.min && sourceX >= extent.min - 2 && sourceX <= extent.max + 2;
    if (!foreground && !internalNegativeSpace && !silhouetteSubstrate) continue;
    candidatePixels += 1;
    if (!canPaint(px, py)) continue;
    if (cleanLogoFit && silhouetteSubstrate) {
      // Clean Logo-Fit must not paint exterior/background-connected white caps or halos.
      // Only true foreground plus enclosed internal negative-space details belong in the logo overlay.
      continue;
    }
    if (silhouetteSubstrate) {
      setPixelRgb(px, py, 255, 255, 255);
      continue;
    }
    const rgb = foreground ? sampleBilinear(sx, sy) : [255, 255, 255] as [number, number, number];
    if (cleanLogoFit && !foreground && !internalNegativeSpace) {
      continue;
    }
    const [moduleX, moduleY] = moduleAtPixel(px, py);
    const activeModule = moduleX >= 0 && moduleY >= 0 && moduleX < matrix.size && moduleY < matrix.size && matrix.modules[moduleY][moduleX] === 1;
    if (activeModule) {
      const texture = cleanLogoFit
        ? logoSize === 'large' ? 0.78 : 0.86
        : foreground
          ? logoSize === 'large' ? 0.54 : 0.62
          : logoSize === 'large' ? 0.18 : 0.24;
      setPixelRgb(
        px,
        py,
        rgb[0] * texture + 17 * (1 - texture),
        rgb[1] * texture + 24 * (1 - texture),
        rgb[2] * texture + 39 * (1 - texture),
      );
      continue;
    }
    setPixelRgb(px, py, rgb[0], rgb[1], rgb[2]);
  }

  const recognitionScore = candidatePixels === 0 ? 0 : round((candidatePixels - protectedPixels) / candidatePixels, 6);
  const protectedConflictScore = candidatePixels === 0 ? 0 : round(protectedPixels / candidatePixels, 6);
  const dataUrl = `data:image/png;base64,${PNG.sync.write(png).toString('base64')}`;
  return { data: dataUrl, format: 'png-dataurl', width, modifiedModules: modified.size, recognitionScore, protectedConflictScore, protectedViolations: [] };
}

/* ================================================================
   Coherent grouped rendering
   ================================================================ */

function renderImageFitSvg(
  matrix: QrMatrix,
  mask: boolean[][],
  mode: ImageFitMode,
  meta: { useLegacy?: boolean; edgeScore?: number; componentCount?: number },
): RenderedImageFit {
  const moduleSize = 8;
  const margin = 4;
  const width = (matrix.size + margin * 2) * moduleSize;
  const offset = margin * moduleSize;

  const svgHeader = `<?xml version="1.0" encoding="UTF-8"?><svg xmlns="http://www.w3.org/2000/svg" width="${width}" height="${width}" viewBox="0 0 ${width} ${width}"><rect width="${width}" height="${width}" fill="#ffffff"/>`;

  let modifiedModules = 0;
  let targetCount = 0;
  let appearanceScoreSum = 0;
  let protectedTargetCount = 0;
  const protectedViolations: string[] = [];

  // Compute fill for every module
  const fills: string[][] = Array.from({ length: matrix.size }, () => Array(matrix.size).fill('#ffffff'));
  for (let y = 0; y < matrix.size; y++) {
    for (let x = 0; x < matrix.size; x++) {
      const active = matrix.modules[y][x] === 1;
      const maskCell = mask[y]?.[x] === true;
      const protectedCell = isProtectedFunctionalModule(matrix.functionalRegions, x, y);
      const baseFill = active ? '#000000' : '#ffffff';

      if (maskCell) targetCount += 1;
      if (maskCell && protectedCell) protectedTargetCount += 1;

      let fill = baseFill;
      if (maskCell && !protectedCell) {
        if (meta.useLegacy) {
          fill = treatmentColor(mode, active);
          if (fill !== baseFill) modifiedModules += 1;
        } else {
          // Coherent mode-aware coloring
          fill = modeAwareFill(mode, active, x, y, matrix, mask);
          if (fill !== baseFill) modifiedModules += 1;
        }
      }

      if (maskCell && !protectedCell) appearanceScoreSum += normalizedRgbDistance(fill, baseFill);
      if (protectedCell && fill !== baseFill) protectedViolations.push(`${x},${y}`);
      fills[y][x] = fill;
    }
  }

  // Build SVG using coherent horizontal-run grouping (fewer elements = cleaner visual)
  let svgBody = '';
  for (let y = 0; y < matrix.size; y++) {
    let runStart = -1;
    let runFill = '';
    for (let x = 0; x <= matrix.size; x++) {
      const fill = x < matrix.size ? fills[y][x] : '';
      if (x < matrix.size && fill === runFill) continue;
      if (runStart >= 0 && runFill !== '#ffffff') {
        const runLength = x - runStart;
        svgBody += `<rect x="${offset + runStart * moduleSize}" y="${offset + y * moduleSize}" width="${runLength * moduleSize}" height="${moduleSize}" fill="${runFill}"/>`;
      }
      runStart = x;
      runFill = fill;
    }
  }

  const svg = `${svgHeader}${svgBody}</svg>`;

  const recognitionScore = targetCount === 0 ? 0 : round(appearanceScoreSum / targetCount, 6);
  const protectedConflictScore = targetCount === 0 ? 0 : round(protectedTargetCount / targetCount, 6);

  return { data: svg, format: 'svg', width, modifiedModules, recognitionScore, protectedConflictScore, protectedViolations };
}

function normalizedRgbDistance(left: string, right: string): number {
  const rgb = (hex: string): [number, number, number] => [
    Number.parseInt(hex.slice(1, 3), 16),
    Number.parseInt(hex.slice(3, 5), 16),
    Number.parseInt(hex.slice(5, 7), 16),
  ];
  const a = rgb(left), b = rgb(right);
  return Math.hypot(a[0] - b[0], a[1] - b[1], a[2] - b[2]) / Math.hypot(255, 255, 255);
}

/**
 * Mode-aware fill considering whether the QR module is dark and local coherence.
 *
 * - readable:   image only on light QR modules. Dark modules stay black.
 * - balanced:   image on both, with tinted darks and mid-tones.
 * - image_first: stronger image everywhere, dark stays dark-blue.
 */
function modeAwareFill(mode: ImageFitMode, active: boolean, x: number, y: number, matrix: QrMatrix, mask: boolean[][]): string {
  // Local coherence: are neighboring image-mask modules mostly on dark or light QR modules?
  let darkNeighbors = 0;
  let lightNeighbors = 0;
  for (let dy = -1; dy <= 1; dy++) {
    for (let dx = -1; dx <= 1; dx++) {
      const nx = x + dx, ny = y + dy;
      if (nx >= 0 && nx < matrix.size && ny >= 0 && ny < matrix.size && mask[ny][nx]) {
        if (matrix.modules[ny][nx] === 1) darkNeighbors++; else lightNeighbors++;
      }
    }
  }
  const mostlyDarkBackground = darkNeighbors >= lightNeighbors;

  if (mode === 'readable') {
    if (active) return '#000000';
    // Subtle tint on light background, stronger if surrounded by image
    const tintStrength = darkNeighbors + lightNeighbors >= 3 ? '#b8c8d8' : '#d0dce8';
    return tintStrength;
  }

  if (mode === 'balanced') {
    if (active) {
      // Dark module: keep dark but shift toward cohesive blue to avoid pure-black voids
      return mostlyDarkBackground ? '#1a3a5a' : '#142e48';
    }
    return mostlyDarkBackground ? '#8ab4d8' : '#a8c8e8';
  }

  // image_first
  if (active) {
    return mostlyDarkBackground ? '#3a6a9e' : '#2a5884';
  }
  return mostlyDarkBackground ? '#9ec8ec' : '#b8daf4';
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

/* ================================================================
   Validation, fallback, artifact, utility (unchanged contracts)
   ================================================================ */

function validationCandidate(
  artifact: ImageFitArtifact, width: number,
  settings: { version: number; ecc: ImageFitEcc; mask: number }, mode: ImageFitMode,
): Candidate {
  return {
    candidateId: `validation-${mode}-v${settings.version}-${settings.ecc.toLowerCase()}-m${settings.mask}`,
    matrixRef: `qr:${settings.version}:${settings.ecc}:${settings.mask}`,
    rendered: { format: artifact.media_type === 'image/png' ? 'png-dataurl' : 'svg', data: artifact.data, width, height: width },
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
  blockers.push('preview_export_parity_not_proven');
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
  let matrix: QrMatrix | undefined;
  let selected: QrSearchSettings | undefined;
  for (const settings of settingsCandidatesForMode(input.request, 'readable')) {
    try {
      matrix = generateMatrix({
        canonical: input.encoded_payload,
        mode: 'url',
        byteLength: Buffer.byteLength(input.encoded_payload),
        version: settings.version,
        errorCorrectionLevel: settings.ecc,
        maskPattern: settings.mask,
      });
      selected = settings;
      break;
    } catch {
      // Continue through the frozen allowed search space before declaring fallback unavailable.
    }
  }
  if (!matrix || !selected) throw new Error('No allowed QR settings can encode the deterministic Level 1 fallback');
  const rendered = renderDeterministic(matrix, {
    format: 'svg', moduleSize: 8, margin: 4, colorDark: '#111827', colorLight: '#ffffff', shape: 'square',
  });
  const artifact = makeArtifact('fallback', rendered.data);
  artifact.uri = `artifact://image-fit/fallback-${artifact.sha256.slice(0, 16)}.svg`;
  const candidate: Candidate = {
    candidateId: 'level1-fallback-validation', matrixRef: `qr:${matrix.version}:${matrix.maskPattern}`,
    rendered: { format: 'svg', data: rendered.data, width: rendered.width, height: rendered.height },
    scanResults: [], exportAllowed: false, artisticScore: 0,
  };
  return { artifact, scan: mapScanEvidence(validate(candidate, input.encoded_payload)) };
}


function artifactDataUri(artifact: ImageFitArtifact): string {
  if (artifact.media_type === 'image/png') return artifact.data;
  return `data:image/svg+xml;base64,${Buffer.from(artifact.data, 'utf8').toString('base64')}`;
}

function makeArtifact(label: string, data: string, kind: 'export_svg' | 'export_png' = 'export_svg'): ImageFitArtifact {
  const digest = kind === 'export_png'
    ? sha256Bytes(Buffer.from(data.replace(/^data:image\/png;base64,/, ''), 'base64'))
    : sha256(data);
  const media_type = kind === 'export_png' ? 'image/png' : 'image/svg+xml';
  const extension = kind === 'export_png' ? 'png' : 'svg';
  return {
    kind, uri: `artifact://image-fit/${label}-${digest.slice(0, 16)}.${extension}`,
    sha256: digest, media_type, data,
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
  const embeddingStyle = input.request.user_controls.image_embedding_style;
  if (embeddingStyle !== undefined && embeddingStyle !== 'clean_logo_fit' && embeddingStyle !== 'embedded_image_fit') {
    throw new Error('image_embedding_style must be clean_logo_fit or embedded_image_fit');
  }
  const logoSize = input.request.user_controls.logo_size ?? 'medium';
  if (logoSize !== 'small' && logoSize !== 'medium' && logoSize !== 'large') {
    throw new Error('logo_size must be small, medium, or large');
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
  const rgb = input.target_rgb;
  if (rgb && (!Number.isInteger(rgb.width) || !Number.isInteger(rgb.height)
    || rgb.width !== target.width || rgb.height !== target.height
    || rgb.values.length !== rgb.width * rgb.height * 3
    || rgb.values.some((value) => !Number.isFinite(value) || value < 0 || value > 255)
    || !/^[a-f0-9]{64}$/.test(rgb.source_image_sha256)
    || rgb.source_image_sha256 !== target.source_image_sha256)) {
    throw new Error('target_rgb dimensions, values, and source hash must match target_luma');
  }
}

function sha256(value: string): string {
  return createHash('sha256').update(value, 'utf8').digest('hex');
}

function sha256Bytes(value: Buffer): string {
  return createHash('sha256').update(value).digest('hex');
}

function round(value: number, places: number): number {
  const factor = 10 ** places;
  return Math.round(value * factor) / factor;
}
