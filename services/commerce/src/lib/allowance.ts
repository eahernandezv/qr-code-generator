/**
 * Allowance accounting for artistic QR projects.
 *
 * A round counts ONLY when candidates are successfully returned.
 * Provider errors, incomplete boards, or all-unscannable boards
 * do NOT consume allowance.
 */

import { Store } from './store.js';
import type { ArtisticProjectEntitlement } from '../types.js';

export type AllowanceResult =
  | { ok: true; entitlement: ArtisticProjectEntitlement }
  | { ok: false; code: string; message: string };

export class AllowanceStore {
  private store: Store<ArtisticProjectEntitlement>;

  constructor(dataDir?: string) {
    this.store = new Store<ArtisticProjectEntitlement>('allowances', { dataDir, flushIntervalMs: 5000 });
  }

  async load(): Promise<void> {
    await this.store.load();
  }

  async flush(): Promise<void> {
    await this.store.flush();
  }

  getByHash(hash: string): ArtisticProjectEntitlement | undefined {
    return this.store.find((e) => e.project_access_token_hash === hash);
  }

  create(entitlement: ArtisticProjectEntitlement): void {
    this.store.set(entitlement.entitlement_id, entitlement);
  }

  /** Consume one successful round and its candidates. */
  consumeRound(tokenHash: string, candidateCount: number): AllowanceResult {
    const ent = this.getByHash(tokenHash);
    if (!ent) return { ok: false, code: 'allowance_not_found', message: 'Project access not found.' };
    if (ent.status !== 'active' && ent.status !== 'pending') {
      return { ok: false, code: 'project_access_revoked', message: 'Project access is no longer active.' };
    }
    if (ent.rounds_consumed >= ent.total_rounds_allowed) {
      return { ok: false, code: 'rounds_exhausted', message: 'All generation rounds have been used.' };
    }
    const remainingCandidates = ent.total_candidates_allowed - ent.candidates_consumed;
    if (candidateCount > remainingCandidates) {
      return { ok: false, code: 'candidates_exhausted', message: 'Not enough candidate allowance remaining.' };
    }

    const updated: ArtisticProjectEntitlement = {
      ...ent,
      rounds_consumed: ent.rounds_consumed + 1,
      candidates_consumed: ent.candidates_consumed + candidateCount,
      updated_at: new Date().toISOString(),
    };
    if (updated.rounds_consumed >= updated.total_rounds_allowed) {
      // mark consumed when all rounds used; exports may still remain
      updated.status = updated.exports_consumed >= updated.exports_allowed ? 'consumed' : updated.status;
    }
    this.store.set(updated.entitlement_id, updated);
    return { ok: true, entitlement: updated };
  }

  /** Consume one finished-artwork export. */
  consumeExport(tokenHash: string): AllowanceResult {
    const ent = this.getByHash(tokenHash);
    if (!ent) return { ok: false, code: 'allowance_not_found', message: 'Project access not found.' };
    if (ent.status !== 'active' && ent.status !== 'pending') {
      return { ok: false, code: 'project_access_revoked', message: 'Project access is no longer active.' };
    }
    if (ent.exports_consumed >= ent.exports_allowed) {
      return { ok: false, code: 'exports_exhausted', message: 'All exports have been used.' };
    }

    const updated: ArtisticProjectEntitlement = {
      ...ent,
      exports_consumed: ent.exports_consumed + 1,
      updated_at: new Date().toISOString(),
    };
    if (updated.exports_consumed >= updated.exports_allowed && updated.rounds_consumed >= updated.total_rounds_allowed) {
      updated.status = 'consumed';
    }
    this.store.set(updated.entitlement_id, updated);
    return { ok: true, entitlement: updated };
  }

  /** Activate a pending entitlement after verified payment. */
  activate(tokenHash: string, checkoutSessionId: string): AllowanceResult {
    const ent = this.getByHash(tokenHash);
    if (!ent) return { ok: false, code: 'allowance_not_found', message: 'Project access not found.' };
    if (ent.checkout_session_id !== checkoutSessionId) {
      return { ok: false, code: 'project_access_invalid', message: 'Checkout session mismatch.' };
    }
    if (ent.status !== 'pending') {
      return { ok: false, code: 'payment_already_processed', message: 'Entitlement is not in pending state.' };
    }
    const updated: ArtisticProjectEntitlement = {
      ...ent,
      status: 'active',
      updated_at: new Date().toISOString(),
    };
    this.store.set(updated.entitlement_id, updated);
    return { ok: true, entitlement: updated };
  }

  /** Refund/revoke handler. */
  revoke(tokenHash: string, checkoutSessionId: string): AllowanceResult {
    const ent = this.getByHash(tokenHash);
    if (!ent) return { ok: false, code: 'allowance_not_found', message: 'Project access not found.' };
    if (ent.checkout_session_id !== checkoutSessionId) {
      return { ok: false, code: 'project_access_invalid', message: 'Checkout session mismatch.' };
    }
    const updated: ArtisticProjectEntitlement = {
      ...ent,
      status: 'revoked',
      updated_at: new Date().toISOString(),
    };
    this.store.set(updated.entitlement_id, updated);
    return { ok: true, entitlement: updated };
  }

  close(): void {
    this.store.close();
  }
}
