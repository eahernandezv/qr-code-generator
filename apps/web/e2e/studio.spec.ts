import { test, expect, type Page } from '@playwright/test'
import fs from 'node:fs/promises'
import path from 'node:path'
import { createHash } from 'node:crypto'

const evidenceRoot = path.resolve(process.cwd(), '../../.work-loop/evidence/stage2-commerce/browser')
const exportDir = path.join(evidenceRoot, 'exports')
const screenshotDir = path.join(evidenceRoot, 'screenshots')
const b10EvidenceDir = path.resolve(process.cwd(), '../../.work-loop/evidence/studio-b10-one-screen-compact-live-editor')
const b11EvidenceDir = path.resolve(process.cwd(), '../../.work-loop/evidence/studio-b11-corners-compact-editor-cleanup')
const b13EvidenceDir = path.resolve(process.cwd(), '../../.work-loop/evidence/studio-b13-label-cleanup-paid-payload-gate')
const b14EvidenceDir = path.resolve(process.cwd(), '../../.work-loop/evidence/studio-b14-expose-expanded-style-primitives')
const b16EvidenceDir = path.resolve(process.cwd(), '../../.work-loop/evidence/studio-b16-palette-sliders-destination-polish')
const b18EvidenceDir = path.resolve(process.cwd(), '../../.work-loop/evidence/studio-b18-expose-extreme-primitives')
const b19EvidenceDir = path.resolve(process.cwd(), '../../.work-loop/evidence/studio-b19-scan-confidence-labeling')
const b20EvidenceDir = path.resolve(process.cwd(), '../../.work-loop/evidence/studio-b20-selector-geometry-alignment')

const svgArtwork = `data:image/svg+xml;charset=utf-8,${encodeURIComponent(`
<svg xmlns="http://www.w3.org/2000/svg" width="512" height="512" viewBox="0 0 512 512">
  <rect width="512" height="512" fill="#f0f4ff"/>
  <rect x="32" y="32" width="448" height="448" fill="#181b3a"/>
  <rect x="64" y="64" width="384" height="384" fill="#f0f4ff"/>
  <rect x="96" y="96" width="320" height="320" fill="#181b3a"/>
</svg>`)}`

function coreCandidateFixture() {
  const ids = [
    '10000000-0000-4000-8000-000000000001',
    '10000000-0000-4000-8000-000000000002',
    '10000000-0000-4000-8000-000000000003',
    '10000000-0000-4000-8000-000000000004',
  ]
  const svg = decodeURIComponent(svgArtwork.split(',')[1])
  return {
    success: true,
    board: {
      boardId: '20000000-0000-4000-8000-000000000001',
      status: 'completed',
      candidates: ids.map((candidateId) => ({
        candidateId,
        matrixRef: 'qr:1:0:test',
        rendered: { format: 'svg', data: svg, width: 512, height: 512 },
        scanResults: [{
          pass: true,
          decoder: 'fixture-decoder',
          version: 'test',
          thresholdVersion: 'scan-v1',
          scannedPayload: 'https://example.com/',
          tests: [{ name: 'baseline', pass: true, scale: 1, perturbation: 'none' }],
          overallConfidence: 'high',
        }],
        exportAllowed: true,
        artisticScore: 0.8,
        provenance: {
          generationMode: 'deterministic_template',
          provider: 'test-fixture',
          modelVersion: 'fixture',
          adapterVersion: 'artistic-qr-test-fixture',
          validationVersion: 'scan-v1',
          createdAt: '2026-07-29T23:00:00.000Z',
        },
      })),
    },
  }
}

async function routeCandidateFixture(page: Page, delayMs = 0) {
  await page.route('**/api/artistic-qr/candidates', async (route) => {
    if (delayMs > 0) await new Promise((resolve) => setTimeout(resolve, delayMs))
    await route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify(coreCandidateFixture()) })
  })
}

function projectState(options: { selected?: boolean; exhausted?: boolean; coreEvidence?: boolean; exportAllowed?: boolean } = {}) {
  const now = '2026-07-28T09:00:00.000Z'
  const selected = options.selected ?? true
  const renderResult = options.coreEvidence ? {
    success: true,
    format: 'png',
    dataUrl: svgArtwork,
    widthPx: 512,
    heightPx: 512,
    provenance: { engine: 'qr-core', version: 'test-contract-fixture' },
  } : undefined
  return {
    projectId: 'projectabcdef',
    payload: { raw: 'https://example.com', normalized: 'https://example.com/', mode: 'url' },
    artDirection: {
      templateId: 'watercolor', artisticStrength: 0.5, composition: 'centered',
      protectedQrProminence: 0.7,
      palette: { primary: '#5162da', secondary: '#323eaf', accent: '#a5bdff' },
    },
    style: { foreground: '#181b3a', background: '#f0f4ff', margin: 4, eyeStyle: 'rounded', moduleStyle: 'rounded' },
    boards: [{
      boardId: 'board-1', projectId: 'projectabcdef', roundNumber: 1, status: 'complete', createdAt: now, completedAt: now,
      candidates: [{
        candidateId: 'candidate-1', projectId: 'projectabcdef', status: 'validated', previewUrl: svgArtwork,
        renderResult, createdAt: now, artisticScore: 0.8,
        validationResult: {
          pass: true,
          confidence: 0.92,
          decoderResults: [{ decoder: 'fixture-decoder', pass: true, match: true }],
          perturbationSummary: [{ type: 'blur', passRate: 0.8 }],
          recommendations: ['Fixture recommendation'],
        },
      }],
    }],
    selectedCandidateId: selected ? 'candidate-1' : undefined,
    entitlement: {
      type: 'project', maxRounds: 3, usedRounds: options.exhausted ? 3 : 0,
      maxCandidates: 4, exportAllowed: options.exportAllowed ?? true,
    },
    createdAt: now,
    updatedAt: now,
  }
}

async function seed(page: Page, project = projectState()) {
  await page.addInitScript(({ state, artwork }) => {
    window.__QR_TEST_PAID_PROJECT_ID__ = state.projectId
    const coreTestState = window as typeof window & {
      __QR_CORE_EXPORT_CALLS__: unknown[]
      __QR_CORE_EXPORT_FAILURES__: number
    }
    coreTestState.__QR_CORE_EXPORT_CALLS__ = []
    coreTestState.__QR_CORE_EXPORT_FAILURES__ = 0
    window.__QR_CORE_EXPORT_TEST__ = {
      async exportArtifact(request) {
        coreTestState.__QR_CORE_EXPORT_CALLS__.push(JSON.parse(JSON.stringify(request)))
        if (coreTestState.__QR_CORE_EXPORT_FAILURES__ > 0) {
          coreTestState.__QR_CORE_EXPORT_FAILURES__ -= 1
          throw new Error('NOT_VALIDATED: PNG failed post-transform scan validation')
        }
        const files = []
        for (const format of request.formats) {
          for (const size of request.sizes ?? []) {
            if (format === 'svg') {
              const svg = decodeURIComponent(artwork.split(',')[1])
                .replace('width="512"', `width="${size.widthPx}"`)
                .replace('height="512"', `height="${size.heightPx}"`)
              files.push({ format, data: svg, width: size.widthPx, height: size.heightPx })
              continue
            }
            const image = new Image()
            image.src = artwork
            await image.decode()
            const canvas = document.createElement('canvas')
            canvas.width = size.widthPx
            canvas.height = size.heightPx
            const context = canvas.getContext('2d')!
            context.drawImage(image, 0, 0, size.widthPx, size.heightPx)
            files.push({ format, data: canvas.toDataURL('image/png'), width: size.widthPx, height: size.heightPx })
            canvas.width = 0
            canvas.height = 0
          }
        }
        return {
          artifactId: `artifact-${coreTestState.__QR_CORE_EXPORT_CALLS__.length}`,
          candidateId: request.candidateId,
          files,
          provenance: {
            generationMode: 'deterministic_template',
            adapterVersion: 'artistic-qr-v1',
            validationVersion: 'scan-v1-real-75pct',
          },
        }
      },
    }
    localStorage.setItem('qr-studio-project', JSON.stringify({
      state: { project: state, activeBoardId: 'board-1' },
      version: 0,
    }))
  }, { state: project, artwork: svgArtwork })
}

