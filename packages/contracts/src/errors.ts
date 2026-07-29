/**
 * @qr/contracts — Error taxonomy v1
 *
 * Stable error codes for all QR services.
 * Rules:
 * - Never expose stack traces, provider secrets, or raw provider IDs.
 * - Always include request_id in the HTTP response.
 * - retryable=true only when the request may succeed unchanged on retry.
 */

export type ErrorCode =
  // Generic / boundary
  | 'unauthorized'
  | 'forbidden'
  | 'not_found'
  | 'conflict'
  | 'too_many_requests'
  | 'internal_error'
  | 'service_unavailable'
  | 'bad_request'
  | 'validation_failed'

  // Commerce / payment
  | 'checkout_session_expired'
  | 'checkout_session_not_found'
  | 'idempotency_key_reused'
  | 'idempotency_key_mismatch'
  | 'payment_provider_error'
  | 'payment_unverified'
  | 'payment_already_processed'
  | 'payment_refund_not_allowed'
  | 'webhook_signature_invalid'
  | 'webhook_payload_invalid'
  | 'offer_not_found'
  | 'offer_unavailable'

  // Entitlement / project access
  | 'project_access_invalid'
  | 'project_access_expired'
  | 'project_access_revoked'
  | 'project_recovery_not_found'
  | 'rounds_exhausted'
  | 'candidates_exhausted'
  | 'exports_exhausted'
  | 'allowance_not_found'

  // Provider / infrastructure
  | 'provider_timeout'
  | 'provider_failure'
  | 'provider_unsafe_output'

  // QR / generation
  | 'qr_unscannable'
  | 'qr_payload_invalid'
  | 'generation_failed'
  | 'generation_aborted';

export interface ErrorDetail {
  field: string;
  issue: string;
}

export interface ErrorEnvelope {
  error: {
    code: ErrorCode;
    message: string;
    request_id: string;
    retryable?: boolean;
    details?: ErrorDetail[];
  };
}

export function buildError(
  code: ErrorCode,
  message: string,
  requestId: string,
  opts?: { retryable?: boolean; details?: ErrorDetail[] }
): ErrorEnvelope {
  return {
    error: {
      code,
      message,
      request_id: requestId,
      retryable: opts?.retryable ?? false,
      details: opts?.details,
    },
  };
}
