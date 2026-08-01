import { createHash } from 'node:crypto';
import { mkdirSync, writeFileSync } from 'node:fs';
import jsQR from 'jsqr';
import { PNG } from 'pngjs';
import {
  generateMatrix,
  isFunctionalModule,
  normalizePayload,
  renderDeterministic,
} from '../packages/qr-core/dist/index.js';
import {
  generateCandidates,
  resolveArtisticRenderIntent,
} from '../packages/artistic-qr/dist/index.js';

const outputDir = new URL('../.work-loop/evidence/creator-b25a-corner-color-contract/', import.meta.url);
mkdirSync(outputDir, { recursive: true });
const generatedAt = new Date().toISOString();
const normalizedPayload = normalizePayload({
  mode: 'url',
  content: 'https://example.com/b25a/corner-color-evidence',
  errorCorrectionLevel: 'H',
});
const matrix = generateMatrix(normalizedPayload);
const baseRequest = {
  normalizedPayload,
  mode: 'deterministic_template',
  artDirectionId: 'premium-minimal',
  palette: { primary: '#004fc4', background: '#ffffff' },
  moduleShape: 'square',
  eyeFrameShape: 'rounded',
  eyeBallShape: 'circle',
  artisticStrength: 0.5,
  composition: { focalArea: 'balanced', qrProminence: 0.78 },
  seed: 25,
};

function sha256(data) {
  return createHash('sha256').update(data).digest('hex');
}
function writeJson(name, value) {
  writeFileSync(new URL(name, outputDir), `${JSON.stringify(value, null, 2)}\n`);
}
function readPng(dataUrl) {
  return PNG.sync.read(Buffer.from(dataUrl.slice(dataUrl.indexOf(',') + 1), 'base64'));
}
function rgbHex(png, pixelX, pixelY) {
  const offset = (pixelY * png.width + pixelX) * 4;
  return `#${[0, 1, 2].map((index) => png.data[offset + index].toString(16).padStart(2, '0')).join('')}`;
}
function modulePixel(png, options, x, y) {
  const moduleSize = options.moduleSize;
  const margin = options.margin;
  return rgbHex(
    png,
    (margin + x) * moduleSize + Math.floor(moduleSize / 2),
    (margin + y) * moduleSize + Math.floor(moduleSize / 2),
  );
}
function firstBodyModule() {
  for (let y = 0; y < matrix.size; y += 1) for (let x = 0; x < matrix.size; x += 1) {
    if (matrix.modules[y][x] === 1 && !isFunctionalModule(matrix, x, y)) return [x, y];
  }
  throw new Error('No active body module');
}
function decodePng(png) {
  return jsQR(new Uint8ClampedArray(png.data), png.width, png.height)?.data ?? null;
}

const omittedIntent = resolveArtisticRenderIntent(baseRequest);
const explicitMatchOptions = { ...omittedIntent.previewOptions, functionalColor: omittedIntent.palette.functionalColor };
const defaultSvg = renderDeterministic(matrix, { ...omittedIntent.previewOptions, format: 'svg' });
const defaultPng = renderDeterministic(matrix, { ...omittedIntent.previewOptions, format: 'png-dataurl' });
const explicitMatchSvg = renderDeterministic(matrix, { ...explicitMatchOptions, format: 'svg' });
const explicitMatchPng = renderDeterministic(matrix, { ...explicitMatchOptions, format: 'png-dataurl' });

