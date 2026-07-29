export type CommerceOfferId = 'artistic_project' | 'extra_exploration'
export type CheckoutStatus = 'idle' | 'pending' | 'succeeded' | 'failed' | 'canceled' | 'expired'

export interface CommerceEntitlementSnapshot {
  projectId: string
  status: 'pending' | 'active'
  totalRounds: number
  roundsConsumed: number
  totalCandidates: number
  candidatesConsumed: number
  totalFinishedArtworks: number
  finishedArtworksConsumed: number
  extraExplorationPurchased: boolean
}

export interface CheckoutView {
  checkoutSessionId: string
  offerId: CommerceOfferId
  amountCents: number
  status: Exclude<CheckoutStatus, 'idle'>
  redirectUrl: string
  recoveryCode?: string
}

export const COMMERCE_OFFERS = Object.freeze({
  artistic_project: Object.freeze({ amountCents: 1200, rounds: 3, candidates: 12, artworks: 1 }),
  extra_exploration: Object.freeze({ amountCents: 500, rounds: 2, candidates: 8, artworks: 1 }),
})

export class CommerceClientError extends Error {
  constructor(readonly code: string, message: string) {
    super(message)
    this.name = 'CommerceClientError'
  }
}

export interface CommerceClient {
  startCheckout(input: { projectId: string; offerId: CommerceOfferId; idempotencyKey: string }): Promise<CheckoutView>
  refreshCheckout(checkoutSessionId: string): Promise<{ checkout: CheckoutView; entitlement?: CommerceEntitlementSnapshot }>
  completeTestPayment(checkoutSessionId: string): Promise<CommerceEntitlementSnapshot>
  setTestPaymentStatus(checkoutSessionId: string, status: 'failed' | 'canceled'): Promise<void>
  recordGeneration(input: { operationId: string; outcome: 'succeeded' | 'failed' | 'canceled'; candidateCount: number }): Promise<CommerceEntitlementSnapshot>
  authorizeExport(input: { exportRequestId: string; candidateId: string }): Promise<CommerceEntitlementSnapshot>
  recover(recoveryCode: string): Promise<{ entitlement: CommerceEntitlementSnapshot; replacementRecoveryCode: string }>
  checkout(checkoutSessionId: string): CheckoutView
  clearAccess(): void
  reset(): void
  failProviderOnce(): void
  grantPaidTestAccess(projectId: string): CommerceEntitlementSnapshot
  expireRecoveryForTest(): void
}

interface MockProjectRecord extends CommerceEntitlementSnapshot {
  accessCapability: string
  recoveryHash: string
  recoveryUsed: boolean
  recoveryExpiresAt: number
  generationOperations: Map<string, string>
  exportOperations: Map<string, string>
  finishedCandidateIds: Set<string>
}

interface MockCheckoutRecord {
  checkoutSessionId: string
  projectId: string
  offerId: CommerceOfferId
  amountCents: number
  status: Exclude<CheckoutStatus, 'idle'>
  redirectUrl: string
  accessCapability: string
  recoveryCode?: string
}

/**
 * Browser adapter for mock/test mode. It models the remote API contract while
 * keeping capabilities in module memory only: never URL, log, localStorage, or
 * sessionStorage. Production replaces this adapter with HTTP calls to
 * @qr/commerce; no payment-provider SDK is coupled to Studio components.
 */
class MockGuestCommerceClient implements CommerceClient {
  private projects = new Map<string, MockProjectRecord>()
  private checkouts = new Map<string, MockCheckoutRecord>()
  private idempotency = new Map<string, string>()
  private usedRecoveryHashes = new Set<string>()
  private activeAccessCapability: string | null = null
  private failNextProviderCall = false

