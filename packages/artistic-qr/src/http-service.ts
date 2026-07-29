/** Core-owned HTTP authority boundary for candidate generation and export. */
import { createServer, type IncomingMessage, type Server, type ServerResponse } from 'node:http';
import { authoritativeCandidate, candidateAuthority, InMemoryCandidateAuthorityStore, setCandidateAuthorityStore, type CandidateAuthorityStore } from './candidate-context.js';
import { exportArtifact, generateCandidates } from './api/index.js';
import { GenerationRequestError } from './request-validation.js';
import type { ExportRequest, GenerationRequest } from './types.js';
import type { GenerationEngineOptions } from './engine.js';

const JSON_TYPE = 'application/json; charset=utf-8';
const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

export interface ArtisticQrHttpServiceOptions {
  authorityStore?: CandidateAuthorityStore;
  generation?: GenerationEngineOptions;
  maxBodyBytes?: number;
  allowedOrigin?: string;
}

export interface ArtisticQrHttpService {
  server: Server;
  authorityStore: CandidateAuthorityStore;
}

export function createArtisticQrHttpService(options: ArtisticQrHttpServiceOptions = {}): ArtisticQrHttpService {
  const authorityStore = options.authorityStore ?? new InMemoryCandidateAuthorityStore();
  const maxBodyBytes = options.maxBodyBytes ?? 1_000_000;
  const server = createServer(async (request, response) => {
    const route = request.url === '/candidates' ? 'candidates' : request.url === '/exports' ? 'exports' : 'other';
    applyCors(response, options.allowedOrigin);
    if (request.method === 'OPTIONS') {
      response.writeHead(204).end();
      return;
    }
    try {
      if (request.method === 'POST' && request.url === '/candidates') {
        const body = await readJson(request, maxBodyBytes);
        setCandidateAuthorityStore(authorityStore);
        const board = await generateCandidates(body as GenerationRequest, options.generation);
        if (board.status === 'failed' || board.status === 'cancelled') {
          throw new ServiceError(502, 'PROVIDER_FAILED', board.failure?.message ?? 'Candidate generation failed');
        }
        sendJson(response, 200, { success: true, board });
        return;
      }
      if (request.method === 'POST' && request.url === '/exports') {
        const exportRequest = validateExportRequest(await readJson(request, maxBodyBytes));
        setCandidateAuthorityStore(authorityStore);
        const record = candidateAuthority(exportRequest.candidateId);
        if (!record) throw new ServiceError(404, 'NOT_FOUND', 'Authoritative candidate was not found');
        const artifact = exportArtifact(exportRequest, authoritativeCandidate(record));
        sendJson(response, 200, artifact);
        return;
      }
      throw new ServiceError(404, 'NOT_FOUND', 'Route not found');
    } catch (error) {
      sendServiceError(response, error, route);
    }
  });
  return { server, authorityStore };
}

class ServiceError extends Error {
  constructor(
    readonly status: number,
    readonly code: 'VALIDATION_FAILED' | 'PROVIDER_FAILED' | 'NOT_VALIDATED' | 'EXPORT_FAILED' | 'NOT_FOUND' | 'INTERNAL_ERROR',
    message: string,
  ) {
    super(message);
  }
}

async function readJson(request: IncomingMessage, maxBodyBytes: number): Promise<unknown> {
  const contentType = request.headers['content-type'] ?? '';
  if (!contentType.toLowerCase().startsWith('application/json')) {
    throw new ServiceError(400, 'VALIDATION_FAILED', 'Content-Type must be application/json');
  }
  const chunks: Buffer[] = [];
  let length = 0;
  for await (const chunk of request as IncomingMessage & AsyncIterable<Buffer | string>) {
    const bytes = Buffer.isBuffer(chunk) ? chunk : Buffer.from(chunk);
    length += bytes.length;
    if (length > maxBodyBytes) throw new ServiceError(413, 'VALIDATION_FAILED', 'Request body exceeds the service limit');
    chunks.push(bytes);
  }
  try {
    return JSON.parse(Buffer.concat(chunks).toString('utf8')) as unknown;
  } catch {
    throw new ServiceError(400, 'VALIDATION_FAILED', 'Request body must contain valid JSON');
  }
}

