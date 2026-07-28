import { beforeEach, describe, expect, it } from 'vitest'
import { COMMERCE_OFFERS, guestCommerce } from './commerceClient'

beforeEach(() => guestCommerce.reset())

async function paidProject(projectId = 'project-test') {
  const checkout = await guestCommerce.startCheckout({
    projectId,
    offerId: 'artistic_project',
    idempotencyKey: crypto.randomUUID(),
  })
  const entitlement = await guestCommerce.completeTestPayment(checkout.checkoutSessionId)
  return { checkout, entitlement }
}

describe('browser commerce adapter contract', () => {
  it('uses frozen pricing and allowance values', () => {
    expect(COMMERCE_OFFERS.artistic_project).toEqual({ amountCents: 1200, rounds: 3, candidates: 12, artworks: 1 })
    expect(COMMERCE_OFFERS.extra_exploration).toEqual({ amountCents: 500, rounds: 2, candidates: 8, artworks: 1 })
  })

  it('does not consume failed or canceled rounds and de-duplicates successful operations', async () => {
    await paidProject()
    expect(await guestCommerce.recordGeneration({ operationId: 'failed', outcome: 'failed', candidateCount: 0 }))
      .toMatchObject({ roundsConsumed: 0, candidatesConsumed: 0 })
    expect(await guestCommerce.recordGeneration({ operationId: 'canceled', outcome: 'canceled', candidateCount: 0 }))
      .toMatchObject({ roundsConsumed: 0, candidatesConsumed: 0 })
    await guestCommerce.recordGeneration({ operationId: 'success', outcome: 'succeeded', candidateCount: 4 })
    expect(await guestCommerce.recordGeneration({ operationId: 'success', outcome: 'succeeded', candidateCount: 4 }))
      .toMatchObject({ roundsConsumed: 1, candidatesConsumed: 4 })
  })

  it('requires in-memory authoritative access even if caller claims paid state', async () => {
    await paidProject()
    guestCommerce.clearAccess()
    await expect(guestCommerce.authorizeExport({ exportRequestId: 'export-1', candidateId: 'candidate-1' }))
      .rejects.toMatchObject({ code: 'payment_unverified' })
  })

  it('rotates one-time recovery and rejects replay', async () => {
    const { checkout } = await paidProject()
    guestCommerce.clearAccess()
    const recovered = await guestCommerce.recover(checkout.recoveryCode!)
    expect(recovered.replacementRecoveryCode).not.toBe(checkout.recoveryCode)
    await expect(guestCommerce.recover(checkout.recoveryCode!)).rejects.toMatchObject({ code: 'project_access_replayed' })
  })
})
