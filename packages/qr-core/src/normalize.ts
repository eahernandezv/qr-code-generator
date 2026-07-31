import * as QRCode from 'qrcode';
import { QrCoreError, type NormalizedPayload, type QrPayload } from './types.js';

/** Normalize and encode payload metadata without importing decoder or PNG paths. */
export function normalizePayload(payload: QrPayload): NormalizedPayload {
  let canonical = payload.content.trim();
  if (!canonical) {
    throw new QrCoreError('MALFORMED_PAYLOAD', 'Payload content must not be empty');
  }

  if (payload.mode === 'url') {
    if (!/^[a-z][a-z0-9+.-]*:\/\//i.test(canonical)) {
      canonical = `https://${canonical.replace(/^\/+/, '')}`;
    }
    try {
      const parsed = new URL(canonical);
      if (parsed.protocol !== 'http:' && parsed.protocol !== 'https:') {
        throw new QrCoreError('UNSUPPORTED_SCHEME', `Unsupported URL scheme ${parsed.protocol}`);
      }
      canonical = parsed.toString();
    } catch (error) {
      if (error instanceof QrCoreError) throw error;
      throw new QrCoreError(
        'MALFORMED_PAYLOAD',
        error instanceof Error ? error.message : 'Invalid URL payload',
      );
    }
  }

  const byteLength = new TextEncoder().encode(canonical).length;
  if (byteLength > 2953) {
    throw new QrCoreError('PAYLOAD_TOO_LONG', 'Payload exceeds the contract maximum of 2953 bytes');
  }

  try {
    const encoded = QRCode.create(canonical, {
      version: payload.version,
      errorCorrectionLevel: payload.errorCorrectionLevel ?? 'M',
      maskPattern: payload.maskPattern as QRCode.QRCodeMaskPattern | undefined,
    });
    if (encoded.maskPattern === undefined) {
      throw new Error('QR encoder did not select a mask pattern');
    }
    return {
      canonical,
      mode: payload.mode,
      byteLength,
      version: encoded.version,
      errorCorrectionLevel: payload.errorCorrectionLevel ?? 'M',
      maskPattern: encoded.maskPattern,
    };
  } catch (error) {
    if (error instanceof QrCoreError) throw error;
    const message = error instanceof Error ? error.message : 'QR encoder rejected the payload';
    throw new QrCoreError('PAYLOAD_TOO_LONG', message);
  }
}
