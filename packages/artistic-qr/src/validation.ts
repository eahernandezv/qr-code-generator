/** Objective image-level scan validation with deterministic perturbations. */
import * as jsQRModule from 'jsqr';
import { PNG } from 'pngjs';
import type { Candidate, ScanValidationResult } from './types.js';

export type Raster = { width: number; height: number; data: Uint8ClampedArray };
type Decoder = (
  data: Uint8ClampedArray,
  width: number,
  height: number,
  options?: { inversionAttempts?: 'dontInvert' | 'onlyInvert' | 'attemptBoth' | 'invertFirst' },
) => { data: string } | null;

const decoder = ((jsQRModule as unknown as { default?: Decoder }).default ?? jsQRModule) as Decoder;
const THRESHOLD_VERSION = 'scan-v1-real-75pct';

export function runValidation(candidate: Candidate, expectedPayload?: string): ScanValidationResult {
  let source: Raster;
  try {
    source = rasterizeCandidate(candidate);
  } catch (error) {
    return failureResult(error instanceof Error ? error.message : 'Unable to rasterize candidate');
  }

  const cases: Array<{
    name: string;
    scale: number;
    perturbation: ScanValidationResult['tests'][number]['perturbation'];
    image: Raster;
  }> = [
    { name: 'decode_raw', scale: 1, perturbation: 'none', image: source },
    { name: 'decode_0.5x', scale: 0.5, perturbation: 'none', image: resizeRaster(source, 0.5) },
    { name: 'decode_2x', scale: 2, perturbation: 'none', image: resizeRaster(source, 2) },
    { name: 'blur_light', scale: 1, perturbation: 'blur', image: blur(source) },
    { name: 'noise_light', scale: 1, perturbation: 'noise', image: noise(source) },
    { name: 'contrast_low', scale: 1, perturbation: 'contrast', image: contrast(source, 0.65) },
    { name: 'rotation_2deg', scale: 1, perturbation: 'rotation', image: rotate(source, 2) },
    { name: 'perspective_mild', scale: 1, perturbation: 'perspective', image: perspective(source) },
  ];

  let rawPayload = '';
  const tests = cases.map((testCase, index) => {
    const started = performance.now();
    const result = decoder(testCase.image.data, testCase.image.width, testCase.image.height, {
      inversionAttempts: 'attemptBoth',
    });
    const decodedPayload = result?.data ?? '';
    if (index === 0) rawPayload = decodedPayload;
    const payloadMatches = expectedPayload === undefined ? decodedPayload.length > 0 : decodedPayload === expectedPayload;
    return {
      name: testCase.name,
      pass: result !== null && payloadMatches,
      scale: testCase.scale,
      perturbation: testCase.perturbation,
      details: {
        decodedPayload,
        payloadMatches,
        latencyMs: Math.round((performance.now() - started) * 1000) / 1000,
        width: testCase.image.width,
        height: testCase.image.height,
      },
    };
  });

  const passCount = tests.filter((test) => test.pass).length;
  const passRate = passCount / tests.length;
  const rawPass = tests[0]?.pass === true;
  const pass = rawPass && passRate >= 0.75;
  const overallConfidence: ScanValidationResult['overallConfidence'] = !pass
    ? 'failed'
    : passRate === 1
      ? 'high'
      : passRate >= 0.875
        ? 'medium'
        : 'low';

  return {
    pass,
    decoder: 'jsQR',
    version: '1.4.0',
    thresholdVersion: THRESHOLD_VERSION,
    scannedPayload: rawPayload,
    tests,
    overallConfidence,
  };
}

function failureResult(reason: string): ScanValidationResult {
  return {
    pass: false,
    decoder: 'jsQR',
    version: '1.4.0',
    thresholdVersion: THRESHOLD_VERSION,
    scannedPayload: '',
    tests: [{
      name: 'rasterize',
      pass: false,
      scale: 1,
      perturbation: 'none',
      details: { reason },
    }],
    overallConfidence: 'failed',
  };
}

