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

const LONG_URL = 'https://www.example.com/products/image-fit-qr/creator-collection?utm_source=instagram&utm_medium=social&utm_campaign=summer-launch-2026&variant=balanced&ref=creator-profile'
const payloads = [
  { payloadClass: 'original-long-url', slug: null, text: LONG_URL },
  { payloadClass: 'optimized-short', slug: 'a7', text: 'https://q.example/r/a7' },
  { payloadClass: 'optimized-short', slug: 'logo', text: 'https://q.example/r/logo' },
  { payloadClass: 'optimized-short', slug: 'pixel9', text: 'https://q.example/r/pixel9' },
]
const versions = [7, 10, 15]
const eccLevels = ['Q', 'H']
const masks = [0, 1, 2, 3, 4, 5, 6, 7]
const strengthLevels = [
  { label: 'readable', fraction: 0.02 },
  { label: 'image-first-probe', fraction: 0.12 },
]
const modulePixels = 6
const quietZone = 4

function fixtureValue(id, x, y, size = 128) {
  const nx = (x + 0.5) / size * 2 - 1
  const ny = (y + 0.5) / size * 2 - 1
  if (id === 'bold-diamond') {
    const outer = Math.abs(nx) + Math.abs(ny) < 0.78
    const inner = Math.abs(nx) + Math.abs(ny) < 0.36
    const slash = Math.abs(ny + nx * 0.55) < 0.075 && Math.abs(nx) < 0.62
    return (outer && !inner) || slash ? 1 : 0
  }
  const head = ((nx / 0.72) ** 2 + ((ny + 0.05) / 0.58) ** 2) < 1
  const leftEar = ny < -0.38 && nx < -0.12 && ny > -1.08 + Math.abs(nx + 0.42) * 1.7
  const rightEar = ny < -0.38 && nx > 0.12 && ny > -1.08 + Math.abs(nx - 0.42) * 1.7
  const eyeL = ((nx + 0.25) ** 2 + (ny + 0.05) ** 2) < 0.018
  const eyeR = ((nx - 0.25) ** 2 + (ny + 0.05) ** 2) < 0.018
  const muzzle = ((nx / 0.42) ** 2 + ((ny - 0.28) / 0.26) ** 2) < 1
  const nose = Math.abs(nx) + Math.abs(ny - 0.2) < 0.12
  return ((head || leftEar || rightEar) && !eyeL && !eyeR && !muzzle) || nose ? 1 : 0
}

function fixtureWeight(id, x, y, size) {
  if (id === 'medium-fox') return 1
  const nx = (x + 0.5) / size * 2 - 1
  const ny = (y + 0.5) / size * 2 - 1
  return Math.abs(nx) < 0.72 && Math.abs(ny) < 0.72 ? 1 : 0.08
}

function makeFixture(id) {
  const size = 128
  const png = new PNG({ width: size, height: size })
  for (let y = 0; y < size; y++) for (let x = 0; x < size; x++) {
    const dark = fixtureValue(id, x, y, size)
    const o = (y * size + x) * 4
    const v = dark ? 20 : 250
    png.data[o] = v; png.data[o + 1] = v; png.data[o + 2] = dark ? 38 : 250; png.data[o + 3] = 255
  }
  const path = resolve(fixturesDir, `${id}.png`)
  writeFileSync(path, PNG.sync.write(png))
  return { id, path, size }
}

const fixtures = [makeFixture('bold-diamond'), makeFixture('medium-fox')]

const ALIGNMENT_CENTERS = {
  7: [6, 22, 38],
  10: [6, 28, 50],
  15: [6, 26, 48, 70],
}

