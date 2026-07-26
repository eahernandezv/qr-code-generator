/**
 * Error Taxonomy v1
 * Stable error codes for all QR MVP services.
 * Never expose stack traces, secrets, or cross-tenant existence.
 */

export const ErrorCodes = {
  // Payload / Input errors (4xx class)
  PAYLOAD_EMPTY: 'PAYLOAD_EMPTY',
  PAYLOAD_TOO_LONG: 'PAYLOAD_TOO_LONG',
  PAYLOAD_MALFORMED: 'PAYLOAD_MALFORMED',
  PAYLOAD_UNSUPPORTED_SCHEME: 'PAYLOAD_UNSUPPORTED_SCHEME',
  PAYLOAD_UNSAFE_CONTENT: 'PAYLOAD_UNSAFE_CONTENT',

  // QR Core errors
  QR_GENERATION_FAILED: 'QR_GENERATION_FAILED',
  QR_MASK_INVALID: 'QR_MASK_INVALID',
  QR_RENDER_FAILED: 'QR_RENDER_FAILED',

  // Artistic generation errors
  ARTISTIC_UNSAFE_PROMPT: 'ARTISTIC_UNSAFE_PROMPT',
  ARTISTIC_UNSAFE_REFERENCE_IMAGE: 'ARTISTIC_UNSAFE_REFERENCE_IMAGE',
  ARTISTIC_PROVIDER_TIMEOUT: 'ARTISTIC_PROVIDER_TIMEOUT',
  ARTISTIC_PROVIDER_FAILURE: 'ARTISTIC_PROVIDER_FAILURE',
  ARTISTIC_UNSCANNABLE_OUTPUT: 'ARTISTIC_UNSCANNABLE_OUTPUT',
  ARTISTIC_EXHAUSTED_ALLOWANCE: 'ARTISTIC_EXHAUSTED_ALLOWANCE',
  ARTISTIC_EXPORT_BLOCKED: 'ARTISTIC_EXPORT_BLOCKED',
  ARTISTIC_CONTENT_POLICY_VIOLATION: 'ARTISTIC_CONTENT_POLICY_VIOLATION',

  // Validation / Scan errors
  SCAN_VALIDATION_FAILED: 'SCAN_VALIDATION_FAILED',
  THRESHOLD_NOT_MET: 'THRESHOLD_NOT_MET',
  REPAIR_FAILED: 'REPAIR_FAILED',

  // Commerce errors
  CHECKOUT_NOT_FOUND: 'CHECKOUT_NOT_FOUND',
  PAYMENT_FAILED: 'PAYMENT_FAILED',
  PAYMENT_IDEMPOTENCY_VIOLATION: 'PAYMENT_IDEMPOTENCY_VIOLATION',
  WEBHOOK_VERIFICATION_FAILED: 'WEBHOOK_VERIFICATION_FAILED',
  WEBHOOK_REPLAY_REJECTED: 'WEBHOOK_REPLAY_REJECTED',
  ALLOWANCE_EXHAUSTED: 'ALLOWANCE_EXHAUSTED',
  OFFER_INVALID: 'OFFER_INVALID',
  GUEST_RECOVERY_INVALID: 'GUEST_RECOVERY_INVALID',

  // Entitlement errors
  ENTITLEMENT_NOT_FOUND: 'ENTITLEMENT_NOT_FOUND',
  ENTITLEMENT_EXPIRED: 'ENTITLEMENT_EXPIRED',
  ENTITLEMENT_CONSUMED: 'ENTITLEMENT_CONSUMED',
  ENTITLEMENT_TENANT_MISMATCH: 'ENTITLEMENT_TENANT_MISMATCH',

  // System errors (5xx class)
  INTERNAL_ERROR: 'INTERNAL_ERROR',
  SERVICE_UNAVAILABLE: 'SERVICE_UNAVAILABLE',
  PROVIDER_UNAVAILABLE: 'PROVIDER_UNAVAILABLE',
  TIMEOUT: 'TIMEOUT',
};

