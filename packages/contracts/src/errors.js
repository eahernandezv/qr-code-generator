/**
 * @qr/contracts — Error taxonomy constants and helpers
 * Status: frozen v1.0.0
 */

import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";

const __dirname = dirname(fileURLToPath(import.meta.url));

export const ERROR_TAXONOMY_PATH = join(__dirname, "../schemas/error-taxonomy.v1.json");

let _taxonomy = null;

export function loadErrorTaxonomy() {
  if (!_taxonomy) {
    const raw = readFileSync(ERROR_TAXONOMY_PATH, "utf-8");
    _taxonomy = JSON.parse(raw);
  }
  return _taxonomy;
}

export function getErrorInfo(code) {
  const taxonomy = loadErrorTaxonomy();
  return taxonomy.errorCatalog[code] || null;
}

export function makeErrorEnvelope(code, requestId, overrides = {}) {
  const info = getErrorInfo(code) || {
    message: "Unknown error",
    retryable: false,
    http_status: 500,
  };
  return {
    code,
    message: overrides.message || info.message,
    request_id: requestId,
    retryable: overrides.retryable !== undefined ? overrides.retryable : info.retryable,
    details: overrides.details || [],
  };
}
