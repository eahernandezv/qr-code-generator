import { createHash, randomBytes, randomUUID } from 'node:crypto'
import { getOffer } from './lib/offers.js'
import type { CheckoutProvider } from './provider.js'
import {
  CommerceError,
  type CheckoutSession,
  type EntitlementSnapshot,
  type GenerationResult,
  type PaymentEvent,
  type PaymentEventResult,
  type RecoveryResult,
  type StartCheckoutInput,
  type StartCheckoutResult,
} from './types.js'

const ACCESS_TTL_MS = 30 * 24 * 60 * 60 * 1000
const RECOVERY_TTL_MS = 30 * 24 * 60 * 60 * 1000

interface AccessRecord {
  projectId: string
  expiresAt: number
}

interface RecoveryRecord {
  projectId: string
  expiresAt: number
  usedAt?: number
}

interface IdempotencyRecord {
  fingerprint: string
  checkoutSessionId: string
}

interface OperationRecord<T> {
  fingerprint: string
  result: T
}

interface MutableEntitlement extends EntitlementSnapshot {
  grantedCheckoutIds: Set<string>
  finishedCandidateIds: Set<string>
}

export interface CommerceServiceOptions {
  now?: () => number
  token?: () => string
  id?: () => string
}

/**
 * Authoritative guest-commerce domain boundary.
 *
 * Raw capabilities are returned to callers but never included in sessions,
 * entitlement snapshots, idempotency fingerprints, or persisted/loggable data.
 */
export class CommerceService {
  private readonly now: () => number
  private readonly token: () => string
  private readonly id: () => string
  private readonly sessions = new Map<string, CheckoutSession>()
  private readonly idempotency = new Map<string, IdempotencyRecord>()
  private readonly processedEvents = new Map<string, PaymentEventResult>()
  private readonly access = new Map<string, AccessRecord>()
  private readonly recovery = new Map<string, RecoveryRecord>()
  private readonly entitlements = new Map<string, MutableEntitlement>()
  private readonly generationOperations = new Map<string, OperationRecord<EntitlementSnapshot>>()
  private readonly exportOperations = new Map<string, OperationRecord<{ authorizationId: string; entitlement: EntitlementSnapshot }>>()

  constructor(
    private readonly provider: CheckoutProvider,
    options: CommerceServiceOptions = {},
  ) {
    this.now = options.now ?? Date.now
    this.token = options.token ?? (() => randomBytes(32).toString('base64url'))
    this.id = options.id ?? randomUUID
  }

  async startCheckout(input: StartCheckoutInput): Promise<StartCheckoutResult> {
    if (!input.idempotencyKey.trim()) {
      throw new CommerceError('bad_request', 'An idempotency key is required.')
    }
    const offer = getOffer(input.offerId)
    const suppliedAccessHash = input.projectAccessToken ? hashCapability(input.projectAccessToken) : undefined
    const fingerprint = `${input.offerId}:${suppliedAccessHash ?? 'new-project'}`
    const prior = this.idempotency.get(input.idempotencyKey)
    if (prior) {
      if (prior.fingerprint !== fingerprint) {
        throw new CommerceError('idempotency_key_mismatch', 'This checkout retry key was used for different input.')
      }
      const session = this.requireSession(prior.checkoutSessionId)
      return { session: cloneSession(session), redirectUrl: `mock-checkout:${session.checkoutSessionId}` }
    }

    let projectId: string
    let accessToken: string | undefined
    let recoveryCode: string | undefined
    let accessTokenHash: string
    if (input.offerId === 'artistic_project') {
      projectId = `project_${this.id()}`
      accessToken = this.token()
      recoveryCode = this.token()
      accessTokenHash = hashCapability(accessToken)
    } else {
      if (!input.projectAccessToken) {
        throw new CommerceError('project_access_invalid', 'Extra Exploration requires active project access.')
      }
      projectId = this.requireProjectId(input.projectAccessToken)
      accessTokenHash = hashCapability(input.projectAccessToken)
      const entitlement = this.entitlements.get(projectId)
      if (!entitlement || entitlement.status !== 'active') {
        throw new CommerceError('payment_unverified', 'The project purchase is not active.')
      }
      if (entitlement.extraExplorationPurchased) {
        throw new CommerceError('bad_request', 'Extra Exploration was already purchased for this project.')
      }
    }

    const checkoutSessionId = `checkout_${this.id()}`
    const providerResult = await this.provider.createCheckout({
      checkoutSessionId,
      offerId: input.offerId,
      amountCents: offer.amount_cents,
      currency: offer.currency,
      idempotencyKey: input.idempotencyKey,
    })
    const timestamp = this.isoNow()
    const session: CheckoutSession = {
      checkoutSessionId,
      projectId,
      offerId: input.offerId,
      status: 'pending',
      amountCents: offer.amount_cents,
      currency: offer.currency,
      idempotencyKey: input.idempotencyKey,
      provider: this.provider.name,
      providerSessionId: providerResult.providerSessionId,
      createdAt: timestamp,
      updatedAt: timestamp,
      accessTokenHash,
    }
    this.sessions.set(checkoutSessionId, session)
    this.idempotency.set(input.idempotencyKey, { fingerprint, checkoutSessionId })

    if (accessToken && recoveryCode) {
      const expiry = this.now() + ACCESS_TTL_MS
      this.access.set(accessTokenHash, { projectId, expiresAt: expiry })
      this.recovery.set(hashCapability(recoveryCode), {
        projectId,
        expiresAt: this.now() + RECOVERY_TTL_MS,
      })
      this.entitlements.set(projectId, {
        projectId,
        status: 'pending',
        totalRounds: 0,
        roundsConsumed: 0,
        totalCandidates: 0,
        candidatesConsumed: 0,
        totalFinishedArtworks: 0,
        finishedArtworksConsumed: 0,
        extraExplorationPurchased: false,
        updatedAt: timestamp,
        grantedCheckoutIds: new Set(),
        finishedCandidateIds: new Set(),
      })
    }

    return {
      session: cloneSession(session),
      redirectUrl: providerResult.redirectUrl,
      projectAccessToken: accessToken,
      recoveryCode,
    }
  }

