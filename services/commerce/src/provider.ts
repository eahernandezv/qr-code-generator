import { createHmac, timingSafeEqual } from 'node:crypto'
import type { OfferId, PaymentEvent } from './types.js'

export interface CheckoutProvider {
  readonly name: 'mock' | 'stripe'
  createCheckout(input: { checkoutSessionId: string; offerId: OfferId; amountCents: number; currency: 'USD'; idempotencyKey: string }): Promise<{ providerSessionId: string; redirectUrl: string }>
  verifyWebhook(rawPayload: string, signature: string): PaymentEvent
}

/** No-network test adapter. Signature verification occurs here, before the domain service sees an event. */
export class MockCheckoutProvider implements CheckoutProvider {
  readonly name = 'mock' as const
  createCalls = 0
  failNext = false
  constructor(private readonly webhookSecret = 'local-test-webhook-secret-not-production') {}
  async createCheckout(input: { checkoutSessionId: string; offerId: OfferId; amountCents: number; currency: 'USD'; idempotencyKey: string }) {
    this.createCalls += 1
    if (this.failNext) { this.failNext = false; throw new CommerceProviderError('Payment service is temporarily unavailable.') }
    return { providerSessionId: `mock_${input.checkoutSessionId}`, redirectUrl: `mock-checkout:${input.checkoutSessionId}` }
  }
  signWebhook(rawPayload: string): string { return createHmac('sha256', this.webhookSecret).update(rawPayload).digest('hex') }
  verifyWebhook(rawPayload: string, signature: string): PaymentEvent {
    const expected = this.signWebhook(rawPayload)
    const supplied = /^[a-f0-9]{64}$/i.test(signature) ? Buffer.from(signature, 'hex') : Buffer.alloc(0)
    const wanted = Buffer.from(expected, 'hex')
    if (supplied.length !== wanted.length || !timingSafeEqual(supplied, wanted)) throw new CommerceProviderError('Payment webhook signature is invalid.', 'payment_unverified')
    let parsed: unknown
    try { parsed = JSON.parse(rawPayload) } catch { throw new CommerceProviderError('Payment webhook payload is invalid.', 'bad_request') }
    if (!isPaymentEvent(parsed)) throw new CommerceProviderError('Payment webhook payload is invalid.', 'bad_request')
    return parsed
  }
}
function isPaymentEvent(value: unknown): value is PaymentEvent {
  if (!value || typeof value !== 'object') return false
  const event = value as Record<string, unknown>
  return typeof event.providerEventId === 'string' && typeof event.checkoutSessionId === 'string' &&
    (event.type === 'succeeded' || event.type === 'failed' || event.type === 'canceled') && typeof event.occurredAt === 'string' &&
    (event.failureReason === undefined || typeof event.failureReason === 'string')
}
export class CommerceProviderError extends Error {
  constructor(message: string, readonly code: 'payment_provider_error' | 'payment_unverified' | 'bad_request' = 'payment_provider_error') { super(message); this.name = 'CommerceProviderError' }
}