export function rasterizeCandidate(candidate: Candidate): Raster {
  if (candidate.rendered.format === 'png-dataurl') {
    const match = /^data:image\/png;base64,([A-Za-z0-9+/=]+)$/.exec(candidate.rendered.data);
    if (!match) throw new Error('Malformed PNG data URL');
    const png = PNG.sync.read(Buffer.from(match[1], 'base64'));
    return { width: png.width, height: png.height, data: new Uint8ClampedArray(png.data) };
  }
  assertSafeSvg(candidate.rendered.data);
  return rasterizeSvg(candidate.rendered.data);
}

/** Reject active or unsupported SVG before any decoder treats it as inert pixels. */
export function assertSafeSvg(svg: string): void {
  if (svg.length === 0 || svg.length > 8 * 1024 * 1024) throw new Error('Unsafe SVG: invalid byte length');
  if (/<!DOCTYPE|<!ENTITY/i.test(svg)) throw new Error('Unsafe SVG: declarations are not allowed');
  if (/<\s*(?:script|foreignObject|iframe|object|embed|image|use|a|style|link|audio|video|canvas)\b/i.test(svg)) {
    throw new Error('Unsafe SVG: active or externally resolved element');
  }
  if (/\s(?:on[a-z][\w:-]*)\s*=/i.test(svg)) throw new Error('Unsafe SVG: event handler attribute');
  if (/\s(?:href|xlink:href)\s*=/i.test(svg)) throw new Error('Unsafe SVG: external reference attribute');
  if (/\b(?:javascript|vbscript|data)\s*:/i.test(svg)) throw new Error('Unsafe SVG: executable reference');
  if (/url\s*\(\s*(?!#[A-Za-z_][\w.-]*\s*\))/i.test(svg)) throw new Error('Unsafe SVG: external URL reference');

  for (const match of svg.matchAll(/<\s*\/?\s*([A-Za-z][\w:-]*)\b/g)) {
    const tag = match[1].toLowerCase();
    if (tag !== 'svg' && tag !== 'g' && tag !== 'rect' && tag !== 'circle') {
      throw new Error(`Unsafe SVG: unsupported element ${tag}`);
    }
  }
}

function rasterizeSvg(svg: string): Raster {
  const root = /<svg\b([^>]*)>/i.exec(svg);
  if (!root) throw new Error('Missing SVG root');
  const rootAttrs = attributes(root[1]);
  const width = positiveInteger(rootAttrs.width);
  const height = positiveInteger(rootAttrs.height);
  if (!width || !height || width > 4096 || height > 4096) throw new Error('Invalid SVG dimensions');

  const data = new Uint8ClampedArray(width * height * 4);
  fill(data, parseColor('#ffffff'));
  let drawableCount = 0;
  const translation = /<g\b[^>]*transform=["']translate\(\s*([\d.-]+)[ ,]+([\d.-]+)\s*\)["'][^>]*>/i.exec(svg);
  const translateX = translation ? Number(translation[1]) : 0;
  const translateY = translation ? Number(translation[2]) : 0;

  for (const match of svg.matchAll(/<(rect|circle)\b([^>]*)\/?\s*>/gi)) {
    const tag = match[1].toLowerCase();
    const attrs = attributes(match[2]);
    const color = parseColor(attrs.fill ?? '#000000');
    if (tag === 'rect') {
      const x = number(attrs.x, 0) + translateX;
      const y = number(attrs.y, 0) + translateY;
      const rectWidth = number(attrs.width, width);
      const rectHeight = number(attrs.height, height);
      drawRect(data, width, height, x, y, rectWidth, rectHeight, color, number(attrs.rx, 0));
    } else {
      drawCircle(data, width, height, number(attrs.cx, 0) + translateX, number(attrs.cy, 0) + translateY, number(attrs.r, 0), color);
    }
    drawableCount += 1;
  }
  if (drawableCount === 0) throw new Error('SVG contains no supported drawable elements');
  return { width, height, data };
}

function attributes(source: string): Record<string, string> {
  const result: Record<string, string> = {};
  for (const match of source.matchAll(/([:\w-]+)\s*=\s*["']([^"']*)["']/g)) result[match[1]] = match[2];
  return result;
}

function positiveInteger(value?: string): number | null {
  if (!value || !/^\d+(?:\.\d+)?$/.test(value)) return null;
  const parsed = Math.round(Number(value));
  return parsed > 0 ? parsed : null;
}

function number(value: string | undefined, fallback: number): number {
  const parsed = value === undefined ? fallback : Number(value);
  return Number.isFinite(parsed) ? parsed : fallback;
}

function parseColor(value: string): [number, number, number, number] {
  const hex = value.trim();
  if (/^#[0-9a-f]{3}$/i.test(hex)) {
    return [parseInt(hex[1] + hex[1], 16), parseInt(hex[2] + hex[2], 16), parseInt(hex[3] + hex[3], 16), 255];
  }
  if (/^#[0-9a-f]{6}$/i.test(hex)) {
    return [parseInt(hex.slice(1, 3), 16), parseInt(hex.slice(3, 5), 16), parseInt(hex.slice(5, 7), 16), 255];
  }
  const rgb = /^rgb\(\s*(\d+)\s*,\s*(\d+)\s*,\s*(\d+)\s*\)$/i.exec(hex);
  if (rgb) return [Number(rgb[1]), Number(rgb[2]), Number(rgb[3]), 255];
  if (hex.toLowerCase() === 'white') return [255, 255, 255, 255];
  if (hex.toLowerCase() === 'black') return [0, 0, 0, 255];
  throw new Error(`Unsupported SVG color ${value}`);
}

function fill(data: Uint8ClampedArray, color: [number, number, number, number]): void {
  for (let offset = 0; offset < data.length; offset += 4) data.set(color, offset);
}

function setPixel(data: Uint8ClampedArray, width: number, x: number, y: number, color: [number, number, number, number]): void {
  const offset = (y * width + x) * 4;
  data.set(color, offset);
}

function drawRect(data: Uint8ClampedArray, width: number, height: number, x: number, y: number, rectWidth: number, rectHeight: number, color: [number, number, number, number], radius: number): void {
  const left = Math.max(0, Math.floor(x));
  const top = Math.max(0, Math.floor(y));
  const right = Math.min(width, Math.ceil(x + rectWidth));
  const bottom = Math.min(height, Math.ceil(y + rectHeight));
  for (let py = top; py < bottom; py += 1) {
    for (let px = left; px < right; px += 1) {
      if (radius > 0) {
        const dx = Math.max(left + radius - px, 0, px - (right - radius - 1));
        const dy = Math.max(top + radius - py, 0, py - (bottom - radius - 1));
        if (dx * dx + dy * dy > radius * radius) continue;
      }
      setPixel(data, width, px, py, color);
    }
  }
}

function drawCircle(data: Uint8ClampedArray, width: number, height: number, cx: number, cy: number, radius: number, color: [number, number, number, number]): void {
  for (let y = Math.max(0, Math.floor(cy - radius)); y < Math.min(height, Math.ceil(cy + radius)); y += 1) {
    for (let x = Math.max(0, Math.floor(cx - radius)); x < Math.min(width, Math.ceil(cx + radius)); x += 1) {
      if ((x + 0.5 - cx) ** 2 + (y + 0.5 - cy) ** 2 <= radius ** 2) setPixel(data, width, x, y, color);
    }
  }
}

export function resizeRaster(source: Raster, factor: number): Raster {
  const width = Math.max(1, Math.round(source.width * factor));
  const height = Math.max(1, Math.round(source.height * factor));
  const data = new Uint8ClampedArray(width * height * 4);
  for (let y = 0; y < height; y += 1) for (let x = 0; x < width; x += 1) {
    const sourceX = Math.min(source.width - 1, Math.floor(x / factor));
    const sourceY = Math.min(source.height - 1, Math.floor(y / factor));
    data.set(source.data.subarray((sourceY * source.width + sourceX) * 4, (sourceY * source.width + sourceX) * 4 + 4), (y * width + x) * 4);
  }
  return { width, height, data };
}

export function resizeRasterTo(source: Raster, width: number, height: number): Raster {
  if (!Number.isInteger(width) || !Number.isInteger(height) || width < 1 || height < 1 || width > 10000 || height > 10000) {
    throw new Error('Invalid export dimensions');
  }
  const data = new Uint8ClampedArray(width * height * 4);
  for (let y = 0; y < height; y += 1) for (let x = 0; x < width; x += 1) {
    const sourceX = Math.min(source.width - 1, Math.floor(x * source.width / width));
    const sourceY = Math.min(source.height - 1, Math.floor(y * source.height / height));
    const sourceOffset = (sourceY * source.width + sourceX) * 4;
    data.set(source.data.subarray(sourceOffset, sourceOffset + 4), (y * width + x) * 4);
  }
  return { width, height, data };
}

function mapPixels(source: Raster, transform: (value: number, channel: number, index: number) => number): Raster {
  const data = new Uint8ClampedArray(source.data.length);
  for (let index = 0; index < source.data.length; index += 1) data[index] = index % 4 === 3 ? 255 : transform(source.data[index], index % 4, index);
  return { ...source, data };
}

function contrast(source: Raster, factor: number): Raster {
  return mapPixels(source, (value) => 128 + (value - 128) * factor);
}

function noise(source: Raster): Raster {
  let state = 0x5eed1234;
  return mapPixels(source, (value, _channel, index) => {
    if (index % 4 !== 0) return value;
    state = (state * 1664525 + 1013904223) >>> 0;
    return value + ((state >>> 24) - 128) * 0.08;
  });
}

function blur(source: Raster): Raster {
  const data = new Uint8ClampedArray(source.data.length);
  for (let y = 0; y < source.height; y += 1) for (let x = 0; x < source.width; x += 1) for (let channel = 0; channel < 4; channel += 1) {
    if (channel === 3) { data[(y * source.width + x) * 4 + channel] = 255; continue; }
    let sum = 0;
    let count = 0;
    for (let dy = -1; dy <= 1; dy += 1) for (let dx = -1; dx <= 1; dx += 1) {
      const sx = x + dx; const sy = y + dy;
      if (sx >= 0 && sx < source.width && sy >= 0 && sy < source.height) { sum += source.data[(sy * source.width + sx) * 4 + channel]; count += 1; }
    }
    data[(y * source.width + x) * 4 + channel] = sum / count;
  }
  return { ...source, data };
}

function remap(source: Raster, coordinate: (x: number, y: number) => [number, number]): Raster {
  const data = new Uint8ClampedArray(source.data.length); fill(data, [255, 255, 255, 255]);
  for (let y = 0; y < source.height; y += 1) for (let x = 0; x < source.width; x += 1) {
    const [sx, sy] = coordinate(x, y); const ix = Math.round(sx); const iy = Math.round(sy);
    if (ix >= 0 && ix < source.width && iy >= 0 && iy < source.height) data.set(source.data.subarray((iy * source.width + ix) * 4, (iy * source.width + ix) * 4 + 4), (y * source.width + x) * 4);
  }
  return { ...source, data };
}

function rotate(source: Raster, degrees: number): Raster {
  const angle = degrees * Math.PI / 180; const cos = Math.cos(-angle); const sin = Math.sin(-angle); const cx = (source.width - 1) / 2; const cy = (source.height - 1) / 2;
  return remap(source, (x, y) => { const dx = x - cx; const dy = y - cy; return [cx + dx * cos - dy * sin, cy + dx * sin + dy * cos]; });
}

function perspective(source: Raster): Raster {
  return remap(source, (x, y) => [x - ((y / Math.max(1, source.height - 1)) - 0.5) * source.width * 0.04, y]);
}
