import { test, expect, type Page } from '@playwright/test'
import fs from 'node:fs/promises'
import path from 'node:path'

const evidenceRoot = path.resolve(process.cwd(), '../../.work-loop/evidence/stage2-commerce/browser')
const exportDir = path.join(evidenceRoot, 'exports')
const screenshotDir = path.join(evidenceRoot, 'screenshots')

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
})

test('cancellation stops pending work and recovers Generate UI', async ({ page }) => {
  const errors = await assertNoConsoleErrors(page)
  await routeCandidateFixture(page, 15_000)
  await page.goto('/')
  await page.getByPlaceholder('Enter url…').fill('https://example.com')
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
  await page.goto('/')
  await page.getByText('Refine from selected candidate').click()
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
  await page.goto('/')
  await page.getByPlaceholder('Enter url…').fill('https://example.com')
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
  await page.goto('/')
  await page.getByText('Refine from selected candidate').click()
  await expect(page.getByRole('button', { name: 'Max rounds reached' })).toBeDisabled()
})

test('all print sizes show correct physical dimensions without clipping', async ({ page }) => {
  const errors = await assertNoConsoleErrors(page)
  await seed(page)
  await page.goto('/')
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
  await page.goto('/')

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
  await page.goto('/')
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
  await page.goto('/')
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
  await page.goto('/')
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
  await page.goto('/')
  await expect(page.getByText('Evidence source not supplied — treat as fixture or unverified data')).toBeVisible()
})

test('mobile print preview remains inside viewport', async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 })
  await seed(page)
  await page.goto('/')
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
