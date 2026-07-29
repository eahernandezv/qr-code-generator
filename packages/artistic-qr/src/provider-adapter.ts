import { spawn, type ChildProcessWithoutNullStreams } from 'node:child_process';
import { statSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, isAbsolute, join, resolve } from 'node:path';

const moduleDir = dirname(fileURLToPath(import.meta.url));
const UUID_PATTERN = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

export interface PythonBoardResult {
  boardId: string;
  request: Record<string, unknown>;
  candidates: PythonCandidate[];
  status: 'completed' | 'failed' | 'cancelled';
  failure?: { code: string; message: string; retryable: boolean; safeFallbackAvailable: boolean };
  totalLatencyMs: number;
  totalCostEstimate: number;
}

export interface PythonCandidate {
  candidateId: string;
  matrixRef: string;
  rendered: { format: string; data: string; width: number; height: number };
  scanResults: PythonScanResult[];
  exportAllowed: boolean;
  artisticScore: number;
  provenance: {
    generationMode: string;
    provider?: string;
    modelVersion?: string;
    adapterVersion: string;
    validationVersion: string;
    createdAt: string;
  };
}

export interface PythonScanResult {
  pass: boolean;
  decoder: string;
  version: string;
  thresholdVersion: string;
  scannedPayload: string;
  tests: Array<{
    name: string;
    pass: boolean;
    scale: number;
    perturbation?: string;
    details?: Record<string, unknown>;
  }>;
  overallConfidence: 'high' | 'medium' | 'low' | 'failed';
}

export interface ProviderCallOptions {
  scriptPath?: string;
  pythonExecutable?: string;
  timeoutMs?: number;
  killGraceMs?: number;
  maxOutputBytes?: number;
  maxAttempts?: number;
  signal?: AbortSignal;
}

export class ProviderAdapterError extends Error {
  constructor(
    public readonly code:
      | 'PROVIDER_UNAVAILABLE'
      | 'PROVIDER_TIMEOUT'
      | 'CANCELLED'
      | 'PROVIDER_OUTPUT_LIMIT'
      | 'MALFORMED_PROVIDER_OUTPUT'
      | 'PROVIDER_FAILED',
    message: string,
    public readonly retryable: boolean,
  ) {
    super(`${code}: ${message}`);
    this.name = 'ProviderAdapterError';
  }
}

export async function callProviderGenerative(
  request: Record<string, unknown>,
  options: ProviderCallOptions | number = {},
): Promise<PythonBoardResult> {
  const normalizedOptions: ProviderCallOptions = typeof options === 'number' ? { timeoutMs: options } : options;
  const attempts = clampInteger(normalizedOptions.maxAttempts ?? 1, 1, 3);
  let lastError: ProviderAdapterError | undefined;
  for (let attempt = 1; attempt <= attempts; attempt += 1) {
    try {
      return await runProviderOnce(request, normalizedOptions);
    } catch (error) {
      const classified = error instanceof ProviderAdapterError
        ? error
        : new ProviderAdapterError('PROVIDER_FAILED', error instanceof Error ? error.message : String(error), true);
      lastError = classified;
      if (!classified.retryable || classified.code === 'CANCELLED' || attempt === attempts) throw classified;
    }
  }
  throw lastError ?? new ProviderAdapterError('PROVIDER_FAILED', 'Provider failed without an error', false);
}

export async function isProviderGenerativeAvailable(options: ProviderCallOptions = {}): Promise<boolean> {
  try {
    resolvePythonScript(options.scriptPath);
    return true;
  } catch {
    return false;
  }
}