async function assertNoConsoleErrors(page: Page) {
  const errors: string[] = []
  page.on('console', (message) => {
    if (message.type() === 'error') errors.push(message.text())
  })
  return errors
}

async function sampledColorCount(page: Page, png: Buffer): Promise<number> {
  return page.evaluate(async (source) => {
    const image = new Image()
    image.src = source
    await image.decode()
    const canvas = document.createElement('canvas')
    canvas.width = image.naturalWidth
    canvas.height = image.naturalHeight
    const context = canvas.getContext('2d')!
    context.drawImage(image, 0, 0)
    const colors = new Set<string>()
    const step = Math.max(1, Math.floor(image.naturalWidth / 32))
    for (let y = 0; y < image.naturalHeight; y += step) {
      for (let x = 0; x < image.naturalWidth; x += step) {
        colors.add(Array.from(context.getImageData(x, y, 1, 1).data).join(','))
      }
    }
    return colors.size
  }, `data:image/png;base64,${png.toString('base64')}`)
}

test.beforeAll(async () => {
  await fs.mkdir(exportDir, { recursive: true })
  await fs.mkdir(screenshotDir, { recursive: true })
  await fs.mkdir(b10EvidenceDir, { recursive: true })
  await fs.mkdir(b11EvidenceDir, { recursive: true })
  await fs.mkdir(b13EvidenceDir, { recursive: true })
  await fs.mkdir(b14EvidenceDir, { recursive: true })
  await fs.mkdir(b16EvidenceDir, { recursive: true })
  await fs.mkdir(b18EvidenceDir, { recursive: true })
  await fs.mkdir(b19EvidenceDir, { recursive: true })
  await fs.mkdir(b20EvidenceDir, { recursive: true })
})

test('B20 aligns QR-size glyphs and gives selector families one perimeter grammar', async ({ page }) => {
  const errors = await assertNoConsoleErrors(page)
  await page.setViewportSize({ width: 390, height: 844 })
  await page.goto('/')
  await page.addStyleTag({ content: '*,*::before,*::after{transition:none!important;animation:none!important}' })

  const selectorMeasurements = []
  const representatives = [
    ['palette', page.getByRole('option', { name: /^Rainbow horizontal/ })],
    ['style', page.getByRole('option', { name: /^Classic QR style/ })],
    ['corners', page.getByRole('option', { name: /^Classic corner style/ })],
    ['eyes', page.getByRole('option', { name: /^Classic eye style/ })],
  ] as const
  for (const [family, option] of representatives) {
    await option.click()
    await expect(option).toHaveAttribute('aria-selected', 'true')
    const measurement = await page.locator(`[data-selector-family="${family}"][aria-selected="true"]`).evaluate((element) => {
      const style = getComputedStyle(element)
      const box = element.getBoundingClientRect()
      return {
        width: box.width, height: box.height, borderWidth: style.borderWidth,
        borderRadius: style.borderRadius, padding: style.padding, boxShadow: style.boxShadow,
      }
    })
    expect(measurement).toMatchObject({ width: 56, height: 56, borderWidth: '2px', borderRadius: '12px', padding: '0px' })
    expect(measurement.boxShadow).not.toBe('none')
    selectorMeasurements.push({ family, ...measurement })
  }
  const perimeterSignatures = selectorMeasurements.map(({ width, height, borderWidth, borderRadius, padding }) => JSON.stringify({ width, height, borderWidth, borderRadius, padding }))
  expect(new Set(perimeterSignatures).size).toBe(1)
  expect(new Set(selectorMeasurements.map(({ boxShadow }) => boxShadow)).size).toBe(1)

  const sizeMeasurements = []
  for (const label of ['Smaller', 'Balanced', 'Larger']) {
    const button = page.getByRole('button', { name: `${label} QR size` })
    await button.click()
    await expect(button).toHaveAttribute('aria-pressed', 'true')
    const geometry = await button.evaluate((element) => {
      const buttonBox = element.getBoundingClientRect()
      const glyphBox = element.firstElementChild!.getBoundingClientRect()
      return {
        label: element.getAttribute('aria-label'),
        button: { width: buttonBox.width, height: buttonBox.height },
        glyph: { width: glyphBox.width, height: glyphBox.height },
        centerDelta: {
          x: (glyphBox.left + glyphBox.width / 2) - (buttonBox.left + buttonBox.width / 2),
          y: (glyphBox.top + glyphBox.height / 2) - (buttonBox.top + buttonBox.height / 2),
        },
      }
    })
    expect(geometry.button).toEqual({ width: 32, height: 36 })
    expect(Math.abs(geometry.centerDelta.x)).toBeLessThanOrEqual(0.1)
    expect(Math.abs(geometry.centerDelta.y)).toBeLessThanOrEqual(0.1)
    sizeMeasurements.push(geometry)
    await page.getByRole('group', { name: 'QR size' }).screenshot({ path: path.join(b20EvidenceDir, `qr-size-${label.toLowerCase()}-selected.png`) })
  }

  const optionCounts = {
    style: await page.getByRole('listbox', { name: 'Style' }).getByRole('option').count(),
    corners: await page.getByRole('listbox', { name: 'Corners' }).getByRole('option').count(),
    eyes: await page.getByRole('listbox', { name: 'Eyes' }).getByRole('option').count(),
  }
  expect(optionCounts).toEqual({ style: 7, corners: 7, eyes: 8 })
  await page.locator('section[aria-labelledby="live-editor-title"]').screenshot({ path: path.join(b20EvidenceDir, 'selector-family-perimeter-comparison.png') })
  await page.screenshot({ path: path.join(b20EvidenceDir, 'mobile-full-page.png'), fullPage: true })
  await fs.writeFile(path.join(b20EvidenceDir, 'computed-style-dom-measurements.json'), JSON.stringify({
    viewport: { width: 390, height: 844 }, selectorMeasurements, sizeMeasurements, optionCounts,
  }, null, 2))
  expect(errors).toEqual([])
})

