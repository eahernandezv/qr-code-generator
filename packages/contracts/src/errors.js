// QR MVP Error Taxonomy — frozen contract v1
// Owned by WS-01 Contract Foundation; consumed by all services.
// NEVER expose stack traces, provider secrets, DNS tokens, or cross-tenant existence.

export const ErrorCodes = Object.freeze({
  BAD_REQUEST: 'BAD_REQUEST',
  UNAUTHORIZED: 'UNAUTHORIZED',
  FORBIDDEN: 'FORBIDDEN',
  NOT_FOUND: 'NOT_FOUND',
  CONFLICT: 'CONFLICT',
  TOO_MANY_REQUESTS: 'TOO_MANY_REQUESTS',
  INTERNAL_ERROR: 'INTERNAL_ERROR',
  SERVICE_UNAVAILABLE: 'SERVICE_UNAVAILABLE',
  TIMEOUT: 'TIMEOUT',
  PAYLOAD_TOO_LARGE: 'PAYLOAD_TOO_LARGE',
  UNSUPPORTED_MEDIA: 'UNSUPPORTED_MEDIA',
  VALIDATION_ERROR: 'VALIDATION_ERROR',
  RATE_LIMIT_EXCEEDED: 'RATE_LIMIT_EXCEEDED',
  COST_CAP_EXCEEDED: 'COST_CAP_EXCEEDED',
  PROVIDER_ERROR: 'PROVIDER_ERROR',
  PROVIDER_TIMEOUT: 'PROVIDER_TIMEOUT',
  GENERATION_FAILED: 'GENERATION_FAILED',
  SCAN_VALIDATION_FAILED: 'SCAN_VALIDATION_FAILED',
  UNSAFE_INPUT: 'UNSAFE_INPUT',
  CONTENT_MODERATED: 'CONTENT_MODERATED',
  ENTITLEMENT_EXHAUSTED: 'ENTITLEMENT_EXHAUSTED',
  IDEMPOTENCY_KEY_REUSED: 'IDEMPOTENCY_KEY_REUSED',
  TENANT_ISOLATION_VIOLATION: 'TENANT_ISOLATION_VIOLATION',
  SECRET_ROTATION_REQUIRED: 'SECRET_ROTATION_REQUIRED',
  FEATURE_DISABLED: 'FEATURE_DISABLED',
});

/** @typedef {keyof typeof ErrorCodes} ErrorCode */

/**
 * @param {ErrorCode} code
 * @param {string} message
 * @param {string} requestId
 * @param {object} [options]
 * @param {Array<{field: string, issue: string, code?: string}>} [options.details]
 * @param {boolean} [options.retryable]
 * @param {number} [options.retryAfterMs]
 * @returns {{code: string, message: string, request_id: string, details?: Array, retryable?: boolean, retry_after_ms?: number}}
 */
export function buildErrorEnvelope(code, message, requestId, options = {}) {
  if (!ErrorCodes[code]) {
    throw new Error(`Unknown error code: ${code}`);
  }
  if (!requestId || typeof requestId !== 'string') {
    throw new Error('request_id is required');
  }
  const envelope = {
    code,
    message: String(message).slice(0, 512),
    request_id: requestId,
  };
  if (options.details && Array.isArray(options.details)) {
    envelope.details = options.details;
  }
  if (typeof options.retryable === 'boolean') {
    envelope.retryable = options.retryable;
  }
  if (typeof options.retryAfterMs === 'number' && options.retryAfterMs >= 0) {
    envelope.retry_after_ms = Math.floor(options.retryAfterMs);
  }
  return Object.freeze(envelope);
}

/**
 * Map known exception types to stable error codes.
 * @param {Error} err
 * @param {string} requestId
 * @returns {ReturnType<typeof buildErrorEnvelope>}
 */
export function mapExceptionToError(err, requestId) {
  const name = err?.name || '';
  const code =
    name === 'TimeoutError' ? ErrorCodes.TIMEOUT :
    name === 'AbortError' ? ErrorCodes.TIMEOUT :
    err?.code === 'ECONNREFUSED' ? ErrorCodes.SERVICE_UNAVAILABLE :
    err?.code === 'ENOTFOUND' ? ErrorCodes.SERVICE_UNAVAILABLE :
    err?.code === 'ETIMEDOUT' ? ErrorCodes.PROVIDER_TIMEOUT :
    err?.statusCode === 429 ? ErrorCodes.RATE_LIMIT_EXCEEDED :
    err?.statusCode >= 500 ? ErrorCodes.PROVIDER_ERROR :
    ErrorCodes.INTERNAL_ERROR;

  const retryable = [
    ErrorCodes.TIMEOUT,
    ErrorCodes.PROVIDER_TIMEOUT,
    ErrorCodes.SERVICE_UNAVAILABLE,
    ErrorCodes.PROVIDER_ERROR,
    ErrorCodes.RATE_LIMIT_EXCEEDED,
  ].includes(code);

  return buildErrorEnvelope(code, err?.message || 'Internal error', requestId, { retryable });
}
