/**
 * Idempotency guard for checkout creation.
 *
 * Keys are scoped to mutation type and time-bounded.
 */

import { Store } from './store.js';

interface IdempotencyRecord {
  id: string; // idempotency_key
  key: string;
  checkout_session_id: string;
  created_at: string;
  expires_at: string;
}

const KEY_TTL_MS = 24 * 60 * 60 * 1000; // 24 hours

export class IdempotencyStore {
  private store: Store<IdempotencyRecord>;

  constructor(dataDir?: string) {
    this.store = new Store<IdempotencyRecord>('idempotency', { dataDir, flushIntervalMs: 5000 });
  }

  async load(): Promise<void> {
    await this.store.load();
  }

  async flush(): Promise<void> {
    await this.store.flush();
  }

  /**
   * Try to reserve an idempotency key.
   * Returns existing checkout_session_id if already present and not expired.
   * Returns null if key is free.
   */
  reserve(key: string, checkoutSessionId: string): string | null {
    const now = new Date().toISOString();
    const existing = this.store.get(key);
    if (existing) {
      if (existing.expires_at > now) {
        return existing.checkout_session_id;
      }
      // expired; treat as free
    }
    const expires = new Date(Date.now() + KEY_TTL_MS).toISOString();
    this.store.set(key, {
      id: key,
      key,
      checkout_session_id: checkoutSessionId,
      created_at: now,
      expires_at: expires,
    });
    return null;
  }

  close(): void {
    this.store.close();
  }
}