  async startCheckout(input: {
    projectId: string
    offerId: CommerceOfferId
    idempotencyKey: string
  }): Promise<CheckoutView> {
    if (this.failNextProviderCall) {
      this.failNextProviderCall = false
      throw new CommerceClientError('payment_provider_error', 'Payment service is temporarily unavailable. Try again safely.')
    }
    const priorId = this.idempotency.get(input.idempotencyKey)
    if (priorId) return this.publicCheckout(this.requireCheckout(priorId))

    let project = this.projects.get(input.projectId)
    let recoveryCode: string | undefined
    if (input.offerId === 'artistic_project') {
      const accessCapability = capability()
      recoveryCode = capability()
      project = {
        projectId: input.projectId,
        status: 'pending',
        totalRounds: 0,
        roundsConsumed: 0,
        totalCandidates: 0,
        candidatesConsumed: 0,
        totalFinishedArtworks: 0,
        finishedArtworksConsumed: 0,
        extraExplorationPurchased: false,
        accessCapability,
        recoveryHash: hashForMock(recoveryCode),
        recoveryUsed: false,
        recoveryExpiresAt: Date.now() + 30 * 24 * 60 * 60 * 1000,
        generationOperations: new Map(),
        exportOperations: new Map(),
        finishedCandidateIds: new Set(),
      }
      this.projects.set(input.projectId, project)
      this.activeAccessCapability = accessCapability
    } else {
      project = this.requireActiveProject()
      if (project.projectId !== input.projectId || project.extraExplorationPurchased) {
        throw new CommerceClientError('project_access_invalid', 'Extra Exploration is unavailable for this project.')
      }
    }

    const checkout: MockCheckoutRecord = {
      checkoutSessionId: `checkout_${crypto.randomUUID()}`,
      projectId: input.projectId,
      offerId: input.offerId,
      amountCents: COMMERCE_OFFERS[input.offerId].amountCents,
      status: 'pending',
      redirectUrl: '',
      accessCapability: project.accessCapability,
      recoveryCode,
    }
    checkout.redirectUrl = `mock-checkout:${checkout.checkoutSessionId}`
    this.checkouts.set(checkout.checkoutSessionId, checkout)
    this.idempotency.set(input.idempotencyKey, checkout.checkoutSessionId)
    return this.publicCheckout(checkout)
  }

  async completeTestPayment(checkoutSessionId: string): Promise<CommerceEntitlementSnapshot> {
    const checkout = this.requireCheckout(checkoutSessionId)
    await new Promise((resolve) => window.setTimeout(resolve, 250))
    const project = this.projects.get(checkout.projectId)
    if (!project) throw new CommerceClientError('project_access_invalid', 'Project access is unavailable.')
    if (checkout.status !== 'succeeded') {
      checkout.status = 'succeeded'
      const offer = COMMERCE_OFFERS[checkout.offerId]
      if (checkout.offerId === 'artistic_project') {
        project.status = 'active'
        project.totalRounds = offer.rounds
        project.totalCandidates = offer.candidates
        project.totalFinishedArtworks = offer.artworks
      } else if (!project.extraExplorationPurchased) {
        project.totalRounds += offer.rounds
        project.totalCandidates += offer.candidates
        project.totalFinishedArtworks += offer.artworks
        project.extraExplorationPurchased = true
      }
    }
    this.activeAccessCapability = checkout.accessCapability
    return snapshot(project)
  }

  async refreshCheckout(checkoutSessionId: string) {
    const record = this.requireCheckout(checkoutSessionId)
    const project = this.projects.get(record.projectId)
    return { checkout: this.publicCheckout(record), entitlement: project?.status === 'active' ? snapshot(project) : undefined }
  }

  async setTestPaymentStatus(checkoutSessionId: string, status: 'failed' | 'canceled'): Promise<void> {
    const checkout = this.requireCheckout(checkoutSessionId)
    if (checkout.status !== 'succeeded') checkout.status = status
  }

