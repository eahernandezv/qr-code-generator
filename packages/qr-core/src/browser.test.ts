import { describe, expect, it } from 'vitest';
import { readFileSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import {
  generateMatrix as generateBrowserMatrix,
  normalizePayload as normalizeBrowserPayload,
  renderDeterministicSvg,
} from './browser.js';
import { generateMatrix, normalizePayload, renderDeterministic } from './index.js';

const sourceRoot = dirname(fileURLToPath(import.meta.url));

describe('@qr/qr-core/browser boundary', () => {
  it('produces byte-identical SVG to the server/root renderer', () => {
    const input = { mode: 'url' as const, content: 'https://example.com/browser-safe?Case=Exact', errorCorrectionLevel: 'H' as const };
    const options = {
      format: 'svg' as const,
      moduleSize: 9,
      margin: 5,
      colorDark: '#c9184a',
      colorLight: '#f9e8ef',
      shape: 'rounded' as const,
      eyeShape: 'square' as const,
    };
    const browserNormalized = normalizeBrowserPayload(input);
    const serverNormalized = normalizePayload(input);
    expect(browserNormalized).toEqual(serverNormalized);
    const browserMatrix = generateBrowserMatrix(browserNormalized);
    const serverMatrix = generateMatrix(serverNormalized);
    expect(browserMatrix).toEqual(serverMatrix);
    expect(renderDeterministicSvg(browserMatrix, options)).toEqual(renderDeterministic(serverMatrix, options));
  });

  it('has no static Node-only import anywhere in its local source graph', () => {
    const visited = new Set<string>();
    const visit = (path: string): void => {
      if (visited.has(path)) return;
      visited.add(path);
      const source = readFileSync(path, 'utf8');
      expect(source).not.toMatch(/(?:from\s+|import\s*\()['"](?:node:|fs[/'"]|path[/'"]|crypto[/'"]|pngjs|jsqr)/);
      expect(source).not.toMatch(/\bBuffer\b/);
      for (const match of source.matchAll(/(?:from\s+|import\s*\()['"](\.\.?\/[^'"]+)['"]/g)) {
        const target = resolve(dirname(path), match[1].replace(/\.js$/, '.ts'));
        visit(target);
      }
    };
    visit(resolve(sourceRoot, 'browser.ts'));
    expect(visited.size).toBeGreaterThanOrEqual(5);
  });
});