const scenarios = [
  { id: 'match-body-blue', request: baseRequest },
  { id: 'blue-body-purple-corner', request: { ...baseRequest, cornerColor: '#7020a8' } },
  { id: 'berry-body-green-corner', request: { ...baseRequest, palette: { primary: '#9b2948', background: '#ffffff' }, cornerColor: '#087044' } },
  { id: 'unsafe-pale-adapted', request: { ...baseRequest, palette: { primary: '#285887', background: '#f9e8ef' }, cornerColor: '#f8e7ee' } },
];
const [bodyX, bodyY] = firstBodyModule();
const parityRows = [];
const renderedPngs = [];
for (const scenario of scenarios) {
  const intent = resolveArtisticRenderIntent(scenario.request);
  const svg = renderDeterministic(matrix, { ...intent.previewOptions, format: 'svg' });
  const pngArtifact = renderDeterministic(matrix, { ...intent.previewOptions, format: 'png-dataurl' });
  const png = readPng(pngArtifact.data);
  const effective = intent.cornerColor.effective.toLowerCase();
  const body = intent.palette.moduleColors[0].toLowerCase();
  const frameMarker = new RegExp(`data-eye-part="frame"[^>]+fill="${effective}"`).test(svg.data);
  const ballMarker = new RegExp(`data-eye-part="ball"[^>]+fill="${effective}"`).test(svg.data);
  const pngFrame = modulePixel(png, intent.previewOptions, 0, 0);
  const pngBall = modulePixel(png, intent.previewOptions, 3, 3);
  const pngBody = modulePixel(png, intent.previewOptions, bodyX, bodyY);
  parityRows.push({
    id: scenario.id,
    requestedCornerColor: scenario.request.cornerColor ?? null,
    resolution: intent.cornerColor,
    expectedBodyColor: body,
    svg: { frameUsesEffectiveCorner: frameMarker, ballUsesEffectiveCorner: ballMarker, bodyColorPresent: svg.data.includes(`fill="${body}"`), sha256: sha256(svg.data) },
    png: { framePixel: pngFrame, ballPixel: pngBall, bodyPixel: pngBody, decodedPayload: decodePng(png), sha256: sha256(Buffer.from(pngArtifact.data.split(',')[1], 'base64')) },
    parityPass: frameMarker && ballMarker && pngFrame === effective && pngBall === effective && pngBody === body && decodePng(png) === normalizedPayload.canonical,
  });
  renderedPngs.push({ png, body, corner: effective });
}

writeJson('corner-color-contract.json', {
  schemaVersion: '1.0',
  generatedAt,
  acceptedVocabulary: {
    studioAndArtisticRequest: 'cornerColor',
    coreRenderOption: 'functionalColor',
    rejectedAlternatives: {
      functionalColor: 'Not exposed as the Studio request field because it is standards-oriented and also colors timing/format/version functional modules.',
      cornerPalette: 'Deferred; B25a supports one curated opaque solid color only.',
    },
  },
  defaults: { cornerColor: null, studioLabel: 'Match body', behavior: 'Omission preserves the existing resolved functional/body color and rendered bytes.' },
  validation: {
    syntax: 'opaque #RGB or #RRGGBB only',
    minimumBackgroundContrastRatio: 4.5,
    lowContrastBehavior: 'deterministically adapted to the highest-contrast color among existing Match body, #111827, #000000, and #ffffff before rendering and unchanged decoder validation',
    malformedBehavior: 'MALFORMED_PAYLOAD rejection',
  },
  compatibility: [
    'GenerationRequest addition is optional.',
    'Core functionalColor already existed; its name and default resolution are unchanged.',
    'Frozen qr-core-api.v1.json and artistic-qr-api.v1.json bytes are unchanged.',
    'No cornerColor produces byte-identical SVG/PNG to explicit existing Match body functionalColor.',
  ],
  defaultByteEquality: {
    svg: defaultSvg.data === explicitMatchSvg.data,
    png: defaultPng.data === explicitMatchPng.data,
    svgSha256: sha256(defaultSvg.data),
    pngSha256: sha256(Buffer.from(defaultPng.data.split(',')[1], 'base64')),
  },
});

writeJson('svg-png-parity.json', {
  schemaVersion: '1.0', generatedAt, payload: normalizedPayload.canonical,
  method: 'SVG eye frame/ball fill markers plus exact PNG finder-frame, finder-ball, and first active non-functional body-module pixel sampling; PNG independently decoded with jsQR 1.4.0.',
  firstSampledBodyModule: { x: bodyX, y: bodyY },
  scenarios: parityRows,
  allPass: parityRows.every((row) => row.parityPass),
});

