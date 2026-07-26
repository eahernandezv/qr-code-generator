/**
 * Durable in-memory store with optional JSON file persistence.
 *
 * MVP: simple file-backed map. Replaced by PostgreSQL in later infrastructure.
 */

import { readFile, writeFile, mkdir } from 'node:fs/promises';
import { existsSync } from 'node:fs';
import { resolve } from 'node:path';

export interface StoreOptions {
  dataDir?: string;
  flushIntervalMs?: number;
}

export class Store<T extends { id: string }> {
  private data = new Map<string, T>();
  private dataDir: string;
  private flushTimer?: ReturnType<typeof setInterval>;
  private filename: string;

  constructor(private name: string, opts: StoreOptions = {}) {
    this.dataDir = opts.dataDir ?? resolve(process.cwd(), 'data');
    this.filename = resolve(this.dataDir, `${name}.json`);
    if (opts.flushIntervalMs && opts.flushIntervalMs > 0) {
      this.flushTimer = setInterval(() => this.flush().catch(() => {}), opts.flushIntervalMs);
    }
  }

  async load(): Promise<void> {
    if (!existsSync(this.filename)) return;
    const raw = await readFile(this.filename, 'utf-8');
    const arr: T[] = JSON.parse(raw);
    this.data = new Map(arr.map((item) => [item.id, item]));
  }

  async flush(): Promise<void> {
    await mkdir(this.dataDir, { recursive: true });
    const arr = Array.from(this.data.values());
    await writeFile(this.filename, JSON.stringify(arr, null, 2), 'utf-8');
  }

  get(id: string): T | undefined {
    return this.data.get(id);
  }

  set(id: string, value: T): void {
    this.data.set(id, value);
  }

  has(id: string): boolean {
    return this.data.has(id);
  }

  find(predicate: (item: T) => boolean): T | undefined {
    for (const item of this.data.values()) {
      if (predicate(item)) return item;
    }
    return undefined;
  }

  findAll(predicate: (item: T) => boolean): T[] {
    const out: T[] = [];
    for (const item of this.data.values()) {
      if (predicate(item)) out.push(item);
    }
    return out;
  }

  close(): void {
    if (this.flushTimer) clearInterval(this.flushTimer);
  }
}
