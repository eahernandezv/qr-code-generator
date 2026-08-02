import { createHash } from 'node:crypto';
import { createRequire } from 'node:module';
import { mkdirSync, writeFileSync } from 'node:fs';

const requireFromCore = createRequire(new URL('../packages/qr-core/package.json', import.meta.url));
const { PNG } = requireFromCore('pngjs');
const core = await import('../packages/qr-core/dist/index.js');
const { runValidation } = await import('../packages/artistic-qr/dist/validation.js');
const { validateGenerationRequest } = await import('../packages/artistic-qr/dist/request-validation.js');

const outputDir = new URL('../.work-loop/evidence/creator-b26-qrio-corner-eye-shapes/', import.meta.url);
mkdirSync(outputDir, { recursive: true });
const generatedAt = new Date().toISOString();
const frames = ['leaf-frame', 'opposing-leaf-frame', 'd-frame', 'inset-leaf-frame'];
const balls = ['star', 'diamond'];
const existingFrames = ['square', 'circle', 'rounded', 'squircle', 'chamfered', 'diamond', 'hex'];
const existingBalls = ['square', 'circle', 'rounded', 'squircle', 'chamfered', 'hex', 'vertical-capsule', 'horizontal-capsule'];
const payloadInputs = [
  { id: 'short-url', mode: 'url', content: 'https://example.com/b26/a', errorCorrectionLevel: 'H' },
  { id: 'styled-url', mode: 'url', content: 'https://example.com/b26/qrio-eye-shapes?scan-safe=true', errorCorrectionLevel: 'H' },
  { id: 'text', mode: 'text', content: 'B26 QR.io-inspired finder geometry scan evidence 2026', errorCorrectionLevel: 'H' },
];

const sha256 = (value) => createHash('sha256').update(value).digest('hex');
const writeJson = (name, value) => writeFileSync(new URL(name, outputDir), `${JSON.stringify(value, null, 2)}\n`);
const readPng = (dataUrl) => PNG.sync.read(Buffer.from(dataUrl.slice(dataUrl.indexOf(',') + 1), 'base64'));

function candidateFor(artifact, id) {
  return {
    candidateId: id,
    matrixRef: id,
    rendered: { format: artifact.format, data: artifact.data, width: artifact.width, height: artifact.height },
    scanResults: [], exportAllowed: false, artisticScore: 0,
  };
}

function compactValidation(result) {
  return {
    pass: result.pass,
    decoder: result.decoder,
    decoderVersion: result.version,
    thresholdVersion: result.thresholdVersion,
    scannedPayload: result.scannedPayload,
    overallConfidence: result.overallConfidence,
    passedTests: result.tests.filter((test) => test.pass).length,
    totalTests: result.tests.length,
    tests: result.tests,
  };
}

const acceptedCases = [];
const representativePngs = new Map();
for (const payloadInput of payloadInputs) {
  const normalized = core.normalizePayload(payloadInput);
  const matrix = core.generateMatrix(normalized);
  for (const family of ['eye-frame', 'eye-ball']) {
    for (const shape of family === 'eye-frame' ? frames : balls) {
      const options = {
        moduleSize: 10,
        margin: 4,
        colorDark: '#111827',
        colorLight: '#ffffff',
        shape: 'square',
        eyeFrameShape: family === 'eye-frame' ? shape : 'square',
        eyeBallShape: family === 'eye-ball' ? shape : 'square',
      };
      validateGenerationRequest({
        normalizedPayload: normalized,
        mode: 'deterministic_template',
        moduleShape: options.shape,
        eyeFrameShape: options.eyeFrameShape,
        eyeBallShape: options.eyeBallShape,
      });
      const svg = core.renderDeterministic(matrix, { ...options, format: 'svg' });
      const png = core.renderDeterministic(matrix, { ...options, format: 'png-dataurl' });
      const pngValidation = runValidation(candidateFor(png, `${payloadInput.id}-${family}-${shape}-png`), normalized.canonical);
      const svgValidation = payloadInput.id === 'styled-url'
        ? runValidation(candidateFor(svg, `${payloadInput.id}-${family}-${shape}-svg`), normalized.canonical)
        : null;
      acceptedCases.push({
        payloadId: payloadInput.id,
        payload: normalized.canonical,
        family,
        shape,
        options,
        svgSha256: sha256(svg.data),
        pngSha256: sha256(Buffer.from(png.data.split(',')[1], 'base64')),
        svgGeometryMarker: svg.data.includes(`data-${family}-shape="${shape}"`),
        pngValidation: compactValidation(pngValidation),
        svgValidation: svgValidation ? compactValidation(svgValidation) : null,
        accepted: pngValidation.pass && (svgValidation?.pass ?? true),
      });
      if (payloadInput.id === 'styled-url') representativePngs.set(`${family}:${shape}`, readPng(png.data));
    }
  }
}