  processPaymentEvent(event: PaymentEvent): PaymentEventResult {
    if (!event.verified) {
      throw new CommerceError('payment_unverified', 'Payment event signature was not verified.')
    }
    const duplicate = this.processedEvents.get(event.providerEventId)
    if (duplicate) {
      const currentSession = this.requireSession(event.checkoutSessionId)
      const currentEntitlement = this.entitlements.get(currentSession.projectId)
      return {
        ...duplicate,
        duplicate: true,
        session: cloneSession(currentSession),
        entitlement: currentEntitlement ? snapshot(currentEntitlement) : undefined,
      }
    }

    const session = this.requireSession(event.checkoutSessionId)
    let ignoredAsStale = false
    if (event.type === 'succeeded') {
      session.status = 'succeeded'
      session.failureReason = undefined
      this.grantCheckout(session)
    } else if (session.status === 'succeeded') {
      ignoredAsStale = true
    } else {
      session.status = event.type
      session.failureReason = event.failureReason
    }
    session.updatedAt = this.isoNow()

    const entitlement = this.entitlements.get(session.projectId)
    const result: PaymentEventResult = {
      duplicate: false,
      ignoredAsStale,
      session: cloneSession(session),
      entitlement: entitlement ? snapshot(entitlement) : undefined,
    }
    this.processedEvents.set(event.providerEventId, result)
    return result
  }

  checkoutStatus(checkoutSessionId: string): CheckoutSession {
    return cloneSession(this.requireSession(checkoutSessionId))
  }

  recover(recoveryCode: string): RecoveryResult {
    const record = this.recovery.get(hashCapability(recoveryCode))
    if (!record) throw new CommerceError('project_access_invalid', 'Recovery code is invalid.')
    if (record.usedAt !== undefined) {
      throw new CommerceError('project_access_replayed', 'Recovery code was already used.')
    }
    if (record.expiresAt <= this.now()) {
      throw new CommerceError('project_access_expired', 'Recovery code has expired.')
    }
    record.usedAt = this.now()
    const entitlement = this.entitlements.get(record.projectId)
    if (!entitlement) throw new CommerceError('project_access_invalid', 'Project access is unavailable.')

    const projectAccessToken = this.token()
    this.access.set(hashCapability(projectAccessToken), {
      projectId: record.projectId,
      expiresAt: this.now() + ACCESS_TTL_MS,
    })
    const replacementRecoveryCode = this.token()
    this.recovery.set(hashCapability(replacementRecoveryCode), {
      projectId: record.projectId,
      expiresAt: this.now() + RECOVERY_TTL_MS,
    })
    return {
      projectId: record.projectId,
      projectAccessToken,
      replacementRecoveryCode,
      entitlement: snapshot(entitlement),
    }
  }

  recordGeneration(
    projectAccessToken: string,
    result: GenerationResult,
  ): EntitlementSnapshot {
    const projectId = this.requireProjectId(projectAccessToken)
    const operationKey = `${projectId}:${result.operationId}`
    const fingerprint = `${result.outcome}:${result.candidateCount}`
    const prior = this.generationOperations.get(operationKey)
    if (prior) {
      if (prior.fingerprint !== fingerprint) {
        throw new CommerceError('bad_request', 'Generation operation was replayed with different input.')
      }
      return { ...prior.result }
    }
    const entitlement = this.requireActiveEntitlement(projectId)
    if (result.outcome === 'succeeded') {
      if (!Number.isInteger(result.candidateCount) || result.candidateCount < 1 || result.candidateCount > 4) {
        throw new CommerceError('bad_request', 'A successful round must contain one to four candidates.')
      }
      if (entitlement.roundsConsumed >= entitlement.totalRounds) {
        throw new CommerceError('rounds_exhausted', 'All successful generation rounds have been used.')
      }
      if (entitlement.candidatesConsumed + result.candidateCount > entitlement.totalCandidates) {
        throw new CommerceError('candidates_exhausted', 'Candidate allowance is exhausted.')
      }
      entitlement.roundsConsumed += 1
      entitlement.candidatesConsumed += result.candidateCount
      entitlement.updatedAt = this.isoNow()
    }
    const resultSnapshot = snapshot(entitlement)
    this.generationOperations.set(operationKey, { fingerprint, result: resultSnapshot })
    return { ...resultSnapshot }
  }