function runProviderOnce(request: Record<string, unknown>, options: ProviderCallOptions): Promise<PythonBoardResult> {
  const scriptPath = resolvePythonScript(options.scriptPath);
  const pythonExecutable = options.pythonExecutable ?? process.env.QR_CREATOR_PYTHON ?? 'python3';
  const timeoutMs = clampInteger(options.timeoutMs ?? 300_000, 1, 900_000);
  // The bridge's Replicate cancellation POST is bounded to eight seconds.
  const killGraceMs = clampInteger(options.killGraceMs ?? 10_000, 0, 30_000);
  const maxOutputBytes = clampInteger(options.maxOutputBytes ?? 8 * 1024 * 1024, 1_024, 32 * 1024 * 1024);

  if (options.signal?.aborted) {
    return Promise.reject(new ProviderAdapterError('CANCELLED', 'Generation was cancelled before launch', false));
  }

  return new Promise((resolvePromise, rejectPromise) => {
    let child: ChildProcessWithoutNullStreams;
    try {
      child = spawn(pythonExecutable, [scriptPath], {
        cwd: dirname(scriptPath),
        env: {
          ...process.env,
          PYTHONPATH: [dirname(scriptPath), process.env.PYTHONPATH].filter(Boolean).join(':'),
        },
        detached: process.platform !== 'win32',
        stdio: ['pipe', 'pipe', 'pipe'],
      });
    } catch (error) {
      rejectPromise(new ProviderAdapterError('PROVIDER_UNAVAILABLE', error instanceof Error ? error.message : String(error), false));
      return;
    }

    let stdout: Buffer = Buffer.alloc(0);
    let stderr: Buffer = Buffer.alloc(0);
    let terminalError: ProviderAdapterError | undefined;
    let killTimer: NodeJS.Timeout | undefined;
    let settled = false;

    const stop = (): void => {
      sendSignal(child, 'SIGTERM');
      killTimer = setTimeout(() => sendSignal(child, 'SIGKILL'), killGraceMs);
      killTimer.unref?.();
    };
    const abort = (): void => {
      if (!terminalError) terminalError = new ProviderAdapterError('CANCELLED', 'Generation was cancelled', false);
      stop();
    };
    const timeout = setTimeout(() => {
      if (!terminalError) terminalError = new ProviderAdapterError('PROVIDER_TIMEOUT', `Provider exceeded ${timeoutMs}ms`, true);
      stop();
    }, timeoutMs);
    timeout.unref?.();
    options.signal?.addEventListener('abort', abort, { once: true });

    const finish = (error?: ProviderAdapterError, result?: PythonBoardResult): void => {
      if (settled) return;
      settled = true;
      clearTimeout(timeout);
      if (killTimer) clearTimeout(killTimer);
      options.signal?.removeEventListener('abort', abort);
      if (error) rejectPromise(error);
      else resolvePromise(result!);
    };

    const append = (current: Buffer, chunk: Buffer): Buffer => {
      if (current.length + chunk.length > maxOutputBytes) {
        terminalError = new ProviderAdapterError('PROVIDER_OUTPUT_LIMIT', `Provider output exceeded ${maxOutputBytes} bytes`, false);
        stop();
        return current;
      }
      return Buffer.concat([current, chunk]);
    };

    child.stdout.on('data', (chunk: Buffer) => { stdout = append(stdout, chunk); });
    child.stderr.on('data', (chunk: Buffer) => { stderr = append(stderr, chunk); });
    child.on('error', (error) => {
      finish(new ProviderAdapterError('PROVIDER_UNAVAILABLE', `Unable to spawn ${pythonExecutable}: ${error.message}`, false));
    });
    child.on('close', (code, signal) => {
      if (terminalError) { finish(terminalError); return; }
      if (code !== 0) {
        finish(new ProviderAdapterError(
          'PROVIDER_FAILED',
          `Provider process exited unsuccessfully (${code ?? 'unknown'}${signal ? `/${signal}` : ''})`,
          true,
        ));
        return;
      }
      let parsed: unknown;
      try {
        parsed = JSON.parse(stdout.toString('utf8').trim());
      } catch (error) {
        finish(new ProviderAdapterError(
          'MALFORMED_PROVIDER_OUTPUT',
          error instanceof Error ? error.message : 'Provider returned invalid JSON',
          false,
        ));
        return;
      }
      try {
        finish(undefined, validateBoardResult(parsed));
      } catch (error) {
        finish(error instanceof ProviderAdapterError
          ? error
          : new ProviderAdapterError('MALFORMED_PROVIDER_OUTPUT', error instanceof Error ? error.message : String(error), false));
      }
    });
    child.stdin.on('error', () => { /* close/error events classify process outcome */ });
    child.stdin.end(JSON.stringify(request));
  });
}

function resolvePythonScript(explicitPath?: string): string {
  const configured = explicitPath ?? process.env.QR_CREATOR_GEN_SCRIPT;
  if (configured) return requireScript(configured);
  if (process.env.QR_CREATOR_GEN_DIR) {
    return requireScript(join(process.env.QR_CREATOR_GEN_DIR, 'provider_generative.py'));
  }
  return requireScript(join(moduleDir, '..', 'provider', 'provider_generative.py'));
}

