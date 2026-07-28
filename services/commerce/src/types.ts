export type OfferId = 'artistic_project' | 'extra_exploration'
export type CheckoutStatus = 'pending' | 'succeeded' | 'failed' | 'canceled' | 'expired'
export type PaymentEventType = 'succeeded' | 'failed' | 'canceled'

export interface Offer {
  offer_id: OfferId
  amount_cents: number
  currency: 'USD'
  total_rounds_allowed: number
  total_candidates_allowed: number
  exports_allowed: number
}

export interface CheckoutSession {
  checkoutSessionId: string
  projectId: string
  offerId: OfferId
  status: CheckoutStatus
  amountCents: number
  currency: 'USD'
  idempotencyKey: string
  provider: 'mock' | 'stripe'
  providerSessionId: string
  createdAt: string
  updatedAt: string
  accessTokenHash: string
  failureReason?: string
}

export interface EntitlementSnapshot {
  projectId: string
  status: 'pending' | 'active' | 'revoked' | 'expired'
  totalRounds: number
  roundsConsumed: number
  totalCandidates: number
  candidatesConsumed: number
  totalFinishedArtworks: number
  finishedArtworksConsumed: number
  extraExplorationPurchased: boolean
  updatedAt: string
}

export interface StartCheckoutInput {
  offerId: OfferId
  idempotencyKey: string
  projectAccessToken?: string
}

export interface StartCheckoutResult {
  session: CheckoutSession
  redirectUrl: string
  /** In-memory project capability. Never persist or log this value. */
  projectAccessToken?: string
  /** One-time recovery capability. Returned only for a new $12 project. */
  recoveryCode?: string
}

export interface PaymentEvent {
  providerEventId: string
  checkoutSessionId: string
  type: PaymentEventType
  occurredAt: string
  /** True only after the provider adapter validates the webhook signature. */
  verified: boolean
  failureReason?: string
}

export interface PaymentEventResult {
  duplicate: boolean
  ignoredAsStale: boolean
  session: CheckoutSession
  entitlement?: EntitlementSnapshot
}

export interface RecoveryResult {
  projectId: string
  projectAccessToken: string
  replacementRecoveryCode: string
  entitlement: EntitlementSnapshot
}

export interface GenerationResult {
  operationId: string
  outcome: 'succeeded' | 'failed' | 'canceled'
  candidateCount: number
}

export class CommerceError extends Error {
  constructor(
    readonly code:
      | 'bad_request'
      | 'offer_not_found'
      | 'idempotency_key_mismatch'
      | 'checkout_session_not_found'
      | 'project_access_invalid'
      | 'project_access_expired'
      | 'project_access_replayed'
      | 'payment_unverified'
      | 'rounds_exhausted'
      | 'candidates_exhausted'
      | 'exports_exhausted',
    message: string,
  ) {
    super(message)
    this.name = 'CommerceError'
  }
}