  authorizeExport(
    projectAccessToken: string,
    input: { exportRequestId: string; candidateId: string },
  ): { authorizationId: string; entitlement: EntitlementSnapshot } {
    const projectId = this.requireProjectId(projectAccessToken)
    const operationKey = `${projectId}:${input.exportRequestId}`
    const fingerprint = input.candidateId
    const prior = this.exportOperations.get(operationKey)
    if (prior) {
      if (prior.fingerprint !== fingerprint) {
        throw new CommerceError('bad_request', 'Export request was replayed for a different candidate.')
      }
      return { authorizationId: prior.result.authorizationId, entitlement: { ...prior.result.entitlement } }
    }
    const entitlement = this.requireActiveEntitlement(projectId)
    if (!entitlement.finishedCandidateIds.has(input.candidateId)) {
      if (entitlement.finishedArtworksConsumed >= entitlement.totalFinishedArtworks) {
        throw new CommerceError('exports_exhausted', 'No finished-artwork entitlement remains.')
      }
      entitlement.finishedCandidateIds.add(input.candidateId)
      entitlement.finishedArtworksConsumed += 1
      entitlement.updatedAt = this.isoNow()
    }
    const result = {
      authorizationId: `export_auth_${this.id()}`,
      entitlement: snapshot(entitlement),
    }
    this.exportOperations.set(operationKey, { fingerprint, result })
    return { authorizationId: result.authorizationId, entitlement: { ...result.entitlement } }
  }

  private grantCheckout(session: CheckoutSession): void {
    const entitlement = this.entitlements.get(session.projectId)
    if (!entitlement) throw new CommerceError('project_access_invalid', 'Checkout project is unavailable.')
    if (entitlement.grantedCheckoutIds.has(session.checkoutSessionId)) return
    const offer = getOffer(session.offerId)
    if (session.offerId === 'artistic_project') {
      entitlement.status = 'active'
      entitlement.totalRounds = offer.total_rounds_allowed
      entitlement.totalCandidates = offer.total_candidates_allowed
      entitlement.totalFinishedArtworks = offer.exports_allowed
    } else if (!entitlement.extraExplorationPurchased) {
      entitlement.totalRounds += offer.total_rounds_allowed
      entitlement.totalCandidates += offer.total_candidates_allowed
      entitlement.totalFinishedArtworks += offer.exports_allowed
      entitlement.extraExplorationPurchased = true
    }
    entitlement.grantedCheckoutIds.add(session.checkoutSessionId)
    entitlement.updatedAt = this.isoNow()
  }

  private requireSession(checkoutSessionId: string): CheckoutSession {
    const session = this.sessions.get(checkoutSessionId)
    if (!session) throw new CommerceError('checkout_session_not_found', 'Checkout session was not found.')
    return session
  }

  private requireProjectId(projectAccessToken: string): string {
    const access = this.access.get(hashCapability(projectAccessToken))
    if (!access) throw new CommerceError('project_access_invalid', 'Project access is invalid.')
    if (access.expiresAt <= this.now()) {
      throw new CommerceError('project_access_expired', 'Project access has expired.')
    }
    return access.projectId
  }

  private requireActiveEntitlement(projectId: string): MutableEntitlement {
    const entitlement = this.entitlements.get(projectId)
    if (!entitlement || entitlement.status !== 'active') {
      throw new CommerceError('payment_unverified', 'A verified purchase is required.')
    }
    return entitlement
  }

  private isoNow(): string {
    return new Date(this.now()).toISOString()
  }
}

function hashCapability(value: string): string {
  return `sha256:${createHash('sha256').update(value).digest('hex')}`
}

function snapshot(entitlement: MutableEntitlement): EntitlementSnapshot {
  return {
    projectId: entitlement.projectId,
    status: entitlement.status,
    totalRounds: entitlement.totalRounds,
    roundsConsumed: entitlement.roundsConsumed,
    totalCandidates: entitlement.totalCandidates,
    candidatesConsumed: entitlement.candidatesConsumed,
    totalFinishedArtworks: entitlement.totalFinishedArtworks,
    finishedArtworksConsumed: entitlement.finishedArtworksConsumed,
    extraExplorationPurchased: entitlement.extraExplorationPurchased,
    updatedAt: entitlement.updatedAt,
  }
}

function cloneSession(session: CheckoutSession): CheckoutSession {
  return { ...session }
}
