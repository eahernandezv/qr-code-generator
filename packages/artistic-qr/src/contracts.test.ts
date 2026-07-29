import { createHash } from 'node:crypto';
import { readFileSync } from 'node:fs';
import * as AjvModule from 'ajv';
import * as formatsModule from 'ajv-formats';
import { describe, expect, it } from 'vitest';
import { generateMatrix, normalizePayload, renderDeterministic } from '@qr/qr-core';
import { exportArtifact, generateCandidates } from './index.js';

const corePath = new URL('../../contracts/schemas/qr-core-api.v1.json', import.meta.url);
const artisticPath = new URL('../../contracts/schemas/artistic-qr-api.v1.json', import.meta.url);
const coreBytes = readFileSync(corePath);
const artisticBytes = readFileSync(artisticPath);
const coreSchema = JSON.parse(coreBytes.toString('utf8'));
const artisticSchema = JSON.parse(artisticBytes.toString('utf8'));
type AjvConstructor = new (options?: import('ajv').Options) => import('ajv').default;
const Ajv = ((AjvModule as unknown as { default?: AjvConstructor }).default ?? AjvModule) as AjvConstructor;
const addFormats = ((formatsModule as unknown as { default?: typeof import('ajv-formats').default }).default ?? formatsModule) as typeof import('ajv-formats').default;
const ajv = new Ajv({ allErrors: true, strict: false });
addFormats(ajv);
ajv.addSchema(coreSchema);
ajv.addSchema(artisticSchema);

function assertDefinition(schemaId: string, definition: string, value: unknown): void {
  const validate = ajv.getSchema(`${schemaId}#/definitions/${definition}`)!;
  expect(validate(value), JSON.stringify(validate.errors)).toBe(true);
}

describe('frozen contract conformance', () => {
  it('keeps the frozen schema bytes unchanged', () => {
    expect(createHash('sha256').update(coreBytes).digest('hex')).toBe('c6620ec4cd824369ae2fff4a4bc37f240ef4cea2f2ad19a660e2d8cbe8e1c11c');
    expect(createHash('sha256').update(artisticBytes).digest('hex')).toBe('de46306d6d0af0f68221027771fac62e4d9d64cd412aeb0c791147dfc8279fa2');
  });

  it('conforms successful core, candidate board, and export objects', async () => {
    const normalized = normalizePayload({ mode: 'url', content: 'https://example.com/contracts', errorCorrectionLevel: 'H' });
    const matrix = generateMatrix(normalized);
    assertDefinition(coreSchema.$id, 'NormalizedPayload', normalized);
    assertDefinition(coreSchema.$id, 'QrMatrix', matrix);
    assertDefinition(coreSchema.$id, 'RenderedArtifact', renderDeterministic(matrix, { format: 'svg' }));
    assertDefinition(coreSchema.$id, 'RenderedArtifact', renderDeterministic(matrix, { format: 'png-dataurl' }));

    const request = { normalizedPayload: normalized, mode: 'deterministic_template' as const, seed: 11 };
    const board = await generateCandidates(request);
    assertDefinition(artisticSchema.$id, 'GenerationBoard', board);
    for (const candidate of board.candidates) assertDefinition(artisticSchema.$id, 'Candidate', candidate);
    assertDefinition(artisticSchema.$id, 'GenerationBoard', {
      ...board,
      status: 'cancelled',
      failure: { code: 'CANCELLED', message: 'cancelled', retryable: false, safeFallbackAvailable: true },
    });
    assertDefinition(artisticSchema.$id, 'GenerationBoard', {
      ...board,
      status: 'failed',
      failure: { code: 'PROVIDER_FAILED', message: 'failed', retryable: true, safeFallbackAvailable: true },
    });

    const candidate = board.candidates.find((item) => item.exportAllowed)!;
    const artifact = exportArtifact({ candidateId: candidate.candidateId, formats: ['svg'] }, candidate);
    assertDefinition(artisticSchema.$id, 'ExportArtifact', artifact);
  });
});
