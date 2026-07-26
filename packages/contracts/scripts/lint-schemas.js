#!/usr/bin/env node
/**
 * Contract Schema Lint
 * Owned by WS-01 / WS-12
 * Validates that every schema file is parseable JSON and has required metadata.
 */
import { readdirSync, readFileSync, statSync } from 'fs';
import { join, resolve } from 'path';

const SCHEMA_DIR = resolve('schemas');
const REQUIRED_ROOT_KEYS = ['$schema', '$id', 'title', 'description', 'type'];
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

walk(SCHEMA_DIR, (path) => {
  let data;
  try {
    data = JSON.parse(readFileSync(path, 'utf8'));
  } catch (e) {
    console.error(`FAIL parse: ${path} — ${e.message}`);
    errors++;
    return;
  }
  for (const key of REQUIRED_ROOT_KEYS) {
    if (!(key in data)) {
      console.error(`FAIL missing ${key}: ${path}`);
      errors++;
    }
  }
  if (typeof data.$id !== 'string' || !data.$id.includes('qr.internal')) {
    console.error(`FAIL bad $id domain: ${path}`);
    errors++;
  }
  console.log(`OK schema: ${path}`);
});

if (errors > 0) {
  console.error(`\nSchema lint failed with ${errors} error(s)`);
  process.exit(1);
} else {
  console.log('\nSchema lint passed');
}
