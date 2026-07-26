/**
 * Commerce service internal types.
 *
 * Guest-only. No customer accounts. All access is via opaque project tokens.
 */

export interface CheckoutSession {
  checkout_session_id: string;
  created_at: string;
  offer_id: 'artistic_project' | 'extra_exploration';
  amount: number;
  currency: string;
  status: 'pending' | 'succeeded' | 'failed' | 'canceled' | 'expired';
  idempotency_key: string;
  project_access_token_hash: string;
  provider: 'stripe';
  provider_checkout_session_id: string;
  canceled_at?: string;
  expires_at?: string;
  success_url?: string;
  cancel_url?: string;
  failure_reason?: string;
}

export interface PaymentEvent {
  event_id: string;
  event_type:
    | 'commerce.payment_succeeded.v1'
    | 'commerce.payment_failed.v1'
    | 'commerce.payment_refunded.v1'
    | 'commerce.payment_disputed.v1'
    | 'commerce.payment_canceled.v1';
  schema_version: '1.0.0';
  occurred_at: string;
  provider: 'stripe';
  provider_event_id: string;
  checkout_session_id: string;
  offer_id: 'artistic_project' | 'extra_exploration';
  amount: number;
  currency: string;
  status: 'succeeded' | 'failed' | 'refunded' | 'disputed' | 'canceled';
  project_access_token_hash: string;
  idempotency_key?: string;
  failure_reason?: string;
  refund_amount?: number;
}

export interface ArtisticProjectEntitlement {
  entitlement_id: string;
  schema_version: '1.0.0';
  created_at: string;
  updated_at: string;
  project_access_token_hash: string;
  offer_id: 'artistic_project' | 'extra_exploration';
  status: 'pending' | 'active' | 'consumed' | 'refunded' | 'revoked' | 'expired';
  total_rounds_allowed: number;
  rounds_consumed: number;
  total_candidates_allowed: number;
  candidates_consumed: number;
  exports_allowed: number;
  exports_consumed: number;
  checkout_session_id: string;
  expires_at?: string;
}

export interface ProjectAccessToken {
  token: string; // raw token, stored hashed in records
  project_access_token_hash: string;
  created_at: string;
  checkout_session_id: string;
}

export type OfferCatalog = Record<
  string,
  {
    offer_id: string;
    amount_cents: number;
    currency: string;
    total_rounds_allowed: number;
    total_candidates_allowed: number;
    exports_allowed: number;
  }
>;
