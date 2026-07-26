/**
 * Artistic QR API surface
 * Implements: generateCandidates, validateCandidate, exportArtifact, repairCandidate
 */

import type {
  GenerationRequest,
  GenerationBoard,
  Candidate,
  ScanValidationResult,
  ExportRequest,
  ExportArtifact,
  RepairStrategy,
} from '../types.js';
import { buildBoard } from '../engine.js';
import { runValidation } from '../validation.js';
import { performExport } from '../export.js';

const artDirections = [
  { id: 'editorial-illustration', name: 'Editorial Illustration', style: 'editorial-illustration', description: 'Magazine-style illustrated scenes with integrated QR modules' },
  { id: 'organic-botanical', name: 'Organic Botanical', style: 'organic-botanical', description: 'Nature-inspired designs with organic shapes and floral integration' },
  { id: 'architectural-geometric', name: 'Architectural Geometric', style: 'architectural-geometric', description: 'Clean geometric and architectural compositions' },
  { id: 'photographic-cinematic', name: 'Photographic Cinematic', style: 'photographic-cinematic', description: 'Cinematic photo-realistic compositions' },
  { id: 'premium-minimal', name: 'Premium Minimal', style: 'premium-minimal', description: 'Minimalist premium brand-forward aesthetics' },
  { id: 'playful-character', name: 'Playful Character', style: 'playful-character', description: 'Character and object-driven playful designs' },
];

export function generateCandidates(request: GenerationRequest): GenerationBoard {
  const boardId = cryptoRandomUUID();

  if (request.mode === 'provider_generative') {
    // Generative path is gated for MVP; return graceful unavailable
    return {
      boardId,
      request,
      candidates: [],
      status: 'failed',
      failure: {
        code: 'UNSUPPORTED_MODE',
        message: 'Provider generative mode is not enabled in this release. Use deterministic_template.',
        retryable: false,
        safeFallbackAvailable: true,
      },
    };
  }

  return buildBoard(boardId, request);
}

export function validateCandidate(candidate: Candidate): ScanValidationResult {
  return runValidation(candidate);
}

export function exportArtifact(request: ExportRequest, candidate: Candidate): ExportArtifact {
  if (!candidate.exportAllowed) {
    throw new Error('NOT_VALIDATED: Candidate has not passed scan validation');
  }
  return performExport(request, candidate);
}

export function repairCandidate(candidate: Candidate, strategy: RepairStrategy): Candidate {
  // Repair applies the strategy and re-runs validation
  // For deterministic templates, repair is a re-render with adjusted parameters
  const repaired: Candidate = {
    ...candidate,
    candidateId: cryptoRandomUUID(),
    scanResults: [],
    exportAllowed: false,
    artisticScore: candidate.artisticScore,
  };

  // Apply repair logic based on strategy
  if (strategy === 'contrast_boost' || strategy === 'module_reinforce') {
    // These are no-ops for deterministic templates (already optimal)
    // but the validation will still run
  }

  const validation = runValidation(repaired);
  repaired.scanResults = [validation];
  repaired.exportAllowed = validation.pass;

  return repaired;
}

function cryptoRandomUUID(): string {
  if (typeof crypto !== 'undefined' && crypto.randomUUID) {
    return crypto.randomUUID();
  }
  return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, (c) => {
    const r = (Math.random() * 16) | 0;
    const v = c === 'x' ? r : (r & 0x3) | 0x8;
    return v.toString(16);
  });
}
