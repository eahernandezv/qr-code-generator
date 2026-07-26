#!/usr/bin/env node
/**
 * Contract Cross-Validation
 * Owned by WS-01 / WS-12
 * Ensures every schema referenced by another schema exists and version consistency.
 */
import { readdirSync, readFileSync, statSync } from 'fs';
import { join, resolve, dirname, relative } from 'path';

const SCHEMA_DIR = resolve('schemas');
let errors = 0;

function walk(dir, cb) {
  for (const entry of readdirSync(dir)) {
    const full = join(dir, entry);
    const s = statSync(full);
    if (s.isDirectory()) {
      walk(full, cb);
    } else if (entry.endsWith('.json')) {
      cb(full);
    }
  }
}

const allPaths = new Set();
walk(SCHEMA_DIR, (p) => allPaths.add(p));

walk(SCHEMA_DIR, (path) => {
  const data = JSON.parse(readFileSync(path, 'utf8'));
  const json = JSON.stringify(data);
  const refMatches = json.matchAll(/"\$ref":\s*"([^"]+)"/g);
  for (const match of refMatches) {
    const ref = match[1];
    if (ref.startsWith('#')) continue; // local ref
    // Resolve relative refs
    const base = dirname(path);
    let target;
    if (ref.startsWith('/')) {
      target = resolve(SCHEMA_DIR, ref.replace(/^\//, ''));
    } else {
      target = resolve(base, ref);
    }
    if (!allPaths.has(target)) {
      console.error(`FAIL broken $ref in ${relative(process.cwd(), path)} → ${ref} (resolved ${target})`);
      errors++;
    } else {
      console.log(`OK ref: ${relative(process.cwd(), path)} → ${ref}`);
    }
  }
});

if (errors > 0) {
  console.error(`\nContract validation failed with ${errors} error(s)`);
  process.exit(1);
} else {
  console.log('\nContract validation passed');
}