test('B19 uses bounded scan-check wording and preserves B18/B16/B13 public behavior', async ({ page }) => {
  const disclaimer = "Scan checks reflect this app's decoder and perturbation tests, not a universal scan guarantee."
  await page.setViewportSize({ width: 1280, height: 900 })
  await page.goto('/?workflow=internal')
  await page.evaluate((state) => {
    localStorage.setItem('qr-studio-project', JSON.stringify({
      state: { project: state, activeBoardId: 'board-1' },
      version: 0,
    }))
  }, projectState({ coreEvidence: true }))
  await page.reload()

  await expect(page.getByText('Decoder checks: 92%')).toBeVisible()
  await expect(page.getByText('Decoder checks', { exact: true })).toBeVisible()
  await expect(page.getByText(disclaimer)).toHaveCount(2)
  await expect(page.getByText(/Confidence:/)).toHaveCount(0)
  await expect(page.getByText('Confidence', { exact: true })).toHaveCount(0)
  await page.getByText('Decoder checks: 92%').locator('xpath=ancestor::button[1]').screenshot({ path: path.join(b19EvidenceDir, 'candidate-cards-bounded-scan-checks.png') })
  await page.getByText('Validation Summary').locator('..').locator('..').screenshot({ path: path.join(b19EvidenceDir, 'validation-summary-bounded-scan-checks.png') })

  await page.evaluate(() => localStorage.clear())
  await page.goto('/')
  const preview = page.getByRole('img', { name: 'QR Preview' })
  const before = await preview.getAttribute('src')
  const destination = page.getByRole('textbox', { name: 'Final destination URL' })
  expect(await destination.evaluate((element) => element.tagName)).toBe('INPUT')
  await expect(page.getByRole('button', { name: 'Text' })).toHaveCount(0)
  await expect(page.getByRole('listbox', { name: 'Style' }).getByRole('option')).toHaveCount(7)
  await expect(page.getByRole('listbox', { name: 'Corners' }).getByRole('option')).toHaveCount(7)
  await expect(page.getByRole('listbox', { name: 'Eyes' }).getByRole('option')).toHaveCount(8)
  await expect(page.getByRole('option', { name: 'Notched QR style' })).toHaveAttribute('data-setting', 'notched')
  await expect(page.getByRole('option', { name: 'Shield QR style' })).toHaveAttribute('data-setting', 'shield')
  await expect(page.getByRole('option', { name: 'Diamond corner style' })).toHaveAttribute('data-setting', 'diamond')
  await expect(page.getByRole('option', { name: 'Hex corner style' })).toHaveAttribute('data-setting', 'hex')
  await expect(page.getByRole('option', { name: 'Hex eye style' })).toHaveAttribute('data-setting', 'hex')
  await expect(page.getByRole('option', { name: 'Vertical capsule eye style' })).toHaveAttribute('data-setting', 'vertical-capsule')
  await expect(page.getByRole('option', { name: 'Horizontal capsule eye style' })).toHaveAttribute('data-setting', 'horizontal-capsule')
  await expect(page.getByTestId('qr-side-controls').getByRole('group', { name: 'QR size' })).toBeVisible()
  await expect(page.getByTestId('qr-side-controls').getByRole('group', { name: 'Intensity' })).toBeVisible()
  await destination.fill('https://example.com/b19-public-draft')
  await page.getByRole('button', { name: 'Continue with this QR' }).click()
  await expect(page.getByRole('status')).toContainText('QR activates after payment')
  expect(await preview.getAttribute('src')).toBe(before)
  for (const heading of ['Candidates', 'Checkout', 'Export']) await expect(page.getByRole('heading', { name: heading })).toHaveCount(0)
  await page.screenshot({ path: path.join(b19EvidenceDir, 'public-gate-preserved.png'), fullPage: true })
  await fs.writeFile(path.join(b19EvidenceDir, 'visible-copy-and-public-gate.json'), JSON.stringify({
    candidateLabel: 'Decoder checks: 92%',
    validationSummaryLabel: 'Decoder checks',
    disclaimer,
    exactVisibleConfidenceColonCount: 0,
    exactVisibleConfidenceLabelCount: 0,
    optionCounts: { style: 7, corners: 7, eyes: 8 },
    destinationElement: 'INPUT',
    textDestinationAbsent: true,
    sideControls: ['QR size', 'Intensity'],
    publicPreviewUnchangedAfterTypingAndContinue: before === await preview.getAttribute('src'),
    hiddenPublicPanels: ['Candidates', 'Checkout', 'Export'],
  }, null, 2))
})

test('B18 exposes only accepted Core-backed extreme primitives and preserves the public paid gate', async ({ page }) => {
  const errors = await assertNoConsoleErrors(page)
  await page.setViewportSize({ width: 390, height: 844 })
  await page.goto('/')

  const preview = page.getByRole('img', { name: 'QR Preview' })
  const previewBox = await preview.boundingBox()
  expect(previewBox).not.toBeNull()
  const families = [
    { row: 'Style', count: 7, suffix: 'QR style', options: [['Notched', 'notched'], ['Shield', 'shield']] },
    { row: 'Corners', count: 7, suffix: 'corner style', options: [['Diamond', 'diamond'], ['Hex', 'hex']] },
    { row: 'Eyes', count: 8, suffix: 'eye style', options: [['Hex', 'hex'], ['Vertical capsule', 'vertical-capsule'], ['Horizontal capsule', 'horizontal-capsule']] },
  ] as const
  const hashes: Record<string, Record<string, string>> = {}

  for (const family of families) {
    const row = page.getByRole('listbox', { name: family.row })
    const options = row.getByRole('option')
    await expect(options).toHaveCount(family.count)
    hashes[family.row.toLowerCase()] = {}
    for (const [name, setting] of family.options) {
      const option = page.getByRole('option', { name: `${name} ${family.suffix}` })
      await option.scrollIntoViewIfNeeded()
      await expect(option).toHaveAttribute('data-setting', setting)
      await expect(option).toHaveAttribute('title', `${name} ${family.suffix}`)
      expect((await option.innerText()).replace('✓', '').trim()).toBe('')
      const recipeIcon = option.locator(`img[data-icon-recipe]`)
      await expect(recipeIcon).toHaveCount(1)
      await expect.poll(() => recipeIcon.evaluate((image: HTMLImageElement) => image.complete && image.naturalWidth === 28 && image.naturalHeight === 28)).toBe(true)
      const before = await preview.getAttribute('src')
      await option.click()
      await expect(page.getByRole('option', { name: `${name} ${family.suffix} selected` })).toHaveAttribute('aria-selected', 'true')
      await expect.poll(() => preview.getAttribute('src')).not.toBe(before)
      const source = await preview.getAttribute('src')
      expect(source).toBeTruthy()
      hashes[family.row.toLowerCase()][setting] = createHash('sha256').update(source!).digest('hex')
      expect(await preview.boundingBox()).toEqual(previewBox)
    }
    expect(new Set(Object.values(hashes[family.row.toLowerCase()])).size).toBe(family.options.length)
    await row.screenshot({ path: path.join(b18EvidenceDir, `${family.row.toLowerCase()}-row-expanded.png`) })
  }

  await page.screenshot({ path: path.join(b18EvidenceDir, 'mobile-public-editor-expanded-textless-rows.png'), fullPage: true })
  const destination = page.getByRole('textbox', { name: 'Final destination URL' })
  expect(await destination.evaluate((element) => element.tagName)).toBe('INPUT')
  await expect(page.getByRole('button', { name: 'Text' })).toHaveCount(0)
  const beforePayload = await preview.getAttribute('src')
  await destination.fill('https://example.com/b18-public-draft')
  await page.getByRole('button', { name: 'Continue with this QR' }).click()
  await expect(page.getByRole('status')).toContainText('QR activates after payment')
  expect(await preview.getAttribute('src')).toBe(beforePayload)
  for (const heading of ['Candidates', 'Checkout', 'Export']) await expect(page.getByRole('heading', { name: heading })).toHaveCount(0)
  await fs.writeFile(path.join(b18EvidenceDir, 'primitive-preview-hashes-and-public-gate.json'), JSON.stringify({
    previewBox,
    hashes,
    publicBeforeSha256: createHash('sha256').update(beforePayload!).digest('hex'),
    publicAfterContinueSha256: createHash('sha256').update((await preview.getAttribute('src'))!).digest('hex'),
    publicTypingAndContinueDraftOnly: beforePayload === await preview.getAttribute('src'),
    hiddenPublicPanels: ['Candidates', 'Checkout', 'Export'],
    destinationElement: 'INPUT',
    textDestinationAbsent: true,
  }, null, 2))
  expect(errors).toEqual([])
})

