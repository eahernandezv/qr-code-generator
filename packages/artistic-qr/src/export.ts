/**
 * Export logic for validated candidates
 */

import type { ExportRequest, ExportArtifact, Candidate } from '../types.js';

export function performExport(request: ExportRequest, candidate: Candidate): ExportArtifact {
  const files: ExportArtifact['files'] = [];

  for (const fmt of request.formats) {
    if (fmt === 'svg' && candidate.rendered.format === 'svg') {
      files.push({
        format: 'svg',
        data: candidate.rendered.data,
        width: candidate.rendered.width,
        height: candidate.rendered.height,
      });
    } else if (fmt === 'png') {
      // PNG export: for MVP, deterministic templates only export SVG
      // PNG would require canvas rasterization in browser or sharp on server
      files.push({
        format: 'png',
        data: '', // Placeholder: rasterization not implemented in MVP scaffold
        width: candidate.rendered.width,
        height: candidate.rendered.height,
      });
    }
  }

  return {
    artifactId: cryptoRandomUUID(),
    candidateId: candidate.candidateId,
    files,
    provenance: {
      generationMode: candidate.provenance?.generationMode ?? 'unknown',
      provider: candidate.provenance?.provider,
      modelVersion: candidate.provenance?.modelVersion,
      adapterVersion: candidate.provenance?.adapterVersion ?? 'artistic-qr-v1',
      validationVersion: candidate.provenance?.validationVersion ?? 'scan-v1',
    },
  };
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
