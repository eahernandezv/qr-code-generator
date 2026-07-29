import { describe, expect, it } from 'vitest';
import * as jsQRModule from 'jsqr';
import { PNG } from 'pngjs';
import { decodeMatrix, generateMatrix, normalizePayload, renderDeterministic } from './index.js';

const payloads = [
  { mode: 'url' as const, content: 'https://Example.COM/CaseSensitive?q=One', errorCorrectionLevel: 'H' as const },
  { mode: 'text' as const, content: 'HELLO WORLD 123', errorCorrectionLevel: 'M' as const },
  { mode: 'text' as const, content: 'UTF-8: café / 東京', errorCorrectionLevel: 'Q' as const },
];

describe('standards-correct deterministic QR generation', () => {
  it.each(payloads)('round-trips $content through a real image decoder', (input) => {
    const normalized = normalizePayload(input);
    const matrix = generateMatrix(normalized);
    const decoded = decodeMatrix(matrix);
    expect(decoded).toEqual({ payload: normalized.canonical, success: true });
  });

  it('is repeatable for the same normalized payload and render options', () => {
    const normalized = normalizePayload({ mode: 'text', content: 'repeatable', errorCorrectionLevel: 'H' });
    const firstMatrix = generateMatrix(normalized);
    const secondMatrix = generateMatrix(normalized);
    expect(secondMatrix).toEqual(firstMatrix);

    const options = { format: 'svg' as const, moduleSize: 8, margin: 4 };
    expect(renderDeterministic(secondMatrix, options)).toEqual(renderDeterministic(firstMatrix, options));
  });

  it('renders a self-contained PNG data URL that independently decodes', () => {
    const normalized = normalizePayload(payloads[0]);
    const matrix = generateMatrix(normalized);
    const artifact = renderDeterministic(matrix, { format: 'png-dataurl', moduleSize: 8, margin: 4 });
    const png = PNG.sync.read(Buffer.from(artifact.data.slice(artifact.data.indexOf(',') + 1), 'base64'));
    type Decoder = (data: Uint8ClampedArray, width: number, height: number) => { data: string } | null;
    const decoder = ((jsQRModule as unknown as { default?: Decoder }).default ?? jsQRModule) as Decoder;
    const decoded = decoder(new Uint8ClampedArray(png.data), png.width, png.height);
    expect(artifact.format).toBe('png-dataurl');
    expect(decoded?.data).toBe(normalized.canonical);
  });

  it('preserves URL path/query case while normalizing scheme and host', () => {
    const normalized = normalizePayload({ mode: 'url', content: 'HTTPS://Example.COM/CaseSensitive?q=One' });
    expect(normalized.canonical).toBe('https://example.com/CaseSensitive?q=One');
  });

  it('rejects malformed and overflowing payloads with contract error codes', () => {
    expect(() => normalizePayload({ mode: 'text', content: '' })).toThrow(/MALFORMED_PAYLOAD/);
    expect(() => normalizePayload({ mode: 'url', content: 'ftp://example.com/file' })).toThrow(/UNSUPPORTED_SCHEME/);
    expect(() => normalizePayload({ mode: 'text', content: 'x'.repeat(3000), errorCorrectionLevel: 'H' })).toThrow(/PAYLOAD_TOO_LONG|VERSION_OVERFLOW/);
  });
});
