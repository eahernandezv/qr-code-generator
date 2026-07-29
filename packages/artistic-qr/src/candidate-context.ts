/** Authoritative candidate records bind export decisions to exact engine-produced bytes. */
import { createHash } from 'node:crypto';
import type { Candidate, ScanValidationResult } from './types.js';

export interface CandidateAuthorityRecord {
  candidateId: string;
  matrixRef: string;
  expectedPayload: string;
  rendered: Candidate['rendered'];
  renderedDigest: string;
  provenance?: Candidate['provenance'];
  artisticScore: number;
  validation: ScanValidationResult;
  exportAllowed: boolean;
}

export interface CandidateAuthorityStore {
  get(candidateId: string): CandidateAuthorityRecord | undefined;
  put(record: CandidateAuthorityRecord): void;
}

export class InMemoryCandidateAuthorityStore implements CandidateAuthorityStore {
  private readonly records = new Map<string, CandidateAuthorityRecord>();
  constructor(private readonly maxEntries = 10_000) {}

  get(candidateId: string): CandidateAuthorityRecord | undefined {
    const record = this.records.get(candidateId);
    return record ? cloneRecord(record) : undefined;
  }

  put(record: CandidateAuthorityRecord): void {
    if (this.records.size >= this.maxEntries && !this.records.has(record.candidateId)) {
      const oldest = this.records.keys().next().value as string | undefined;
      if (oldest) this.records.delete(oldest);
    }
    this.records.set(record.candidateId, cloneRecord(record));
  }
}

let authorityStore: CandidateAuthorityStore = new InMemoryCandidateAuthorityStore();

/** Replace process-local storage with an integration-owned durable adapter. Missing records always fail closed. */
export function setCandidateAuthorityStore(store: CandidateAuthorityStore): void {
  authorityStore = store;
}

/** Reset process-local authority, primarily for restart simulation and isolated tests. */
export function resetCandidateAuthorityStore(): void {
  authorityStore = new InMemoryCandidateAuthorityStore();
}

export function registerCandidateAuthority(
  candidate: Candidate,
  expectedPayload: string,
  validation: ScanValidationResult,
): void {
  authorityStore.put({
    candidateId: candidate.candidateId,
    matrixRef: candidate.matrixRef,
    expectedPayload,
    rendered: { ...candidate.rendered },
    renderedDigest: digestRenderedData(candidate.rendered.data),
    provenance: candidate.provenance ? { ...candidate.provenance } : undefined,
    artisticScore: candidate.artisticScore,
    validation: cloneValidation(validation),
    exportAllowed: validation.pass && candidate.exportAllowed,
  });
}

export function candidateAuthority(candidateId: string): CandidateAuthorityRecord | undefined {
  return authorityStore.get(candidateId);
}

export function updateCandidateAuthorityDecision(
  record: CandidateAuthorityRecord,
  validation: ScanValidationResult,
): CandidateAuthorityRecord {
  const updated: CandidateAuthorityRecord = {
    ...record,
    rendered: { ...record.rendered },
    provenance: record.provenance ? { ...record.provenance } : undefined,
    validation: cloneValidation(validation),
    exportAllowed: validation.pass,
  };
  authorityStore.put(updated);
  return updated;
}

export function candidateMatchesAuthority(candidate: Candidate, record: CandidateAuthorityRecord): boolean {
  return candidate.candidateId === record.candidateId
    && candidate.matrixRef === record.matrixRef
    && candidate.rendered.format === record.rendered.format
    && candidate.rendered.width === record.rendered.width
    && candidate.rendered.height === record.rendered.height
    && digestRenderedData(candidate.rendered.data) === record.renderedDigest;
}

export function authoritativeCandidate(record: CandidateAuthorityRecord): Candidate {
  return {
    candidateId: record.candidateId,
    matrixRef: record.matrixRef,
    rendered: { ...record.rendered },
    scanResults: [cloneValidation(record.validation)],
    exportAllowed: record.exportAllowed,
    artisticScore: record.artisticScore,
    provenance: record.provenance ? { ...record.provenance } : undefined,
  };
}

export function digestRenderedData(data: string): string {
  return createHash('sha256').update(Buffer.from(data, 'utf8')).digest('hex');
}

function cloneValidation(validation: ScanValidationResult): ScanValidationResult {
  return {
    ...validation,
    tests: validation.tests.map((test) => ({
      ...test,
      details: test.details ? { ...test.details } : undefined,
    })),
  };
}

function cloneRecord(record: CandidateAuthorityRecord): CandidateAuthorityRecord {
  return {
    ...record,
    rendered: { ...record.rendered },
    provenance: record.provenance ? { ...record.provenance } : undefined,
    validation: cloneValidation(record.validation),
  };
}