test('B16 delivers icon-only settings, one-line destination, palettes, side controls, and preserved payload gates', async ({ page }) => {
  const errors = await assertNoConsoleErrors(page)
  await page.setViewportSize({ width: 390, height: 844 })
  await page.goto('/')

  const preview = page.getByRole('img', { name: 'QR Preview' })
  const previewBox = await preview.boundingBox()
  expect(previewBox).not.toBeNull()
  const destination = page.getByRole('textbox', { name: 'Final destination URL' })
  const destinationBox = await destination.boundingBox()
  expect(await destination.evaluate((element) => element.tagName)).toBe('INPUT')
  expect(destinationBox?.height).toBeLessThanOrEqual(44)
  await expect(page.getByRole('button', { name: 'Text' })).toHaveCount(0)
  for (const type of ['URL', 'Email', 'Phone']) await expect(page.getByRole('button', { name: type })).toBeVisible()

  const iconRows = ['Style', 'Corners', 'Eyes'] as const
  const optionCounts = { Style: 7, Corners: 7, Eyes: 8 } as const
  for (const row of iconRows) {
    const options = page.getByRole('listbox', { name: row }).getByRole('option')
    await expect(options).toHaveCount(optionCounts[row])
    for (let index = 0; index < optionCounts[row]; index += 1) {
      expect((await options.nth(index).innerText()).replace('✓', '').trim()).toBe('')
      await expect(options.nth(index)).toHaveAttribute('aria-label', /style/)
      await expect(options.nth(index)).toHaveAttribute('data-setting', /square|rounded|circle|vertical-bars|horizontal-bars|squircle|chamfered|notched|shield|diamond|hex|vertical-capsule|horizontal-capsule/)
    }
  }
  for (const removed of ['Classic', 'Rounded', 'Dots', 'Soft', 'Circle', 'Squircle', 'Chamfered', 'Mellow', 'Balanced', 'Punchy']) {
    await expect(page.getByText(removed, { exact: true })).toHaveCount(0)
  }

  const sideControls = page.getByTestId('qr-side-controls')
  await expect(sideControls.getByRole('group', { name: 'QR size' })).toBeVisible()
  await expect(sideControls.getByRole('group', { name: 'Intensity' })).toBeVisible()
  const solidHashes: Record<string, string> = {}
  await page.getByRole('button', { name: /^Studio Blue/ }).click()
  for (const level of ['Mellow', 'Balanced', 'Punchy']) {
    const button = page.getByRole('button', { name: `${level} color intensity` })
    const before = await preview.getAttribute('src')
    await button.click()
    await expect.poll(() => preview.getAttribute('src')).not.toBe(before)
    const source = await preview.getAttribute('src')
    solidHashes[level.toLowerCase()] = createHash('sha256').update(source!).digest('hex')
    expect(await preview.boundingBox()).toEqual(previewBox)
    await page.screenshot({ path: path.join(b16EvidenceDir, `solid-${level.toLowerCase()}.png`), fullPage: true })
  }
  expect(new Set(Object.values(solidHashes)).size).toBe(3)

  await page.getByRole('option', { name: /^Rainbow horizontal/ }).click()
  const patternedHashes: Record<string, string> = {}
  for (const level of ['Mellow', 'Balanced', 'Punchy']) {
    const button = page.getByRole('button', { name: `${level} color intensity` })
    await button.click()
    await expect(button).toHaveAttribute('aria-pressed', 'true')
    const source = await preview.getAttribute('src')
    patternedHashes[level.toLowerCase()] = createHash('sha256').update(source!).digest('hex')
  }
  expect(new Set(Object.values(patternedHashes)).size).toBe(3)

  const sizeHashes: Record<string, string> = {}
  for (const level of ['Smaller', 'Balanced', 'Larger']) {
    const button = page.getByRole('button', { name: `${level} QR size` })
    const before = await preview.getAttribute('src')
    await button.click()
    await expect.poll(() => preview.getAttribute('src')).not.toBe(before)
    const source = await preview.getAttribute('src')
    sizeHashes[level.toLowerCase()] = createHash('sha256').update(source!).digest('hex')
    expect(await preview.boundingBox()).toEqual(previewBox)
  }
  expect(new Set(Object.values(sizeHashes)).size).toBe(3)

  await page.getByRole('group', { name: 'Color' }).screenshot({ path: path.join(b16EvidenceDir, 'expanded-solid-palette-row.png') })
  for (const row of iconRows) await page.getByRole('listbox', { name: row }).screenshot({ path: path.join(b16EvidenceDir, `icon-only-${row.toLowerCase()}.png`) })
  await page.screenshot({ path: path.join(b16EvidenceDir, 'mobile-public-editor.png'), fullPage: true })

  const beforePayload = await preview.getAttribute('src')
  await destination.fill('https://example.com/b16-public-draft')
  await page.getByRole('button', { name: 'Continue with this QR' }).click()
  expect(await preview.getAttribute('src')).toBe(beforePayload)
  await expect(page.getByRole('heading', { name: 'Candidates' })).toHaveCount(0)
  await expect(page.getByRole('heading', { name: 'Export' })).toHaveCount(0)
  const note = page.getByText('After checkout: PNG + SVG downloads · Social and print sizes')
  await expect(note).toHaveCSS('color', 'rgb(203, 213, 225)')
  await fs.writeFile(path.join(b16EvidenceDir, 'preview-hashes.json'), JSON.stringify({
    previewBox,
    destinationBox,
    solidHashes,
    patternedHashes,
    sizeHashes,
    publicPayloadPreviewUnchanged: beforePayload === await preview.getAttribute('src'),
  }, null, 2))
  expect(errors).toEqual([])
})

