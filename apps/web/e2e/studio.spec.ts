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
      palette: { primary: '#5b6ef5', secondary: '#323eaf', accent: '#a5bdff' },
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
  await page.screenshot({ path: path.join(b13EvidenceDir, '02-public-url-typed-preview-unchanged.png'), fullPage: true })
  await fs.writeFile(path.join(b13EvidenceDir, 'public-preview-hashes.json'), JSON.stringify({
    payloadMode: 'public-free-draft',
    beforeSha256: beforeHash,
    afterSha256: afterHash,
    unchanged: beforeHash === afterHash,
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
  await expect(page.getByRole('status')).toContainText('Checkout coming next')
  await expect.poll(() => preview.getAttribute('src')).not.toBe(demoSource)
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
