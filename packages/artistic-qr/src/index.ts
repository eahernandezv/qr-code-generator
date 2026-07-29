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
export { setCandidateAuthorityStore } from './candidate-context.js';

export type {
  ArtDirection,
  GenerationRequest,
  Candidate,
  ScanValidationResult,
  GenerationBoard,
  ExportRequest,
  ExportArtifact,
  RepairStrategy,
} from './types.js';
export type { CandidateAuthorityRecord, CandidateAuthorityStore } from './candidate-context.js';
export type { SafetyEvaluator, SafetyVerdict } from './request-validation.js';
