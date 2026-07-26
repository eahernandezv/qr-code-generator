/**
 * Opaque guest project-access capability.
 *
 * No identity required. A random opaque token grants access to a project
 * and its entitlements. The raw token is given to the client once at
 * checkout creation; only its SHA-256 hash is stored server-side.
 */

import { randomBytes, createHash } from 'node:crypto';
import { Store } from './store.js';
import type { ProjectAccessToken } from '../types.js';

export function hashToken(token: string): string {
  return 'sha256:' + createHash('sha256').update(token).digest('hex');
}

export function generateToken(): string {
  // 32 bytes base64url => ~43 chars, URL-safe
  return randomBytes(32).toString('base64url');
}

interface StoredToken {
  id: string; // hash
  hash: string;
  created_at: string;
  checkout_session_id: string;
}

export class ProjectAccessStore {
  private store: Store<StoredToken>;

  constructor(dataDir?: string) {
    this.store = new Store<StoredToken>('project_access', { dataDir, flushIntervalMs: 5000 });
  }

  async load(): Promise<void> {
    await this.store.load();
  }

  async flush(): Promise<void> {
    await this.store.flush();
  }

  create(checkoutSessionId: string): ProjectAccessToken {
    const token = generateToken();
    const hash = hashToken(token);
    const now = new Date().toISOString();
    this.store.set(hash, {
      id: hash,
      hash,
      created_at: now,
      checkout_session_id: checkoutSessionId,
    });
    return {
      token,
      project_access_token_hash: hash,
      created_at: now,
      checkout_session_id: checkoutSessionId,
    };
  }

  verify(token: string): StoredToken | undefined {
    const hash = hashToken(token);
    return this.store.get(hash);
  }

  findByCheckoutSession(checkoutSessionId: string): StoredToken | undefined {
    return this.store.find((s) => s.checkout_session_id === checkoutSessionId);
  }

  close(): void {
    this.store.close();
  }
}