  async recordGeneration(input: {
    operationId: string
    outcome: 'succeeded' | 'failed' | 'canceled'
    candidateCount: number
  }): Promise<CommerceEntitlementSnapshot> {
    const project = this.requireActiveProject()
    const fingerprint = `${input.outcome}:${input.candidateCount}`
    const prior = project.generationOperations.get(input.operationId)
    if (prior && prior !== fingerprint) throw new CommerceClientError('bad_request', 'Generation replay did not match.')
    if (prior) return snapshot(project)
    if (input.outcome === 'succeeded') {
      if (project.roundsConsumed >= project.totalRounds) throw new CommerceClientError('rounds_exhausted', 'All successful rounds are used.')
      if (project.candidatesConsumed + input.candidateCount > project.totalCandidates) {
        throw new CommerceClientError('candidates_exhausted', 'Candidate allowance is exhausted.')
      }
      project.roundsConsumed += 1
      project.candidatesConsumed += input.candidateCount
    }
    project.generationOperations.set(input.operationId, fingerprint)
    return snapshot(project)
  }

  async authorizeExport(input: { exportRequestId: string; candidateId: string }): Promise<CommerceEntitlementSnapshot> {
    const project = this.requireActiveProject()
    const prior = project.exportOperations.get(input.exportRequestId)
    if (prior && prior !== input.candidateId) throw new CommerceClientError('bad_request', 'Export replay did not match.')
    if (prior) return snapshot(project)
    if (!project.finishedCandidateIds.has(input.candidateId)) {
      if (project.finishedArtworksConsumed >= project.totalFinishedArtworks) {
        throw new CommerceClientError('exports_exhausted', 'No finished artwork remains. Extra Exploration can add one.')
      }
      project.finishedCandidateIds.add(input.candidateId)
      project.finishedArtworksConsumed += 1
    }
    project.exportOperations.set(input.exportRequestId, input.candidateId)
    return snapshot(project)
  }

  async recover(recoveryCode: string): Promise<{ entitlement: CommerceEntitlementSnapshot; replacementRecoveryCode: string }> {
    const recoveryHash = hashForMock(recoveryCode)
    if (this.usedRecoveryHashes.has(recoveryHash)) {
      throw new CommerceClientError('project_access_replayed', 'Recovery code was already used.')
    }
    const project = Array.from(this.projects.values()).find((item) => item.recoveryHash === recoveryHash)
    if (!project) throw new CommerceClientError('project_access_invalid', 'Recovery code is invalid.')
    if (project.recoveryUsed) throw new CommerceClientError('project_access_replayed', 'Recovery code was already used.')
    if (project.recoveryExpiresAt <= Date.now()) throw new CommerceClientError('project_access_expired', 'Recovery code has expired.')
    project.recoveryUsed = true
    this.usedRecoveryHashes.add(recoveryHash)
    const replacementRecoveryCode = capability()
    project.recoveryHash = hashForMock(replacementRecoveryCode)
    project.recoveryUsed = false
    this.activeAccessCapability = project.accessCapability
    return { entitlement: snapshot(project), replacementRecoveryCode }
  }

  checkout(checkoutSessionId: string): CheckoutView {
    return this.publicCheckout(this.requireCheckout(checkoutSessionId))
  }

  clearAccess(): void {
    this.activeAccessCapability = null
  }

  reset(): void {
    this.projects.clear()
    this.checkouts.clear()
    this.idempotency.clear()
    this.usedRecoveryHashes.clear()
    this.activeAccessCapability = null
    this.failNextProviderCall = false
  }

  failProviderOnce(): void {
    this.failNextProviderCall = true
  }

  grantPaidTestAccess(projectId: string): CommerceEntitlementSnapshot {
    const accessCapability = capability()
    const project: MockProjectRecord = {
      projectId,
      status: 'active',
      totalRounds: 3,
      roundsConsumed: 0,
      totalCandidates: 12,
      candidatesConsumed: 0,
      totalFinishedArtworks: 1,
      finishedArtworksConsumed: 0,
      extraExplorationPurchased: false,
      accessCapability,
      recoveryHash: hashForMock(capability()),
      recoveryUsed: false,
      recoveryExpiresAt: Date.now() + 30 * 24 * 60 * 60 * 1000,
      generationOperations: new Map(),
      exportOperations: new Map(),
      finishedCandidateIds: new Set(),
    }
    this.projects.set(projectId, project)
    this.activeAccessCapability = accessCapability
    return snapshot(project)
  }

