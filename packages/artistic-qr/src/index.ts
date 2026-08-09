/**
 * Artistic QR — generation adapter, validation, repair, and export
 * Owned by WS-03 (qr-creator)
 */

export {
  generateCandidates,
  validateCandidate,
  exportArtifact,
  repairCandidate,
} from './api/index.js';
export { InMemoryCandidateAuthorityStore, setCandidateAuthorityStore } from './candidate-context.js';
export { PATTERNED_PALETTE_PRESETS, resolveArtisticRenderIntent } from './render-intent.js';
export { optimizeImageFitQr } from './image-fit.js';
export type {
  ImageFitArtifact,
  ImageFitCandidateV1,
  ImageFitOptimizationResult,
  ImageFitOptimizerInput,
  ImageFitOptimizerOptions,
  ImageFitQrRequestV1,
} from './image-fit.js';

export type {
  ArtDirection,
  GenerationRequest,
  Candidate,
  ScanValidationResult,
  GenerationBoard,
  ExportRequest,
  ExportArtifact,
  RepairStrategy,
  PaletteFamily,
  PalettePattern,
  ColorIntensity,
  ModuleStyle,
  EyeStyle,
  EyeFrameStyle,
  EyeBallStyle,
  FinderStyle,
} from './types.js';
export type { CandidateAuthorityRecord, CandidateAuthorityStore } from './candidate-context.js';
export type {
  ArtisticCompositionTreatment,
  ArtisticCompositionTreatmentId,
  ArtisticRenderIntent,
  ArtisticStrengthTreatment,
  ArtisticStyleFamily,
  QrProminenceTreatment,
  PatternedPaletteIntent,
  CornerColorResolution,
} from './render-intent.js';
export type { SafetyEvaluator, SafetyVerdict } from './request-validation.js';
