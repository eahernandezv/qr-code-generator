import { QrCoreError, type QrPayload, type NormalizedPayload, type ErrorCorrectionLevel } from '../types.js';

const CAPACITY_TABLE: Record<ErrorCorrectionLevel, number[]> = {
  L: [
    152, 272, 440, 640, 864, 1088, 1248, 1552, 1856, 2192,
    2592, 2960, 3424, 3688, 4184, 4712, 5176, 5768, 6360, 6888,
    7456, 8048, 8752, 9392, 10208, 10960, 11744, 12248, 13048, 13880,
    14744, 15640, 16568, 17528, 18448, 19472, 20528, 21616, 22496, 23648,
  ],
  M: [
    128, 224, 352, 512, 688, 864, 992, 1232, 1456, 1728,
    2032, 2320, 2672, 2920, 3320, 3624, 4056, 4504, 5016, 5352,
    5712, 6256, 6880, 7312, 8000, 8496, 9024, 9544, 10136, 10984,
    11640, 12328, 13048, 13800, 14496, 15312, 15936, 16816, 17728, 18672,
  ],
  Q: [
    104, 176, 272, 384, 496, 608, 704, 880, 1056, 1232,
    1440, 1648, 1952, 2088, 2360, 2600, 2936, 3176, 3560, 3880,
    4096, 4544, 4912, 5312, 5744, 6032, 6464, 6968, 7288, 7880,
    8264, 8920, 9368, 9848, 10288, 10832, 11408, 12016, 12656, 13328,
  ],
  H: [
    72, 128, 208, 288, 368, 480, 528, 688, 800, 976,
    1120, 1264, 1440, 1576, 1784, 2024, 2264, 2504, 2728, 3080,
    3248, 3536, 3712, 4112, 4304, 4768, 5024, 5288, 5608, 5960,
    6344, 6760, 7208, 7688, 7888, 8432, 8768, 9136, 9776, 10208,
  ],
};

const ALPHANUMERIC_CHARS = '0123456789ABCDEFGHIJKLMNOPQRSTUVWXYZ $%*+-./:';

export function normalizePayload(payload: QrPayload): NormalizedPayload {
  const ecl: ErrorCorrectionLevel = payload.errorCorrectionLevel ?? 'M';
  const mode = payload.mode;
  let canonical = payload.content.trim();

  if (canonical.length === 0) {
    throw new QrCoreError('MALFORMED_PAYLOAD', 'Payload content is empty');
  }

  switch (mode) {
    case 'url':
      canonical = normalizeUrl(canonical);
      break;
    case 'email':
      canonical = normalizeEmail(canonical);
      break;
    case 'phone':
      canonical = normalizePhone(canonical);
      break;
    case 'wifi':
      canonical = normalizeWifi(canonical);
      break;
    case 'text':
      canonical = canonical;
      break;
    default:
      throw new QrCoreError('MALFORMED_PAYLOAD', `Unsupported mode: ${mode}`);
  }

  const byteLength = new TextEncoder().encode(canonical).length;

  if (byteLength > 2953) {
    throw new QrCoreError('PAYLOAD_TOO_LONG', 'Payload exceeds maximum QR capacity');
  }

  const version = payload.version ?? computeVersion(byteLength, ecl);
  const maskPattern = payload.maskPattern ?? -1; // -1 means auto-select later

  if (version < 1 || version > 40) {
    throw new QrCoreError('VERSION_OVERFLOW', 'Payload requires QR version > 40');
  }

  return {
    canonical,
    mode,
    byteLength,
    version,
    errorCorrectionLevel: ecl,
    maskPattern: maskPattern >= 0 && maskPattern <= 7 ? maskPattern : 0,
  };
}

function normalizeUrl(url: string): string {
  url = url.trim();
  const lower = url.toLowerCase();
  if (!lower.startsWith('http://') && !lower.startsWith('https://')) {
    throw new QrCoreError('UNSUPPORTED_SCHEME', 'URL must use http:// or https:// scheme');
  }
  // Keep scheme lowercase, rest as-is
  const schemeEnd = url.indexOf('://');
  if (schemeEnd > 0) {
    url = url.slice(0, schemeEnd).toLowerCase() + url.slice(schemeEnd);
  }
  return url;
}

function normalizeEmail(email: string): string {
  email = email.trim().toLowerCase();
  if (!email.includes('@')) {
    throw new QrCoreError('MALFORMED_PAYLOAD', 'Email must contain @');
  }
  return `mailto:${email}`;
}

function normalizePhone(phone: string): string {
  phone = phone.trim().replace(/\s+/g, '');
  if (!/^\+?[\d\-().]+$/.test(phone)) {
    throw new QrCoreError('MALFORMED_PAYLOAD', 'Phone contains invalid characters');
  }
  return `tel:${phone}`;
}

function normalizeWifi(wifi: string): string {
  // Expect format: SSID;PASSWORD;TYPE or just SSID
  const parts = wifi.split(';');
  const ssid = parts[0]?.trim() ?? '';
  if (!ssid) {
    throw new QrCoreError('MALFORMED_PAYLOAD', 'WiFi SSID is required');
  }
  const type = parts[2]?.trim() ?? 'WPA';
  const password = parts[1]?.trim() ?? '';
  return `WIFI:S:${ssid};T:${type};P:${password};;`;
}

function computeVersion(byteLength: number, ecl: ErrorCorrectionLevel): number {
  const capacities = CAPACITY_TABLE[ecl];
  for (let i = 0; i < capacities.length; i++) {
    if (capacities[i] >= byteLength * 8) {
      return i + 1;
    }
  }
  throw new QrCoreError('VERSION_OVERFLOW', 'Payload requires QR version > 40');
}