  expireRecoveryForTest(): void {
    const project = this.requireActiveProject()
    project.recoveryExpiresAt = 0
  }

  private requireCheckout(checkoutSessionId: string): MockCheckoutRecord {
    const checkout = this.checkouts.get(checkoutSessionId)
    if (!checkout) throw new CommerceClientError('checkout_session_not_found', 'Checkout session was not found.')
    return checkout
  }

  private requireActiveProject(): MockProjectRecord {
    const project = Array.from(this.projects.values()).find(
      (item) => item.accessCapability === this.activeAccessCapability && item.status === 'active',
    )
    if (!project) throw new CommerceClientError('payment_unverified', 'Paid export and rounds require verified project access.')
    return project
  }

  private publicCheckout(checkout: MockCheckoutRecord): CheckoutView {
    return {
      checkoutSessionId: checkout.checkoutSessionId,
      offerId: checkout.offerId,
      amountCents: checkout.amountCents,
      status: checkout.status,
      redirectUrl: checkout.redirectUrl,
      recoveryCode: checkout.recoveryCode,
    }
  }
}

function capability(): string {
  const bytes = new Uint8Array(32)
  crypto.getRandomValues(bytes)
  return Array.from(bytes, (value) => value.toString(16).padStart(2, '0')).join('')
}

/** Mock-only non-cryptographic index; the real service uses SHA-256. */
function hashForMock(value: string): string {
  let hash = 2166136261
  for (let index = 0; index < value.length; index += 1) {
    hash ^= value.charCodeAt(index)
    hash = Math.imul(hash, 16777619)
  }
  return `mock-hash:${(hash >>> 0).toString(16)}`
}

function snapshot(project: MockProjectRecord): CommerceEntitlementSnapshot {
  return {
    projectId: project.projectId,
    status: project.status,
    totalRounds: project.totalRounds,
    roundsConsumed: project.roundsConsumed,
    totalCandidates: project.totalCandidates,
    candidatesConsumed: project.candidatesConsumed,
    totalFinishedArtworks: project.totalFinishedArtworks,
    finishedArtworksConsumed: project.finishedArtworksConsumed,
    extraExplorationPurchased: project.extraExplorationPurchased,
  }
}

