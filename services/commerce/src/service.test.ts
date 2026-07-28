import { beforeEach, describe, expect, it } from 'vitest'
import { OFFER_CATALOG } from './lib/offers.js'
import { MockCheckoutProvider } from './provider.js'
import { JsonFileCommerceRepository } from './repository.js'
import { mkdtempSync, readFileSync, rmSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { CommerceService } from './service.js'
import { CommerceError, type PaymentEvent } from './types.js'

let now: number
let serial: number
let provider: MockCheckoutProvider
let service: CommerceService

beforeEach(() => {
  now = Date.parse('2026-07-28T10:00:00Z')
  serial = 0
  provider = new MockCheckoutProvider()
  service = new CommerceService(provider, {
    now: () => now,
    id: () => `id-${++serial}`,
    token: () => `test-capability-${++serial}-${'x'.repeat(32)}`,
  })
})

function event(
  checkoutSessionId: string,
  type: PaymentEvent['type'],
  providerEventId = `event-${++serial}`,
): PaymentEvent {
  return {
    providerEventId,
    checkoutSessionId,
    type,
    occurredAt: new Date(now).toISOString(),
  }
}

function deliver(target: CommerceService, adapter: MockCheckoutProvider, paymentEvent: PaymentEvent) {
  const raw = JSON.stringify(paymentEvent)
  return target.processPaymentWebhook(raw, adapter.signWebhook(raw))
}

async function buyProject() {
  const checkout = await service.startCheckout({
    offerId: 'artistic_project',
    idempotencyKey: `project-checkout-${++serial}`,
  })
  const result = deliver(service, provider, event(checkout.session.checkoutSessionId, 'succeeded'))
  return {
    ...checkout,
    accessToken: checkout.projectAccessToken!,
    entitlement: result.entitlement!,
  }
}

describe('frozen offer catalog', () => {
  it('implements exact $12 project and $5 Extra Exploration allowances', () => {
    expect(OFFER_CATALOG.artistic_project).toMatchObject({
      amount_cents: 1200,
      total_rounds_allowed: 3,
      total_candidates_allowed: 12,
      exports_allowed: 1,
    })
    expect(OFFER_CATALOG.extra_exploration).toMatchObject({
      amount_cents: 500,
      total_rounds_allowed: 2,
      total_candidates_allowed: 8,
      exports_allowed: 1,
    })
  })
})

describe('checkout and payment idempotency', () => {
  it('returns one checkout for a safe retry and rejects key reuse with changed input', async () => {
    const first = await service.startCheckout({ offerId: 'artistic_project', idempotencyKey: 'retry-key' })
    const retry = await service.startCheckout({ offerId: 'artistic_project', idempotencyKey: 'retry-key' })
    expect(retry.session.checkoutSessionId).toBe(first.session.checkoutSessionId)
    expect(provider.createCalls).toBe(1)
    await expect(service.startCheckout({
      offerId: 'extra_exploration',
      idempotencyKey: 'retry-key',
      projectAccessToken: first.projectAccessToken,
    })).rejects.toMatchObject({ code: 'idempotency_key_mismatch' })
  })

  it('surfaces provider failures without creating a retry-key reservation', async () => {
    provider.failNext = true
    await expect(service.startCheckout({ offerId: 'artistic_project', idempotencyKey: 'provider-retry' }))
      .rejects.toMatchObject({ code: 'payment_provider_error' })
    const retry = await service.startCheckout({ offerId: 'artistic_project', idempotencyKey: 'provider-retry' })
    expect(retry.session.status).toBe('pending')
    expect(provider.createCalls).toBe(2)
  })

  it('does not double-grant duplicate success and ignores reordered failure after success', async () => {
    const checkout = await service.startCheckout({ offerId: 'artistic_project', idempotencyKey: 'payment-order' })
    const success = event(checkout.session.checkoutSessionId, 'succeeded', 'provider-success')
    const first = deliver(service, provider, success)
    const duplicate = deliver(service, provider, success)
    const staleFailure = deliver(service, provider, event(checkout.session.checkoutSessionId, 'failed', 'provider-failed-late'))
    expect(first.entitlement?.totalCandidates).toBe(12)
    expect(duplicate.duplicate).toBe(true)
    expect(duplicate.entitlement?.totalCandidates).toBe(12)
    expect(staleFailure.ignoredAsStale).toBe(true)
    expect(staleFailure.session.status).toBe('succeeded')
  })

  it('verifies raw signatures and rejects invalid or modified payloads before mutation', async () => {
    const checkout = await service.startCheckout({ offerId: 'artistic_project', idempotencyKey: 'signed-event' })
    const payment = event(checkout.session.checkoutSessionId, 'succeeded'); const raw = JSON.stringify(payment)
    expect(() => service.processPaymentWebhook(raw, '0'.repeat(64))).toThrowError(expect.objectContaining({ code: 'payment_unverified' }))
    expect(() => service.processPaymentWebhook(raw.replace('succeeded', 'failed'), provider.signWebhook(raw))).toThrowError(expect.objectContaining({ code: 'payment_unverified' }))
    expect(service.checkoutStatus(checkout.session.checkoutSessionId).status).toBe('pending')
    expect(service.processPaymentWebhook(raw, provider.signWebhook(raw)).session.status).toBe('succeeded')
  })

  it('allows a verified success to supersede earlier failed or canceled delivery', async () => {
    for (const prior of ['failed', 'canceled'] as const) {
      const checkout = await service.startCheckout({ offerId: 'artistic_project', idempotencyKey: `recover-${prior}` })
      deliver(service, provider, event(checkout.session.checkoutSessionId, prior))
      const recovered = deliver(service, provider, event(checkout.session.checkoutSessionId, 'succeeded'))
      expect(recovered.session.status).toBe('succeeded')
      expect(recovered.entitlement?.status).toBe('active')
    }
  })
})

describe('authoritative allowance and export mutations', () => {
  it('consumes only successful candidate rounds and keeps retries idempotent', async () => {
    const project = await buyProject()
    const failed = service.recordGeneration(project.accessToken, {
      operationId: 'round-failed', outcome: 'failed', candidateCount: 0,
    })
    const canceled = service.recordGeneration(project.accessToken, {
      operationId: 'round-canceled', outcome: 'canceled', candidateCount: 0,
    })
    const success = service.recordGeneration(project.accessToken, {
      operationId: 'round-success', outcome: 'succeeded', candidateCount: 4,
    })
    const retry = service.recordGeneration(project.accessToken, {
      operationId: 'round-success', outcome: 'succeeded', candidateCount: 4,
    })
    expect(failed.roundsConsumed).toBe(0)
    expect(canceled.roundsConsumed).toBe(0)
    expect(success).toMatchObject({ roundsConsumed: 1, candidatesConsumed: 4 })
    expect(retry).toMatchObject({ roundsConsumed: 1, candidatesConsumed: 4 })
  })

  it('enforces exhaustion then grants exactly eight candidates and one artwork once', async () => {
    const project = await buyProject()
    for (let round = 1; round <= 3; round += 1) {
      service.recordGeneration(project.accessToken, {
        operationId: `base-round-${round}`, outcome: 'succeeded', candidateCount: 4,
      })
    }
    expect(() => service.recordGeneration(project.accessToken, {
      operationId: 'base-round-4', outcome: 'succeeded', candidateCount: 4,
    })).toThrowError(expect.objectContaining({ code: 'rounds_exhausted' }))

    const extra = await service.startCheckout({
      offerId: 'extra_exploration',
      idempotencyKey: 'extra-checkout',
      projectAccessToken: project.accessToken,
    })
    const granted = deliver(service, provider, event(extra.session.checkoutSessionId, 'succeeded', 'extra-success'))
    const duplicate = deliver(service, provider, event(extra.session.checkoutSessionId, 'succeeded', 'extra-success'))
    expect(granted.entitlement).toMatchObject({
      totalRounds: 5,
      totalCandidates: 20,
      totalFinishedArtworks: 2,
      extraExplorationPurchased: true,
    })
    expect(duplicate.entitlement?.totalCandidates).toBe(20)
    service.recordGeneration(project.accessToken, {
      operationId: 'extra-round-1', outcome: 'succeeded', candidateCount: 4,
    })
    const final = service.recordGeneration(project.accessToken, {
      operationId: 'extra-round-2', outcome: 'succeeded', candidateCount: 4,
    })
    expect(final).toMatchObject({ roundsConsumed: 5, candidatesConsumed: 20 })
  })

  it('denies export without server access and authorizes one paid artwork idempotently', async () => {
    expect(() => service.authorizeExport('tampered-client-token', {
      exportRequestId: 'export-1', candidateId: 'candidate-1',
    })).toThrowError(expect.objectContaining({ code: 'project_access_invalid' }))
    const project = await buyProject()
    const first = service.authorizeExport(project.accessToken, {
      exportRequestId: 'export-1', candidateId: 'candidate-1',
    })
    const retry = service.authorizeExport(project.accessToken, {
      exportRequestId: 'export-1', candidateId: 'candidate-1',
    })
    expect(retry.authorizationId).toBe(first.authorizationId)
    expect(retry.entitlement.finishedArtworksConsumed).toBe(1)
    expect(service.authorizeExport(project.accessToken, {
      exportRequestId: 'export-2', candidateId: 'candidate-1',
    }).entitlement.finishedArtworksConsumed).toBe(1)
    expect(() => service.authorizeExport(project.accessToken, {
      exportRequestId: 'export-3', candidateId: 'candidate-2',
    })).toThrowError(expect.objectContaining({ code: 'exports_exhausted' }))
  })
})

describe('opaque guest recovery', () => {
  it('recovers once, rotates the code, and rejects replay or invalid input', async () => {
    const project = await buyProject()
    const recovered = service.recover(project.recoveryCode!)
    expect(recovered.projectId).toBe(project.session.projectId)
    expect(recovered.projectAccessToken).not.toBe(project.recoveryCode)
    expect(recovered.replacementRecoveryCode).not.toBe(project.recoveryCode)
    expect(() => service.recover(project.recoveryCode!)).toThrowError(expect.objectContaining({ code: 'project_access_replayed' }))
    expect(() => service.recover('invalid')).toThrowError(expect.objectContaining({ code: 'project_access_invalid' }))
  })

  it('rejects an expired recovery capability', async () => {
    const project = await buyProject()
    now += 31 * 24 * 60 * 60 * 1000
    expect(() => service.recover(project.recoveryCode!)).toThrowError(expect.objectContaining({ code: 'project_access_expired' }))
  })

  it('keeps raw capabilities out of session and entitlement serialization', async () => {
    const project = await buyProject()
    const serialized = JSON.stringify({ session: project.session, entitlement: project.entitlement })
    expect(serialized).not.toContain(project.accessToken)
    expect(serialized).not.toContain(project.recoveryCode!)
    expect(project.session.providerSessionId).toMatch(/^mock_/)
  })
})

describe('error shape', () => {
  it('uses stable commerce codes without leaking internals', () => {
    const error = new CommerceError('payment_unverified', 'A verified purchase is required.')
    expect(error).toMatchObject({ name: 'CommerceError', code: 'payment_unverified' })
  })
})


describe('durable repository restart guarantees', () => {
  it('preserves purchase, dedupe, allowance, artwork identity and recovery replay using hashes only', async () => {
    const directory = mkdtempSync(join(tmpdir(), 'qr-commerce-')); const path = join(directory, 'state.json')
    try {
      const repository = new JsonFileCommerceRepository(path); const initial = serviceWith(repository)
      const checkout = await initial.startCheckout({ offerId: 'artistic_project', idempotencyKey: 'durable-buy' })
      const payment = event(checkout.session.checkoutSessionId, 'succeeded', 'durable-event'); deliver(initial, provider, payment)
      initial.recordGeneration(checkout.projectAccessToken!, { operationId: 'round-1', outcome: 'succeeded', candidateCount: 4 })
      initial.authorizeExport(checkout.projectAccessToken!, { exportRequestId: 'export-1', candidateId: 'artwork-a' })
      const restarted = serviceWith(repository)
      expect(deliver(restarted, provider, payment)).toMatchObject({ duplicate: true, entitlement: { roundsConsumed: 1, finishedArtworksConsumed: 1 } })
      expect(restarted.recordGeneration(checkout.projectAccessToken!, { operationId: 'round-1', outcome: 'succeeded', candidateCount: 4 }).roundsConsumed).toBe(1)
      expect(restarted.authorizeExport(checkout.projectAccessToken!, { exportRequestId: 'export-2', candidateId: 'artwork-a' }).entitlement.finishedArtworksConsumed).toBe(1)
      expect(() => restarted.authorizeExport(checkout.projectAccessToken!, { exportRequestId: 'export-3', candidateId: 'artwork-b' })).toThrowError(expect.objectContaining({ code: 'exports_exhausted' }))
      const recovered = restarted.recover(checkout.recoveryCode!); const restartedAgain = serviceWith(repository)
      expect(restartedAgain.entitlementForAccess(recovered.projectAccessToken)).toMatchObject({ roundsConsumed: 1, finishedArtworksConsumed: 1 })
      expect(() => restartedAgain.recover(checkout.recoveryCode!)).toThrowError(expect.objectContaining({ code: 'project_access_replayed' }))
      const persisted = readFileSync(path, 'utf8')
      for (const rawCapability of [checkout.projectAccessToken!, checkout.recoveryCode!, recovered.projectAccessToken, recovered.replacementRecoveryCode]) expect(persisted).not.toContain(rawCapability)
      expect(persisted).toContain('sha256:')
    } finally { rmSync(directory, { recursive: true, force: true }) }
  })
  it('preserves recovery expiry across restart', async () => {
    const directory = mkdtempSync(join(tmpdir(), 'qr-commerce-expiry-'))
    try {
      const repository = new JsonFileCommerceRepository(join(directory, 'state.json')); const initial = serviceWith(repository)
      const checkout = await initial.startCheckout({ offerId: 'artistic_project', idempotencyKey: 'expiry-buy' })
      deliver(initial, provider, event(checkout.session.checkoutSessionId, 'succeeded', 'expiry-event')); now += 31 * 24 * 60 * 60 * 1000
      expect(() => serviceWith(repository).recover(checkout.recoveryCode!)).toThrowError(expect.objectContaining({ code: 'project_access_expired' }))
    } finally { rmSync(directory, { recursive: true, force: true }) }
  })
})
function serviceWith(repository: JsonFileCommerceRepository): CommerceService {
  return new CommerceService(provider, { repository, now: () => now, id: () => `id-${++serial}`, token: () => `test-capability-${++serial}-${'x'.repeat(32)}` })
}