test('B14 exposes five Core-backed Style, Corners, and Eyes options with stable preview geometry', async ({ page }) => {
  const errors = await assertNoConsoleErrors(page)
  await page.setViewportSize({ width: 390, height: 844 })
  await page.goto('/')
  const preview = page.getByRole('img', { name: 'QR Preview' })
  const previewBox = await preview.boundingBox()
  expect(previewBox).not.toBeNull()

  for (const removedLabel of ['Style', 'Corners', 'Eyes']) {
    await expect(page.getByText(removedLabel, { exact: true })).toHaveCount(0)
  }
  await expect(page.getByRole('listbox', { name: 'Style' })).toBeVisible()
  await expect(page.getByRole('listbox', { name: 'Corners' })).toBeVisible()
  await expect(page.getByRole('listbox', { name: 'Eyes' })).toBeVisible()
  await page.screenshot({ path: path.join(b14EvidenceDir, '01-mobile-public-editor-three-unlabelled-rows.png'), fullPage: true })

  const families = [
    { row: 'Style', suffix: 'QR style', names: ['Classic', 'Rounded', 'Dots', 'Vertical', 'Horizontal'], slug: 'style' },
    { row: 'Corners', suffix: 'corner style', names: ['Classic', 'Soft', 'Circle', 'Squircle', 'Chamfered'], slug: 'corners' },
    { row: 'Eyes', suffix: 'eye style', names: ['Classic', 'Soft', 'Circle', 'Squircle', 'Chamfered'], slug: 'eyes' },
  ] as const
  const hashes: Record<string, string[]> = {}
  for (const family of families) {
    const sources: string[] = []
    for (const [index, name] of family.names.entries()) {
      const option = page.getByRole('option', { name: new RegExp(`^${name} ${family.suffix}`) })
      await option.scrollIntoViewIfNeeded()
      const before = await preview.getAttribute('src')
      await option.click()
      await expect(page.getByRole('option', { name: `${name} ${family.suffix} selected` })).toHaveAttribute('aria-selected', 'true')
      if (index > 0) await expect.poll(() => preview.getAttribute('src')).not.toBe(before)
      const source = await preview.getAttribute('src')
      expect(source).toBeTruthy()
      await expect.poll(() => preview.evaluate((image: HTMLImageElement) => image.complete && image.naturalWidth > 0)).toBe(true)
      sources.push(source!)
      expect(await preview.boundingBox()).toEqual(previewBox)
      await preview.screenshot({ path: path.join(b14EvidenceDir, `${family.slug}-${index + 1}-${name.toLowerCase()}.png`) })
    }
    expect(new Set(sources).size).toBe(5)
    hashes[family.slug] = sources.map((source) => createHash('sha256').update(source).digest('hex'))
    const finalOption = page.getByRole('option', { name: new RegExp(`^${family.names[4]} ${family.suffix}`) })
    await finalOption.scrollIntoViewIfNeeded()
    await page.getByRole('listbox', { name: family.row }).screenshot({ path: path.join(b14EvidenceDir, `${family.slug}-row-all-five-reachable.png`) })
  }
  await fs.writeFile(path.join(b14EvidenceDir, 'primitive-preview-hashes.json'), JSON.stringify({ previewBox, hashes }, null, 2))
  expect(errors).toEqual([])
})

test('B14 preserves public draft-only payload and internal live-preview gates', async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 })
  await page.goto('/')
  const publicPreview = page.getByRole('img', { name: 'QR Preview' })
  const before = await publicPreview.getAttribute('src')
  await page.getByRole('textbox', { name: 'Final destination URL' }).fill('https://example.com/b14-public-draft')
  await page.getByRole('button', { name: 'Continue with this QR' }).click()
  const after = await publicPreview.getAttribute('src')
  expect(after).toBe(before)
  await expect(page.getByRole('heading', { name: 'Candidates' })).toHaveCount(0)
  await expect(page.getByRole('heading', { name: 'Export' })).toHaveCount(0)
  await page.screenshot({ path: path.join(b14EvidenceDir, 'public-typed-continue-preview-unchanged.png'), fullPage: true })

  await page.goto('/?workflow=internal')
  const internalPreview = page.getByRole('img', { name: 'QR Preview' })
  const internalBefore = await internalPreview.getAttribute('src')
  await page.getByRole('textbox', { name: 'Final destination URL' }).fill('https://example.com/b14-internal-live')
  await expect.poll(() => internalPreview.getAttribute('src')).not.toBe(internalBefore)
  const internalAfter = await internalPreview.getAttribute('src')
  await page.screenshot({ path: path.join(b14EvidenceDir, 'internal-live-preview-updated.png'), fullPage: true })
  await fs.writeFile(path.join(b14EvidenceDir, 'payload-gate-hashes.json'), JSON.stringify({
    publicBeforeSha256: createHash('sha256').update(before!).digest('hex'),
    publicAfterSha256: createHash('sha256').update(after!).digest('hex'),
    publicUnchanged: before === after,
    internalBeforeSha256: createHash('sha256').update(internalBefore!).digest('hex'),
    internalAfterSha256: createHash('sha256').update(internalAfter!).digest('hex'),
    internalChanged: internalBefore !== internalAfter,
  }, null, 2))
})

test('B13 public destination stays draft-only and compact controls keep accessible names', async ({ page }) => {
  const errors = await assertNoConsoleErrors(page)
  await page.setViewportSize({ width: 390, height: 844 })
  await page.goto('/')

  const preview = page.getByRole('img', { name: 'QR Preview' })
  const destination = page.getByRole('textbox', { name: 'Final destination URL' })
  const continueButton = page.getByRole('button', { name: 'Continue with this QR' })
  await expect(preview).toBeVisible()
  await expect(continueButton).toBeDisabled()
  for (const removedLabel of ['Color', 'Palette', 'Style', 'Corners', 'Intensity']) {
    await expect(page.getByText(removedLabel, { exact: true })).toHaveCount(0)
  }
  await expect(page.getByRole('group', { name: 'Color' })).toBeVisible()
  await expect(page.getByRole('listbox', { name: 'Palette' })).toBeVisible()
  await expect(page.getByRole('listbox', { name: 'Style' })).toBeVisible()
  await expect(page.getByRole('listbox', { name: 'Corners' })).toBeVisible()
  await expect(page.getByRole('group', { name: 'Intensity' })).toBeVisible()
  await expect(page.getByText('Bind the real destination before generation.')).toHaveCount(0)
  await expect(page.getByRole('heading', { name: 'Candidates' })).toHaveCount(0)
  await expect(page.getByRole('heading', { name: 'Export' })).toHaveCount(0)
  await page.screenshot({ path: path.join(b13EvidenceDir, '01-mobile-public-editor-before-typing.png'), fullPage: true })

  const beforeSource = await preview.getAttribute('src')
  expect(beforeSource).toBeTruthy()
  await destination.fill('https://example.com/public-free-draft')
  await expect(continueButton).toBeEnabled()
  await expect(preview).toHaveAttribute('src', beforeSource!)
  const afterSource = await preview.getAttribute('src')
  const beforeHash = createHash('sha256').update(beforeSource!).digest('hex')
  const afterHash = createHash('sha256').update(afterSource!).digest('hex')
  expect(afterHash).toBe(beforeHash)
  await continueButton.click()
  await expect(page.getByRole('status')).toContainText('QR activates after payment')
  await expect(preview).toHaveAttribute('src', beforeSource!)
  await page.screenshot({ path: path.join(b13EvidenceDir, '02-public-url-typed-preview-unchanged.png'), fullPage: true })
  await fs.writeFile(path.join(b13EvidenceDir, 'public-preview-hashes.json'), JSON.stringify({
    payloadMode: 'public-free-draft',
    beforeSha256: beforeHash,
    afterSha256: afterHash,
    unchangedAfterTyping: beforeHash === afterHash,
    unchangedAfterContinue: await preview.getAttribute('src') === beforeSource,
    continueEnabled: await continueButton.isEnabled(),
  }, null, 2))
  expect(errors).toEqual([])
})

test('B13 internal entitlement preserves live Core preview payload updates', async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 })
  await page.goto('/?workflow=internal')
  const preview = page.getByRole('img', { name: 'QR Preview' })
  const beforeSource = await preview.getAttribute('src')
  await page.getByRole('textbox', { name: 'Final destination URL' }).fill('https://example.com/member-live')
  await expect.poll(() => preview.getAttribute('src')).not.toBe(beforeSource)
  const afterSource = await preview.getAttribute('src')
  expect(afterSource).toBeTruthy()
  await page.screenshot({ path: path.join(b13EvidenceDir, '03-internal-live-preview-enabled.png'), fullPage: true })
  await fs.writeFile(path.join(b13EvidenceDir, 'internal-live-preview-hashes.json'), JSON.stringify({
    payloadMode: 'internal-entitled',
    beforeSha256: createHash('sha256').update(beforeSource!).digest('hex'),
    afterSha256: createHash('sha256').update(afterSource!).digest('hex'),
    changed: beforeSource !== afterSource,
  }, null, 2))
})