function cropHash(png, family) {
  const moduleSize = 10;
  const marginPx = 4 * moduleSize;
  const finderSize = 7 * moduleSize;
  const offset = family === 'eye-frame' ? 0 : 2 * moduleSize;
  const size = family === 'eye-frame' ? finderSize : 3 * moduleSize;
  const bytes = [];
  for (let y = marginPx + offset; y < marginPx + offset + size; y += 1) {
    for (let x = marginPx + offset; x < marginPx + offset + size; x += 1) {
      const source = (y * png.width + x) * 4;
      bytes.push(...png.data.subarray(source, source + 4));
    }
  }
  return sha256(Buffer.from(bytes));
}

const styled = core.normalizePayload(payloadInputs[1]);
const styledMatrix = core.generateMatrix(styled);
const fidelity = [];
for (const family of ['eye-frame', 'eye-ball']) {
  const values = family === 'eye-frame' ? [...existingFrames, ...frames] : [...existingBalls, ...balls];
  for (const shape of values) {
    const artifact = core.renderDeterministic(styledMatrix, {
      format: 'png-dataurl', moduleSize: 10, margin: 4, shape: 'square',
      eyeFrameShape: family === 'eye-frame' ? shape : 'square',
      eyeBallShape: family === 'eye-ball' ? shape : 'square',
    });
    fidelity.push({ family, shape, finderCropSha256: cropHash(readPng(artifact.data), family) });
  }
}
const distinctness = [...fidelity.reduce((families, item) => families.add(item.family), new Set())].map((family) => {
  const items = fidelity.filter((item) => item.family === family);
  return { family, count: items.length, uniqueHashes: new Set(items.map((item) => item.finderCropSha256)).size, allDistinct: new Set(items.map((item) => item.finderCropSha256)).size === items.length };
});

function createSheet(keys, columns, fileName) {
  const pngs = keys.map((key) => representativePngs.get(key));
  const cellWidth = Math.max(...pngs.map((png) => png.width)) + 24;
  const cellHeight = Math.max(...pngs.map((png) => png.height)) + 40;
  const rows = Math.ceil(keys.length / columns);
  const sheet = new PNG({ width: cellWidth * columns, height: cellHeight * rows });
  sheet.data.fill(255);
  pngs.forEach((png, index) => {
    const originX = (index % columns) * cellWidth;
    const originY = Math.floor(index / columns) * cellHeight;
    const header = [38 + index * 31, 82 + index * 23, 140 + index * 17].map((value) => value % 220);
    for (let y = originY; y < originY + 16; y += 1) for (let x = originX; x < originX + cellWidth; x += 1) {
      const offset = (y * sheet.width + x) * 4;
      sheet.data[offset] = header[0]; sheet.data[offset + 1] = header[1]; sheet.data[offset + 2] = header[2]; sheet.data[offset + 3] = 255;
    }
    PNG.bitblt(png, sheet, 0, 0, png.width, png.height, originX + 12, originY + 28);
  });
  writeFileSync(new URL(fileName, outputDir), PNG.sync.write(sheet));
  return { fileName, width: sheet.width, height: sheet.height, cells: keys.map((key, index) => ({ index, key, row: Math.floor(index / columns), column: index % columns })) };
}

const frameSheet = createSheet(frames.map((shape) => `eye-frame:${shape}`), 2, 'eye-frame-qrio-contact-sheet.png');
const ballSheet = createSheet(balls.map((shape) => `eye-ball:${shape}`), 2, 'eye-ball-qrio-contact-sheet.png');

