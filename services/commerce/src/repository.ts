import { mkdirSync, readFileSync, renameSync, writeFileSync } from 'node:fs'
import { dirname } from 'node:path'
import type { CheckoutSession, EntitlementSnapshot, PaymentEventResult } from './types.js'

export interface PersistedEntitlement extends EntitlementSnapshot {
  grantedCheckoutIds: string[]
  finishedCandidateIds: string[]
}
export interface PersistedCommerceState {
  schemaVersion: 1
  sessions: CheckoutSession[]
  idempotency: Array<[string, { fingerprint: string; checkoutSessionId: string }]>
  processedEvents: Array<[string, PaymentEventResult]>
  access: Array<[string, { projectId: string; expiresAt: number }]>
  recovery: Array<[string, { projectId: string; expiresAt: number; usedAt?: number }]>
  entitlements: PersistedEntitlement[]
  generationOperations: Array<[string, { fingerprint: string; result: EntitlementSnapshot }]>
  exportOperations: Array<[string, { fingerprint: string; result: { authorizationId: string; entitlement: EntitlementSnapshot } }]>
}

export const emptyCommerceState = (): PersistedCommerceState => ({
  schemaVersion: 1, sessions: [], idempotency: [], processedEvents: [], access: [], recovery: [],
  entitlements: [], generationOperations: [], exportOperations: [],
})

export interface CommerceRepository {
  load(): PersistedCommerceState
  save(state: PersistedCommerceState): void
}

export class MemoryCommerceRepository implements CommerceRepository {
  private state = emptyCommerceState()
  load(): PersistedCommerceState { return structuredClone(this.state) }
  save(state: PersistedCommerceState): void { this.state = structuredClone(state) }
}

/** Atomic JSON storage for the single-process MVP. Raw capabilities must never be passed to this boundary. */
export class JsonFileCommerceRepository implements CommerceRepository {
  constructor(private readonly path: string) {}
  load(): PersistedCommerceState {
    try {
      const parsed = JSON.parse(readFileSync(this.path, 'utf8')) as PersistedCommerceState
      if (parsed.schemaVersion !== 1) throw new Error('Unsupported commerce repository schema')
      return parsed
    } catch (error) {
      if ((error as NodeJS.ErrnoException).code === 'ENOENT') return emptyCommerceState()
      throw error
    }
  }
  save(state: PersistedCommerceState): void {
    mkdirSync(dirname(this.path), { recursive: true })
    const temporary = `${this.path}.${process.pid}.tmp`
    writeFileSync(temporary, `${JSON.stringify(state, null, 2)}
`, { encoding: 'utf8', mode: 0o600 })
    renameSync(temporary, this.path)
  }
}
