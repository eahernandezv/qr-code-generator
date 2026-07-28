import type { CheckoutSession, OfferId } from './types.js'

export interface CheckoutProvider {
  readonly name: 'mock' | 'stripe'
  createCheckout(input: {
    checkoutSessionId: string
    offerId: OfferId
    amountCents: number
    currency: 'USD'
    idempotencyKey: string
  }): Promise<{ providerSessionId: string; redirectUrl: string }>
}

/** Test-mode adapter only. It never performs a network request or charge. */
export class MockCheckoutProvider implements CheckoutProvider {
  readonly name = 'mock' as const
  createCalls = 0
  failNext = false

  async createCheckout(input: {
    checkoutSessionId: string
    offerId: OfferId
    amountCents: number
    currency: 'USD'
    idempotencyKey: string
  }): Promise<{ providerSessionId: string; redirectUrl: string }> {
    this.createCalls += 1
    if (this.failNext) {
      this.failNext = false
      throw new CommerceProviderError('Payment service is temporarily unavailable.')
    }
    return {
      providerSessionId: `mock_${input.checkoutSessionId}`,
      redirectUrl: `mock-checkout:${input.checkoutSessionId}`,
    }
  }
}

export class CommerceProviderError extends Error {
  readonly code = 'payment_provider_error'
}

export function isTerminalCheckout(session: CheckoutSession): boolean {
  return session.status === 'succeeded' || session.status === 'expired'
}