function provisionalRejectedArtifact(kind) {
  const normalized = core.normalizePayload({ mode: 'url', content: 'https://example.com/b12/style-primitives?stable=true', errorCorrectionLevel: 'H' });
  const matrix = core.generateMatrix(normalized);
  const base = core.renderDeterministic(matrix, { format: 'png-dataurl', moduleSize: 10, margin: 4, shape: 'square', eyeFrameShape: 'square', eyeBallShape: 'square' });
  const png = readPng(base.data);
  const dark = [26, 26, 46, 255];
  const light = [255, 255, 255, 255];
  const contains = (x, y) => {
    const dx = Math.abs((x + 0.5) / 30 - 0.5);
    const dy = Math.abs((y + 0.5) / 30 - 0.5);
    if (kind === 'plus') return dx <= 0.17 || dy <= 0.17;
    const angle = Math.atan2((y + 0.5) / 30 - 0.5, (x + 0.5) / 30 - 0.5) + Math.PI / 2;
    const radius = Math.hypot(dx, dy);
    const sector = Math.PI / 12;
    const folded = Math.abs((((angle + sector) % (2 * sector)) + 2 * sector) % (2 * sector) - sector);
    return radius <= 0.31 + (0.5 - 0.31) * (1 - folded / sector);
  };
  for (const finder of matrix.functionalRegions.finderPatterns) {
    const startX = (finder.x + 4 + 2) * 10;
    const startY = (finder.y + 4 + 2) * 10;
    for (let y = 0; y < 30; y += 1) for (let x = 0; x < 30; x += 1) {
      const offset = ((startY + y) * png.width + startX + x) * 4;
      png.data.set(contains(x, y) ? dark : light, offset);
    }
  }
  const bytes = PNG.sync.write(png);
  return { normalized, artifact: { ...base, data: `data:image/png;base64,${bytes.toString('base64')}` }, sha256: sha256(bytes) };
}

const rejected = ['plus', 'burst'].map((shape) => {
  const provisional = provisionalRejectedArtifact(shape);
  const validation = runValidation(candidateFor(provisional.artifact, `rejected-${shape}`), provisional.normalized.canonical);
  return {
    candidate: shape === 'plus' ? 'plus / cross' : shape,
    contractValuesRejected: shape === 'plus' ? ['plus', 'cross'] : ['burst'],
    reason: validation.tests[0]?.pass ? 'Failed unchanged 75% perturbation threshold.' : 'Failed mandatory raw decode, so threshold evaluation cannot authorize export.',
    evaluationGeometry: shape === 'plus' ? 'centered orthogonal bars, normalized half-width 0.17' : '12-point radial burst, outer radius 0.50 and inner radius 0.31',
    pngSha256: provisional.sha256,
    validation: compactValidation(validation),
    publicBoundaryRejected: (shape === 'plus' ? ['plus', 'cross'] : ['burst']).every((value) => {
      try {
        validateGenerationRequest({ normalizedPayload: provisional.normalized, mode: 'deterministic_template', eyeBallShape: value });
        return false;
      } catch {
        return true;
      }
    }),
  };
});

writeJson('candidate-validation.json', {
  schemaVersion: '1.0', generatedAt,
  claimBoundary: 'Representative jsQR 1.4.0 evidence under unchanged scan-v1-real-75pct: raw decode mandatory and at least 6/8 deterministic perturbations. Not a universal device guarantee.',
  thresholdChanged: false,
  payloads: payloadInputs,
  acceptedShapes: { eyeFrameShape: frames, eyeBallShape: balls },
  cases: acceptedCases,
  allAccepted: acceptedCases.every((item) => item.accepted),
});
writeJson('rejected-candidates.json', {
  schemaVersion: '1.0', generatedAt,
  thresholdChanged: false,
  candidates: rejected,
  allUnsafeValuesRejectedAtPublicBoundary: rejected.every((item) => item.publicBoundaryRejected),
});
writeJson('icon-fidelity-reference.json', {
  schemaVersion: '1.0', generatedAt,
  geometrySource: 'packages/qr-core/src/finder-geometry.ts pointInShape; shared by SVG scanline geometry and PNG pixel geometry',
  definitions: {
    'leaf-frame': 'square finder silhouette with one large rounded top-right outside corner',
    'opposing-leaf-frame': 'square finder silhouette with rounded top-right and bottom-left opposing corners',
    'd-frame': 'square left edge with a right semicircular side',
    'inset-leaf-frame': 'one anchored square top-left corner with three smaller rounded outside corners',
    star: 'five radial tips over a solid scan anchor core',
    diamond: 'existing diamond geometry promoted to the eye-ball contract after B26 validation',
  },
  fidelity,
  distinctness,
  contactSheets: { frame: frameSheet, ball: ballSheet },
});

console.log(JSON.stringify({
  outputDir: outputDir.pathname,
  acceptedCases: acceptedCases.length,
  allAccepted: acceptedCases.every((item) => item.accepted),
  distinctness,
  rejected: rejected.map((item) => ({ candidate: item.candidate, pass: item.validation.pass, rawPass: item.validation.tests[0]?.pass, publicBoundaryRejected: item.publicBoundaryRejected })),
  contactSheets: { frame: frameSheet, ball: ballSheet },
}, null, 2));