export const ErrorMessages = {
  [ErrorCodes.PAYLOAD_EMPTY]: 'Payload cannot be empty.',
  [ErrorCodes.PAYLOAD_TOO_LONG]: 'Payload exceeds maximum supported length.',
  [ErrorCodes.PAYLOAD_MALFORMED]: 'Payload format is invalid.',
  [ErrorCodes.PAYLOAD_UNSUPPORTED_SCHEME]: 'URL scheme is not supported.',
  [ErrorCodes.PAYLOAD_UNSAFE_CONTENT]: 'Payload contains unsafe content.',
  [ErrorCodes.QR_GENERATION_FAILED]: 'QR generation failed. Try a shorter payload or different settings.',
  [ErrorCodes.QR_MASK_INVALID]: 'QR mask selection failed.',
  [ErrorCodes.QR_RENDER_FAILED]: 'QR rendering failed.',
  [ErrorCodes.ARTISTIC_UNSAFE_PROMPT]: 'Prompt violates content safety policy.',
  [ErrorCodes.ARTISTIC_UNSAFE_REFERENCE_IMAGE]: 'Reference image violates content safety policy.',
  [ErrorCodes.ARTISTIC_PROVIDER_TIMEOUT]: 'Generation provider timed out. Retrying or falling back.',
  [ErrorCodes.ARTISTIC_PROVIDER_FAILURE]: 'Generation provider failed. A safe fallback is available.',
  [ErrorCodes.ARTISTIC_UNSCANNABLE_OUTPUT]: 'Generated candidate does not scan reliably. Regenerate or adjust strength.',
  [ErrorCodes.ARTISTIC_EXHAUSTED_ALLOWANCE]: 'Generation allowance is exhausted. Purchase additional exploration.',
  [ErrorCodes.ARTISTIC_EXPORT_BLOCKED]: 'Export blocked: candidate did not pass scan validation.',
  [ErrorCodes.ARTISTIC_CONTENT_POLICY_VIOLATION]: 'Content policy violation. Review acceptable use guidelines.',
  [ErrorCodes.SCAN_VALIDATION_FAILED]: 'Scan validation suite failed to complete.',
  [ErrorCodes.THRESHOLD_NOT_MET]: 'Scan confidence below approved threshold.',
  [ErrorCodes.REPAIR_FAILED]: 'Automated repair could not restore scannability.',
  [ErrorCodes.CHECKOUT_NOT_FOUND]: 'Checkout session not found.',
  [ErrorCodes.PAYMENT_FAILED]: 'Payment could not be completed.',
  [ErrorCodes.PAYMENT_IDEMPOTENCY_VIOLATION]: 'Duplicate payment attempt detected.',
  [ErrorCodes.WEBHOOK_VERIFICATION_FAILED]: 'Webhook signature verification failed.',
  [ErrorCodes.WEBHOOK_REPLAY_REJECTED]: 'Replayed webhook rejected.',
  [ErrorCodes.ALLOWANCE_EXHAUSTED]: 'Allowance exhausted.',
  [ErrorCodes.OFFER_INVALID]: 'Selected offer is not valid.',
  [ErrorCodes.GUEST_RECOVERY_INVALID]: 'Recovery token is invalid or expired.',
  [ErrorCodes.ENTITLEMENT_NOT_FOUND]: 'Entitlement not found.',
  [ErrorCodes.ENTITLEMENT_EXPIRED]: 'Entitlement has expired.',
  [ErrorCodes.ENTITLEMENT_CONSUMED]: 'Entitlement has already been consumed.',
  [ErrorCodes.ENTITLEMENT_TENANT_MISMATCH]: 'Entitlement does not belong to this tenant.',
  [ErrorCodes.INTERNAL_ERROR]: 'An internal error occurred. Please try again later.',
  [ErrorCodes.SERVICE_UNAVAILABLE]: 'Service temporarily unavailable.',
  [ErrorCodes.PROVIDER_UNAVAILABLE]: 'External provider temporarily unavailable.',
  [ErrorCodes.TIMEOUT]: 'Request timed out.',
};

export const RetryableCodes = new Set([
  ErrorCodes.ARTISTIC_PROVIDER_TIMEOUT,
  ErrorCodes.ARTISTIC_PROVIDER_FAILURE,
  ErrorCodes.SCAN_VALIDATION_FAILED,
  ErrorCodes.INTERNAL_ERROR,
  ErrorCodes.SERVICE_UNAVAILABLE,
  ErrorCodes.PROVIDER_UNAVAILABLE,
  ErrorCodes.TIMEOUT,
]);

export function isRetryable(code) {
  return RetryableCodes.has(code);
}
