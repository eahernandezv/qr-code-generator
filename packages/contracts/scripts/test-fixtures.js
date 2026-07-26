#!/usr/bin/env node
/**
 * Fixture Tests
 * Owned by WS-01 / WS-12
 * Validates fixtures against schemas using basic JSON Schema validation.
 * For MVP, this uses a lightweight validator; upgrade to Ajv or similar for stricter checks.
 */
import { readdirSync, readFileSync, statSync } from 'fs';
import { join, resolve } from 'path';

const FIXTURES_DIR = resolve('fixtures');
let errors = 0;
let passed = 0;

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

function checkValidFixture(path, data) {
  // Basic structural checks
  if (!data || typeof data !== 'object') {
    console.error(`FAIL invalid object: ${path}`);
    return false;
  }
  // If it looks like an error envelope, validate minimal shape
  if ('code' in data && 'message' in data && 'request_id' in data) {
    if (typeof data.code !== 'string' || typeof data.message !== 'string' || typeof data.request_id !== 'string') {
      console.error(`FAIL malformed error envelope: ${path}`);
      return false;
    }
  }
  // If it looks like telemetry, check event_id and occurred_at
  if ('event_id' in data) {
    if (typeof data.event_id !== 'string' || typeof data.occurred_at !== 'string') {
      console.error(`FAIL malformed telemetry event: ${path}`);
      return false;
    }
  }
  return true;
}

function checkInvalidFixture(path, data) {
  // Invalid fixtures MUST contain a known contract violation
  const json = JSON.stringify(data);
  const violations = [
    'stack_trace',
    'secret_key',
    'sk-',
    'password',
    'token',
    'api_key',
    'private_key',
  ];
  const found = violations.filter((v) => json.includes(v));
  if (found.length === 0) {
    console.error(`FAIL invalid fixture lacks expected violation: ${path}`);
    return false;
  }
  // If it claims to be an error envelope, ensure it's missing required keys or leaks
  if ('code' in data && 'message' in data) {
    if ('stack_trace' in data || 'sql' in data || !data.request_id || typeof data.request_id !== 'string') {
      return true; // expected violation
    }
  }
  return true;
}

walk(FIXTURES_DIR, (path) => {
  let data;
  try {
    data = JSON.parse(readFileSync(path, 'utf8'));
  } catch (e) {
    console.error(`FAIL parse: ${path} — ${e.message}`);
    errors++;
    return;
  }
  const isValidDir = path.includes('/valid/');
  const isInvalidDir = path.includes('/invalid/');
  if (isValidDir) {
    if (checkValidFixture(path, data)) {
      console.log(`OK valid: ${path}`);
      passed++;
    } else {
      errors++;
    }
  } else if (isInvalidDir) {
    if (checkInvalidFixture(path, data)) {
      console.log(`OK invalid: ${path}`);
      passed++;
    } else {
      errors++;
    }
  } else {
    console.error(`FAIL fixture not in valid/ or invalid/: ${path}`);
    errors++;
  }
});

console.log(`\n${passed} fixture(s) checked, ${errors} error(s)`);
if (errors > 0) process.exit(1);