test('B11 public compact editor exposes truthful styles, corners, colors, and content types', async ({ page }) => {
  const errors = await assertNoConsoleErrors(page)
  await page.setViewportSize({ width: 390, height: 844 })
  await page.goto('/')

  const editor = page.locator('section[aria-labelledby="live-editor-title"]')
  const preview = page.getByRole('img', { name: 'QR Preview' })
  await expect(editor).toBeVisible()
  await expect(page.getByText('Corners', { exact: true })).toHaveCount(0)
  await expect(page.getByRole('button', { name: 'URL' })).toHaveAttribute('aria-pressed', 'true')
  await expect(page.getByRole('button', { name: 'Email' })).toBeVisible()
  await expect(page.getByRole('button', { name: 'Continue with this QR' })).toBeDisabled()
  await expect(page.getByText('After checkout: PNG + SVG downloads · Social and print sizes')).toBeVisible()
  await expect(page.getByRole('heading', { name: 'Candidates' })).toHaveCount(0)
  await expect(page.getByRole('heading', { name: 'Export' })).toHaveCount(0)
  await expect(page.getByText('Love this look?')).toHaveCount(0)
  await expect(page.getByText('Live Core-backed preview')).toHaveCount(0)
  await page.screenshot({ path: path.join(b11EvidenceDir, '01-mobile-compact-editor-corners-content-types.png'), fullPage: true })

  const previewBox = await preview.boundingBox()
  expect(previewBox).not.toBeNull()
  const initial = await preview.getAttribute('src')
  await page.getByRole('button', { name: 'Classic Black' }).click()
  await expect(page.getByRole('button', { name: 'Classic Black selected' })).toHaveAttribute('aria-pressed', 'true')
  await expect.poll(() => preview.getAttribute('src')).not.toBe(initial)
  await editor.screenshot({ path: path.join(b11EvidenceDir, '02-classic-black-selected.png') })

  const styleSources: string[] = []
  let priorStyle = await preview.getAttribute('src')
  for (const name of ['Rounded', 'Dots', 'Classic']) {
    await page.getByRole('option', { name: new RegExp(`^${name} QR style`) }).click()
    await expect(page.getByRole('option', { name: `${name} QR style selected` })).toHaveAttribute('aria-selected', 'true')
    await expect.poll(() => preview.getAttribute('src')).not.toBe(priorStyle)
    const source = await preview.getAttribute('src')
    expect(source).toBeTruthy()
    styleSources.push(source!)
    priorStyle = source
    expect(await preview.boundingBox()).toEqual(previewBox)
  }
  expect(new Set(styleSources).size).toBe(3)
  await editor.screenshot({ path: path.join(b11EvidenceDir, '03-style-treatments-stable-preview.png') })

  const square = await preview.getAttribute('src')
  await page.getByRole('option', { name: /^Circle corner style/ }).click()
  await expect(page.getByRole('option', { name: 'Circle corner style selected' })).toHaveAttribute('aria-selected', 'true')
  await expect.poll(() => preview.getAttribute('src')).not.toBe(square)
  expect(await preview.boundingBox()).toEqual(previewBox)
  await editor.screenshot({ path: path.join(b11EvidenceDir, '04-circle-corners-selected.png') })

  await page.getByRole('button', { name: 'Email' }).click()
  const email = page.getByRole('textbox', { name: 'Email address' })
  await expect(email).toHaveAttribute('placeholder', 'name@example.com')
  const demoSource = await preview.getAttribute('src')
  await email.fill('studio@example.com')
  await expect(page.getByText(/Encoded: mailto:studio@example.com/)).toBeVisible()
  await expect(page.getByRole('button', { name: 'Continue with this QR' })).toBeEnabled()
  await expect(preview).toHaveAttribute('src', demoSource!)
  await page.screenshot({ path: path.join(b11EvidenceDir, '05-activation-cta-export-note.png'), fullPage: true })
  await page.getByRole('button', { name: 'Continue with this QR' }).click()
  await expect(page.getByRole('status')).toContainText('QR activates after payment')
  await expect(preview).toHaveAttribute('src', demoSource!)
  await page.screenshot({ path: path.join(b11EvidenceDir, '06-email-content-confirmed.png'), fullPage: true })
  expect(errors).toEqual([])
})

test.skip('superseded B10 one-screen live editor evidence', async ({ page }) => {
  const errors = await assertNoConsoleErrors(page)
  let candidateRequest: Record<string, unknown> | undefined
  await page.route('**/api/artistic-qr/candidates', async (route) => {
    candidateRequest = route.request().postDataJSON() as Record<string, unknown>
    await route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify(coreCandidateFixture()) })
  })

  await page.setViewportSize({ width: 390, height: 844 })
  await page.goto('/?workflow=internal')
  const editor = page.locator('section[aria-labelledby="live-editor-title"]')
  const preview = page.getByRole('img', { name: 'QR Preview' })
  await expect(editor).toBeVisible()
  await expect(preview).toBeVisible()
  await expect(page.getByText(/Demo destination/)).toBeVisible()
  await expect(page.getByRole('combobox')).toHaveCount(0)
  await expect(page.getByRole('slider', { name: /Artistic Strength|QR Prominence/ })).toHaveCount(0)
  await expect(page.getByText('QR Frame', { exact: true })).toHaveCount(0)
  await expect(page.getByText('Templates', { exact: true })).toHaveCount(0)
  const editorBox = await editor.boundingBox()
  expect(editorBox).not.toBeNull()
  expect((editorBox?.y ?? 0) + (editorBox?.height ?? 9999)).toBeLessThanOrEqual(844)
  await page.screenshot({ path: path.join(b10EvidenceDir, '01-one-screen-live-editor.png') })

  await page.getByRole('button', { name: 'Berry Pink' }).click()
  await expect(page.getByRole('button', { name: 'Berry Pink selected' })).toHaveAttribute('aria-pressed', 'true')
  const berryPreview = await preview.getAttribute('src')
  expect(berryPreview).toContain('%23c9184a')
  await editor.screenshot({ path: path.join(b10EvidenceDir, '02-selected-color-swatch.png') })

  const palette = page.getByRole('option', { name: 'Trans safe diagonal' })
  await palette.scrollIntoViewIfNeeded()
  await palette.click()
  await expect(page.getByRole('option', { name: 'Trans safe diagonal selected' })).toHaveAttribute('aria-selected', 'true')
  await expect.poll(() => preview.getAttribute('src')).not.toBe(berryPreview)
  const patternedPreview = await preview.getAttribute('src')
  await editor.screenshot({ path: path.join(b10EvidenceDir, '03-palette-carousel-selected.png') })

  const boldStyle = page.getByRole('option', { name: 'Bold QR style' })
  await boldStyle.scrollIntoViewIfNeeded()
  await boldStyle.click()
  await expect(page.getByRole('option', { name: 'Bold QR style selected' })).toHaveAttribute('aria-selected', 'true')
  await expect.poll(() => preview.getAttribute('src')).not.toBe(patternedPreview)
  const boldPreview = await preview.getAttribute('src')
  await editor.screenshot({ path: path.join(b10EvidenceDir, '04-style-carousel-bold-selected.png') })

  await page.getByRole('button', { name: 'Mellow' }).click()
  await expect.poll(() => preview.getAttribute('src')).not.toBe(boldPreview)
  const mellowPreview = await preview.getAttribute('src')
  await editor.screenshot({ path: path.join(b10EvidenceDir, '05-intensity-mellow.png') })
  await page.getByRole('button', { name: 'Punchy' }).click()
  await expect.poll(() => preview.getAttribute('src')).not.toBe(mellowPreview)
  const punchyPreview = await preview.getAttribute('src')
  expect(punchyPreview).not.toBe(mellowPreview)
  await editor.screenshot({ path: path.join(b10EvidenceDir, '06-intensity-punchy.png') })

  await page.getByRole('button', { name: 'Use this design' }).click()
  const destination = page.getByRole('textbox', { name: 'Final destination URL' })
  await expect(destination).toBeFocused()
  await destination.fill('https://example.com/final-destination')
  await expect.poll(() => preview.getAttribute('src')).not.toBe(punchyPreview)
  await page.getByRole('button', { name: 'Generate 4' }).click()
  await expect(page.getByText('Validated', { exact: true })).toHaveCount(4)
  expect(candidateRequest).toMatchObject({
    artDirectionId: 'architectural-geometric',
    artisticStrength: 1,
    paletteFamily: 'trans',
    palettePattern: 'diagonalGradient',
    colorIntensity: 'punchy',
    composition: { focalArea: 'center' },
  })
  await page.getByRole('button', { name: /Candidate 100000/ }).first().click()
  await expect(page.getByRole('button', { name: 'Purchase to export selected PNG' })).toBeDisabled()
  await page.getByRole('heading', { name: 'Export', exact: true }).locator('xpath=../..').screenshot({
    path: path.join(b10EvidenceDir, '07-export-payment-gate.png'),
  })
  expect(errors).toEqual([])
})