class HttpGuestCommerceClient implements CommerceClient {
  private accessToken: string | null = null
  private readonly checkouts = new Map<string, CheckoutView>()
  constructor(private readonly baseUrl = import.meta.env.VITE_COMMERCE_API_URL || '/api/commerce') {}
  async startCheckout(input: { projectId: string; offerId: CommerceOfferId; idempotencyKey: string }): Promise<CheckoutView> {
    const result = await this.request<CheckoutView & { projectAccessToken?: string }>('/checkouts', { method: 'POST', body: JSON.stringify({ offerId: input.offerId, idempotencyKey: input.idempotencyKey }) })
    if (result.projectAccessToken) this.accessToken = result.projectAccessToken
    const checkout = publicCheckout(result); this.checkouts.set(checkout.checkoutSessionId, checkout); return checkout
  }
  async refreshCheckout(checkoutSessionId: string) {
    const result = await this.request<Omit<CheckoutView, 'redirectUrl'> & { redirectUrl?: string; entitlement?: CommerceEntitlementSnapshot }>(`/checkouts/${encodeURIComponent(checkoutSessionId)}`)
    const redirectUrl = result.redirectUrl ?? this.checkouts.get(checkoutSessionId)?.redirectUrl
    if (!redirectUrl) throw new CommerceClientError('checkout_redirect_unavailable', 'Checkout destination is unavailable.')
    const checkout = publicCheckout({ ...result, redirectUrl }); this.checkouts.set(checkoutSessionId, checkout); return { checkout, entitlement: result.entitlement }
  }
  async completeTestPayment(): Promise<CommerceEntitlementSnapshot> { throw new CommerceClientError('payment_unverified', 'Test payment controls are unavailable.') }
  async setTestPaymentStatus(): Promise<void> { throw new CommerceClientError('payment_unverified', 'Test payment controls are unavailable.') }
  async recordGeneration(input: { operationId: string; outcome: 'succeeded'|'failed'|'canceled'; candidateCount: number }) { return this.request<CommerceEntitlementSnapshot>('/generations', { method: 'POST', body: JSON.stringify(input) }) }
  async authorizeExport(input: { exportRequestId: string; candidateId: string }) { const result = await this.request<{ entitlement: CommerceEntitlementSnapshot }>('/exports', { method: 'POST', body: JSON.stringify(input) }); return result.entitlement }
  async recover(recoveryCode: string) { const result = await this.request<{ projectAccessToken: string; entitlement: CommerceEntitlementSnapshot; replacementRecoveryCode: string }>('/recovery', { method: 'POST', body: JSON.stringify({ recoveryCode }) }); this.accessToken = result.projectAccessToken; return result }
  checkout(checkoutSessionId: string): CheckoutView { const value=this.checkouts.get(checkoutSessionId); if(!value) throw new CommerceClientError('checkout_session_not_found','Checkout session was not found.'); return value }
  clearAccess() { this.accessToken = null }
  reset() { this.clearAccess(); this.checkouts.clear() }
  failProviderOnce() { throw new CommerceClientError('bad_request','Test controls are unavailable.') }
  grantPaidTestAccess(): CommerceEntitlementSnapshot { throw new CommerceClientError('payment_unverified','Test grants are unavailable.') }
  expireRecoveryForTest() { throw new CommerceClientError('bad_request','Test controls are unavailable.') }
  private async request<T>(path: string, init: RequestInit = {}): Promise<T> {
    const headers = new Headers(init.headers); headers.set('Content-Type','application/json'); if(this.accessToken) headers.set('Authorization',`Bearer ${this.accessToken}`)
    let response: Response
    try { response = await fetch(`${this.baseUrl}${path}`, { ...init, headers }) } catch { throw new CommerceClientError('service_unavailable','Commerce service is unavailable. Paid rounds and exports remain locked.') }
    const value = response.status === 204 ? undefined : await response.json().catch(() => ({})) as {code?:unknown;message?:unknown}|undefined
    if (!response.ok) throw new CommerceClientError(String(value?.code ?? 'service_unavailable'), String(value?.message ?? 'Commerce service is unavailable.'))
    return value as T
  }
}
function publicCheckout(value: CheckoutView): CheckoutView { return { checkoutSessionId:value.checkoutSessionId, offerId:value.offerId, amountCents:value.amountCents, status:value.status, redirectUrl:value.redirectUrl, recoveryCode:value.recoveryCode } }
export const COMMERCE_TEST_MODE = import.meta.env.DEV && import.meta.env.VITE_COMMERCE_TEST_MODE === 'true'
export const guestCommerce: CommerceClient = COMMERCE_TEST_MODE ? new MockGuestCommerceClient() : new HttpGuestCommerceClient()


declare global {
  interface Window {
    __QR_TEST_PAID_PROJECT_ID__?: string
    __QR_COMMERCE_TEST__?: {
      grantPaidAccess: (projectId: string) => CommerceEntitlementSnapshot
      clearAccess: () => void
      reset: () => void
      failProviderOnce: () => void
    }
  }
}

if (typeof window !== 'undefined' && COMMERCE_TEST_MODE) {
  window.__QR_COMMERCE_TEST__ = {
    grantPaidAccess: (projectId) => guestCommerce.grantPaidTestAccess(projectId),
    clearAccess: () => guestCommerce.clearAccess(),
    reset: () => guestCommerce.reset(),
    failProviderOnce: () => guestCommerce.failProviderOnce(),
  }
  if (window.__QR_TEST_PAID_PROJECT_ID__) {
    guestCommerce.grantPaidTestAccess(window.__QR_TEST_PAID_PROJECT_ID__)
  }
}
