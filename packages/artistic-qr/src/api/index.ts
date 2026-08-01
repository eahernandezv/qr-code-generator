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
import {
  authoritativeCandidate,
  candidateAuthority,
  candidateMatchesAuthority,
  registerCandidateAuthority,
  updateCandidateAuthorityDecision,
} from '../candidate-context.js';

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
  const authority = candidateAuthority(candidate.candidateId);
  if (!authority || !candidateMatchesAuthority(candidate, authority)) return authorityRejectedValidation();
  const validation = runValidation(authoritativeCandidate(authority), authority.expectedPayload);
  updateCandidateAuthorityDecision(authority, validation);
  return validation;
}

export function exportArtifact(request: ExportRequest, candidate: Candidate): ExportArtifact {
  if (request.candidateId !== candidate.candidateId) {
    throw new Error('EXPORT_FAILED: candidateId does not match the supplied candidate');
  }
  const authority = candidateAuthority(candidate.candidateId);
  if (!authority || !candidateMatchesAuthority(candidate, authority) || !authority.exportAllowed) {
    throw new Error('NOT_VALIDATED: Candidate has not passed scan validation');
  }
  const trustedCandidate = authoritativeCandidate(authority);
  const freshValidation = runValidation(trustedCandidate, authority.expectedPayload);
  if (!freshValidation.pass) {
    updateCandidateAuthorityDecision(authority, freshValidation);
    throw new Error('NOT_VALIDATED: Candidate has not passed scan validation');
  }
  updateCandidateAuthorityDecision(authority, freshValidation);
  return performExport(request, trustedCandidate, authority.expectedPayload);
}

export function repairCandidate(candidate: Candidate, strategy: RepairStrategy): Candidate {
  const authority = candidateAuthority(candidate.candidateId);
  if (!authority || !candidateMatchesAuthority(candidate, authority)) {
    throw new Error('REPAIR_FAILED: Candidate authority is missing or does not match exact rendered bytes');
  }
  const trustedCandidate = authoritativeCandidate(authority);
  const repaired: Candidate = {
    ...trustedCandidate,
    candidateId: randomUUID(),
    rendered: applyRepair(trustedCandidate.rendered, strategy),
    scanResults: [],
    exportAllowed: false,
    artisticScore: trustedCandidate.artisticScore,
    provenance: trustedCandidate.provenance ? { ...trustedCandidate.provenance, validationVersion: 'scan-v1-real-75pct' } : undefined,
  };
  const validation = runValidation(repaired, authority.expectedPayload);
  repaired.scanResults = [validation];
  repaired.exportAllowed = validation.pass;
  registerCandidateAuthority(repaired, authority.expectedPayload, validation);
  return repaired;
}

function authorityRejectedValidation(): ScanValidationResult {
  return {
    pass: false,
    decoder: 'jsQR',
    version: '1.4.0',
    thresholdVersion: 'scan-v1-real-75pct',
    scannedPayload: '',
    tests: [{
      name: 'candidate_authority',
      pass: false,
      scale: 1,
      perturbation: 'none',
      details: { reason: 'Candidate authority is missing or exact rendered bytes do not match' },
    }],
    overallConfidence: 'failed',
  };
}

function applyRepair(rendered: Candidate['rendered'], strategy: RepairStrategy): Candidate['rendered'] {
  if (rendered.format !== 'svg') return { ...rendered };
  let data = rendered.data;
  let width = rendered.width;
  let height = rendered.height;
  if (strategy === 'contrast_boost' || strategy === 'composite_rerender') {
    let drawableIndex = 0;
    data = data.replace(/<(rect|circle|path)\b[^>]*>/gi, (element) => {
      const isBackground = drawableIndex++ === 0;
      const isFinderCutout = /\sdata-eye-part=["']frame-cutout["']/i.test(element);
      const fill = isBackground || isFinderCutout ? '#ffffff' : '#000000';
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
