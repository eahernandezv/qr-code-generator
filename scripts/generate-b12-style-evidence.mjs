import { createHash } from 'node:crypto';
import { mkdirSync, rmSync, writeFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { PNG } from 'pngjs';
import { generateMatrix, normalizePayload, renderDeterministic } from '../packages/qr-core/dist/index.js';
import { runValidation } from '../packages/artistic-qr/dist/validation.js';
import { validateGenerationRequest } from '../packages/artistic-qr/dist/request-validation.js';

const outputDirectory = resolve('.work-loop/evidence/creator-b12-expanded-style-primitives');
rmSync(outputDirectory, { recursive: true, force: true });
mkdirSync(outputDirectory, { recursive: true });

const payload = normalizePayload({
  mode: 'url',
  content: 'https://example.com/b12',
  errorCorrectionLevel: 'H',
});
const matrix = generateMatrix(payload);
const families = [
  {
    id: 'body-module',
    option: 'shape',
    values: ['square', 'rounded', 'circle', 'vertical-bars', 'horizontal-bars'],
    fixed: { eyeFrameShape: 'square', eyeBallShape: 'square' },
  },
  {
    id: 'eye-frame',
    option: 'eyeFrameShape',
    values: ['square', 'rounded', 'circle', 'squircle', 'chamfered'],
    fixed: { shape: 'square', eyeBallShape: 'square' },
  },
  {
    id: 'eye-ball',
    option: 'eyeBallShape',
    values: ['square', 'rounded', 'circle', 'squircle', 'chamfered'],
    fixed: { shape: 'square', eyeFrameShape: 'square' },
  },
];

const rows = [];
for (const family of families) {
  const rendered = [];
  for (const value of family.values) {
    const options = {
      format: 'svg', moduleSize: 10, margin: 4,
      shape: 'square', eyeFrameShape: 'square', eyeBallShape: 'square',
      ...family.fixed, [family.option]: value,
    };
    const svg = renderDeterministic(matrix, options);
    const png = renderDeterministic(matrix, { ...options, format: 'png-dataurl' });
    const validation = runValidation({
      candidateId: `evidence-${family.id}-${value}`,
      matrixRef: `qr:${matrix.version}:${matrix.maskPattern}:b12-evidence`,
      rendered: { format: png.format, data: png.data, width: png.width, height: png.height },
      scanResults: [], exportAllowed: false, artisticScore: 0.5,
    }, payload.canonical);
    const stem = `${family.id}-${value}`;
    writeFileSync(resolve(outputDirectory, `${stem}.svg`), svg.data);
    writeFileSync(resolve(outputDirectory, `${stem}.png`), Buffer.from(png.data.slice(png.data.indexOf(',') + 1), 'base64'));
    rows.push({
      family: family.id,
      primitive: value,
      renderOption: family.option,
      renderOptionValue: value,
      svgSha256: createHash('sha256').update(svg.data).digest('hex'),
      width: svg.width,
      height: svg.height,
      viewBox: `0 0 ${svg.width} ${svg.height}`,
      moduleSize: svg.metadata.moduleSize,
      marginPx: svg.metadata.margin,
      validationInput: 'exact Core PNG pixels',
      validationPass: validation.pass,
      validationThresholdVersion: validation.thresholdVersion,
      passedCases: validation.tests.filter((test) => test.pass).length,
      totalCases: validation.tests.length,
      overallConfidence: validation.overallConfidence,
      decodedPayloadMatches: validation.scannedPayload === payload.canonical,
    });
    rendered.push({ value, svg, png });
  }
  writeContactSheets(family.id, rendered);
}

const baseRequest = { normalizedPayload: payload, mode: 'deterministic_template' };
const rejectedResearch = [
  { family: 'body-module', option: 'moduleShape', primitive: 'diamond', disposition: 'unsupported-not-safety-claimed' },
  { family: 'body-module', option: 'moduleShape', primitive: 'inset-grid', disposition: 'unsupported-not-safety-claimed' },
  { family: 'body-module', option: 'moduleShape', primitive: 'mosaic', disposition: 'unsupported-not-safety-claimed' },
  { family: 'eye-frame', option: 'eyeFrameShape', primitive: 'beaded', disposition: 'unsupported-not-safety-claimed' },
  { family: 'eye-ball', option: 'eyeBallShape', primitive: 'flower', disposition: 'unsupported-not-safety-claimed' },
  { family: 'eye-ball', option: 'eyeBallShape', primitive: 'vertical-capsule', disposition: 'unsupported-not-safety-claimed' },
].map((item) => {
  try {
    validateGenerationRequest({ ...baseRequest, [item.option]: item.primitive });
    return { ...item, accepted: true, boundaryEvidence: 'UNEXPECTED_ACCEPTANCE' };
  } catch (error) {
    return { ...item, accepted: false, boundaryEvidence: error instanceof Error ? error.message : String(error) };
  }
});

writeFileSync(resolve(outputDirectory, 'rejected-primitives.json'), `${JSON.stringify(rejectedResearch, null, 2)}\n`);
writeFileSync(resolve(outputDirectory, 'primitive-validation.json'), `${JSON.stringify(rows, null, 2)}\n`);
const markdown = [
  '# B12 primitive validation evidence', '',
  '| family | primitive | render option | SVG SHA-256 | size / viewBox | margin | objective validation |',
  '|---|---|---|---|---|---:|---|',
  ...rows.map((row) => `| ${row.family} | ${row.primitive} | \`${row.renderOption}=${row.renderOptionValue}\` | \`${row.svgSha256}\` | ${row.width}×${row.height} / \`${row.viewBox}\` | ${row.marginPx}px | ${row.validationPass ? 'PASS' : 'FAIL'} (${row.passedCases}/${row.totalCases}, ${row.validationThresholdVersion}) |`),
  '',
  'Validation used the exact Core PNG pixels corresponding to each hashed SVG and the unchanged `scan-v1-real-75pct` 8-case gate.',
  '', '## Rejected/unsupported researched primitives', '',
  'These values were rejected at the engine boundary. They are not labeled scan-unsafe because no accepted renderer exists for objective pixel validation; no safety result is fabricated.',
  ...rejectedResearch.map((item) => `- ${item.family} \`${item.primitive}\`: ${item.accepted ? 'UNEXPECTEDLY ACCEPTED' : `rejected (${item.boundaryEvidence})`}`),
  '',
].join('\n');
writeFileSync(resolve(outputDirectory, 'primitive-validation.md'), markdown);
console.log(JSON.stringify({ outputDirectory, rows: rows.length, validationPasses: rows.filter((row) => row.validationPass).length, rejected: rejectedResearch.length }, null, 2));

function writeContactSheets(familyId, items) {
  const cellWidth = Math.max(...items.map(({ svg }) => svg.width)) + 40;
  const cellHeight = Math.max(...items.map(({ svg }) => svg.height)) + 72;
  const sheetWidth = cellWidth * items.length;
  let vector = `<?xml version="1.0" encoding="UTF-8"?><svg xmlns="http://www.w3.org/2000/svg" width="${sheetWidth}" height="${cellHeight}" viewBox="0 0 ${sheetWidth} ${cellHeight}"><rect width="100%" height="100%" fill="#eef2f7"/>`;
  const raster = new PNG({ width: sheetWidth, height: cellHeight });
  for (let offset = 0; offset < raster.data.length; offset += 4) raster.data.set([238, 242, 247, 255], offset);
  const headerColors = [[17, 24, 39], [37, 99, 235], [124, 58, 237], [5, 150, 105], [220, 38, 38]];
  for (const [index, item] of items.entries()) {
    const x = index * cellWidth;
    const inner = item.svg.data.replace(/^<\?xml[^>]*>/, '').replace(/^<svg[^>]*>/, '').replace(/<\/svg>$/, '');
    vector += `<g transform="translate(${x},0)"><rect x="8" y="8" width="${cellWidth - 16}" height="${cellHeight - 16}" rx="12" fill="#ffffff"/><text x="20" y="30" font-family="sans-serif" font-size="18" font-weight="700" fill="#111827">${item.value}</text><text x="20" y="51" font-family="sans-serif" font-size="13" fill="#4b5563">${familyId} · ${item.svg.width}×${item.svg.height}</text><g transform="translate(20,62)">${inner}</g></g>`;
    const source = PNG.sync.read(Buffer.from(item.png.data.slice(item.png.data.indexOf(',') + 1), 'base64'));
    for (let y = 8; y < 24; y += 1) for (let px = 16; px < cellWidth - 16; px += 1) raster.data.set([...headerColors[index], 255], (y * raster.width + x + px) * 4);
    for (let y = 0; y < source.height; y += 1) for (let px = 0; px < source.width; px += 1) {
      const sourceOffset = (y * source.width + px) * 4;
      raster.data.set(source.data.subarray(sourceOffset, sourceOffset + 4), ((y + 32) * raster.width + x + px + 20) * 4);
    }
  }
  vector += '</svg>';
  writeFileSync(resolve(outputDirectory, `${familyId}-contact-sheet.svg`), vector);
  writeFileSync(resolve(outputDirectory, `${familyId}-contact-sheet.png`), PNG.sync.write(raster));
}