test('cancellation stops pending work and recovers Generate UI', async ({ page }) => {
  const errors = await assertNoConsoleErrors(page)
  await routeCandidateFixture(page, 15_000)
  await page.goto('/?workflow=internal')
  await page.getByPlaceholder('Enter destination URL…').fill('https://example.com')
  await page.getByRole('button', { name: 'Continue with this QR' }).click()
  await page.getByRole('button', { name: 'Generate 4' }).click()
  await expect(page.getByRole('button', { name: 'Cancel' })).toBeVisible()
  await page.getByRole('button', { name: 'Cancel' }).click()
  await expect(page.getByText('No candidates yet')).toBeVisible()
  await expect(page.getByRole('button', { name: 'Generate 4' })).toBeEnabled()
  await page.waitForTimeout(1_000)
  await expect(page.getByText('No candidates yet')).toBeVisible()
  expect(errors).toEqual([])
})

test('refinement starts a new round and exhausted state remains disabled', async ({ page }) => {
  const errors = await assertNoConsoleErrors(page)
  await routeCandidateFixture(page)
  await seed(page)
  await page.goto('/?workflow=internal')
  await expect(page.getByRole('button', { name: 'Refine from selected candidate' })).toHaveAttribute('aria-expanded', 'true')
  await page.getByPlaceholder(/Describe changes/).fill('Use a darker indigo palette')
  await page.getByRole('button', { name: 'Apply & Generate New Round' }).click()
  await expect(page.getByText('Round 2')).toBeVisible()
  await expect(page.getByText('complete', { exact: true }).last()).toBeVisible()
  const persistedPrompt = await page.evaluate(() => {
    const stored = JSON.parse(localStorage.getItem('qr-studio-project') || '{}')
    return stored.state.project.artDirection.prompt
  })
  expect(persistedPrompt).toBe('Use a darker indigo palette')
  expect(errors).toEqual([])
})

test('Core generation outage is visible and retry remains possible', async ({ page }) => {
  await page.route('**/api/artistic-qr/candidates', (route) => route.abort('connectionrefused'))
  await page.goto('/?workflow=internal')
  await page.getByPlaceholder('Enter destination URL…').fill('https://example.com')
  await page.getByRole('button', { name: 'Continue with this QR' }).click()
  await page.getByRole('button', { name: 'Generate 4' }).click()
  await expect(page.getByRole('alert')).toContainText('Core generation service is unavailable')
  await expect(page.getByRole('button', { name: 'Generate 4' })).toBeEnabled()
  await expect(page.getByText('No candidates yet')).toBeVisible()

  await page.unroute('**/api/artistic-qr/candidates')
  await routeCandidateFixture(page)
  await page.getByRole('button', { name: 'Generate 4' }).click()
  await expect(page.getByText('complete', { exact: true })).toBeVisible()
  await expect(page.getByText('Validated', { exact: true })).toHaveCount(4)
})

test('exhausted refinement remains disabled in the browser', async ({ page }) => {
  await seed(page, projectState({ exhausted: true }))
  await page.goto('/?workflow=internal')
  await expect(page.getByRole('button', { name: 'Refine from selected candidate' })).toHaveAttribute('aria-expanded', 'true')
  await expect(page.getByRole('button', { name: 'Max rounds reached' })).toBeDisabled()
})

test('all print sizes show correct physical dimensions without clipping', async ({ page }) => {
  const errors = await assertNoConsoleErrors(page)
  await seed(page)
  await page.goto('/?workflow=internal')
  const cases = [
    { button: /Social \(512×512\)/, label: /Social \(512×512\) · 180\.6×180\.6 mm/, detail: /512×512px at 72 DPI/, slug: 'social' },
    { button: /Small Print \(1200×1200\)/, label: /Small Print \(1200×1200\) · 101\.6×101\.6 mm/, detail: /1200×1200px at 300 DPI/, slug: 'small' },
    { button: /Medium Print \(2400×2400\)/, label: /Medium Print \(2400×2400\) · 203\.2×203\.2 mm/, detail: /2400×2400px at 300 DPI/, slug: 'medium' },
    { button: /Large Print \(3600×3600\)/, label: /Large Print \(3600×3600\) · 304\.8×304\.8 mm/, detail: /3600×3600px at 300 DPI/, slug: 'large' },
  ]

  for (const item of cases) {
    await page.getByRole('button', { name: item.button }).click()
    const opener = page.getByRole('button', { name: 'Preview at size' })
    await opener.click()
    const dialog = page.getByRole('dialog', { name: 'Print Preview' })
    await expect(dialog).toBeVisible()
    const previewImage = dialog.getByRole('img', { name: 'Print preview' })
    await expect.poll(() => previewImage.evaluate((image: HTMLImageElement) => image.complete && image.naturalWidth > 0)).toBe(true)
    await expect(page.getByText(item.label)).toBeVisible()
    await expect(page.getByText(item.detail)).toBeVisible()
    await expect(page.getByRole('button', { name: 'Close' })).toBeFocused()
    const box = await dialog.boundingBox()
    const viewport = page.viewportSize()!
    expect(box).not.toBeNull()
    expect(box!.x).toBeGreaterThanOrEqual(0)
    expect(box!.y).toBeGreaterThanOrEqual(0)
    expect(box!.x + box!.width).toBeLessThanOrEqual(viewport.width)
    expect(box!.y + box!.height).toBeLessThanOrEqual(viewport.height)
    await dialog.screenshot({ path: path.join(screenshotDir, `print-${item.slug}.png`) })
    await page.keyboard.press('Tab')
    await expect(page.getByRole('button', { name: 'Close' })).toBeFocused()
    await page.keyboard.press('Escape')
    await expect(dialog).toBeHidden()
    await expect(opener).toBeFocused()
  }
  expect(errors).toEqual([])
})