const sheetPadding = 20;
const swatchHeight = 24;
const cellGap = 20;
const qrWidth = Math.max(...renderedPngs.map(({ png }) => png.width));
const qrHeight = Math.max(...renderedPngs.map(({ png }) => png.height));
const cellWidth = qrWidth + sheetPadding * 2;
const cellHeight = qrHeight + sheetPadding * 2 + swatchHeight;
const sheet = new PNG({ width: cellWidth * 2 + cellGap, height: cellHeight * 2 + cellGap });
sheet.data.fill(255);
function colorTuple(hex) {
  const raw = hex.slice(1);
  return [0, 2, 4].map((offset) => Number.parseInt(raw.slice(offset, offset + 2), 16));
}
function fillRect(png, x, y, width, height, color) {
  const [r, g, b] = colorTuple(color);
  for (let py = y; py < y + height; py += 1) for (let px = x; px < x + width; px += 1) {
    const offset = (py * png.width + px) * 4;
    png.data[offset] = r; png.data[offset + 1] = g; png.data[offset + 2] = b; png.data[offset + 3] = 255;
  }
}
for (const [index, item] of renderedPngs.entries()) {
  const column = index % 2;
  const row = Math.floor(index / 2);
  const originX = column * (cellWidth + cellGap);
  const originY = row * (cellHeight + cellGap);
  const swatchSplit = Math.floor(cellWidth / 2);
  fillRect(sheet, originX, originY, swatchSplit, swatchHeight, item.body);
  fillRect(sheet, originX + swatchSplit, originY, cellWidth - swatchSplit, swatchHeight, item.corner);
  PNG.bitblt(item.png, sheet, 0, 0, item.png.width, item.png.height, originX + sheetPadding, originY + swatchHeight + sheetPadding);
}
writeFileSync(new URL('body-vs-corner-color-contact-sheet.png', outputDir), PNG.sync.write(sheet));

const scanCases = [];
for (const scenario of scenarios.slice(0, 3).concat(scenarios.slice(3))) {
  const intent = resolveArtisticRenderIntent(scenario.request);
  const board = await generateCandidates(scenario.request);
  scanCases.push({
    id: scenario.id,
    requestedCornerColor: scenario.request.cornerColor ?? null,
    resolution: intent.cornerColor,
    candidateCount: board.candidates.length,
    exportAllowedCount: board.candidates.filter((candidate) => candidate.exportAllowed).length,
    candidates: board.candidates.map((candidate) => ({
      candidateId: candidate.candidateId,
      exportAllowed: candidate.exportAllowed,
      decoder: candidate.scanResults[0].decoder,
      decoderVersion: candidate.scanResults[0].version,
      thresholdVersion: candidate.scanResults[0].thresholdVersion,
      overallConfidence: candidate.scanResults[0].overallConfidence,
      passedTests: candidate.scanResults[0].tests.filter((test) => test.pass).length,
      totalTests: candidate.scanResults[0].tests.length,
      tests: candidate.scanResults[0].tests,
    })),
  });
}
const rejected = [];
for (const cornerColor of ['red', '#12', '#11223344']) {
  try {
    await generateCandidates({ ...baseRequest, cornerColor });
    rejected.push({ cornerColor, rejected: false });
  } catch (error) {
    rejected.push({ cornerColor, rejected: true, error: String(error) });
  }
}
writeJson('scan-safe-validation.json', {
  schemaVersion: '1.0', generatedAt,
  claimBoundary: 'Representative jsQR 1.4.0 perturbation evidence under existing scan-v1-real-75pct threshold; not a universal device guarantee.',
  thresholdChanged: false,
  cases: scanCases,
  malformedRejected: rejected,
  allRepresentativeCandidatesExportAllowed: scanCases.every((item) => item.exportAllowedCount === item.candidateCount),
  allMalformedRejected: rejected.every((item) => item.rejected),
});

console.log(JSON.stringify({
  outputDir: outputDir.pathname,
  parityAllPass: parityRows.every((row) => row.parityPass),
  scanCases: scanCases.map((item) => ({ id: item.id, allowed: item.exportAllowedCount, total: item.candidateCount, behavior: item.resolution.behavior })),
  malformedRejected: rejected.every((item) => item.rejected),
  contactSheet: { width: sheet.width, height: sheet.height },
}, null, 2));
