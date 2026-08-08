#!/usr/bin/env node
import { createHash } from 'node:crypto'
import { createRequire } from 'node:module'
import { mkdirSync, rmSync, writeFileSync } from 'node:fs'
import { dirname, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'
import { normalizePayload, generateMatrix } from '../../../../../packages/qr-core/dist/index.js'
import { runValidation } from '../../../../../packages/artistic-qr/dist/validation.js'

const packageRequire = createRequire(new URL('../../../../../packages/qr-core/package.json', import.meta.url))
const { PNG } = packageRequire('pngjs')
const here = dirname(fileURLToPath(import.meta.url))
const fixturesDir = resolve(here, 'fixtures')
const selectedDir = resolve(here, 'selected')
mkdirSync(fixturesDir, { recursive: true })
rmSync(selectedDir, { recursive: true, force: true })
mkdirSync(selectedDir, { recursive: true })

const payload = 'https://q.example/r/a7'
const versions = [7, 10]
const eccLevels = ['Q', 'H']
const masks = [0, 1, 2, 3, 4, 5, 6, 7]
const budgets = [0.02, 0.04, 0.06, 0.08]
const treatments = ['central-logo-pixel', 'background-silhouette', 'module-recolor']
const fixtureIds = ['bold-diamond', 'medium-fox']
const modulePixels = 8
const quietZone = 4
const ALIGNMENT_CENTERS = { 7: [6, 22, 38], 10: [6, 28, 50] }

function baseFixtureValue(id, x, y, size = 128) {
  const nx = (x + 0.5) / size * 2 - 1
  const ny = (y + 0.5) / size * 2 - 1
  if (id === 'bold-diamond') {
    const outer = Math.abs(nx) + Math.abs(ny) < 0.82
    const inner = Math.abs(nx) + Math.abs(ny) < 0.43
    const slash = Math.abs(ny + nx * 0.55) < 0.08 && Math.abs(nx) < 0.64
    return (outer && !inner) || slash ? 1 : 0
  }
  const head = ((nx / 0.72) ** 2 + ((ny + 0.05) / 0.58) ** 2) < 1
  const leftEar = ny < -0.38 && nx < -0.12 && ny > -1.08 + Math.abs(nx + 0.42) * 1.7
  const rightEar = ny < -0.38 && nx > 0.12 && ny > -1.08 + Math.abs(nx - 0.42) * 1.7
  const eyeL = ((nx + 0.25) ** 2 + (ny + 0.05) ** 2) < 0.02
  const eyeR = ((nx - 0.25) ** 2 + (ny + 0.05) ** 2) < 0.02
  const muzzle = ((nx / 0.42) ** 2 + ((ny - 0.28) / 0.26) ** 2) < 1
  const nose = Math.abs(nx) + Math.abs(ny - 0.2) < 0.12
  return ((head || leftEar || rightEar) && !eyeL && !eyeR && !muzzle) || nose ? 1 : 0
}

function centeredTarget(id, x, y, size) {
  const scale = id === 'bold-diamond' ? 0.57 : 0.62
  const nx = ((x + 0.5) / size - 0.5) * 2
  const ny = ((y + 0.5) / size - 0.5) * 2
  if (Math.abs(nx) > scale || Math.abs(ny) > scale) return 0
  const fx = Math.max(0, Math.min(127, Math.floor(((nx / scale) + 1) * 64)))
  const fy = Math.max(0, Math.min(127, Math.floor(((ny / scale) + 1) * 64)))
  return baseFixtureValue(id, fx, fy, 128)
}

function makeFixture(id) {
  const size = 128
  const png = new PNG({ width: size, height: size })
  for (let y = 0; y < size; y++) for (let x = 0; x < size; x++) {
    const dark = baseFixtureValue(id, x, y, size)
    const o = (y * size + x) * 4
    png.data[o] = dark ? 49 : 250
    png.data[o + 1] = dark ? 46 : 250
    png.data[o + 2] = dark ? 129 : 252
    png.data[o + 3] = 255
  }
  writeFileSync(resolve(fixturesDir, `${id}.png`), PNG.sync.write(png))
}
fixtureIds.forEach(makeFixture)

function reservedMap(version, size) {
  const reserved = Array.from({ length: size }, () => Array(size).fill(false))
  const mark = (x0, y0, w, h) => {
    for (let y = Math.max(0, y0); y < Math.min(size, y0 + h); y++) for (let x = Math.max(0, x0); x < Math.min(size, x0 + w); x++) reserved[y][x] = true
  }
  mark(0, 0, 9, 9); mark(size - 8, 0, 8, 9); mark(0, size - 8, 9, 8)
  mark(6, 0, 1, size); mark(0, 6, size, 1)
  mark(8, 0, 1, 9); mark(0, 8, 9, 1); mark(size - 8, 8, 8, 1); mark(8, size - 8, 1, 8)
  mark(8, 4 * version + 9, 1, 1)
  if (version >= 7) { mark(size - 11, 0, 3, 6); mark(0, size - 11, 6, 3) }
  for (const cy of ALIGNMENT_CENTERS[version] ?? []) for (const cx of ALIGNMENT_CENTERS[version] ?? []) {
    if ((cx <= 8 && cy <= 8) || (cx >= size - 9 && cy <= 8) || (cx <= 8 && cy >= size - 9)) continue
    mark(cx - 2, cy - 2, 5, 5)
  }
  return reserved
}

function deterministicRank(seed, x, y) {
  return createHash('sha256').update(`${seed}:${x}:${y}`).digest().readUInt32BE(0)
}

function buildVisual(matrix, fixtureId, treatment, budget, seed) {
  const modules = matrix.modules.map((row) => [...row])
  const reserved = reservedMap(matrix.version, matrix.size)
  const editableCount = reserved.flat().filter((value) => !value).length
  const budgetCount = Math.floor(editableCount * budget)
  const targetCells = []
  const centralMismatches = []
  const backgroundLight = []
  const recolorActive = []
  let protectedTargetConflicts = 0
  let protectedTargetCount = 0

  for (let y = 0; y < matrix.size; y++) for (let x = 0; x < matrix.size; x++) {
    const target = centeredTarget(fixtureId, x, y, matrix.size)
    if (target) targetCells.push({ x, y })
    if (reserved[y][x]) {
      if (target) { protectedTargetCount++; if (modules[y][x] !== target) protectedTargetConflicts++ }
      continue
    }
    const rank = deterministicRank(seed, x, y)
    if (target && modules[y][x] !== target) centralMismatches.push({ x, y, target, rank })
    if (target && modules[y][x] === 0) backgroundLight.push({ x, y, rank })
    if (target && modules[y][x] === 1) recolorActive.push({ x, y, rank })
  }
  centralMismatches.sort((a, b) => a.rank - b.rank)
  backgroundLight.sort((a, b) => a.rank - b.rank)
  recolorActive.sort((a, b) => a.rank - b.rank)

  const selected = treatment === 'central-logo-pixel'
    ? centralMismatches.slice(0, budgetCount)
    : treatment === 'background-silhouette'
      ? backgroundLight.slice(0, budgetCount)
      : recolorActive.slice(0, budgetCount)
  if (treatment === 'central-logo-pixel') for (const cell of selected) modules[cell.y][cell.x] = cell.target
  const selectedSet = new Set(selected.map(({ x, y }) => `${x}:${y}`))

  let targetBinaryMatches = 0
  for (const { x, y } of targetCells) if (modules[y][x] === 1) targetBinaryMatches++
  const targetCoverage = targetCells.length ? selected.length / targetCells.length : 0
  const recognitionScore = treatment === 'central-logo-pixel'
    ? targetCells.length ? targetBinaryMatches / targetCells.length : 0
    : targetCoverage

  return {
    modules,
    reserved,
    selectedSet,
    editableCount,
    budgetCount,
    modifiedModules: selected.length,
    actualModifiedFraction: selected.length / editableCount,
    targetCells: targetCells.length,
    recognitionScore,
    targetCoverage,
    protectedZoneConflictScore: protectedTargetCount ? protectedTargetConflicts / protectedTargetCount : 0,
  }
}

function rasterize(visual, treatment) {
  const size = visual.modules.length
  const width = (size + quietZone * 2) * modulePixels
  const png = new PNG({ width, height: width })
  png.data.fill(255)
  const setPixel = (x, y, color) => {
    const o = (y * width + x) * 4
    png.data[o] = color[0]; png.data[o + 1] = color[1]; png.data[o + 2] = color[2]; png.data[o + 3] = 255
  }
  for (let y = 0; y < size; y++) for (let x = 0; x < size; x++) {
    const key = `${x}:${y}`
    if (treatment === 'background-silhouette' && visual.selectedSet.has(key) && visual.modules[y][x] === 0) {
      for (let py = 0; py < modulePixels; py++) for (let px = 0; px < modulePixels; px++) {
        setPixel((x + quietZone) * modulePixels + px, (y + quietZone) * modulePixels + py, [254, 215, 105])
      }
    }
    if (!visual.modules[y][x]) continue
    const recolored = treatment === 'module-recolor' && visual.selectedSet.has(key)
    const color = recolored ? [180, 70, 9] : [15, 23, 42]
    for (let py = 0; py < modulePixels; py++) for (let px = 0; px < modulePixels; px++) {
      setPixel((x + quietZone) * modulePixels + px, (y + quietZone) * modulePixels + py, color)
    }
  }
  return png
}

function round(value) { return Math.round(value * 10000) / 10000 }
const candidates = []
const rasters = new Map()
const startedAt = new Date().toISOString()
let completed = 0
const total = fixtureIds.length * versions.length * eccLevels.length * masks.length * budgets.length * treatments.length
for (const fixture of fixtureIds) for (const version of versions) for (const ecc of eccLevels) for (const mask of masks) for (const budget of budgets) for (const treatment of treatments) {
  const id = `${fixture}__${treatment}__v${version}-${ecc}-m${mask}-b${Math.round(budget * 100)}`
  const normalized = normalizePayload({ mode: 'url', content: payload, version, errorCorrectionLevel: ecc, maskPattern: mask })
  const matrix = generateMatrix(normalized)
  const visual = buildVisual(matrix, fixture, treatment, budget, id)
  const png = rasterize(visual, treatment)
  const buffer = PNG.sync.write(png)
  const data = `data:image/png;base64,${buffer.toString('base64')}`
  const validation = runValidation({ rendered: { format: 'png-dataurl', data, width: png.width, height: png.height } }, normalized.canonical)
  const passCount = validation.tests.filter((test) => test.pass).length
  candidates.push({
    id,
    fixture,
    payload: normalized.canonical,
    payloadLength: normalized.byteLength,
    version: matrix.version,
    moduleCount: matrix.size,
    ecc,
    mask,
    mutationBudget: budget,
    budgetModules: visual.budgetCount,
    modifiedModules: visual.modifiedModules,
    actualModifiedFraction: round(visual.actualModifiedFraction),
    imageTreatment: treatment,
    localAlignmentProtection: true,
    protectedZoneConflictScore: round(visual.protectedZoneConflictScore),
    visualRecognition: {
      method: treatment === 'central-logo-pixel' ? 'target-dark coverage after binary central integration' : 'treated target-cell coverage',
      score: round(visual.recognitionScore),
      targetCoverage: round(visual.targetCoverage),
      targetCells: visual.targetCells,
      humanReviewed: false,
      recognizable: null,
    },
    decoder: {
      verdict: validation.pass ? 'pass' : 'fail',
      decoder: `${validation.decoder} ${validation.version}`,
      thresholdVersion: validation.thresholdVersion,
      rawPass: validation.tests[0]?.pass === true,
      passCount,
      testCount: validation.tests.length,
      passRate: round(passCount / validation.tests.length),
      confidence: validation.overallConfidence,
      failingTests: validation.tests.filter((test) => !test.pass).map((test) => test.name),
    },
    physicalScanTested: false,
    warning: 'Automated decoder evidence only; no physical-device or print scan performed.',
  })
  rasters.set(id, { png, buffer })
  completed++
  if (completed % 96 === 0) console.log(`progress ${completed}/${total}`)
}

function bestCandidate(fixture, treatment) {
  const passing = candidates.filter((candidate) => candidate.fixture === fixture && candidate.imageTreatment === treatment && candidate.decoder.verdict === 'pass')
  return passing.sort((a, b) => b.mutationBudget - a.mutationBudget || b.visualRecognition.score - a.visualRecognition.score || b.decoder.passRate - a.decoder.passRate)[0]
}
const selected = []
for (const fixture of fixtureIds) for (const treatment of treatments) {
  const candidate = bestCandidate(fixture, treatment)
  if (candidate) selected.push(candidate)
}
for (const candidate of selected) writeFileSync(resolve(selectedDir, `${candidate.id}.png`), rasters.get(candidate.id).buffer)

function makeThumbnail(id, size = 72) {
  const png = new PNG({ width: size, height: size })
  for (let y = 0; y < size; y++) for (let x = 0; x < size; x++) {
    const dark = baseFixtureValue(id, x, y, size)
    const o = (y * size + x) * 4
    png.data[o] = dark ? 49 : 255; png.data[o + 1] = dark ? 46 : 255; png.data[o + 2] = dark ? 129 : 255; png.data[o + 3] = 255
  }
  return png
}
function fillRect(png, x0, y0, w, h, color) {
  for (let y = y0; y < y0 + h; y++) for (let x = x0; x < x0 + w; x++) {
    const o = (y * png.width + x) * 4
    png.data[o] = color[0]; png.data[o + 1] = color[1]; png.data[o + 2] = color[2]; png.data[o + 3] = 255
  }
}
function blit(target, source, x0, y0) {
  for (let y = 0; y < source.height; y++) for (let x = 0; x < source.width; x++) {
    const so = (y * source.width + x) * 4
    const to = ((y0 + y) * target.width + x0 + x) * 4
    target.data[to] = source.data[so]; target.data[to + 1] = source.data[so + 1]; target.data[to + 2] = source.data[so + 2]; target.data[to + 3] = 255
  }
}
const columns = 3
const cell = 620
const rows = Math.ceil(selected.length / columns)
const sheet = new PNG({ width: columns * cell, height: rows * cell })
sheet.data.fill(244)
const index = []
selected.forEach((candidate, i) => {
  const col = i % columns; const row = Math.floor(i / columns)
  const x0 = col * cell; const y0 = row * cell
  const treatmentColor = candidate.imageTreatment === 'central-logo-pixel' ? [79, 70, 229] : candidate.imageTreatment === 'background-silhouette' ? [217, 119, 6] : [180, 70, 9]
  fillRect(sheet, x0, y0, cell, 14, treatmentColor)
  fillRect(sheet, x0, y0, 14, cell, treatmentColor)
  const source = rasters.get(candidate.id).png
  blit(sheet, source, x0 + Math.floor((cell - source.width) / 2), y0 + 30)
  blit(sheet, makeThumbnail(candidate.fixture), x0 + cell - 88, y0 + cell - 88)
  index.push({ cell: i + 1, row: row + 1, column: col + 1, candidateId: candidate.id, ...candidate })
})
writeFileSync(resolve(here, 'visual-contact-sheet.png'), PNG.sync.write(sheet))
writeFileSync(resolve(here, 'visual-contact-sheet-index.json'), `${JSON.stringify(index, null, 2)}\n`)

const summary = {
  totalCandidates: candidates.length,
  scanPassed: candidates.filter((candidate) => candidate.decoder.verdict === 'pass').length,
  scanFailed: candidates.filter((candidate) => candidate.decoder.verdict === 'fail').length,
  selected: selected.length,
  fixtures: fixtureIds,
  treatments,
  budgets,
  versions,
  eccLevels,
  masks,
}
const result = {
  schemaVersion: 'level2-image-fit-visual-pass.v1',
  startedAt,
  generatedAt: new Date().toISOString(),
  experiment: {
    payload,
    fixturePaths: fixtureIds.map((id) => `fixtures/${id}.png`),
    versions,
    eccLevels,
    masks,
    budgets,
    treatments,
    validator: 'jsQR 1.4.0 via scan-v1-real-75pct',
    physicalScanTested: false,
    coreAlignmentPatternWorkaround: 'Local reserved-map table for versions 7 and 10.',
  },
  summary,
  selectedCandidateIds: selected.map((candidate) => candidate.id),
  candidates,
}
writeFileSync(resolve(here, 'visual-candidates.json'), `${JSON.stringify(result, null, 2)}\n`)
console.log(JSON.stringify(summary, null, 2))
