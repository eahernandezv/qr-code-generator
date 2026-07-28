/**
 * Artistic QR API surface
 * Implements: generateCandidates, validateCandidate, exportArtifact, repairCandidate
 */

import { randomUUID } from 'node:crypto';
import type {
  GenerationRequest,
  GenerationBoard,
  Candidate,
  ScanValidationResult,
  ExportRequest,
  ExportArtifact,
  RepairStrategy,
} from '../types.js';
import { buildBoard, type GenerationEngineOptions } from '../engine.js';
import { runValidation } from '../validation.js';
import { performExport } from '../export.js';
import { expectedPayloadForMatrix } from '../candidate-context.js';

const artDirections = [
  { id: 'editorial-illustration', name: 'Editorial Illustration', style: 'editorial-illustration', description: 'Magazine-style illustrated scenes with integrated QR modules' },
  { id: 'organic-botanical', name: 'Organic Botanical', style: 'organic-botanical', description: 'Nature-inspired designs with organic shapes and floral integration' },
  { id: 'architectural-geometric', name: 'Architectural Geometric', style: 'architectural-geometric', description: 'Clean geometric and architectural compositions' },
  { id: 'photographic-cinematic', name: 'Photographic Cinematic', style: 'photographic-cinematic', description: 'Cinematic photo-realistic compositions' },
  { id: 'premium-minimal', name: 'Premium Minimal', style: 'premium-minimal', description: 'Minimalist premium brand-forward aesthetics' },
  { id: 'playful-character', name: 'Playful Character', style: 'playful-character', description: 'Character and object-driven playful designs' },
];

export async function generateCandidates(
  request: GenerationRequest,
  options: GenerationEngineOptions = {},
): Promise<GenerationBoard> {
  const boardId = cryptoRandomUUID();
  return buildBoard(boardId, request, options);
}

export function validateCandidate(candidate: Candidate): ScanValidationResult {
  return runValidation(candidate);
}

export function exportArtifact(request: ExportRequest, candidate: Candidate): ExportArtifact {
  if (request.candidateId !== candidate.candidateId) {
    throw new Error('EXPORT_FAILED: candidateId does not match the supplied candidate');
  }
  const expectedPayload = trustedExpectedPayload(candidate);
  const freshValidation = expectedPayload ? runValidation(candidate, expectedPayload) : undefined;
  if (!candidate.exportAllowed || !freshValidation?.pass) {
    throw new Error('NOT_VALIDATED: Candidate has not passed scan validation');
  }
  return performExport(request, candidate);
}

export function repairCandidate(candidate: Candidate, strategy: RepairStrategy): Candidate {
  const expectedPayload = trustedExpectedPayload(candidate);
  const repaired: Candidate = {
    ...candidate,
    candidateId: randomUUID(),
    rendered: applyRepair(candidate.rendered, strategy),
    scanResults: [],
    exportAllowed: false,
    artisticScore: candidate.artisticScore,
    provenance: candidate.provenance ? { ...candidate.provenance, validationVersion: 'scan-v1-real-75pct' } : undefined,
  };
  const validation = runValidation(repaired, expectedPayload);
  repaired.scanResults = [validation];
  repaired.exportAllowed = Boolean(expectedPayload) && validation.pass;
  return repaired;
}

function trustedExpectedPayload(candidate: Candidate): string | undefined {
  // A client-supplied scan result is evidence, not authority. Only a matrix
  // reference created by this engine (or a future durable store adapter) may
  // supply the expected payload used for repair/export authorization.
  return expectedPayloadForMatrix(candidate.matrixRef);
}

function applyRepair(rendered: Candidate['rendered'], strategy: RepairStrategy): Candidate['rendered'] {
  if (rendered.format !== 'svg') return { ...rendered };
  let data = rendered.data;
  let width = rendered.width;
  let height = rendered.height;
  if (strategy === 'contrast_boost' || strategy === 'composite_rerender') {
    let drawableIndex = 0;
    data = data.replace(/<(rect|circle)\b[^>]*>/gi, (element) => {
      const fill = drawableIndex++ === 0 ? '#ffffff' : '#000000';
      return /\sfill=["'][^"']*["']/i.test(element)
        ? element.replace(/\sfill=["'][^"']*["']/i, ` fill="${fill}"`)
        : element.replace(/>$/, ` fill="${fill}">`);
    });
  }
  if (strategy === 'module_reinforce' || strategy === 'composite_rerender') {
    data = data.replace(/\s(?:rx|ry)=["'][^"']*["']/gi, '');
  }
  if (strategy === 'quiet_zone_enforce' || strategy === 'composite_rerender') {
    const padding = Math.max(4, Math.round(Math.min(width, height) * 0.05));
    width += padding * 2;
    height += padding * 2;
    data = data
      .replace(/<svg\b[^>]*>/i, `<svg xmlns="http://www.w3.org/2000/svg" width="${width}" height="${height}" viewBox="0 0 ${width} ${height}"><g transform="translate(${padding} ${padding})">`)
      .replace(/<\/svg>\s*$/i, '</g></svg>');
  }
  return { ...rendered, data, width, height };
}

function cryptoRandomUUID(): string {
  return randomUUID();
}