test('preview mode configures size, format, and bundle intent without exporting', async ({ page }) => {
  await seed(page, projectState({ exportAllowed: false, coreEvidence: true }))
  await page.goto('/?workflow=internal')

  await expect(page.getByText('Selected candidate', { exact: true })).toBeVisible()
  await expect(page.getByText('Validation Summary')).toBeVisible()

  const largeSize = page.getByRole('button', { name: /Large Print/ })
  await expect(largeSize).toBeEnabled()
  await largeSize.click()
  await expect(largeSize).toHaveAttribute('aria-pressed', 'true')

  const svg = page.getByRole('button', { name: /^SVG/ })
  await svg.click()
  await expect(svg).toHaveAttribute('aria-pressed', 'true')
  await expect(page.getByRole('button', { name: 'Purchase to export selected SVG' })).toBeDisabled()

  const bundle = page.getByRole('button', { name: 'Bundle (all sizes)' })
  await expect(bundle).toBeEnabled()
  await bundle.click()
  await expect(bundle).toHaveAttribute('aria-pressed', 'true')
  await expect(page.getByText(/downloading the selected bundle requires purchase/i)).toBeVisible()
  await expect(page.getByRole('button', { name: 'Purchase to export selected bundle' })).toBeDisabled()

  const exportCalls = await page.evaluate(() => (
    window as typeof window & { __QR_CORE_EXPORT_CALLS__: unknown[] }
  ).__QR_CORE_EXPORT_CALLS__)
  expect(exportCalls).toEqual([])
})

test('Core export rejection is visible, downloads nothing, and retries idempotently', async ({ page }) => {
  await seed(page)
  await page.goto('/?workflow=internal')
  await page.evaluate(() => {
    const state = window as typeof window & { __QR_CORE_EXPORT_FAILURES__: number }
    state.__QR_CORE_EXPORT_FAILURES__ = 1
  })
  const downloads: import('@playwright/test').Download[] = []
  page.on('download', (download) => downloads.push(download))

  await page.getByRole('button', { name: 'Export PNG' }).click()

  await expect(page.getByRole('alert')).toContainText('NOT_VALIDATED')
  await expect(page.getByText(/Downloaded:/)).toHaveCount(0)
  expect(downloads).toHaveLength(0)
  const afterFailure = await page.evaluate(() => {
    const state = window as typeof window & { __QR_CORE_EXPORT_CALLS__: unknown[] }
    const stored = JSON.parse(localStorage.getItem('qr-studio-project') || '{}')
    return { calls: state.__QR_CORE_EXPORT_CALLS__, consumed: stored.state.project.entitlement.exportsConsumed }
  })
  expect(afterFailure.calls).toHaveLength(1)
  expect(afterFailure.consumed).toBe(1)

  const [download] = await Promise.all([
    page.waitForEvent('download'),
    page.getByRole('button', { name: 'Export PNG' }).click(),
  ])
  await expect(page.getByRole('status')).toContainText(download.suggestedFilename())
  const afterRetry = await page.evaluate(() => {
    const state = window as typeof window & { __QR_CORE_EXPORT_CALLS__: unknown[] }
    const stored = JSON.parse(localStorage.getItem('qr-studio-project') || '{}')
    return { calls: state.__QR_CORE_EXPORT_CALLS__, consumed: stored.state.project.entitlement.exportsConsumed }
  })
  expect(afterRetry.calls).toHaveLength(2)
  expect(afterRetry.calls[1]).toEqual(afterRetry.calls[0])
  expect(afterRetry.consumed).toBe(1)
  expect(downloads).toHaveLength(1)
})

test('single exports produce inspectable Core-returned PNG and SVG files', async ({ page }) => {
  const errors = await assertNoConsoleErrors(page)
  await seed(page)
  await page.goto('/?workflow=internal')
  const formats = ['PNG', 'SVG'] as const
  const saved: Record<string, string> = {}

  for (const format of formats) {
    await page.getByRole('button', { name: new RegExp(`^${format}`) }).click()
    const [download] = await Promise.all([
      page.waitForEvent('download'),
      page.getByRole('button', { name: `Export ${format}` }).click(),
    ])
    const target = path.join(exportDir, download.suggestedFilename())
    await download.saveAs(target)
    saved[format] = target
    await expect(page.getByRole('status')).toContainText(download.suggestedFilename())
  }

  const png = await fs.readFile(saved.PNG)
  expect(png.subarray(1, 4).toString()).toBe('PNG')
  expect(png.readUInt32BE(16)).toBe(512)
  expect(png.readUInt32BE(20)).toBe(512)
  expect(await sampledColorCount(page, png)).toBeGreaterThan(1)

  const svg = await fs.readFile(saved.SVG, 'utf8')
  expect(svg).toContain('<svg')
  expect(svg).toMatch(/width=["']512["']/)
  expect(errors).toEqual([])
})

test('bundle export downloads exactly four PNG sizes with expected dimensions', async ({ page }) => {
  const errors = await assertNoConsoleErrors(page)
  await seed(page)
  await page.goto('/?workflow=internal')
  await page.getByRole('button', { name: 'Bundle (all sizes)' }).click()
  const downloads: import('@playwright/test').Download[] = []
  page.on('download', (download) => downloads.push(download))
  await page.getByRole('button', { name: 'Export Bundle' }).click()
  await expect(page.getByRole('status')).toContainText('Bundle: 4 files', { timeout: 30_000 })
  await expect.poll(() => downloads.length).toBe(4)

  const expected = [512, 1200, 2400, 3600]
  for (let index = 0; index < downloads.length; index += 1) {
    const target = path.join(exportDir, `bundle-${index + 1}-${downloads[index].suggestedFilename()}`)
    await downloads[index].saveAs(target)
    const bytes = await fs.readFile(target)
    expect(bytes.subarray(1, 4).toString()).toBe('PNG')
    expect(bytes.readUInt32BE(16)).toBe(expected[index])
    expect(bytes.readUInt32BE(20)).toBe(expected[index])
    expect(await sampledColorCount(page, bytes)).toBeGreaterThan(1)
  }
  expect(errors).toEqual([])
})

test('validation evidence is explicitly unverified without Core Engine provenance', async ({ page }) => {
  await seed(page, projectState({ coreEvidence: false }))
  await page.goto('/?workflow=internal')
  await expect(page.getByText('Evidence source not supplied — treat as fixture or unverified data')).toBeVisible()
})

test('mobile print preview remains inside viewport', async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 })
  await seed(page)
  await page.goto('/?workflow=internal')
  await page.getByRole('button', { name: /Large Print/ }).click()
  await page.getByRole('button', { name: 'Preview at size' }).click()
  const dialog = page.getByRole('dialog', { name: 'Print Preview' })
  await expect(dialog).toBeVisible()
  const previewImage = dialog.getByRole('img', { name: 'Print preview' })
  await expect.poll(() => previewImage.evaluate((image: HTMLImageElement) => image.complete && image.naturalWidth > 0)).toBe(true)
  const box = await dialog.boundingBox()
  expect(box).not.toBeNull()
  expect(box!.x).toBeGreaterThanOrEqual(0)
  expect(box!.y).toBeGreaterThanOrEqual(0)
  expect(box!.x + box!.width).toBeLessThanOrEqual(390)
  expect(box!.y + box!.height).toBeLessThanOrEqual(844)
  await page.screenshot({ path: path.join(screenshotDir, 'mobile-large-preview.png'), fullPage: true })
})
