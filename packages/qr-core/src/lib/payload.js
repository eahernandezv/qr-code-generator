/**
 * @qr/qr-core — Payload normalization
 * Status: frozen v1.0.0
 */

const MAX_PAYLOAD_LENGTH = 4096;

export function normalizePayload(payload, ecLevel = "M") {
  if (typeof payload !== "string") {
    throw new Error("Payload must be a string");
  }
  if (payload.length === 0) {
    throw new Error("Payload must not be empty");
  }
  if (payload.length > MAX_PAYLOAD_LENGTH) {
    const err = new Error("Payload exceeds maximum length");
    err.code = "QR_PAYLOAD_TOO_LONG";
    throw err;
  }

  const normalized = payload.trim();
  const mode = detectMode(normalized);
  const version = estimateVersion(normalized.length, mode, ecLevel);

  return {
    original: payload,
    normalized,
    mode,
    version,
    ec_level: ecLevel,
  };
}

function detectMode(payload) {
  if (/^[0-9]+$/.test(payload)) return "numeric";
  if (/^[0-9A-Z $%*+\-./:]+$/.test(payload)) return "alphanumeric";
  return "byte";
}

function estimateVersion(length, mode, ecLevel) {
  const capacity = {
    numeric: { L: 41, M: 34, Q: 27, H: 17 },
    alphanumeric: { L: 25, M: 20, Q: 16, H: 10 },
    byte: { L: 17, M: 14, Q: 11, H: 7 },
  };
  const base = capacity[mode]?.[ecLevel] || capacity.byte.M;
  let version = 1;
  while (version <= 40 && base * version * version < length) {
    version++;
  }
  if (version > 40) {
    const err = new Error("Payload too long for any QR version");
    err.code = "QR_PAYLOAD_TOO_LONG";
    throw err;
  }
  return version;
}