function requireScript(candidate: string): string {
  const path = isAbsolute(candidate) ? candidate : resolve(process.cwd(), candidate);
  try {
    if (statSync(path).isFile()) return path;
  } catch { /* classified below */ }
  throw new ProviderAdapterError(
    'PROVIDER_UNAVAILABLE',
    `Provider script not found: ${path}; set QR_CREATOR_GEN_SCRIPT or QR_CREATOR_GEN_DIR explicitly`,
    false,
  );
}

function sendSignal(child: ChildProcessWithoutNullStreams, signal: NodeJS.Signals): void {
  if (child.exitCode !== null || child.signalCode !== null) return;
  try {
    if (process.platform !== 'win32' && child.pid) process.kill(-child.pid, signal);
    else child.kill(signal);
  } catch { /* process already exited */ }
}

function clampInteger(value: number, minimum: number, maximum: number): number {
  if (!Number.isFinite(value)) return minimum;
  return Math.min(maximum, Math.max(minimum, Math.round(value)));
}

function validateBoardResult(value: unknown): PythonBoardResult {
  if (!isRecord(value)) throw new ProviderAdapterError('MALFORMED_PROVIDER_OUTPUT', 'Result must be an object', false);
  if (typeof value.boardId !== 'string' || !isRecord(value.request) || !Array.isArray(value.candidates)) {
    throw new ProviderAdapterError('MALFORMED_PROVIDER_OUTPUT', 'Missing boardId, request, or candidates', false);
  }
  if (value.status !== 'completed' && value.status !== 'failed' && value.status !== 'cancelled') {
    throw new ProviderAdapterError('MALFORMED_PROVIDER_OUTPUT', 'Invalid board status', false);
  }
  if (value.candidates.length > 4 || (value.status === 'completed' && value.candidates.length < 1)) {
    throw new ProviderAdapterError('MALFORMED_PROVIDER_OUTPUT', 'Candidate count violates contract bounds', false);
  }
  if (!value.candidates.every(isCandidate)) {
    throw new ProviderAdapterError('MALFORMED_PROVIDER_OUTPUT', 'Malformed candidate', false);
  }
  if (
    typeof value.totalLatencyMs !== 'number' || !Number.isFinite(value.totalLatencyMs) || value.totalLatencyMs < 0 ||
    typeof value.totalCostEstimate !== 'number' || !Number.isFinite(value.totalCostEstimate) || value.totalCostEstimate < 0
  ) {
    throw new ProviderAdapterError('MALFORMED_PROVIDER_OUTPUT', 'Missing latency/cost evidence', false);
  }
  return value as unknown as PythonBoardResult;
}

function isCandidate(value: unknown): value is PythonCandidate {
  if (!isRecord(value) || typeof value.candidateId !== 'string' || !UUID_PATTERN.test(value.candidateId) || typeof value.matrixRef !== 'string' || value.matrixRef.length === 0) return false;
  if (!isRecord(value.rendered) || typeof value.rendered.data !== 'string' || value.rendered.data.length === 0) return false;
  if (value.rendered.format !== 'svg' && value.rendered.format !== 'png-dataurl') return false;
  if (
    typeof value.rendered.width !== 'number' || !Number.isInteger(value.rendered.width) || value.rendered.width < 1 || value.rendered.width > 4096 ||
    typeof value.rendered.height !== 'number' || !Number.isInteger(value.rendered.height) || value.rendered.height < 1 || value.rendered.height > 4096
  ) return false;
  if (!Array.isArray(value.scanResults) || typeof value.exportAllowed !== 'boolean') return false;
  if (typeof value.artisticScore !== 'number' || !Number.isFinite(value.artisticScore) || value.artisticScore < 0 || value.artisticScore > 1) return false;
  if (!isRecord(value.provenance)) return false;
  return value.provenance.generationMode === 'provider_generative'
    && typeof value.provenance.adapterVersion === 'string'
    && typeof value.provenance.validationVersion === 'string'
    && typeof value.provenance.createdAt === 'string'
    && Number.isFinite(Date.parse(value.provenance.createdAt));
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}