function reservedMap(version, size) {
  const reserved = Array.from({ length: size }, () => Array(size).fill(false))
  const markRect = (x0, y0, w, h) => {
    for (let y = Math.max(0, y0); y < Math.min(size, y0 + h); y++) for (let x = Math.max(0, x0); x < Math.min(size, x0 + w); x++) reserved[y][x] = true
  }
  markRect(0, 0, 9, 9)
  markRect(size - 8, 0, 8, 9)
  markRect(0, size - 8, 9, 8)
  markRect(6, 0, 1, size)
  markRect(0, 6, size, 1)
  markRect(8, 0, 1, 9)
  markRect(0, 8, 9, 1)
  markRect(size - 8, 8, 8, 1)
  markRect(8, size - 8, 1, 8)
  markRect(8, 4 * version + 9, 1, 1)
  if (version >= 7) {
    markRect(size - 11, 0, 3, 6)
    markRect(0, size - 11, 6, 3)
  }
  const centers = ALIGNMENT_CENTERS[version] ?? []
  for (const cy of centers) for (const cx of centers) {
    if ((cx <= 8 && cy <= 8) || (cx >= size - 9 && cy <= 8) || (cx <= 8 && cy >= size - 9)) continue
    markRect(cx - 2, cy - 2, 5, 5)
  }
  return reserved
}

function targetAt(fixtureId, x, y, size) {
  const fx = Math.min(127, Math.floor((x + 0.5) / size * 128))
  const fy = Math.min(127, Math.floor((y + 0.5) / size * 128))
  return fixtureValue(fixtureId, fx, fy, 128)
}

function weightAt(fixtureId, x, y, size) {
  return fixtureWeight(fixtureId, x, y, size)
}

function digestRank(seed, x, y) {
  const hash = createHash('sha256').update(`${seed}:${x}:${y}`).digest()
  return hash.readUInt32BE(0) / 0xffffffff
}

function integrateImage(matrix, fixtureId, seed, strengthFraction) {
  const reserved = reservedMap(matrix.version, matrix.size)
  const modules = matrix.modules.map((row) => [...row])
  const editable = []
  let weightedTotal = 0
  let baselineMatch = 0
  let protectedWeight = 0
  let protectedMismatch = 0
  let protectedCount = 0
  for (let y = 0; y < matrix.size; y++) for (let x = 0; x < matrix.size; x++) {
    const target = targetAt(fixtureId, x, y, matrix.size)
    const weight = weightAt(fixtureId, x, y, matrix.size)
    if (reserved[y][x]) {
      protectedCount++
      protectedWeight += weight
      if (modules[y][x] !== target) protectedMismatch += weight
      continue
    }
    weightedTotal += weight
    if (modules[y][x] === target) baselineMatch += weight
    else editable.push({ x, y, target, weight, rank: digestRank(seed, x, y) })
  }
  editable.sort((a, b) => b.weight - a.weight || a.rank - b.rank)
  const editableCount = matrix.size * matrix.size - protectedCount
  const budget = Math.floor(editableCount * strengthFraction)
  const chosen = editable.slice(0, budget)
  let changedWeight = 0
  for (const item of chosen) {
    modules[item.y][item.x] = item.target
    changedWeight += item.weight
  }
  const baselineImageFitScore = weightedTotal ? baselineMatch / weightedTotal : 0
  const imageFitScore = weightedTotal ? (baselineMatch + changedWeight) / weightedTotal : 0
  return {
    modules,
    reserved,
    editableCount,
    protectedCount,
    modifiedModules: chosen.length,
    baselineImageFitScore,
    imageFitScore,
    imageFitGain: imageFitScore - baselineImageFitScore,
    protectedZoneConflictScore: protectedWeight ? protectedMismatch / protectedWeight : 0,
  }
}

function rasterize(modules) {
  const size = modules.length
  const width = (size + quietZone * 2) * modulePixels
  const png = new PNG({ width, height: width })
  png.data.fill(255)
  for (let y = 0; y < size; y++) for (let x = 0; x < size; x++) {
    if (!modules[y][x]) continue
    for (let py = 0; py < modulePixels; py++) for (let px = 0; px < modulePixels; px++) {
      const rx = (x + quietZone) * modulePixels + px
      const ry = (y + quietZone) * modulePixels + py
      const o = (ry * width + rx) * 4
      png.data[o] = 8; png.data[o + 1] = 15; png.data[o + 2] = 28; png.data[o + 3] = 255
    }
  }
  return png
}

function round(value) { return Math.round(value * 10000) / 10000 }