function validateExportRequest(value: unknown): ExportRequest {
  const body = requireRecord(value);
  const allowed = new Set(['candidateId', 'formats', 'sizes']);
  if (Object.keys(body).some((key) => !allowed.has(key))) throw exportFailure('Export request contains an unknown field');
  if (typeof body.candidateId !== 'string' || !UUID.test(body.candidateId)) throw exportFailure('candidateId must be a UUID');
  if (!Array.isArray(body.formats) || body.formats.length < 1 || body.formats.length > 2 || body.formats.some((format) => format !== 'png' && format !== 'svg')) {
    throw exportFailure('formats must contain only png or svg');
  }
  if (body.sizes !== undefined) {
    if (!Array.isArray(body.sizes) || body.sizes.length < 1 || body.sizes.length > 16) throw exportFailure('sizes must be a non-empty bounded array');
    for (const value of body.sizes) {
      const size = requireRecord(value, 'EXPORT_FAILED');
      const sizeKeys = new Set(['label', 'widthPx', 'heightPx', 'dpi']);
      if (Object.keys(size).some((key) => !sizeKeys.has(key))) throw exportFailure('Export size contains an unknown field');
      if (typeof size.label !== 'string' || size.label.length < 1 || size.label.length > 128) throw exportFailure('Export size label is invalid');
      if (!Number.isInteger(size.widthPx) || !Number.isInteger(size.heightPx)) throw exportFailure('Export dimensions must be integers');
      if (size.dpi !== undefined && (!Number.isInteger(size.dpi) || (size.dpi as number) < 1 || (size.dpi as number) > 2400)) throw exportFailure('Export DPI is invalid');
    }
  }
  return body as unknown as ExportRequest;
}

function requireRecord(value: unknown, code: 'VALIDATION_FAILED' | 'EXPORT_FAILED' = 'VALIDATION_FAILED'): Record<string, unknown> {
  if (typeof value !== 'object' || value === null || Array.isArray(value)) {
    throw new ServiceError(400, code, code === 'EXPORT_FAILED' ? 'Export request must be an object' : 'Request body must be an object');
  }
  return value as Record<string, unknown>;
}

function exportFailure(message: string): ServiceError {
  return new ServiceError(400, 'EXPORT_FAILED', message);
}

function sendServiceError(response: ServerResponse, error: unknown, route: 'candidates' | 'exports' | 'other'): void {
  if (error instanceof ServiceError) {
    const code = route === 'exports' && error.code === 'VALIDATION_FAILED' ? 'EXPORT_FAILED' : error.code;
    sendErrorJson(response, error.status, route, code, error.message);
    return;
  }
  if (error instanceof GenerationRequestError) {
    sendErrorJson(response, 400, route, route === 'exports' ? 'EXPORT_FAILED' : 'VALIDATION_FAILED', error.message.replace(/^[A-Z_]+:\s*/, ''));
    return;
  }
  const message = error instanceof Error ? error.message : '';
  const match = /^(NOT_VALIDATED|EXPORT_FAILED|UNSUPPORTED_FORMAT):\s*(.*)$/.exec(message);
  if (match) {
    const code = match[1] === 'NOT_VALIDATED' ? 'NOT_VALIDATED' : 'EXPORT_FAILED';
    sendErrorJson(response, code === 'NOT_VALIDATED' ? 422 : 400, route, code, match[2] || 'Export failed');
    return;
  }
  sendErrorJson(response, 500, route, 'INTERNAL_ERROR', 'The Core export service could not complete the request');
}

function sendErrorJson(response: ServerResponse, status: number, route: 'candidates' | 'exports' | 'other', code: string, message: string): void {
  sendJson(response, status, route === 'candidates' ? { success: false, code, message } : { code, message });
}

function sendJson(response: ServerResponse, status: number, value: unknown): void {
  if (response.headersSent) return;
  response.writeHead(status, { 'content-type': JSON_TYPE, 'cache-control': 'no-store' });
  response.end(JSON.stringify(value));
}

function applyCors(response: ServerResponse, allowedOrigin: string | undefined): void {
  if (!allowedOrigin) return;
  response.setHeader('access-control-allow-origin', allowedOrigin);
  response.setHeader('access-control-allow-methods', 'POST, OPTIONS');
  response.setHeader('access-control-allow-headers', 'content-type');
}
