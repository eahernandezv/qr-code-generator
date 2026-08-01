import { describe, expect, it } from 'vitest';
import { createHash } from 'node:crypto';
import * as jsQRModule from 'jsqr';
import { PNG } from 'pngjs';
import { generateMatrix, normalizePayload, renderDeterministic, type EyeShape, type ModuleShape } from './index.js';

const modules: ModuleShape[] = ['square', 'rounded', 'circle', 'vertical-bars', 'horizontal-bars'];
const eyes: EyeShape[] = ['square', 'rounded', 'circle', 'squircle', 'chamfered'];
const payload = 'https://example.com/b12/style-primitives?stable=true';
const matrix = generateMatrix(normalizePayload({ mode: 'url', content: payload, errorCorrectionLevel: 'H' }));
type Decoder = (data: Uint8ClampedArray, width: number, height: number) => { data: string } | null;
const decoder = ((jsQRModule as unknown as { default?: Decoder }).default ?? jsQRModule) as Decoder;

function decode(dataUrl: string): string | undefined {
  const png = PNG.sync.read(Buffer.from(dataUrl.slice(dataUrl.indexOf(',') + 1), 'base64'));
  return decoder(new Uint8ClampedArray(png.data), png.width, png.height)?.data;
}
function svg(options: Parameters<typeof renderDeterministic>[1]) {
  return renderDeterministic(matrix, { format: 'svg', moduleSize: 10, margin: 4, ...options });
}
function png(options: Parameters<typeof renderDeterministic>[1]) {
  return renderDeterministic(matrix, { format: 'png-dataurl', moduleSize: 10, margin: 4, ...options });
}

function assertStrictSvg(svgData: string): void {
  const stack: string[] = [];
  const tags = svgData.matchAll(/<\/?([A-Za-z][\w:-]*)([^<>]*?)>/g);
  let tagCount = 0;
  for (const match of tags) {
    tagCount += 1;
    const [tag, name, rawAttributes] = match;
    if (tag.startsWith('</')) {
      expect(rawAttributes.trim(), `closing tag ${tag} must not have attributes`).toBe('');
      expect(stack.pop(), `closing tag ${tag} must match its opening tag`).toBe(name);
      continue;
    }

    const attributes = [...rawAttributes.matchAll(/([A-Za-z_:][\w:.-]*)\s*=\s*(?:"[^"]*"|'[^']*')/g)];
    const attributeNames = attributes.map((attribute) => attribute[1]);
    expect(new Set(attributeNames).size, `duplicate attribute in ${tag}`).toBe(attributeNames.length);
    const unparsed = rawAttributes
      .replace(/([A-Za-z_:][\w:.-]*)\s*=\s*(?:"[^"]*"|'[^']*')/g, '')
      .replace(/\/$/, '')
      .trim();
    expect(unparsed, `malformed attribute syntax in ${tag}`).toBe('');
    if (!tag.endsWith('/>')) stack.push(name);
  }
  expect(tagCount).toBeGreaterThan(0);
  expect(stack, 'all SVG tags must be balanced').toEqual([]);
}

function proveFamilyDistinct(values: readonly string[], option: (value: string) => Parameters<typeof svg>[0], marker: string): void {
  const svgs = values.map((value) => svg(option(value)));
  const pngs = values.map((value) => png(option(value)));
  expect(new Set(svgs.map((artifact) => artifact.data)).size).toBe(values.length);
  expect(new Set(pngs.map((artifact) => artifact.data)).size).toBe(values.length);
  expect(new Set(svgs.map((artifact) => `${artifact.width}x${artifact.height}:${artifact.metadata.margin}`)).size).toBe(1);
  for (const [index, value] of values.entries()) {
    expect(svg(option(value))).toEqual(svgs[index]);
    expect(decode(pngs[index].data)).toBe(payload);
    if (value === 'squircle' || value === 'chamfered') expect(svgs[index].data).toContain(`${marker}="${value}"`);
  }
}

describe('expanded Core-backed style primitive families', () => {
  it('renders body/module primitives distinctly, deterministically, dimension-stably, and decodably', () => {
    proveFamilyDistinct(modules, (value) => ({ shape: value as ModuleShape, eyeFrameShape: 'square', eyeBallShape: 'square' }), 'data-module-shape');
  });

  it('renders eye frame/corner-ring primitives independently and scan-safely', () => {
    proveFamilyDistinct(eyes, (value) => ({ shape: 'square', eyeFrameShape: value as EyeShape, eyeBallShape: 'square' }), 'data-eye-frame-shape');
  });

  it('renders eye ball/pupil primitives independently and scan-safely', () => {
    proveFamilyDistinct(eyes, (value) => ({ shape: 'square', eyeFrameShape: 'square', eyeBallShape: value as EyeShape }), 'data-eye-ball-shape');
  });

  it('uses an XML-equivalent strict check that rejects duplicate attributes', () => {
    expect(() => assertStrictSvg('<svg xmlns="http://www.w3.org/2000/svg"><rect fill="#123" fill="#123"/></svg>'))
      .toThrow(/duplicate attribute/);
  });

  it.each([
    ['squircle frame', { eyeFrameShape: 'squircle', eyeBallShape: 'square' }],
    ['chamfered frame', { eyeFrameShape: 'chamfered', eyeBallShape: 'square' }],
    ['squircle ball', { eyeFrameShape: 'square', eyeBallShape: 'squircle' }],
    ['chamfered ball', { eyeFrameShape: 'square', eyeBallShape: 'chamfered' }],
  ] as const)('serializes %s as strict deterministic SVG without duplicate attributes', (_name, options) => {
    const first = svg(options);
    const second = svg(options);
    assertStrictSvg(first.data);
    expect(createHash('sha256').update(first.data).digest('hex'))
      .toBe(createHash('sha256').update(second.data).digest('hex'));
    expect(first).toEqual(second);
    expect(decode(png(options).data)).toBe(payload);
  });

  it('keeps the legacy eyeShape shorthand compatible while split options override it independently', () => {
    expect(svg({ eyeShape: 'chamfered' }).data).toContain('data-eye-frame-shape="chamfered" data-eye-ball-shape="chamfered"');
    expect(svg({ eyeShape: 'circle', eyeFrameShape: 'squircle', eyeBallShape: 'rounded' }).data)
      .toContain('data-eye-frame-shape="squircle" data-eye-ball-shape="rounded"');
  });

  it('rejects unsupported values instead of silently rendering square', () => {
    expect(() => svg({ shape: 'diamond' as ModuleShape })).toThrow(/Unsupported module shape/);
    expect(() => svg({ eyeFrameShape: 'beaded' as EyeShape })).toThrow(/Unsupported eye frame shape/);
    expect(() => png({ eyeBallShape: 'flower' as EyeShape })).toThrow(/Unsupported eye ball shape/);
  });
});
