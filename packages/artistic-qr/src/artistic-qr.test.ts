import { describe, expect, it } from 'vitest';
import { normalizePayload } from '@qr/qr-core';
import { exportArtifact, generateCandidates, repairCandidate, validateCandidate } from './index.js';
import type { Candidate } from './types.js';

const normalized = normalizePayload({ mode: 'url', content: 'https://example.com/artistic', errorCorrectionLevel: 'H' });

const request = {
  normalizedPayload: normalized,
  mode: 'deterministic_template' as const,
  artisticStrength: 0.45,
  seed: 42,
};

describe('objective validation and export safety', () => {
  it('decodes every deterministic candidate and records perturbation evidence', async () => {
    const board = await generateCandidates(request);
    expect(board.status).toBe('completed');
    expect(board.candidates).toHaveLength(4);
    for (const candidate of board.candidates) {
      expect(candidate.scanResults[0].decoder).not.toContain('stub');
      expect(candidate.scanResults[0].scannedPayload).toBe(normalized.canonical);
      expect(candidate.scanResults[0].tests.length).toBeGreaterThanOrEqual(8);
      expect(candidate.exportAllowed).toBe(candidate.scanResults[0].pass);
    }
  });

  it('rejects an undecodable rendered artifact and never authorizes export', () => {
    const corrupt: Candidate = {
      candidateId: '00000000-0000-4000-8000-000000000001',
      matrixRef: 'missing',
      rendered: {
        format: 'svg',
        data: '<svg xmlns="http://www.w3.org/2000/svg" width="128" height="128"><rect width="128" height="128" fill="#fff"/></svg>',
        width: 128,
        height: 128,
      },
      scanResults: [],
      exportAllowed: false,
      artisticScore: 0,
    };
    const result = validateCandidate(corrupt);
    expect(result.pass).toBe(false);
    expect(result.scannedPayload).toBe('');
    expect(() => exportArtifact({ candidateId: corrupt.candidateId, formats: ['svg'] }, corrupt)).toThrow(/NOT_VALIDATED/);
  });

  it('revalidates repairs rather than copying authorization', () => {
    const corrupt: Candidate = {
      candidateId: '00000000-0000-4000-8000-000000000002',
      matrixRef: 'missing',
      rendered: { format: 'svg', data: '<svg width="64" height="64"></svg>', width: 64, height: 64 },
      scanResults: [],
      exportAllowed: true,
      artisticScore: 0,
    };
    const repaired = repairCandidate(corrupt, 'contrast_boost');
    expect(repaired.exportAllowed).toBe(false);
    expect(repaired.scanResults[0].pass).toBe(false);
  });

  it('repairs a known low-contrast matrix and authorizes only after revalidation', async () => {
    const lowContrast = await generateCandidates({
      ...request,
      palette: { primary: '#aaaaaa', background: '#ffffff' },
    });
    const failed = lowContrast.candidates.find((candidate) => !candidate.exportAllowed)!;
    expect(failed).toBeDefined();
    const repaired = repairCandidate(failed, 'contrast_boost');
    expect(repaired.rendered.data).toContain('#000000');
    expect(repaired.scanResults[0].scannedPayload).toBe(normalized.canonical);
    expect(repaired.exportAllowed).toBe(true);
  });

  it('exports non-empty, decodable PNG bundles at requested sizes', async () => {
    const board = await generateCandidates(request);
    const candidate = board.candidates.find((item) => item.exportAllowed)!;
    const artifact = exportArtifact({
      candidateId: candidate.candidateId,
      formats: ['png'],
      sizes: [
        { label: 'small', widthPx: 256, heightPx: 256 },
        { label: 'large', widthPx: 512, heightPx: 512 },
      ],
    }, candidate);
    expect(artifact.files).toHaveLength(2);
    for (const file of artifact.files) {
      expect(file.data).toMatch(/^data:image\/png;base64,/);
      const renderedCandidate: Candidate = {
        ...candidate,
        rendered: { format: 'png-dataurl', data: file.data, width: file.width, height: file.height },
      };
      expect(validateCandidate(renderedCandidate).scannedPayload).toBe(normalized.canonical);
    }
  });

  it('denies a scannable artifact when its matrix authority is forged', async () => {
    const board = await generateCandidates(request);
    const genuine = board.candidates.find((candidate) => candidate.exportAllowed)!;
    const forged: Candidate = {
      ...genuine,
      matrixRef: 'forged-client-reference',
      scanResults: [{ pass: true, decoder: 'claimed', version: 'x', thresholdVersion: 'x', scannedPayload: normalized.canonical, tests: [], overallConfidence: 'high' }],
      exportAllowed: true,
    };
    expect(validateCandidate(forged).scannedPayload).toBe(normalized.canonical);
    expect(() => exportArtifact({ candidateId: forged.candidateId, formats: ['png'] }, forged)).toThrow(/NOT_VALIDATED/);
  });
});
