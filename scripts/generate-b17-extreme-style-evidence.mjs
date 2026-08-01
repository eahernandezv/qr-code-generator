import { createHash } from 'node:crypto';
import { mkdirSync, rmSync, writeFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { PNG } from 'pngjs';
import { generateMatrix, normalizePayload, renderDeterministic } from '../packages/qr-core/dist/index.js';
import { pointInShape, svgShape } from '../packages/qr-core/dist/finder-geometry.js';
import { pointInModuleShape } from '../packages/qr-core/dist/module-geometry.js';
import { runValidation } from '../packages/artistic-qr/dist/validation.js';

const outputDirectory = resolve('.work-loop/evidence/creator-b17-extreme-style-primitives');
rmSync(outputDirectory, { recursive: true, force: true });
mkdirSync(outputDirectory, { recursive: true });

const payload = normalizePayload({ mode: 'url', content: 'https://example.com/b17', errorCorrectionLevel: 'H' });
const matrix = generateMatrix(payload);
const families = [
  { id: 'body-module', option: 'shape', values: ['square', 'rounded', 'circle', 'vertical-bars', 'horizontal-bars', 'notched', 'shield'], accepted: ['notched', 'shield'], fixed: { eyeFrameShape: 'square', eyeBallShape: 'square' } },
  { id: 'eye-frame', option: 'eyeFrameShape', values: ['square', 'rounded', 'circle', 'squircle', 'chamfered', 'diamond', 'hex'], accepted: ['diamond', 'hex'], fixed: { shape: 'square', eyeBallShape: 'square' } },
  { id: 'eye-ball', option: 'eyeBallShape', values: ['square', 'rounded', 'circle', 'squircle', 'chamfered', 'hex', 'vertical-capsule', 'horizontal-capsule'], accepted: ['hex', 'vertical-capsule', 'horizontal-capsule'], fixed: { shape: 'square', eyeFrameShape: 'square' } },
];
const rows = [];

for (const family of families) {
  const rendered = [];
  for (const value of family.values) {
    const options = { format: 'svg', moduleSize: 10, margin: 4, shape: 'square', eyeFrameShape: 'square', eyeBallShape: 'square', ...family.fixed, [family.option]: value };
    const svg = renderDeterministic(matrix, options);
    const png = renderDeterministic(matrix, { ...options, format: 'png-dataurl' });
    const svgRerender = renderDeterministic(matrix, options);
    const pngRerender = renderDeterministic(matrix, { ...options, format: 'png-dataurl' });
    const validation = validatePng(`${family.id}-${value}`, png);
    const binary = Buffer.from(png.data.slice(png.data.indexOf(',') + 1), 'base64');
    const stem = `${family.id}-${value}`;
    writeFileSync(resolve(outputDirectory, `${stem}.svg`), svg.data);
    writeFileSync(resolve(outputDirectory, `${stem}.png`), binary);
    rows.push({
      family: family.id,
      primitive: value,
      acceptedInB17: family.accepted.includes(value),
      renderOption: family.option,
      renderOptionValue: value,
      svgSha256: sha(svg.data),
      pngSha256: sha(binary),
      deterministicSvg: svg.data === svgRerender.data,
      deterministicPng: png.data === pngRerender.data,
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
      decodedPayloadMatches: validation.scannedPayload === payload.canonical,
    });
    rendered.push({ value, svg, png });
  }
  writeContactSheet(family.id, rendered);
}

const allIconRecipes = [
  ...['square', 'rounded', 'circle', 'vertical-bars', 'horizontal-bars'].map((primitive) => bodyRecipe(primitive, `Existing Core ${primitive} comparison recipe.`)),
  bodyRecipe('notched', 'Render a 2×2 grid of 8-unit modules using the Core notched predicate; preserve the four inward center-edge bites.'),
  bodyRecipe('shield', 'Render a 2×2 grid of 8-unit modules with a flat top, straight upper sides, and centered lower point from the Core shield predicate.'),
  ...['square', 'rounded', 'circle', 'squircle', 'chamfered'].map((primitive) => eyeFrameRecipe(primitive, `Existing Core ${primitive} frame comparison recipe.`)),
  eyeFrameRecipe('diamond', 'Draw the Core diamond as a 24-unit outer frame, subtract the same 16-unit diamond, and retain a neutral square center ball.'),
  eyeFrameRecipe('hex', 'Draw the Core tall hex silhouette as a 24-unit outer frame, subtract the same 16-unit hex, and retain a neutral square center ball.'),
  ...['square', 'rounded', 'circle', 'squircle', 'chamfered'].map((primitive) => eyeBallRecipe(primitive, `Existing Core ${primitive} ball comparison recipe.`)),
  eyeBallRecipe('hex', 'Use a neutral square finder frame and render the center 8-unit ball with the Core tall-hex predicate.'),
  eyeBallRecipe('vertical-capsule', 'Use a neutral square finder frame and render the enlarged pupil as the Core vertical capsule: full height, narrower width, semicircular top and bottom caps.'),
  eyeBallRecipe('horizontal-capsule', 'Use a neutral square finder frame and render the enlarged pupil as the Core horizontal capsule: full width, shorter height, semicircular left and right caps.'),
];
const acceptedKeys = new Set(families.flatMap((family) => family.accepted.map((primitive) => `${family.id}:${primitive}`)));
const iconRecipes = allIconRecipes.filter((item) => acceptedKeys.has(`${item.family}:${item.primitive}`));
for (const item of iconRecipes) writeFileSync(resolve(outputDirectory, item.iconFile), item.svg);
const iconHashesByFamily = new Map();
for (const item of iconRecipes) {
  const values = iconHashesByFamily.get(item.family) ?? [];
  values.push(item.iconRasterSha256);
  iconHashesByFamily.set(item.family, values);
}
for (const [family, hashes] of iconHashesByFamily) {
  if (new Set(hashes).size !== hashes.length) throw new Error(`Compact icon collision in ${family}`);
}
writeIconContactSheet(iconRecipes, 'icon-fidelity-contact-sheet.svg');
writeIconContactSheet(allIconRecipes, 'icon-distinctness-vs-existing-contact-sheet.svg');
for (const family of families) {
  const comparison = allIconRecipes.filter((item) => item.family === family.id);
  const groups = new Map();
  for (const item of comparison) groups.set(item.iconRasterSha256, [...(groups.get(item.iconRasterSha256) ?? []), item]);
  const acceptedValues = new Set(family.accepted);
  const collisions = [...groups.values()].filter((items) => items.length > 1 && items.some((item) => acceptedValues.has(item.primitive))).map((items) => items.map((item) => item.primitive));
  if (collisions.length > 0) throw new Error(`Compact icon pixel collision against existing ${family.id} options: ${JSON.stringify(collisions)}`);
}
writeFileSync(resolve(outputDirectory, 'icon-recipes.json'), `${JSON.stringify(iconRecipes.map(({ svg, ...item }) => item), null, 2)}\n`);

const rejected = buildRejectedEvidence();
writeFileSync(resolve(outputDirectory, 'rejected-candidates.json'), `${JSON.stringify(rejected, null, 2)}\n`);
writeFileSync(resolve(outputDirectory, 'primitive-validation.json'), `${JSON.stringify(rows, null, 2)}\n`);
writeFileSync(resolve(outputDirectory, 'primitive-validation.md'), validationMarkdown(rows, rejected, iconRecipes));

const accepted = rows.filter((row) => row.acceptedInB17);
for (const family of families) {
  const familyRows = accepted.filter((row) => row.family === family.id);
  if (new Set(familyRows.map((row) => row.svgSha256)).size !== familyRows.length) throw new Error(`Accepted SVG hash collision in ${family.id}`);
  if (new Set(familyRows.map((row) => row.pngSha256)).size !== familyRows.length) throw new Error(`Accepted PNG hash collision in ${family.id}`);
}
if (!accepted.every((row) => row.deterministicSvg && row.deterministicPng)) throw new Error('Accepted primitive rerender was not deterministic');
console.log(JSON.stringify({
  outputDirectory,
  acceptedRows: accepted.length,
  acceptedValidationPasses: accepted.filter((row) => row.validationPass).length,
  allAcceptedEightOfEight: accepted.every((row) => row.passedCases === 8 && row.totalCases === 8),
  allAcceptedSvgPngDeterministic: accepted.every((row) => row.deterministicSvg && row.deterministicPng),
  acceptedHashesUniqueByFamily: Object.fromEntries(families.map((family) => {
    const familyRows = accepted.filter((row) => row.family === family.id);
    return [family.id, new Set(familyRows.map((row) => `${row.svgSha256}:${row.pngSha256}`)).size === familyRows.length];
  })),
  compactIconRecipes: iconRecipes.length,
  compactIconHashesUniqueByFamily: Object.fromEntries([...iconHashesByFamily].map(([family, hashes]) => [family, new Set(hashes).size === hashes.length])),
  compactIconsDistinctFromExistingByFamily: Object.fromEntries(families.map((family) => {
    const comparison = allIconRecipes.filter((item) => item.family === family.id);
    return [family.id, family.accepted.every((primitive) => {
      const acceptedItem = comparison.find((item) => item.primitive === primitive);
      return comparison.filter((item) => item.iconRasterSha256 === acceptedItem.iconRasterSha256).length === 1;
    })];
  })),
  rejectedCandidates: rejected.length,
}, null, 2));

function validatePng(id, png) {
  return runValidation({ candidateId: `evidence-${id}`, matrixRef: `qr:${matrix.version}:${matrix.maskPattern}:b17`, rendered: { format: png.format, data: png.data, width: png.width, height: png.height }, scanResults: [], exportAllowed: false, artisticScore: 0.5 }, payload.canonical);
}

function sha(value) {
  return createHash('sha256').update(value).digest('hex');
}

function iconDocument(content) {
  return `<?xml version="1.0" encoding="UTF-8"?><svg xmlns="http://www.w3.org/2000/svg" width="28" height="28" viewBox="0 0 28 28"><rect width="28" height="28" rx="4" fill="#ffffff"/>${content}</svg>`;
}

function bodyRecipe(primitive, recipe) {
  let content = '';
  for (const y of [4, 14]) for (const x of [4, 14]) content += svgBodyIconModule(primitive, x, y, 8, '#111111');
  return recipeRecord('body-module', primitive, recipe, iconDocument(content), 'Use the exact `pointInModuleShape` predicate at an 8-unit tile size; do not substitute a generic polygon.');
}

function svgBodyIconModule(primitive, x, y, size, fill) {
  const rows = [];
  for (let py = 0; py < size; py += 1) {
    let first = -1;
    let last = -1;
    for (let px = 0; px < size; px += 1) {
      if (!pointInBodyModule(primitive, px, py, size)) continue;
      if (first < 0) first = px;
      last = px;
    }
    if (first >= 0) rows.push(`<rect data-module-shape="${primitive}" fill="${fill}" x="${x + first}" y="${y + py}" width="${last - first + 1}" height="1"/>`);
  }
  return `<g data-module-shape="${primitive}" fill="${fill}">${rows.join('')}</g>`;
}

function pointInBodyModule(primitive, x, y, size) {
  const center = (size - 1) / 2;
  if (primitive === 'circle') return Math.hypot(x - center, y - center) <= size / 2;
  if (primitive === 'rounded') return pointInShape('rounded', x, y, size);
  if (primitive === 'vertical-bars') return Math.abs(x - center) <= size * 3 / 8;
  if (primitive === 'horizontal-bars') return Math.abs(y - center) <= size * 3 / 8;
  if (primitive === 'notched' || primitive === 'shield') return pointInModuleShape(primitive, x, y, size);
  return true;
}

function eyeFrameRecipe(primitive, recipe) {
  const content = svgShape(primitive, 2, 2, 24, '#111111', 'icon-frame') + svgShape(primitive, 6, 6, 16, '#ffffff', 'icon-frame-cutout') + svgShape('square', 10, 10, 8, '#111111', 'icon-neutral-ball');
  return recipeRecord('eye-frame', primitive, recipe, iconDocument(content), 'Use nested outer/cutout shapes from the exact Core `pointInShape` predicate; keep the center ball neutral square.');
}

function eyeBallRecipe(primitive, recipe) {
  // Textless controls should depict the configured pupil silhouette itself at a
  // readable scale; a literal full-finder thumbnail collapses distinct 3×3 balls.
  const content = '<rect x="2" y="2" width="24" height="24" rx="3" fill="none" stroke="#d1d5db"/>' + svgShape(primitive, 5, 5, 18, '#111111', 'icon-ball');
  return recipeRecord('eye-ball', primitive, recipe, iconDocument(content), 'Show the exact Core ball silhouette enlarged to 18 units inside a neutral outline; do not use a literal full-finder thumbnail at compact size.');
}

function recipeRecord(family, primitive, recipe, svg, fidelityConstraint) {
  const item = { family, primitive, compactIconDistinct: true, recommendedViewBox: '0 0 28 28', minimumRenderedSizePx: 24, iconFile: `icon-${family}-${primitive}.svg`, iconSvgSha256: sha(svg), recipe, fidelityConstraint, svg };
  return { ...item, iconRasterSha256: compactIconRasterSha(item) };
}

function writeIconContactSheet(items, filename) {
  const cell = 96;
  let sheet = `<?xml version="1.0" encoding="UTF-8"?><svg xmlns="http://www.w3.org/2000/svg" width="${cell * items.length}" height="96" viewBox="0 0 ${cell * items.length} 96"><rect width="100%" height="100%" fill="#eef2f7"/>`;
  items.forEach((item, index) => {
    const inner = item.svg.replace(/^<\?xml[^>]*>/, '').replace(/^<svg[^>]*>/, '').replace(/<\/svg>$/, '');
    sheet += `<g transform="translate(${index * cell},0)"><rect x="4" y="4" width="88" height="88" rx="8" fill="#fff"/><text x="8" y="18" font-family="sans-serif" font-size="9" fill="#111">${item.family}</text><text x="8" y="30" font-family="sans-serif" font-size="10" font-weight="700" fill="#111">${item.primitive}</text><g transform="translate(34,38)">${inner}</g></g>`;
  });
  sheet += '</svg>';
  writeFileSync(resolve(outputDirectory, filename), sheet);

  const scale = 3;
  const raster = new PNG({ width: cell * items.length, height: 96 });
  for (let offset = 0; offset < raster.data.length; offset += 4) raster.data.set([238, 242, 247, 255], offset);
  items.forEach((item, index) => {
    const originX = index * cell + 6;
    fillRect(raster, originX, 6, 84, 84, [255, 255, 255, 255]);
    const iconX = index * cell + 6;
    const iconY = 6;
    for (let y = 0; y < 28; y += 1) for (let x = 0; x < 28; x += 1) {
      const dark = iconPixel(item, x, y);
      if (!dark) continue;
      fillRect(raster, iconX + x * scale, iconY + y * scale, scale, scale, [17, 17, 17, 255]);
    }
  });
  writeFileSync(resolve(outputDirectory, filename.replace(/\.svg$/, '.png')), PNG.sync.write(raster));
}

function compactIconRasterSha(item) {
  const pixels = Buffer.alloc(28 * 28);
  for (let y = 0; y < 28; y += 1) for (let x = 0; x < 28; x += 1) pixels[y * 28 + x] = iconPixel(item, x, y) ? 1 : 0;
  return sha(pixels);
}

function iconPixel(item, x, y) {
  if (item.family === 'body-module') {
    for (const oy of [4, 14]) for (const ox of [4, 14]) {
      if (x >= ox && x < ox + 8 && y >= oy && y < oy + 8 && pointInBodyModule(item.primitive, x - ox, y - oy, 8)) return true;
    }
    return false;
  }
  if (item.family === 'eye-frame') {
    const outer = x >= 2 && x < 26 && y >= 2 && y < 26 && pointInShape(item.primitive, x - 2, y - 2, 24);
    const cutout = x >= 6 && x < 22 && y >= 6 && y < 22 && pointInShape(item.primitive, x - 6, y - 6, 16);
    const ball = x >= 10 && x < 18 && y >= 10 && y < 18;
    return (outer && !cutout) || ball;
  }
  return x >= 5 && x < 23 && y >= 5 && y < 23 && pointInShape(item.primitive, x - 5, y - 5, 18);
}

function fillRect(png, x, y, width, height, color) {
  for (let py = y; py < y + height; py += 1) for (let px = x; px < x + width; px += 1) png.data.set(color, (py * png.width + px) * 4);
}

function writeContactSheet(family, items) {
  const cellWidth = Math.max(...items.map(({ svg }) => svg.width)) + 40;
  const cellHeight = Math.max(...items.map(({ svg }) => svg.height)) + 72;
  const sheetWidth = cellWidth * items.length;
  let vector = `<?xml version="1.0" encoding="UTF-8"?><svg xmlns="http://www.w3.org/2000/svg" width="${sheetWidth}" height="${cellHeight}" viewBox="0 0 ${sheetWidth} ${cellHeight}"><rect width="100%" height="100%" fill="#eef2f7"/>`;
  const raster = new PNG({ width: sheetWidth, height: cellHeight });
  for (let offset = 0; offset < raster.data.length; offset += 4) raster.data.set([238, 242, 247, 255], offset);
  items.forEach((item, index) => {
    const x = index * cellWidth;
    const inner = item.svg.data.replace(/^<\?xml[^>]*>/, '').replace(/^<svg[^>]*>/, '').replace(/<\/svg>$/, '');
    vector += `<g transform="translate(${x},0)"><rect x="8" y="8" width="${cellWidth - 16}" height="${cellHeight - 16}" rx="12" fill="#fff"/><text x="20" y="30" font-family="sans-serif" font-size="18" font-weight="700" fill="#111827">${item.value}</text><text x="20" y="51" font-family="sans-serif" font-size="13" fill="#4b5563">${family} · ${item.svg.width}×${item.svg.height}</text><g transform="translate(20,62)">${inner}</g></g>`;
    const source = PNG.sync.read(Buffer.from(item.png.data.slice(item.png.data.indexOf(',') + 1), 'base64'));
    const colors = [[17, 24, 39], [37, 99, 235], [124, 58, 237], [5, 150, 105]];
    for (let y = 8; y < 24; y += 1) for (let px = 16; px < cellWidth - 16; px += 1) raster.data.set([...colors[index % colors.length], 255], (y * raster.width + x + px) * 4);
    for (let y = 0; y < source.height; y += 1) for (let px = 0; px < source.width; px += 1) {
      const sourceOffset = (y * source.width + px) * 4;
      raster.data.set(source.data.subarray(sourceOffset, sourceOffset + 4), ((y + 32) * raster.width + x + px + 20) * 4);
    }
  });
  vector += '</svg>';
  writeFileSync(resolve(outputDirectory, `${family}-contact-sheet.svg`), vector);
  writeFileSync(resolve(outputDirectory, `${family}-contact-sheet.png`), PNG.sync.write(raster));
}

function buildRejectedEvidence() {
  const rounded = experimentalBodyPng((x, y, size) => pointInShape('rounded', x, y, size));
  const cutCornerDraft = experimentalBodyPng((x, y, size) => {
    const dx = Math.abs((x + 0.5) / size - 0.5);
    const dy = Math.abs((y + 0.5) / size - 0.5);
    return dx + dy <= 0.82;
  });
  const roundedHash = sha(rounded);
  const cutCornerHash = sha(cutCornerDraft);
  if (roundedHash !== cutCornerHash) throw new Error('Expected rejected cut-corner draft to reproduce rounded PNG no-op');
  return [
    { family: 'body-module', candidate: 'cut-corner', reason: 'Rejected: exact moduleSize=10 PNG bytes duplicate rounded, so it is a rendered no-op/near-duplicate and compact icon differentiation would be misleading.', evidence: { roundedPngSha256: roundedHash, cutCornerDraftPngSha256: cutCornerHash, hashesEqual: true } },
    { family: 'body-module', candidate: 'diamond', reason: 'Not promoted: no accepted exact-pixel body renderer was established; no scan-safety claim made.' },
    { family: 'body-module', candidate: 'cross/slash/star/mosaic-safe', reason: 'Not promoted within the bounded lane: no accepted exact-pixel renderer; no scan-safety claim made.' },
    { family: 'eye-frame', candidate: 'plus', reason: 'Rejected after real decoder and icon review: an icon-distinct plus (normalized arm half-width 0.32) failed raw decode for the long representative payload, while the scan-safe thicker draft collapsed toward an existing stepped-square compact icon. No accepted renderer remains.' },
    { family: 'eye-frame', candidate: 'heavy-rounded', reason: 'Rejected before promotion as too visually similar to rounded in a compact textless icon.' },
    { family: 'eye-frame', candidate: 'beaded/bracket', reason: 'Not promoted: no accepted exact-pixel renderer; no scan-safety claim made.' },
    { family: 'eye-ball', candidate: 'diamond/plus', reason: 'Rejected for textless controls: at literal 3-module finder-ball scale these silhouettes are too easily confused with frame options or a square pupil; replaced by axis-distinct capsules backed by exact Core geometry.' },
    { family: 'eye-ball', candidate: 'generic-capsule/slash/star', reason: 'Not promoted: a generic capsule lacks axis identity; slash/star have no accepted exact-pixel renderer and no scan-safety claim is made.' },
    { family: 'eye-ball', candidate: 'flower', reason: 'Not promoted: compact icon is distinct, but no scan-safe exact-pixel renderer was established; no scan-safety claim made.' },
  ];
}

function experimentalBodyPng(predicate) {
  const moduleSize = 10;
  const margin = 4;
  const total = (matrix.size + margin * 2) * moduleSize;
  const png = new PNG({ width: total, height: total });
  for (let offset = 0; offset < png.data.length; offset += 4) png.data.set([255, 255, 255, 255], offset);
  const isFinder = (x, y) => matrix.functionalRegions.finderPatterns.some((finder) => x >= finder.x && x < finder.x + finder.size && y >= finder.y && y < finder.y + finder.size);
  for (let row = 0; row < matrix.size; row += 1) for (let column = 0; column < matrix.size; column += 1) {
    if (matrix.modules[row][column] !== 1) continue;
    for (let py = 0; py < moduleSize; py += 1) for (let px = 0; px < moduleSize; px += 1) {
      if (!isFinder(column, row) && !predicate(px, py, moduleSize)) continue;
      png.data.set([0, 0, 0, 255], (((row + margin) * moduleSize + py) * total + (column + margin) * moduleSize + px) * 4);
    }
  }
  return PNG.sync.write(png);
}

function validationMarkdown(data, rejected, recipes) {
  const accepted = data.filter((row) => row.acceptedInB17);
  return [
    '# B17 extreme primitive evidence', '',
    '| family | primitive | option | SVG SHA-256 | PNG SHA-256 | size / viewBox | margin | deterministic SVG/PNG | objective validation |',
    '|---|---|---|---|---|---|---:|---|---|',
    ...accepted.map((row) => `| ${row.family} | ${row.primitive} | \`${row.renderOption}=${row.renderOptionValue}\` | \`${row.svgSha256}\` | \`${row.pngSha256}\` | ${row.width}×${row.height} / \`${row.viewBox}\` | ${row.marginPx}px | ${row.deterministicSvg}/${row.deterministicPng} | ${row.validationPass ? 'PASS' : 'FAIL'} (${row.passedCases}/${row.totalCases}, ${row.validationThresholdVersion}) |`),
    '', 'All accepted evidence uses exact Core PNG pixels and the unchanged `scan-v1-real-75pct` eight-case gate.',
    '', '## Icon fidelity notes for Studio textless controls', '',
    ...recipes.map((item) => `- **${item.family} / ${item.primitive}** — ${item.recipe} Constraint: ${item.fidelityConstraint} Example: \`${item.iconFile}\` (SHA-256 \`${item.iconSvgSha256}\`).`),
    '', 'Every accepted primitive has a family-unique compact icon hash at the recommended 28×28 viewBox and remains visibly distinct at 24px or larger. These are evidence/recipes only; no Studio UI was changed.',
    '', '## Rejected candidates', '',
    ...rejected.map((item) => `- **${item.family} / ${item.candidate}** — ${item.reason}`),
    '',
  ].join('\n');
}