const candidates = []
const validRasters = new Map()
const startedAt = new Date().toISOString()
for (const fixture of fixtures) for (const payload of payloads) for (const requestedVersion of versions) for (const ecc of eccLevels) for (const mask of masks) for (const strengthOption of strengthLevels) {
  const strengthCode = Math.round(strengthOption.fraction * 100)
  const id = `${fixture.id}__${payload.payloadClass}-${payload.slug ?? 'original'}__v${requestedVersion}-${ecc}-m${mask}-s${strengthCode}`
  const base = {
    id,
    fixture: fixture.id,
    payloadClass: payload.payloadClass,
    payload: payload.text,
    payloadLength: new TextEncoder().encode(payload.text).length,
    slugCandidate: payload.slug,
    requestedVersion,
    ecc,
    mask,
    imageTreatment: 'protected-data-module-perforation',
    strength: strengthOption.label,
    strengthFraction: strengthOption.fraction,
    physicalScanTested: false,
  }
  try {
    const normalized = normalizePayload({ mode: 'url', content: payload.text, version: requestedVersion, errorCorrectionLevel: ecc, maskPattern: mask })
    const matrix = generateMatrix(normalized)
    const fit = integrateImage(matrix, fixture.id, id, strengthOption.fraction)
    const png = rasterize(fit.modules)
    const buffer = PNG.sync.write(png)
    const data = `data:image/png;base64,${buffer.toString('base64')}`
    const validation = runValidation({ rendered: { format: 'png-dataurl', data, width: png.width, height: png.height } }, normalized.canonical)
    const passCount = validation.tests.filter((test) => test.pass).length
    candidates.push({
      ...base,
      status: 'generated',
      actualVersion: matrix.version,
      moduleCount: matrix.size,
      editableModules: fit.editableCount,
      protectedModules: fit.protectedCount,
      modifiedModules: fit.modifiedModules,
      protectedZoneConflictScore: round(fit.protectedZoneConflictScore),
      baselineImageFitScore: round(fit.baselineImageFitScore),
      imageFitScore: round(fit.imageFitScore),
      imageFitGain: round(fit.imageFitGain),
      scan: {
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
      warnings: validation.pass ? ['Automated jsQR perturbation proof only; no physical-device scan performed.'] : ['Not export-safe under scan-v1-real-75pct.', 'No physical-device scan performed.'],
      failureReason: validation.pass ? null : 'Image-integrated raster failed raw decode or 75% perturbation threshold.',
    })
    validRasters.set(id, { png, buffer })
  } catch (error) {
    candidates.push({
      ...base,
      status: 'encoding-rejected',
      actualVersion: null,
      moduleCount: null,
      editableModules: null,
      protectedModules: null,
      modifiedModules: null,
      protectedZoneConflictScore: null,
      baselineImageFitScore: null,
      imageFitScore: null,
      imageFitGain: null,
      scan: { verdict: 'not-run', decoder: 'jsQR 1.4.0', thresholdVersion: 'scan-v1-real-75pct', rawPass: false, passCount: 0, testCount: 0, passRate: 0, confidence: 'failed', failingTests: [] },
      warnings: ['QR encoder rejected this forced version/ECC/payload combination.', 'No physical-device scan performed.'],
      failureReason: error instanceof Error ? error.message : String(error),
    })
  }
}

const generated = candidates.filter((candidate) => candidate.status === 'generated')
const passed = generated.filter((candidate) => candidate.scan.verdict === 'pass')
const failed = generated.filter((candidate) => candidate.scan.verdict === 'fail')

function bestFor(fixture, payloadClass) {
  return passed.filter((c) => c.fixture === fixture && c.payloadClass === payloadClass)
    .sort((a, b) => b.imageFitScore - a.imageFitScore || b.scan.passRate - a.scan.passRate)[0]
}
function maskContrast(fixture) {
  const group = generated.filter((c) => c.fixture === fixture && c.slugCandidate === 'logo' && c.requestedVersion === 10 && c.ecc === 'H' && c.strength === 'readable')
    .sort((a, b) => a.imageFitScore - b.imageFitScore)
  return [group[0], group[group.length - 1]].filter(Boolean)
}
const selected = []
for (const fixture of fixtures.map((item) => item.id)) {
  selected.push(bestFor(fixture, 'original-long-url'))
  selected.push(bestFor(fixture, 'optimized-short'))
  selected.push(...maskContrast(fixture))
}
const uniqueSelected = [...new Map(selected.filter(Boolean).map((candidate) => [candidate.id, candidate])).values()]
for (const candidate of uniqueSelected) {
  const source = validRasters.get(candidate.id)
  writeFileSync(resolve(selectedDir, `${candidate.id}.png`), source.buffer)
}

function blit(target, source, x0, y0) {
  for (let y = 0; y < source.height; y++) for (let x = 0; x < source.width; x++) {
    const so = (y * source.width + x) * 4
    const to = ((y0 + y) * target.width + x0 + x) * 4
    target.data[to] = source.data[so]; target.data[to + 1] = source.data[so + 1]; target.data[to + 2] = source.data[so + 2]; target.data[to + 3] = 255
  }
}
function fillRect(png, x0, y0, w, h, color) {
  for (let y = y0; y < y0 + h; y++) for (let x = x0; x < x0 + w; x++) {
    const o = (y * png.width + x) * 4
    png.data[o] = color[0]; png.data[o + 1] = color[1]; png.data[o + 2] = color[2]; png.data[o + 3] = 255
  }
}
const columns = 4
const cell = 560
const rows = Math.ceil(uniqueSelected.length / columns)
const sheet = new PNG({ width: columns * cell, height: rows * cell })
sheet.data.fill(244)
const index = []
uniqueSelected.forEach((candidate, i) => {
  const col = i % columns
  const row = Math.floor(i / columns)
  const x0 = col * cell
  const y0 = row * cell
  const border = candidate.scan.verdict === 'pass' ? [22, 163, 74] : [220, 38, 38]
  fillRect(sheet, x0, y0, cell, 12, border)
  fillRect(sheet, x0, y0 + 12, 12, cell - 12, border)
  const source = validRasters.get(candidate.id).png
  const x = x0 + Math.floor((cell - source.width) / 2)
  const y = y0 + 28
  blit(sheet, source, x, y)
  const fixturePng = PNG.sync.read(PNG.sync.write(makeFixturePng(candidate.fixture)))
  blit(sheet, fixturePng, x0 + cell - 74, y0 + cell - 74)
  index.push({ cell: i + 1, row: row + 1, column: col + 1, candidateId: candidate.id, fixture: candidate.fixture, payloadClass: candidate.payloadClass, version: candidate.actualVersion, ecc: candidate.ecc, mask: candidate.mask, imageFitScore: candidate.imageFitScore, scanVerdict: candidate.scan.verdict })
})

function makeFixturePng(id) {
  const size = 64
  const png = new PNG({ width: size, height: size })
  for (let y = 0; y < size; y++) for (let x = 0; x < size; x++) {
    const dark = fixtureValue(id, x, y, size)
    const o = (y * size + x) * 4
    const v = dark ? 15 : 255
    png.data[o] = v; png.data[o + 1] = v; png.data[o + 2] = dark ? 35 : 255; png.data[o + 3] = 255
  }
  return png
}

writeFileSync(resolve(here, 'contact-sheet.png'), PNG.sync.write(sheet))
writeFileSync(resolve(here, 'contact-sheet-index.json'), `${JSON.stringify(index, null, 2)}\n`)
const result = {
  schemaVersion: 'level2-image-fit-spike.v1',
  generatedAt: new Date().toISOString(),
  startedAt,
  experiment: {
    fixtures: fixtures.map((fixture) => ({ id: fixture.id, path: `fixtures/${fixture.id}.png` })),
    payloads,
    versions,
    eccLevels,
    masks,
    imageTreatment: 'protected-data-module-perforation',
    strengthLevels,
    validator: 'jsQR 1.4.0 through artistic-qr scan-v1-real-75pct',
    physicalScanTested: false,
  },
  summary: {
    totalAttempts: candidates.length,
    generated: generated.length,
    encodingRejected: candidates.length - generated.length,
    scanPassed: passed.length,
    scanFailed: failed.length,
    distinctVersionsGenerated: [...new Set(generated.map((candidate) => candidate.actualVersion))],
    eccGenerated: [...new Set(generated.map((candidate) => candidate.ecc))],
    masksGenerated: [...new Set(generated.map((candidate) => candidate.mask))],
  },
  selectedContactSheetCandidates: index,
  candidates,
}
writeFileSync(resolve(here, 'candidates.json'), `${JSON.stringify(result, null, 2)}\n`)
console.log(JSON.stringify(result.summary, null, 2))
