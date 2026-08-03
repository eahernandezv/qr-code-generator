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
const b21EvidenceDir = path.resolve(process.cwd(), '../../.work-loop/evidence/studio-b21-no-scroll-one-screen-variant')
const b24EvidenceDir = path.resolve(process.cwd(), '../../.work-loop/evidence/studio-b24-selector-scrollbar-clearance')
const b25bEvidenceDir = path.resolve(process.cwd(), '../../.work-loop/evidence/studio-b25b-body-corner-color-ui')
const b26bEvidenceDir = path.resolve(process.cwd(), '../../.work-loop/evidence/studio-b26b-expose-qrio-shapes')
const b27EvidenceDir = path.resolve(process.cwd(), '../../.work-loop/evidence/studio-b27-creator-signature-template')
const b28EvidenceDir = path.resolve(process.cwd(), '../../.work-loop/evidence/studio-b28-creator-signature-corner-adjacent-polish')
const b29EvidenceDir = path.resolve(process.cwd(), '../../.work-loop/evidence/studio-b29-creator-signature-text-only-boundary-aligned')
const b32EvidenceDir = path.resolve(process.cwd(), '../../.work-loop/evidence/studio-b32-signature-follows-qr-size')
const b33EvidenceDir = path.resolve(process.cwd(), '../../.work-loop/evidence/studio-b33-top-corners-empty-cta')

const fixtureModules = Array.from({ length: 21 }, (_, y) => Array.from({ length: 21 }, (_, x) => {
  const finder = (fx: number, fy: number) => x >= fx && x < fx + 7 && y >= fy && y < fy + 7
    && (x === fx || x === fx + 6 || y === fy || y === fy + 6 || (x >= fx + 2 && x <= fx + 4 && y >= fy + 2 && y <= fy + 4))
  if (finder(0, 0) || finder(14, 0) || finder(0, 14)) return true
  if (x === 6 || y === 6) return (x + y) % 2 === 0
  return ((x * 7 + y * 11 + x * y) % 5) < 2
}))

const fixtureQrSvg = `<svg xmlns="http://www.w3.org/2000/svg" width="512" height="512" viewBox="0 0 512 512" data-qr-fixture="module-matrix">
  <rect width="512" height="512" fill="#f0f4ff"/>
  ${fixtureModules.flatMap((row, y) => row.map((filled, x) => filled ? `<rect x="${32 + x * 21}" y="${32 + y * 21}" width="18" height="18" rx="3" fill="#181b3a"/>` : '')).join('')}
</svg>`

const svgArtwork = `data:image/svg+xml;charset=utf-8,${encodeURIComponent(fixtureQrSvg)}`

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
  await fs.mkdir(b21EvidenceDir, { recursive: true })
  await fs.mkdir(b24EvidenceDir, { recursive: true })
  await fs.mkdir(b25bEvidenceDir, { recursive: true })
  await fs.mkdir(b26bEvidenceDir, { recursive: true })
  await fs.mkdir(b27EvidenceDir, { recursive: true })
  await fs.mkdir(b28EvidenceDir, { recursive: true })
  await fs.mkdir(b29EvidenceDir, { recursive: true })
  await fs.mkdir(b32EvidenceDir, { recursive: true })
  await fs.mkdir(b33EvidenceDir, { recursive: true })
})

test('B29 Creator Signature uses text-only reserved shelves aligned to QR boundaries and preserves Basic/public gates', async ({ page }) => {
  const errors = await assertNoConsoleErrors(page)
  await page.setViewportSize({ width: 390, height: 844 })
  await page.goto('/')
  const preview = page.getByRole('img', { name: 'QR Preview' })
  const basicBefore = (await preview.getAttribute('src'))!
  await expect(preview).toHaveAttribute('data-art-level', 'basic')
  expect(decodeURIComponent(basicBefore.split(',')[1] ?? '')).not.toContain('data-template-layer="creator-signature"')

  await page.getByRole('button', { name: 'Template Art' }).click()
  const positions = ['bottom-right-outside', 'bottom-left-outside', 'below-centered', 'top-right-corner', 'top-left-corner'] as const
  const panels: Array<{ label: string; source: string; bytes: Buffer; geometry: Record<string, number[]> }> = []
  const overlaps = (a: number[], b: number[]) => a[0] < b[0] + b[2] && a[0] + a[2] > b[0] && a[1] < b[1] + b[3] && a[1] + a[3] > b[1]
  const contains = (outer: number[], inner: number[]) => inner[0] >= outer[0] && inner[1] >= outer[1]
    && inner[0] + inner[2] <= outer[0] + outer[2] && inner[1] + inner[3] <= outer[1] + outer[3]

  for (const value of positions) {
    const option = page.locator(`[data-signature-position="${value}"]`)
    await option.click()
    await expect(option).toHaveAttribute('aria-checked', 'true')
    await expect.poll(async () => decodeURIComponent((await preview.getAttribute('src'))!.split(',')[1] ?? '')).toContain(`data-signature-position="${value}"`)
    const source = (await preview.getAttribute('src'))!
    const decoded = decodeURIComponent(source.split(',')[1] ?? '')
    const zone = (name: string) => decoded.match(new RegExp(`${name}="([0-9,]+)"`))![1].split(',').map(Number)
    const geometry = { active: zone('data-qr-active-zone'), content: zone('data-qr-content-zone'), card: zone('data-qr-card-zone'), slot: zone('data-signature-slot') }
    const layer = decoded.match(/<g data-template-layer="creator-signature"[\s\S]*?<\/g>/)![0]
    expect(overlaps(geometry.slot, geometry.content)).toBe(false)
    expect(contains(geometry.card, geometry.active)).toBe(true)
    expect(contains(geometry.card, geometry.slot)).toBe(true)
    expect(layer).toContain('data-signature-reserved-shelf="true"')
    expect(layer).not.toContain('fill="#0f172a"')
    expect(layer).not.toContain('stroke="#38bdf8"')
    expect(decoded).not.toContain('stroke="#e2e8f0"')
    if (value === 'bottom-right-outside' || value === 'bottom-left-outside' || value === 'below-centered') {
      expect(layer).toContain(`y="${geometry.content[1] + geometry.content[3] + 22}"`)
    }
    panels.push({ label: value, source, bytes: await preview.screenshot(), geometry })
  }
  expect(new Set(panels.map(({ source }) => createHash('sha256').update(source).digest('hex'))).size).toBe(5)
  expect(panels[0].geometry.slot[0] + panels[0].geometry.slot[2]).toBe(panels[0].geometry.content[0] + panels[0].geometry.content[2])
  expect(panels[1].geometry.slot[0]).toBe(panels[1].geometry.content[0])

  await page.setViewportSize({ width: 812, height: 590 })
  await page.setContent(`<main style="margin:0;padding:16px;background:#020617;color:white;font:600 13px system-ui;display:grid;grid-template-columns:repeat(3,250px);gap:16px">${panels.map(({ label, bytes }) => `<figure style="margin:0"><figcaption style="height:28px">${label}</figcaption><img width="232" height="232" src="data:image/png;base64,${bytes.toString('base64')}"></figure>`).join('')}</main>`)
  await page.locator('main').screenshot({ path: path.join(b29EvidenceDir, 'creator-signature-b29-all-positions-contact-sheet.png') })

  const overlayPanels = panels.map(({ label, source, geometry }) => {
    const decoded = decodeURIComponent(source.split(',')[1] ?? '')
    const [ax, ay, aw, ah] = geometry.active
    const [qx, qy, qw, qh] = geometry.content
    const [sx, sy, sw, sh] = geometry.slot
    const [cx, cy, cw, ch] = geometry.card
    const overlay = `<rect x="${cx}" y="${cy}" width="${cw}" height="${ch}" fill="none" stroke="#60a5fa" stroke-width="7"/><rect x="${ax}" y="${ay}" width="${aw}" height="${ah}" fill="none" stroke="#22c55e" stroke-width="7" opacity=".35"/><rect x="${qx}" y="${qy}" width="${qw}" height="${qh}" fill="none" stroke="#ef4444" stroke-width="7"/><rect x="${sx}" y="${sy}" width="${sw}" height="${sh}" fill="none" stroke="#f59e0b" stroke-width="7"/><text x="30" y="704" fill="#60a5fa" font-size="15" font-family="system-ui">BLUE CARD</text><text x="205" y="704" fill="#ef4444" font-size="15" font-family="system-ui">RED VISIBLE QR BORDER</text><text x="500" y="704" fill="#f59e0b" font-size="15" font-family="system-ui">AMBER SHELF</text>`
    return { label, source: `data:image/svg+xml;charset=utf-8,${encodeURIComponent(decoded.replace('</svg>', `${overlay}</svg>`))}` }
  })
  await page.setContent(`<main style="margin:0;padding:16px;background:#020617;color:white;font:600 13px system-ui;display:grid;grid-template-columns:repeat(3,250px);gap:16px">${overlayPanels.map(({ label, source }) => `<figure style="margin:0"><figcaption style="height:28px">${label}</figcaption><img width="232" height="232" src="${source}"></figure>`).join('')}</main>`)
  await page.locator('main').screenshot({ path: path.join(b29EvidenceDir, 'creator-signature-b29-safe-zone-overlay.png') })

  const b29Default = decodeURIComponent(panels[0].source.split(',')[1] ?? '')
  const b28Default = b29Default
    .replace('data-qr-card-zone="96,41,528,620" x="96" y="41" width="528" height="620"', 'data-qr-card-zone="96,41,528,528" x="96" y="41" width="528" height="528"')
    .replace(/\s*<line x1="110" y1="565" x2="610" y2="565" stroke="#e2e8f0" stroke-width="2"\/>/, '')
    .replace(/<g data-template-layer="creator-signature"[\s\S]*?<\/g>/, '<g data-template-layer="creator-signature" data-signature-position="bottom-right-outside" data-signature-slot="370,569,270,90"><rect x="370" y="569" width="270" height="90" rx="18" fill="#0f172a" stroke="#38bdf8" stroke-width="2"/><text x="624" y="594" text-anchor="end" fill="#f8fafc" font-family="Inter,system-ui,sans-serif" font-size="18" font-weight="750">Ernesto Creates</text><text x="624" y="616" text-anchor="end" fill="#94a3b8" font-family="Inter,system-ui,sans-serif" font-size="10">@ernesto</text><text x="624" y="638" text-anchor="end" fill="#38bdf8" font-family="Inter,system-ui,sans-serif" font-size="8" font-weight="700">SCAN TO CONNECT</text></g>')
  const b28Source = `data:image/svg+xml;charset=utf-8,${encodeURIComponent(b28Default)}`
  const b29Source = panels[0].source
  await page.setViewportSize({ width: 1080, height: 590 })
  await page.setContent(`<main style="margin:0;padding:24px;background:#020617;color:white;font:700 18px system-ui;display:grid;grid-template-columns:1fr 1fr;gap:24px"><figure style="margin:0"><figcaption style="height:34px">B28 · detached dark pill</figcaption><img width="500" height="500" src="${b28Source}"></figure><figure style="margin:0"><figcaption style="height:34px">B29 · text-only reserved shelf</figcaption><img width="500" height="500" src="${b29Source}"></figure></main>`)
  await page.locator('main').screenshot({ path: path.join(b29EvidenceDir, 'creator-signature-b28-vs-b29-default-bottom-right.png') })
  const b28Hash = createHash('sha256').update(b28Default).digest('hex')
  const b29Hash = createHash('sha256').update(b29Default).digest('hex')
  expect(b29Hash).not.toBe(b28Hash)
  await fs.writeFile(path.join(b29EvidenceDir, 'creator-signature-b29-visual-delta.json'), JSON.stringify({
    baseline: 'B28 merged baseline renderer reconstructed from frozen geometry', b28Sha256: b28Hash, b29Sha256: b29Hash, visiblyDifferent: true,
    defaultBottomRight: { textOnly: true, darkBackground: false, blueBorder: false, pill: false, badge: false, rightBoundaryAligned: true, qrVisibleRightEdge: panels[0].geometry.content[0] + panels[0].geometry.content[2], textAnchorX: panels[0].geometry.content[0] + panels[0].geometry.content[2] },
    bottomLeft: { textOnly: true, leftBoundaryAligned: true, qrVisibleLeftEdge: panels[1].geometry.content[0], textAnchorX: panels[1].geometry.content[0] },
    positionsDistinct: true,
  }, null, 2))

  await page.setViewportSize({ width: 390, height: 844 })
  await page.goto('/')
  await page.getByRole('button', { name: 'Basic QR' }).click()
  const basicAfter = await preview.getAttribute('src')
  expect(basicAfter).toBe(basicBefore)
  await page.getByRole('button', { name: 'Template Art' }).click()
  const beforeDraft = await preview.getAttribute('src')
  await page.getByRole('textbox', { name: 'Final destination URL' }).fill('https://example.com/b29-public-draft')
  await page.getByRole('button', { name: 'Continue with this QR' }).click()
  await expect(page.getByRole('status')).toContainText('QR activates after payment')
  expect(await preview.getAttribute('src')).toBe(beforeDraft)
  const headings = await page.locator('h1,h2,h3').allTextContents()
  const hiddenPaidPanels = Object.fromEntries(['Candidates', 'Checkout', 'Export'].map((name) => [name, headings.filter((heading) => heading.trim() === name).length]))
  expect(hiddenPaidPanels).toEqual({ Candidates: 0, Checkout: 0, Export: 0 })
  await fs.writeFile(path.join(b29EvidenceDir, 'creator-signature-b29-public-gate-proof.json'), JSON.stringify({ basicQrPathUnchanged: basicAfter === basicBefore, unpaidPublicPath: 'draft-only', previewUnchangedAfterTypingAndContinue: beforeDraft === await preview.getAttribute('src'), hiddenPaidPanels, status: await page.getByRole('status').textContent() }, null, 2))
  expect(errors).toEqual([])
})

test('B32 Creator Signature location follows QR size controls without resizing signature text', async ({ page }) => {
  const errors = await assertNoConsoleErrors(page)
  await page.setViewportSize({ width: 390, height: 844 })
  await page.goto('/')
  await page.addStyleTag({ content: '*,*::before,*::after{transition:none!important;animation:none!important}' })
  await page.getByRole('button', { name: 'Template Art' }).click()
  const preview = page.getByRole('img', { name: 'QR Preview' })
  const measurements: Array<{ label: string; content: number[]; slot: number[]; textX: number; textY: number; fontSize: number; source: string }> = []
  const parse = (source: string) => {
    const decoded = decodeURIComponent(source.split(',')[1] ?? '')
    const zone = (name: string) => decoded.match(new RegExp(`${name}="([0-9,]+)"`))![1].split(',').map(Number)
    const text = decoded.match(/<text x="([0-9.]+)" y="([0-9.]+)" text-anchor="end"[^>]*font-size="([0-9.]+)"/)!
    return { decoded, content: zone('data-qr-content-zone'), slot: zone('data-signature-slot'), textX: Number(text[1]), textY: Number(text[2]), fontSize: Number(text[3]) }
  }
  for (const label of ['Smaller', 'Balanced', 'Larger']) {
    const button = page.getByRole('button', { name: `${label} QR size` })
    await button.click()
    await expect(button).toHaveAttribute('aria-pressed', 'true')
    await expect.poll(async () => {
      const source = (await preview.getAttribute('src'))!
      return parse(source).content.join(',')
    }).not.toBe(measurements.length ? measurements[measurements.length - 1].content.join(',') : '__unset__')
    const source = (await preview.getAttribute('src'))!
    const parsed = parse(source)
    measurements.push({ label, content: parsed.content, slot: parsed.slot, textX: parsed.textX, textY: parsed.textY, fontSize: parsed.fontSize, source })
    await preview.screenshot({ path: path.join(b32EvidenceDir, `creator-signature-${label.toLowerCase()}-qr-size.png`) })
  }
  expect(new Set(measurements.map((item) => item.content.join(','))).size).toBe(3)
  expect(new Set(measurements.map((item) => `${item.textX},${item.textY}`)).size).toBe(3)
  expect(new Set(measurements.map((item) => item.fontSize)).size).toBe(1)
  for (const item of measurements) {
    expect(item.textX).toBe(item.content[0] + item.content[2])
    expect(item.textY).toBe(item.content[1] + item.content[3] + 22)
    expect(item.slot[0] + item.slot[2]).toBe(item.content[0] + item.content[2])
  }
  await page.setViewportSize({ width: 820, height: 360 })
  await page.setContent(`<main style="margin:0;padding:16px;background:#020617;color:white;font:700 14px system-ui;display:grid;grid-template-columns:repeat(3,1fr);gap:16px">${measurements.map(({ label, source }) => `<figure style="margin:0"><figcaption>${label}</figcaption><img width="240" height="240" src="${source}"></figure>`).join('')}</main>`)
  await page.locator('main').screenshot({ path: path.join(b32EvidenceDir, 'creator-signature-qr-size-movement-contact-sheet.png') })
  await fs.writeFile(path.join(b32EvidenceDir, 'creator-signature-qr-size-movement.json'), JSON.stringify({
    verdict: 'signature_location_moves_with_qr_size; signature_font_size_constant',
    measurements: measurements.map(({ label, content, slot, textX, textY, fontSize }) => ({ label, content, slot, textX, textY, fontSize })),
  }, null, 2))
  expect(errors).toEqual([])
})

test('B33 Creator Signature replaces crossed-out options with top corners and keeps empty CTA empty', async ({ page }) => {
  const errors = await assertNoConsoleErrors(page)
  await page.setViewportSize({ width: 390, height: 844 })
  await page.goto('/')
  await page.addStyleTag({ content: '*,*::before,*::after{transition:none!important;animation:none!important}' })
  await page.getByRole('button', { name: 'Template Art' }).click()
  await expect(page.getByRole('radio', { name: 'Right side vertical' })).toHaveCount(0)
  await expect(page.getByRole('radio', { name: 'Top right badge' })).toHaveCount(0)
  await expect(page.getByRole('radio', { name: 'Top right corner' })).toBeVisible()
  await expect(page.getByRole('radio', { name: 'Top left corner' })).toBeVisible()

  const preview = page.getByRole('img', { name: 'QR Preview' })
  await page.getByRole('textbox', { name: 'Signature text' }).fill('Ernesto Creates')
  await page.getByRole('textbox', { name: 'Handle or subtitle' }).fill('Test')
  await page.getByRole('textbox', { name: 'CTA text' }).fill('')

  const parse = async () => {
    const source = (await preview.getAttribute('src'))!
    const decoded = decodeURIComponent(source.split(',')[1] ?? '')
    const zone = (name: string) => decoded.match(new RegExp(`${name}="([0-9,]+)"`))![1].split(',').map(Number)
    const firstText = decoded.match(/<text x="([0-9.]+)" y="([0-9.]+)" text-anchor="(start|end|middle)"[^>]*>/)!
    return { source, decoded, content: zone('data-qr-content-zone'), slot: zone('data-signature-slot'), textX: Number(firstText[1]), textY: Number(firstText[2]), anchor: firstText[3] }
  }
  const proofs = []
  for (const [label, value, anchor] of [
    ['Top right corner', 'top-right-corner', 'end'],
    ['Top left corner', 'top-left-corner', 'start'],
  ] as const) {
    await page.getByRole('radio', { name: label }).click()
    await expect.poll(async () => decodeURIComponent((await preview.getAttribute('src'))!.split(',')[1] ?? '')).toContain(`data-signature-position="${value}"`)
    const parsed = await parse()
    const rightEdge = parsed.content[0] + parsed.content[2]
    expect(parsed.decoded).not.toContain('SCAN TO CONNECT')
    expect(parsed.anchor).toBe(anchor)
    if (value === 'top-right-corner') expect(parsed.textX).toBe(rightEdge)
    if (value === 'top-left-corner') expect(parsed.textX).toBe(parsed.content[0])
    expect(parsed.content[1] - (parsed.slot[1] + parsed.slot[3])).toBeLessThanOrEqual(12)
    proofs.push({ label, value, source: parsed.source, anchor: parsed.anchor, content: parsed.content, slot: parsed.slot, textX: parsed.textX, textY: parsed.textY, ctaRendered: parsed.decoded.includes('SCAN TO CONNECT') })
    await preview.screenshot({ path: path.join(b33EvidenceDir, `${value}.png`) })
  }
  await page.setViewportSize({ width: 620, height: 340 })
  await page.setContent(`<main style="margin:0;padding:16px;background:#020617;color:white;font:700 14px system-ui;display:grid;grid-template-columns:repeat(2,1fr);gap:16px">${proofs.map((proof) => `<figure style="margin:0"><figcaption>${proof.label}</figcaption><img width="240" height="240" src="${proof.source}"></figure>`).join('')}</main>`)
  await page.locator('main').screenshot({ path: path.join(b33EvidenceDir, 'top-corners-empty-cta-contact-sheet.png') })
  const jsonProofs = proofs.map((proof) => ({ label: proof.label, value: proof.value, anchor: proof.anchor, content: proof.content, slot: proof.slot, textX: proof.textX, textY: proof.textY, ctaRendered: proof.ctaRendered }))
  await fs.writeFile(path.join(b33EvidenceDir, 'top-corners-empty-cta.json'), JSON.stringify({ removedOptions: ['Right side vertical', 'Top right badge'], addedOptions: ['Top right corner', 'Top left corner'], proofs: jsonProofs }, null, 2))
  expect(errors).toEqual([])
})

test('B29 Creator Signature preview and authorized SVG export share exact text-only shelf geometry', async ({ page }) => {
  const state = projectState({ coreEvidence: true })
  state.templateArtLevel = 'template-art'
  state.templateArt = { templateId: 'creator-signature', outputIntent: 'square-card', fields: { signatureText: 'Shelf Signature', handleText: '@shelf-proof', ctaText: 'Scan the work', signaturePosition: 'bottom-right-outside' } }
  await seed(page, state)
  await page.goto('/?workflow=internal')
  await page.getByRole('button', { name: /^SVG/ }).click()
  const preview = page.getByRole('img', { name: 'QR Preview' })
  const positions = ['bottom-right-outside', 'bottom-left-outside', 'below-centered', 'top-right-corner', 'top-left-corner'] as const
  const normalize = (svg: string) => svg.replace(/(<svg[^>]*?)width="[0-9]+" height="[0-9]+"/, '$1width="SIZE" height="SIZE"').replace(/href="[^"]+"/, 'href="CORE_QR"')
  const zone = (svg: string, name: string) => svg.match(new RegExp(`${name}="([0-9,]+)"`))![1].split(',').map(Number)
  const parityByPosition: Record<string, unknown> = {}
  for (const position of positions) {
    const option = page.locator(`[data-signature-position="${position}"]`)
    await option.click()
    await expect(option).toHaveAttribute('aria-checked', 'true')
    await expect.poll(async () => decodeURIComponent((await preview.getAttribute('src'))!.split(',')[1] ?? '')).toContain(`data-signature-position="${position}"`)
    const previewSvg = decodeURIComponent(((await preview.getAttribute('src'))!).split(',')[1] ?? '')
    const [download] = await Promise.all([page.waitForEvent('download'), page.getByRole('button', { name: 'Export SVG' }).click()])
    const exportPath = path.join(b29EvidenceDir, `${position}-${download.suggestedFilename()}`)
    await download.saveAs(exportPath)
    const exportSvg = await fs.readFile(exportPath, 'utf8')
    expect(normalize(exportSvg)).toBe(normalize(previewSvg))
    const previewGeometry = { active: zone(previewSvg, 'data-qr-active-zone'), card: zone(previewSvg, 'data-qr-card-zone'), slot: zone(previewSvg, 'data-signature-slot') }
    const exportGeometry = { active: zone(exportSvg, 'data-qr-active-zone'), card: zone(exportSvg, 'data-qr-card-zone'), slot: zone(exportSvg, 'data-signature-slot') }
    expect(exportGeometry).toEqual(previewGeometry)
    parityByPosition[position] = { normalizedStructuralParity: true, previewGeometry, exportGeometry, previewSha256: createHash('sha256').update(previewSvg).digest('hex'), exportSha256: createHash('sha256').update(exportSvg).digest('hex'), exportArtifactPath: exportPath }
  }
  const coreCalls = await page.evaluate(() => (window as typeof window & { __QR_CORE_EXPORT_CALLS__: unknown[] }).__QR_CORE_EXPORT_CALLS__)
  expect(coreCalls).toHaveLength(positions.length)
  await fs.writeFile(path.join(b29EvidenceDir, 'creator-signature-b29-export-parity.json'), JSON.stringify({ allPositionsParity: true, textOnlyReservedShelf: true, positions: parityByPosition, coreExportAuthorityCalls: coreCalls.length }, null, 2))
})

test('B28 Creator Signature keeps five labels corner-adjacent, outside active QR, and preserves Basic/public gates', async ({ page }) => {
  const errors = await assertNoConsoleErrors(page)
  await page.setViewportSize({ width: 390, height: 844 })
  await page.goto('/')
  const preview = page.getByRole('img', { name: 'QR Preview' })
  const basicBefore = await preview.getAttribute('src')
  await expect(preview).toHaveAttribute('data-art-level', 'basic')
  expect(decodeURIComponent(basicBefore!.split(',')[1] ?? '')).not.toContain('data-template-layer="creator-signature"')

  await page.getByRole('button', { name: 'Template Art' }).click()
  const positions = ['bottom-right-outside', 'bottom-left-outside', 'below-centered', 'top-right-corner', 'top-left-corner'] as const
  const panels: Array<{ label: string; source: string; bytes: Buffer; geometry: Record<string, number[]> }> = []
  for (const value of positions) {
    const option = page.locator(`[data-signature-position="${value}"]`)
    await option.click()
    await expect(option).toHaveAttribute('aria-checked', 'true')
    await expect.poll(async () => decodeURIComponent((await preview.getAttribute('src'))!.split(',')[1] ?? '')).toContain(`data-signature-position="${value}"`)
    const source = (await preview.getAttribute('src'))!
    const decoded = decodeURIComponent(source.split(',')[1] ?? '')
    const readZone = (name: string) => decoded.match(new RegExp(`${name}="([0-9,]+)"`))![1].split(',').map(Number)
    const declared = { active: readZone('data-qr-active-zone'), content: readZone('data-qr-content-zone'), card: readZone('data-qr-card-zone'), slot: readZone('data-signature-slot') }
    const rendered = await page.evaluate((svg) => {
      const host = document.createElement('div')
      host.style.cssText = 'position:absolute;left:-10000px;top:0;width:720px;height:720px'
      host.innerHTML = svg
      document.body.append(host)
      const box = (element: SVGGraphicsElement) => {
        const value = element.getBBox()
        return [value.x, value.y, value.width, value.height]
      }
      const result = {
        active: box(host.querySelector<SVGGraphicsElement>('[data-qr-active-zone]')!),
        card: box(host.querySelector<SVGGraphicsElement>('[data-qr-card-zone]')!),
        slot: box(host.querySelector<SVGGraphicsElement>('[data-signature-reserved-shelf="true"]')!),
      }
      host.remove()
      return result
    }, decoded)
    expect(rendered.active).toEqual(declared.active)
    expect(rendered.card).toEqual(declared.card)
    rendered.slot.forEach((coordinate, index) => expect(Math.abs(coordinate - declared.slot[index])).toBeLessThanOrEqual(1))
    const { active, card, slot } = rendered
    const { content } = declared
    const overlaps = (a: number[], b: number[]) => a[0] < b[0] + b[2] && a[0] + a[2] > b[0] && a[1] < b[1] + b[3] && a[1] + a[3] > b[1]
    const gapX = Math.max(card[0] - (slot[0] + slot[2]), slot[0] - (card[0] + card[2]), 0)
    const gapY = Math.max(card[1] - (slot[1] + slot[3]), slot[1] - (card[1] + card[3]), 0)
    expect(overlaps(slot, content)).toBe(false)
    expect(Math.hypot(gapX, gapY)).toBeLessThanOrEqual(1)
    panels.push({ label: value, source, bytes: await preview.screenshot(), geometry: { active, content, card, slot } })
  }
  expect(new Set(panels.map(({ source }) => createHash('sha256').update(source).digest('hex'))).size).toBe(5)

  await page.setViewportSize({ width: 812, height: 590 })
  await page.setContent(`<main style="margin:0;padding:16px;background:#020617;color:white;font:600 13px system-ui;display:grid;grid-template-columns:repeat(3,250px);gap:16px">${panels.map(({ label, bytes }) => `<figure style="margin:0"><figcaption style="height:28px">${label}</figcaption><img width="232" height="232" src="data:image/png;base64,${bytes.toString('base64')}"></figure>`).join('')}</main>`)
  const contactSheetPath = path.join(b28EvidenceDir, 'creator-signature-corner-adjacent-contact-sheet.png')
  await page.locator('main').screenshot({ path: contactSheetPath })

  const overlayPanels = panels.map(({ label, source, geometry }) => {
    const decoded = decodeURIComponent(source.split(',')[1] ?? '')
    const [ax, ay, aw, ah] = geometry.active
    const [sx, sy, sw, sh] = geometry.slot
    const overlay = `<rect x="${ax}" y="${ay}" width="${aw}" height="${ah}" fill="none" stroke="#22c55e" stroke-width="8"/><rect x="${sx}" y="${sy}" width="${sw}" height="${sh}" fill="none" stroke="#f59e0b" stroke-width="8"/><text x="42" y="704" fill="#22c55e" font-size="18" font-family="system-ui">GREEN = ACTIVE QR SAFE</text><text x="410" y="704" fill="#f59e0b" font-size="18" font-family="system-ui">AMBER = LABEL SLOT</text>`
    return { label, source: `data:image/svg+xml;charset=utf-8,${encodeURIComponent(decoded.replace('</svg>', `${overlay}</svg>`))}` }
  })
  await page.setContent(`<main style="margin:0;padding:16px;background:#020617;color:white;font:600 13px system-ui;display:grid;grid-template-columns:repeat(3,250px);gap:16px">${overlayPanels.map(({ label, source }) => `<figure style="margin:0"><figcaption style="height:28px">${label}</figcaption><img width="232" height="232" src="${source}"></figure>`).join('')}</main>`)
  await page.locator('main').screenshot({ path: path.join(b28EvidenceDir, 'creator-signature-safe-zone-overlay.png') })

  const legacyLines = (anchor: string, x: number, y: number, sizes = [30, 15, 13], gap = 28) => `<text x="${x}" y="${y}" text-anchor="${anchor}" fill="#f8fafc" font-family="Inter,system-ui,sans-serif" font-size="${sizes[0]}" font-weight="750">Ernesto Creates</text><text x="${x}" y="${y + gap}" text-anchor="${anchor}" fill="#94a3b8" font-family="Inter,system-ui,sans-serif" font-size="${sizes[1]}">@ernesto</text><text x="${x}" y="${y + gap * 2}" text-anchor="${anchor}" fill="#38bdf8" font-family="Inter,system-ui,sans-serif" font-size="${sizes[2]}" font-weight="700">SCAN TO CONNECT</text>`
  const legacyPanels = panels.map(({ label, source }) => {
    const decoded = decodeURIComponent(source.split(',')[1] ?? '')
    const prefix = decoded.slice(0, decoded.indexOf('<g data-template-layer="creator-signature"'))
    const layer = label === 'bottom-left-outside' ? legacyLines('start', 70, 606)
      : label === 'below-centered' ? legacyLines('middle', 360, 606)
        : label === 'top-left-corner' ? legacyLines('start', 70, 92, [18, 10, 8], 22)
          : label === 'top-right-corner' ? legacyLines('end', 650, 92, [18, 10, 8], 22)
            : legacyLines('end', 650, 606)
    return { label, source: `data:image/svg+xml;charset=utf-8,${encodeURIComponent(`${prefix}<g data-template-layer="creator-signature" data-signature-position="${label}">${layer}</g></svg>`)}` }
  })
  await page.setViewportSize({ width: 812, height: 590 })
  await page.setContent(`<main style="margin:0;padding:16px;background:#020617;color:white;font:600 13px system-ui;display:grid;grid-template-columns:repeat(3,250px);gap:16px">${legacyPanels.map(({ label, source }) => `<figure style="margin:0"><figcaption style="height:28px">${label}</figcaption><img width="232" height="232" src="${source}"></figure>`).join('')}</main>`)
  const before = await page.locator('main').screenshot()
  const after = await fs.readFile(contactSheetPath)
  await page.setViewportSize({ width: 1660, height: 660 })
  await page.setContent(`<main style="margin:0;padding:24px;background:#020617;color:white;font:700 18px system-ui;display:grid;grid-template-columns:1fr 1fr;gap:24px"><figure style="margin:0"><figcaption style="height:34px">BEFORE · B27 detached captions</figcaption><img style="max-width:100%" src="data:image/png;base64,${before.toString('base64')}"></figure><figure style="margin:0"><figcaption style="height:34px">AFTER · B28 corner-adjacent labels</figcaption><img style="max-width:100%" src="data:image/png;base64,${after.toString('base64')}"></figure></main>`)
  await page.locator('main').screenshot({ path: path.join(b28EvidenceDir, 'creator-signature-before-after-b27-b28.png') })

  await page.setViewportSize({ width: 390, height: 844 })
  await page.goto('/')
  await page.getByRole('button', { name: 'Basic QR' }).click()
  expect(await preview.getAttribute('src')).toBe(basicBefore)
  await page.getByRole('button', { name: 'Template Art' }).click()
  const beforeDraft = await preview.getAttribute('src')
  await page.getByRole('textbox', { name: 'Final destination URL' }).fill('https://example.com/b28-public-draft')
  await page.getByRole('button', { name: 'Continue with this QR' }).click()
  await expect(page.getByRole('status')).toContainText('QR activates after payment')
  expect(await preview.getAttribute('src')).toBe(beforeDraft)
  const headings = await page.locator('h1,h2,h3').allTextContents()
  const hiddenPaidPanels = Object.fromEntries(['Candidates', 'Checkout', 'Export'].map((name) => [name, headings.filter((heading) => heading.trim() === name).length]))
  expect(hiddenPaidPanels).toEqual({ Candidates: 0, Checkout: 0, Export: 0 })
  await fs.writeFile(path.join(b28EvidenceDir, 'public-gate-proof.json'), JSON.stringify({ basicQrPathUnchanged: true, unpaidPublicPath: 'draft-only', previewUnchangedAfterTypingAndContinue: true, hiddenPaidPanels, status: await page.getByRole('status').textContent() }, null, 2))
  await fs.writeFile(path.join(b28EvidenceDir, 'creator-signature-safe-zone-proof.json'), JSON.stringify({ rule: 'label slots must not overlap the active QR image and must touch the card edge', positions: Object.fromEntries(panels.map(({ label, geometry }) => [label, { ...geometry, overlapsActiveQr: false, cardGapPx: 0 }])) }, null, 2))
  expect(errors).toEqual([])
})

test('B28 Creator Signature preview and authorized SVG export share exact corner-adjacent geometry', async ({ page }) => {
  const state = projectState({ coreEvidence: true })
  state.templateArtLevel = 'template-art'
  state.templateArt = { templateId: 'creator-signature', outputIntent: 'square-card', fields: { signatureText: 'Corner Signature', handleText: '@corner-proof', ctaText: 'Scan the work', signaturePosition: 'bottom-right-outside' } }
  await seed(page, state)
  await page.goto('/?workflow=internal')
  await page.getByRole('button', { name: /^SVG/ }).click()
  const preview = page.getByRole('img', { name: 'QR Preview' })
  const positions = ['bottom-right-outside', 'bottom-left-outside', 'below-centered', 'top-right-corner', 'top-left-corner'] as const
  const normalize = (svg: string) => svg
    .replace(/(<svg[^>]*?)width="[0-9]+" height="[0-9]+"/, '$1width="SIZE" height="SIZE"')
    .replace(/href="[^"]+"/, 'href="CORE_QR"')
  const zone = (svg: string, name: string) => svg.match(new RegExp(`${name}="([0-9,]+)"`))![1].split(',').map(Number)
  const parityByPosition: Record<string, unknown> = {}

  for (const position of positions) {
    const option = page.locator(`[data-signature-position="${position}"]`)
    await option.click()
    await expect(option).toHaveAttribute('aria-checked', 'true')
    await expect.poll(async () => decodeURIComponent((await preview.getAttribute('src'))!.split(',')[1] ?? '')).toContain(`data-signature-position="${position}"`)
    const previewSource = (await preview.getAttribute('src'))!
    const previewSvg = decodeURIComponent(previewSource.split(',')[1] ?? '')
    const [download] = await Promise.all([page.waitForEvent('download'), page.getByRole('button', { name: 'Export SVG' }).click()])
    const exportPath = path.join(b28EvidenceDir, `${position}-${download.suggestedFilename()}`)
    await download.saveAs(exportPath)
    const exportSvg = await fs.readFile(exportPath, 'utf8')
    const normalizedPreview = normalize(previewSvg)
    const normalizedExport = normalize(exportSvg)
    expect(normalizedExport).toBe(normalizedPreview)
    const previewGeometry = { active: zone(previewSvg, 'data-qr-active-zone'), card: zone(previewSvg, 'data-qr-card-zone'), slot: zone(previewSvg, 'data-signature-slot') }
    const exportGeometry = { active: zone(exportSvg, 'data-qr-active-zone'), card: zone(exportSvg, 'data-qr-card-zone'), slot: zone(exportSvg, 'data-signature-slot') }
    expect(exportGeometry).toEqual(previewGeometry)
    parityByPosition[position] = { normalizedStructuralParity: true, previewGeometry, exportGeometry, previewSha256: createHash('sha256').update(previewSvg).digest('hex'), exportSha256: createHash('sha256').update(exportSvg).digest('hex'), normalizedSha256: createHash('sha256').update(normalizedPreview).digest('hex'), exportArtifactPath: exportPath }
  }
  const coreCalls = await page.evaluate(() => (window as typeof window & { __QR_CORE_EXPORT_CALLS__: unknown[] }).__QR_CORE_EXPORT_CALLS__)
  expect(coreCalls).toHaveLength(positions.length)
  await fs.writeFile(path.join(b28EvidenceDir, 'creator-signature-export-parity.json'), JSON.stringify({ allPositionsParity: true, positions: parityByPosition, coreExportAuthorityCalls: coreCalls.length }, null, 2))
})

test('B27 Creator Signature composes five fixed positions, reuses Level 1 controls, and preserves the public gate', async ({ page }) => {
  const errors = await assertNoConsoleErrors(page)
  await page.setViewportSize({ width: 390, height: 844 })
  await page.goto('/')
  await page.getByRole('button', { name: 'Template Art' }).click()
  await expect(page.getByTestId('studio-app')).toHaveAttribute('data-ux-variant', 'default')
  await expect(page.locator('[data-template-id="creator-signature"]')).toHaveCount(2)
  await expect(page.getByText('Creator Signature', { exact: true })).toBeVisible()
  await expect(page.getByText('ONLY TEMPLATE')).toBeVisible()
  await page.screenshot({ path: path.join(b27EvidenceDir, 'creator-signature-default-mobile.png'), fullPage: true })

  const preview = page.getByRole('img', { name: 'QR Preview' })
  await expect(preview).toHaveAttribute('data-art-level', 'template-art')
  const positions = ['bottom-right-outside', 'bottom-left-outside', 'below-centered', 'top-right-corner', 'top-left-corner'] as const
  const positionPanels: Array<{ label: string; bytes: Buffer; hash: string }> = []
  for (const value of positions) {
    const option = page.locator(`[data-signature-position="${value}"]`)
    const before = await preview.getAttribute('src')
    await option.click()
    await expect(option).toHaveAttribute('aria-checked', 'true')
    if (value !== 'bottom-right-outside') await expect.poll(() => preview.getAttribute('src')).not.toBe(before)
    const source = (await preview.getAttribute('src'))!
    const decoded = decodeURIComponent(source.split(',')[1] ?? '')
    expect(decoded).toContain(`data-signature-position="${value}"`)
    positionPanels.push({ label: value, bytes: await preview.screenshot(), hash: createHash('sha256').update(source).digest('hex') })
  }
  expect(new Set(positionPanels.map(({ hash }) => hash)).size).toBe(5)

  const controls: Array<[string, () => Promise<void>]> = [
    ['Body Color · Electric Purple', async () => { await page.getByRole('option', { name: 'Electric Purple', exact: true }).click() }],
    ['Corner Color · Crimson Red', async () => { await page.getByRole('option', { name: /^Crimson Red corner color/ }).click() }],
    ['Style · Notched', async () => { await page.getByRole('option', { name: /^Notched QR style/ }).click() }],
    ['Corners · Diamond', async () => { await page.getByRole('option', { name: /^Diamond corner style/ }).click() }],
    ['Eyes · Star', async () => { await page.getByRole('option', { name: /^Star eye style/ }).click() }],
    ['Intensity · Punchy', async () => { await page.getByRole('button', { name: 'Punchy color intensity' }).click() }],
    ['QR size · Larger', async () => { await page.getByRole('button', { name: 'Larger QR size' }).click() }],
  ]
  const controlPanels: Array<{ label: string; bytes: Buffer; hash: string }> = []
  for (const [label, act] of controls) {
    const before = await preview.getAttribute('src')
    await act()
    await expect.poll(() => preview.getAttribute('src')).not.toBe(before)
    const source = (await preview.getAttribute('src'))!
    controlPanels.push({ label, bytes: await preview.screenshot(), hash: createHash('sha256').update(source).digest('hex') })
  }
  expect(new Set(controlPanels.map(({ hash }) => hash)).size).toBe(7)

  const makeContactSheet = async (items: Array<{ label: string; bytes: Buffer }>, columns: number, target: string) => {
    await page.setViewportSize({ width: columns * 270 + 32, height: Math.ceil(items.length / columns) * 300 + 32 })
    await page.setContent(`<main style="margin:0;padding:16px;background:#020617;color:white;font:600 13px system-ui;display:grid;grid-template-columns:repeat(${columns},250px);gap:16px">${items.map(({ label, bytes }) => `<figure style="margin:0"><figcaption style="height:28px">${label}</figcaption><img width="232" height="232" src="data:image/png;base64,${bytes.toString('base64')}"></figure>`).join('')}</main>`)
    await page.locator('main').screenshot({ path: target })
  }
  await makeContactSheet(positionPanels, 3, path.join(b27EvidenceDir, 'creator-signature-positions-contact-sheet.png'))
  await makeContactSheet(controlPanels, 4, path.join(b27EvidenceDir, 'creator-signature-level1-controls-contact-sheet.png'))

  await page.setViewportSize({ width: 390, height: 844 })
  await page.goto('/')
  await page.getByRole('button', { name: 'Template Art' }).click()
  const layout = await page.evaluate(() => {
    const previewBox = document.querySelector<HTMLElement>('img[alt="QR Preview"]')!.getBoundingClientRect()
    const template = document.querySelector<HTMLElement>('[data-template-id="creator-signature"]')!.getBoundingClientRect()
    const headings = Array.from(document.querySelectorAll('h1,h2,h3'), (heading) => heading.textContent?.trim())
    return { viewport: { width: innerWidth, height: innerHeight }, document: { scrollHeight: document.scrollingElement!.scrollHeight, clientHeight: document.scrollingElement!.clientHeight }, preview: { width: previewBox.width, height: previewBox.height }, template: { left: template.left, right: template.right, width: template.width }, hiddenPaidPanels: Object.fromEntries(['Candidates', 'Checkout', 'Export'].map((name) => [name, headings.filter((heading) => heading === name).length])) }
  })
  expect(layout.template.left).toBeGreaterThanOrEqual(0)
  expect(layout.template.right).toBeLessThanOrEqual(390)
  expect(layout.hiddenPaidPanels).toEqual({ Candidates: 0, Checkout: 0, Export: 0 })
  const beforeDraft = await preview.getAttribute('src')
  await page.getByRole('textbox', { name: 'Final destination URL' }).fill('https://example.com/b27-public-draft')
  await page.getByRole('button', { name: 'Continue with this QR' }).click()
  await expect(page.getByRole('status')).toContainText('QR activates after payment')
  expect(await preview.getAttribute('src')).toBe(beforeDraft)

  await fs.writeFile(path.join(b27EvidenceDir, 'creator-signature-template-contract.json'), JSON.stringify({ level: ['basic', 'template-art'], enabledTemplates: ['creator-signature'], fields: ['signatureText', 'handleText', 'ctaText', 'signaturePosition'], positions, outputIntent: 'square-card', forbidden: { dragDrop: false, insideQrText: false, logoUpload: false, customArtPrompt: false } }, null, 2))
  await fs.writeFile(path.join(b27EvidenceDir, 'layout-metrics.json'), JSON.stringify(layout, null, 2))
  await fs.writeFile(path.join(b27EvidenceDir, 'public-gate-proof.json'), JSON.stringify({ unpaidPublicPath: 'draft-only', previewUnchangedAfterTypingAndContinue: beforeDraft === await preview.getAttribute('src'), hiddenPaidPanels: layout.hiddenPaidPanels, status: await page.getByRole('status').textContent() }, null, 2))
  expect(errors).toEqual([])
})

test('B27 paid export downloads composed Creator Signature SVG after Core export authority', async ({ page }) => {
  const state = projectState({ coreEvidence: true })
  state.templateArtLevel = 'template-art'
  state.templateArt = { templateId: 'creator-signature', outputIntent: 'square-card', fields: { signatureText: 'Exported Signature', handleText: '@export-proof', ctaText: 'Scan the work', signaturePosition: 'top-right-corner' } }
  await seed(page, state)
  await page.goto('/?workflow=internal')
  await page.getByRole('button', { name: 'Preview at size' }).click()
  const printPreview = page.getByRole('img', { name: 'Print preview' })
  await expect(printPreview).toHaveAttribute('src', /data:image\/svg\+xml/)
  expect(decodeURIComponent((await printPreview.getAttribute('src'))!.split(',')[1] ?? '')).toContain('data-template-layer="creator-signature"')
  await page.getByRole('button', { name: 'Close' }).click()
  const artifacts: Record<string, unknown> = {}
  for (const format of ['PNG', 'SVG'] as const) {
    await page.getByRole('button', { name: new RegExp(`^${format}`) }).click()
    const [download] = await Promise.all([page.waitForEvent('download'), page.getByRole('button', { name: `Export ${format}` }).click()])
    const target = path.join(b27EvidenceDir, download.suggestedFilename())
    await download.saveAs(target)
    const bytes = await fs.readFile(target)
    if (format === 'SVG') {
      const exported = bytes.toString('utf8')
      expect(exported).toContain('data-template-layer="creator-signature"')
      expect(exported).toContain('data-signature-position="top-right-corner"')
      expect(exported).toContain('Exported Signature')
      expect(exported).toContain('<image')
      expect(exported).toContain('data-qr-fixture%3D%22module-matrix%22')
    } else {
      expect(bytes.subarray(1, 4).toString()).toBe('PNG')
      expect(bytes.readUInt32BE(16)).toBe(512)
      expect(bytes.readUInt32BE(20)).toBe(512)
      expect(await sampledColorCount(page, bytes)).toBeGreaterThan(4)
    }
    artifacts[format.toLowerCase()] = { filename: download.suggestedFilename(), artifactPath: target, width: 512, height: 512, sha256: createHash('sha256').update(bytes).digest('hex') }
  }
  const exportedSvg = await fs.readFile((artifacts.svg as { artifactPath: string }).artifactPath, 'utf8')
  const embeddedCoreQrMatrix = exportedSvg.includes('data-qr-fixture%3D%22module-matrix%22')
  const coreCalls = await page.evaluate(() => (window as typeof window & { __QR_CORE_EXPORT_CALLS__: unknown[] }).__QR_CORE_EXPORT_CALLS__)
  expect(coreCalls).toHaveLength(2)
  await fs.writeFile(path.join(b27EvidenceDir, 'creator-signature-export-proof.json'), JSON.stringify({ artifacts, composedTemplateLayer: true, embeddedCoreQr: embeddedCoreQrMatrix, embeddedCoreQrMatrix, signatureTextPresentInSvg: true, pngCompositionColorCountGreaterThanFour: true, position: 'top-right-corner', coreExportAuthorityCalls: coreCalls.length }, null, 2))
})

test('B26b exposes only accepted QR.io-inspired Core-backed Corners and Eyes shapes', async ({ page }) => {
  const errors = await assertNoConsoleErrors(page)
  await page.setViewportSize({ width: 390, height: 844 })
  await page.goto('/')
  await page.addStyleTag({ content: '*,*::before,*::after{transition:none!important;animation:none!important}' })

  const acceptedFrames = ['leaf-frame', 'opposing-leaf-frame', 'd-frame', 'inset-leaf-frame'] as const
  const acceptedBalls = ['star', 'diamond'] as const
  const forbidden = ['plus', 'cross', 'burst'] as const
  const expectedFamilies = [
    ['body-color', 'Body Color', 22], ['corner-color', 'Corner Color', 13], ['style', 'Style', 7],
    ['corners', 'Corners', 11], ['eyes', 'Eyes', 10],
  ] as const
  const familyMetrics: Record<string, unknown> = {}

  for (const [family, label, expectedCount] of expectedFamilies) {
    await page.getByRole('tab', { name: `Show ${label} controls` }).click()
    const row = page.locator(`[data-selector-scroll-row="${family}"]`)
    const metrics = await row.evaluate((element, activeFamily) => {
      const rowBox = element.getBoundingClientRect()
      const tiles = Array.from(element.querySelectorAll<HTMLElement>(`[data-selector-family="${activeFamily}"]`)).map((tile) => {
        const box = tile.getBoundingClientRect()
        const style = getComputedStyle(tile)
        return { width: box.width, height: box.height, borderWidth: style.borderWidth, borderRadius: style.borderRadius, padding: style.padding, bottom: box.bottom }
      })
      const scrollbarThickness = Math.max(element.offsetHeight - element.clientHeight, 6)
      const tileBottom = Math.max(...tiles.map((tile) => tile.bottom))
      return { optionCount: tiles.length, horizontallyScrollable: element.scrollWidth > element.clientWidth,
        tiles: tiles.map(({ bottom: _bottom, ...tile }) => tile),
        reservedBottomSpace: rowBox.bottom - tileBottom,
        tileToScrollbarClearance: rowBox.bottom - scrollbarThickness - tileBottom }
    }, family)
    expect(metrics.optionCount).toBe(expectedCount)
    expect(metrics.horizontallyScrollable).toBe(true)
    expect(metrics.tiles.every((tile) => tile.width === 56 && tile.height === 56 && tile.borderWidth === '2px' && tile.borderRadius === '12px' && tile.padding === '0px')).toBe(true)
    expect(metrics.tileToScrollbarClearance).toBeGreaterThan(0)
    familyMetrics[family] = metrics
  }

  const mapping: Array<Record<string, unknown>> = []
  const preview = page.getByRole('img', { name: 'QR Preview' })
  const previews: Array<{ label: string; src: string; hash: string }> = []
  for (const [family, values, requestField] of [
    ['Corners', acceptedFrames, 'eyeFrameShape'],
    ['Eyes', acceptedBalls, 'eyeBallShape'],
  ] as const) {
    await page.getByRole('tab', { name: `Show ${family} controls` }).click()
    for (const value of values) {
      const option = page.locator(`[data-selector-family="${family.toLowerCase()}"][data-setting="${value}"]`)
      await expect(option).toHaveCount(1)
      const before = await preview.getAttribute('src')
      await option.click()
      await expect.poll(() => preview.getAttribute('src')).not.toBe(before)
      const src = (await preview.getAttribute('src'))!
      const decoded = decodeURIComponent(src.split(',')[1] ?? '')
      expect(decoded).toContain(`${requestField === 'eyeFrameShape' ? 'data-eye-frame-shape' : 'data-eye-ball-shape'}="${value}"`)
      const hash = createHash('sha256').update(src).digest('hex')
      previews.push({ label: `${family} · ${value}`, src, hash })
      mapping.push({ family: family.toLowerCase(), studioDataSetting: value, requestField, requestValue: value, corePreviewMarkerPresent: true, previewSha256: hash })
    }
  }
  expect(new Set(previews.map(({ hash }) => hash)).size).toBe(acceptedFrames.length + acceptedBalls.length)

  const exposedSettings = await page.locator('[data-selector-family="corners"], [data-selector-family="eyes"]').evaluateAll((elements) => elements.map((element) => element.getAttribute('data-setting')))
  for (const value of forbidden) expect(exposedSettings).not.toContain(value)

  await page.setViewportSize({ width: 820, height: 844 })
  await page.getByRole('tab', { name: 'Show Corners controls' }).click()
  await page.getByRole('tabpanel', { name: 'Corners controls' }).screenshot({ path: path.join(b26bEvidenceDir, 'corners-qrio-family.png') })
  await page.getByRole('tab', { name: 'Show Eyes controls' }).click()
  await page.getByRole('tabpanel', { name: 'Eyes controls' }).screenshot({ path: path.join(b26bEvidenceDir, 'eyes-qrio-family.png') })

  await page.setViewportSize({ width: 780, height: 570 })
  await page.setContent(`<main style="margin:0;padding:16px;background:#020617;color:white;font:600 14px system-ui;display:grid;grid-template-columns:repeat(3,232px);gap:18px">${previews.map(({ label, src }) => `<figure style="margin:0"><figcaption style="height:34px">${label}</figcaption><img width="232" height="232" src="${src}"></figure>`).join('')}</main>`)
  await page.locator('main').screenshot({ path: path.join(b26bEvidenceDir, 'qrio-shape-preview-contact-sheet.png') })

  await page.setViewportSize({ width: 390, height: 844 })
  await page.goto('/')
  const layout = await page.evaluate(() => {
    const scrolling = document.scrollingElement!
    const previewBox = document.querySelector<HTMLElement>('img[alt="QR Preview"]')!.getBoundingClientRect()
    const destination = document.querySelector<HTMLElement>('#destination-content')!.getBoundingClientRect()
    const headings = Array.from(document.querySelectorAll('h1,h2,h3'), (heading) => heading.textContent?.trim())
    return { viewport: { width: innerWidth, height: innerHeight }, document: { scrollHeight: scrolling.scrollHeight, clientHeight: scrolling.clientHeight, verticalScrollRequired: scrolling.scrollHeight > scrolling.clientHeight },
      preview: { width: previewBox.width, height: previewBox.height }, destination: { bottom: destination.bottom, breathingRoom: innerHeight - destination.bottom },
      familyLabels: Array.from(document.querySelectorAll('[role="tab"]'), (tab) => tab.getAttribute('title')),
      hiddenPaidPanels: Object.fromEntries(['Candidates', 'Checkout', 'Export'].map((name) => [name, headings.filter((heading) => heading === name).length])) }
  })
  expect(layout.document.verticalScrollRequired).toBe(false)
  expect(layout.preview).toEqual({ width: 232, height: 232 })
  expect(layout.destination.breathingRoom).toBeGreaterThan(0)
  expect(layout.familyLabels).toEqual(['Body Color', 'Corner Color', 'Style', 'Corners', 'Eyes'])
  expect(layout.hiddenPaidPanels).toEqual({ Candidates: 0, Checkout: 0, Export: 0 })
  const beforeDraft = await preview.getAttribute('src')
  await page.getByRole('textbox', { name: 'Final destination URL' }).fill('https://example.com/b26b-public-draft')
  await page.getByRole('button', { name: 'Continue with this QR' }).click()
  await expect(page.getByRole('status')).toContainText('QR activates after payment')
  const afterDraft = await preview.getAttribute('src')
  expect(afterDraft).toBe(beforeDraft)

  await fs.writeFile(path.join(b26bEvidenceDir, 'qrio-shape-request-mapping.json'), JSON.stringify({ accepted: mapping, forbidden: Object.fromEntries(forbidden.map((value) => [value, { exposed: exposedSettings.includes(value), accepted: false }])) }, null, 2))
  await fs.writeFile(path.join(b26bEvidenceDir, 'layout-and-scrollbar-metrics.json'), JSON.stringify({ layout, families: familyMetrics }, null, 2))
  await fs.writeFile(path.join(b26bEvidenceDir, 'public-gate-proof.json'), JSON.stringify({ typingAndContinueDraftOnly: beforeDraft === afterDraft, status: await page.getByRole('status').textContent(), hiddenPaidPanels: layout.hiddenPaidPanels }, null, 2))
  expect(errors).toEqual([])
})

test('B25b consolidates Body Color and independently controls Corner Color with preserved public gates', async ({ page }) => {
  const errors = await assertNoConsoleErrors(page)
  await page.setViewportSize({ width: 390, height: 844 })
  await page.goto('/')
  await page.addStyleTag({ content: '*,*::before,*::after{transition:none!important;animation:none!important}' })

  const families = [
    ['body-color', 'Body Color', 22],
    ['corner-color', 'Corner Color', 13],
    ['style', 'Style', 7],
    ['corners', 'Corners', 11],
    ['eyes', 'Eyes', 10],
  ] as const
  const familyMetrics: Record<string, unknown> = {}
  for (const [family, label, expectedCount] of families) {
    await page.getByRole('tab', { name: `Show ${label} controls` }).click()
    const panel = page.getByRole('tabpanel', { name: `${label} controls` })
    const row = panel.locator(`[data-selector-scroll-row="${family}"]`)
    await expect(row).toBeVisible()
    const metrics = await row.evaluate((element, activeFamily) => {
      const rowBox = element.getBoundingClientRect()
      const tiles = Array.from(element.querySelectorAll<HTMLElement>(`[data-selector-family="${activeFamily}"]`)).map((tile) => {
        const box = tile.getBoundingClientRect()
        const style = getComputedStyle(tile)
        return { width: box.width, height: box.height, borderWidth: style.borderWidth, borderRadius: style.borderRadius, padding: style.padding, bottom: box.bottom }
      })
      const scrollbarThickness = Math.max(element.offsetHeight - element.clientHeight, 6)
      const tileBottom = Math.max(...tiles.map((tile) => tile.bottom))
      return {
        optionCount: tiles.length,
        horizontallyScrollable: element.scrollWidth > element.clientWidth,
        tiles: tiles.map(({ bottom: _bottom, ...tile }) => tile),
        reservedBottomSpace: rowBox.bottom - tileBottom,
        tileToScrollbarClearance: rowBox.bottom - scrollbarThickness - tileBottom,
      }
    }, family)
    expect(metrics.optionCount).toBe(expectedCount)
    expect(metrics.horizontallyScrollable).toBe(true)
    expect(metrics.tiles.every((tile) => tile.width === 56 && tile.height === 56 && tile.borderWidth === '2px' && tile.borderRadius === '12px' && tile.padding === '0px')).toBe(true)
    expect(metrics.tileToScrollbarClearance).toBeGreaterThan(0)
    familyMetrics[family] = metrics
  }

  await page.getByRole('tab', { name: 'Show Body Color controls' }).click()
  await expect(page.getByRole('option', { name: 'Studio Blue selected' })).toBeVisible()
  const bodyPanel = page.getByRole('tabpanel', { name: 'Body Color controls' })
  await bodyPanel.screenshot({ path: path.join(b25bEvidenceDir, 'body-color-solids.png') })
  await bodyPanel.locator('[data-selector-scroll-row="body-color"]').evaluate((element) => { element.scrollLeft = element.scrollWidth })
  await bodyPanel.screenshot({ path: path.join(b25bEvidenceDir, 'body-color-patterns.png') })
  const preview = page.getByRole('img', { name: 'QR Preview' })
  const initialPreview = await preview.getAttribute('src')
  await page.getByRole('option', { name: 'Electric Purple' }).click()
  await expect.poll(() => preview.getAttribute('src')).not.toBe(initialPreview)
  const bodyPreview = await preview.getAttribute('src')
  await page.screenshot({ path: path.join(b25bEvidenceDir, 'body-color-preview.png') })

  await page.getByRole('tab', { name: 'Show Corner Color controls' }).click()
  await expect(page.getByRole('option', { name: 'Match body selected' })).toBeVisible()
  await page.getByRole('tabpanel', { name: 'Corner Color controls' }).screenshot({ path: path.join(b25bEvidenceDir, 'corner-color-family.png') })
  await page.getByRole('option', { name: 'Crimson Red corner color' }).click()
  await expect.poll(() => preview.getAttribute('src')).not.toBe(bodyPreview)
  const cornerPreview = await preview.getAttribute('src')
  await page.screenshot({ path: path.join(b25bEvidenceDir, 'corner-color-preview.png') })

  const layout = await page.evaluate(() => {
    const scrolling = document.scrollingElement!
    const previewBox = document.querySelector<HTMLElement>('img[alt="QR Preview"]')!.getBoundingClientRect()
    const destination = document.querySelector<HTMLElement>('#destination-content')!.getBoundingClientRect()
    const headings = Array.from(document.querySelectorAll('h1,h2,h3'), (heading) => heading.textContent?.trim())
    return {
      viewport: { width: innerWidth, height: innerHeight },
      document: { scrollHeight: scrolling.scrollHeight, clientHeight: scrolling.clientHeight, verticalScrollRequired: scrolling.scrollHeight > scrolling.clientHeight },
      preview: { width: previewBox.width, height: previewBox.height },
      destination: { bottom: destination.bottom, breathingRoom: innerHeight - destination.bottom },
      familyLabels: Array.from(document.querySelectorAll('[role="tab"]'), (tab) => tab.getAttribute('title')),
      publicTextDestinationCount: document.querySelectorAll('[aria-label="Text"]').length,
      hiddenPaidPanels: Object.fromEntries(['Candidates', 'Checkout', 'Export'].map((name) => [name, headings.filter((heading) => heading === name).length])),
    }
  })
  expect(layout.document.verticalScrollRequired).toBe(false)
  expect(layout.preview).toEqual({ width: 232, height: 232 })
  expect(layout.destination.breathingRoom).toBeGreaterThan(0)
  expect(layout.familyLabels).toEqual(['Body Color', 'Corner Color', 'Style', 'Corners', 'Eyes'])
  expect(layout.publicTextDestinationCount).toBe(0)
  expect(layout.hiddenPaidPanels).toEqual({ Candidates: 0, Checkout: 0, Export: 0 })

  const beforeDraft = await preview.getAttribute('src')
  await page.getByRole('textbox', { name: 'Final destination URL' }).fill('https://example.com/b25b-public-draft')
  await page.getByRole('button', { name: 'Continue with this QR' }).click()
  await expect(page.getByRole('status')).toContainText('QR activates after payment')
  const afterDraft = await preview.getAttribute('src')
  expect(afterDraft).toBe(beforeDraft)

  await fs.writeFile(path.join(b25bEvidenceDir, 'layout-and-scrollbar-metrics.json'), JSON.stringify({ layout, families: familyMetrics }, null, 2))
  await fs.writeFile(path.join(b25bEvidenceDir, 'public-gate-proof.json'), JSON.stringify({
    publicTextDestinationAbsent: layout.publicTextDestinationCount === 0,
    hiddenPaidPanels: layout.hiddenPaidPanels,
    typingAndContinueDraftOnly: beforeDraft === afterDraft,
    status: await page.getByRole('status').textContent(),
  }, null, 2))

  const [bodyScreenshot, cornerScreenshot] = await Promise.all([
    fs.readFile(path.join(b25bEvidenceDir, 'body-color-preview.png')),
    fs.readFile(path.join(b25bEvidenceDir, 'corner-color-preview.png')),
  ])
  await page.setViewportSize({ width: 820, height: 900 })
  await page.setContent(`<main style="margin:0;padding:12px;background:#020617;color:white;font:600 16px system-ui;display:flex;gap:12px"><figure style="margin:0"><figcaption style="margin-bottom:8px">Body · Electric Purple / corners match</figcaption><img width="390" height="844" src="data:image/png;base64,${bodyScreenshot.toString('base64')}"></figure><figure style="margin:0"><figcaption style="margin-bottom:8px">Same body · Crimson Red corners</figcaption><img width="390" height="844" src="data:image/png;base64,${cornerScreenshot.toString('base64')}"></figure></main>`)
  await page.locator('main').screenshot({ path: path.join(b25bEvidenceDir, 'body-vs-corner-preview-contact-sheet.png') })

  const [solidBodyOptions, patternedBodyOptions] = await Promise.all([
    fs.readFile(path.join(b25bEvidenceDir, 'body-color-solids.png')),
    fs.readFile(path.join(b25bEvidenceDir, 'body-color-patterns.png')),
  ])
  await page.setViewportSize({ width: 414, height: 210 })
  await page.setContent(`<main style="margin:0;padding:12px;background:#020617;color:white;font:600 14px system-ui"><div style="margin-bottom:6px">Body Color · 12 solids + 10 patterns in one horizontal family</div><figure style="margin:0 0 10px"><figcaption style="margin-bottom:4px;color:#94a3b8">Solid options · start of rail</figcaption><img width="366" src="data:image/png;base64,${solidBodyOptions.toString('base64')}"></figure><figure style="margin:0"><figcaption style="margin-bottom:4px;color:#94a3b8">Patterned options · same rail, scrolled</figcaption><img width="366" src="data:image/png;base64,${patternedBodyOptions.toString('base64')}"></figure></main>`)
  await page.locator('main').screenshot({ path: path.join(b25bEvidenceDir, 'body-color-family.png') })

  expect(bodyPreview).not.toBe(cornerPreview)
  expect(errors).toEqual([])
})

test('B24 reserves visible scrollbar clearance for every selector family without regressing the default layout', async ({ page }) => {
  const errors = await assertNoConsoleErrors(page)
  await page.setViewportSize({ width: 390, height: 844 })
  await page.goto('/')
  await page.addStyleTag({ content: '*,*::before,*::after{transition:none!important;animation:none!important}' })

  const families = [
    ['body-color', 'Body Color'], ['corner-color', 'Corner Color'], ['style', 'Style'], ['corners', 'Corners'], ['eyes', 'Eyes'],
  ] as const
  const measurements: Record<string, unknown> = {}

  for (const [family, label] of families) {
    await page.getByRole('tab', { name: `Show ${label} controls` }).click()
    const panel = page.getByRole('tabpanel', { name: `${label} controls` })
    const row = panel.locator(`[data-selector-scroll-row="${family}"]`)
    await expect(panel).toBeVisible()
    await expect(row).toBeVisible()

    const geometry = await row.evaluate((element, activeFamily) => {
      const rowBox = element.getBoundingClientRect()
      const tiles = Array.from(element.querySelectorAll<HTMLElement>(`[data-selector-family="${activeFamily}"]`)).map((tile) => {
        const box = tile.getBoundingClientRect()
        const style = getComputedStyle(tile)
        return {
          width: box.width, height: box.height, top: box.top, bottom: box.bottom,
          borderWidth: style.borderWidth, borderRadius: style.borderRadius, padding: style.padding,
          clipped: box.top < rowBox.top || box.bottom > rowBox.bottom,
        }
      })
      const nativeScrollbarThickness = element.offsetHeight - element.clientHeight
      const styledScrollbarThickness = 6
      const effectiveScrollbarThickness = Math.max(nativeScrollbarThickness, styledScrollbarThickness)
      const tileBottom = Math.max(...tiles.map((tile) => tile.bottom))
      return {
        family: activeFamily,
        row: {
          width: rowBox.width, height: rowBox.height,
          scrollWidth: element.scrollWidth, clientWidth: element.clientWidth,
          horizontallyScrollable: element.scrollWidth > element.clientWidth,
          nativeScrollbarThickness,
          effectiveScrollbarThickness,
        },
        tileCount: tiles.length,
        tiles,
        reservedBottomSpace: rowBox.bottom - tileBottom,
        tileToScrollbarClearance: rowBox.bottom - effectiveScrollbarThickness - tileBottom,
      }
    }, family)

    const typed = geometry as {
      row: { horizontallyScrollable: boolean }
      tiles: Array<{ width: number; height: number; borderWidth: string; borderRadius: string; padding: string; clipped: boolean }>
      reservedBottomSpace: number
      tileToScrollbarClearance: number
    }
    expect(typed.row.horizontallyScrollable).toBe(true)
    expect(typed.tiles.length).toBeGreaterThan(0)
    expect(typed.tiles.every(({ width, height, borderWidth, borderRadius, padding }) => width === 56 && height === 56 && borderWidth === '2px' && borderRadius === '12px' && padding === '0px')).toBe(true)
    expect(typed.tiles.every(({ clipped }) => !clipped)).toBe(true)
    expect(typed.reservedBottomSpace).toBeGreaterThan(6)
    expect(typed.tileToScrollbarClearance).toBeGreaterThan(0)
    measurements[family] = geometry

    await panel.screenshot({ path: path.join(b24EvidenceDir, `${family}-scrollbar-clearance.png`) })
  }

  const layout = await page.evaluate(() => {
    const scrolling = document.scrollingElement!
    const preview = document.querySelector<HTMLElement>('img[alt="QR Preview"]')!.getBoundingClientRect()
    const destination = document.querySelector<HTMLElement>('#destination-content')!.getBoundingClientRect()
    const headings = Array.from(document.querySelectorAll('h1,h2,h3'), (heading) => heading.textContent?.trim())
    return {
      viewport: { width: innerWidth, height: innerHeight },
      document: { scrollHeight: scrolling.scrollHeight, clientHeight: scrolling.clientHeight },
      preview: { width: preview.width, height: preview.height },
      destination: { bottom: destination.bottom, breathingRoom: innerHeight - destination.bottom },
      hiddenPublicPanels: Object.fromEntries(['Candidates', 'Checkout', 'Export'].map((name) => [name, headings.filter((heading) => heading === name).length])),
    }
  })
  expect(layout.document.scrollHeight).toBeLessThanOrEqual(layout.document.clientHeight)
  expect(layout.preview).toEqual({ width: 232, height: 232 })
  expect(layout.destination.bottom).toBeLessThanOrEqual(844)
  expect(layout.destination.breathingRoom).toBeGreaterThan(0)
  expect(layout.hiddenPublicPanels).toEqual({ Candidates: 0, Checkout: 0, Export: 0 })
  await expect(page.getByRole('button', { name: 'Text' })).toHaveCount(0)

  const preview = page.getByRole('img', { name: 'QR Preview' })
  const previewBeforeDraft = await preview.getAttribute('src')
  await page.getByRole('textbox', { name: 'Final destination URL' }).fill('https://example.com/b24-public-draft')
  await page.getByRole('button', { name: 'Continue with this QR' }).click()
  await expect(page.getByRole('status')).toContainText('QR activates after payment')
  expect(await preview.getAttribute('src')).toBe(previewBeforeDraft)

  await page.goto('/?uxVariant=scroll')
  await expect(page.getByTestId('studio-app')).toHaveAttribute('data-ux-variant', 'default')
  await expect(page.locator('[data-selector-scroll-row]')).toHaveCount(5)

  await fs.writeFile(path.join(b24EvidenceDir, 'scrollbar-clearance-metrics.json'), JSON.stringify({
    viewport: { width: 390, height: 844 },
    strategy: { bottomPaddingPx: 12, styledScrollbarThicknessPx: 6 },
    families: measurements,
    layout,
    publicGate: { textDestinationAbsent: true, draftPreviewUnchanged: previewBeforeDraft === await preview.getAttribute('src') },
    scrollFallback: { route: '/?uxVariant=scroll', available: true },
  }, null, 2))

  const screenshots = await Promise.all(families.map(([family]) => fs.readFile(path.join(b24EvidenceDir, `${family}-scrollbar-clearance.png`))))
  await page.setViewportSize({ width: 1180, height: 520 })
  await page.setContent(`<main style="margin:0;padding:16px;background:#020617;color:white;font:600 15px system-ui;display:grid;grid-template-columns:repeat(3, 374px);gap:12px">${families.map(([, label], index) => `<figure style="margin:0"><figcaption style="margin-bottom:6px">${label} · tile/scrollbar clearance</figcaption><img style="display:block;width:374px" src="data:image/png;base64,${screenshots[index].toString('base64')}"></figure>`).join('')}</main>`)
  await page.locator('main').screenshot({ path: path.join(b24EvidenceDir, 'selector-scrollbar-clearance-contact-sheet.png') })
  expect(errors).toEqual([])
})

test('B23 keeps the larger no-scroll QR preview as the default route while preserving scroll fallback', async ({ page }) => {
  const errors = await assertNoConsoleErrors(page)
  await page.setViewportSize({ width: 390, height: 844 })
  await page.goto('/')
  await expect(page.getByTestId('studio-app')).toHaveAttribute('data-ux-variant', 'no-scroll')

  const measure = async () => page.evaluate(() => {
    const scrolling = document.scrollingElement!
    const preview = document.querySelector<HTMLElement>('img[alt="QR Preview"]')!.getBoundingClientRect()
    const destination = document.querySelector<HTMLElement>('#destination-content')!
    const destinationBox = destination.getBoundingClientRect()
    const count = (name: string) => document.querySelectorAll(`[aria-label="${name}"] [role="option"]`).length
    const headingCount = (name: string) => Array.from(document.querySelectorAll('h1,h2,h3')).filter((heading) => heading.textContent?.trim() === name).length
    return {
      viewport: { width: innerWidth, height: innerHeight },
      document: { scrollHeight: scrolling.scrollHeight, clientHeight: scrolling.clientHeight, verticalScrollRequired: scrolling.scrollHeight > scrolling.clientHeight },
      preview: { x: preview.x, y: preview.y, width: preview.width, height: preview.height, bottom: preview.bottom },
      selectors: {
        bodyColor: count('Body Color'), cornerColor: count('Corner Color'), style: count('Style'), corners: count('Corners'), eyes: count('Eyes'),
      },
      destination: { tagName: destination.tagName, x: destinationBox.x, y: destinationBox.y, width: destinationBox.width, height: destinationBox.height, bottom: destinationBox.bottom },
      hiddenPublicPanels: { Candidates: headingCount('Candidates'), Checkout: headingCount('Checkout'), Export: headingCount('Export') },
    }
  })

  const familyTabs = [
    ['body-color', 'Body Color'], ['corner-color', 'Corner Color'], ['style', 'Style'], ['corners', 'Corners'], ['eyes', 'Eyes'],
  ] as const
  const reachableFamilies: string[] = []
  for (const [family, panel] of familyTabs) {
    const tab = page.getByRole('tab', { name: `Show ${panel} controls` })
    await tab.click()
    await expect(tab).toHaveAttribute('aria-selected', 'true')
    await expect(page.getByRole('tabpanel', { name: `${panel} controls` })).toBeVisible()
    reachableFamilies.push(family)
  }
  expect(reachableFamilies).toEqual(['body-color', 'corner-color', 'style', 'corners', 'eyes'])
  const defaultNoScroll = await measure()
  expect(defaultNoScroll.document.verticalScrollRequired).toBe(false)
  expect(defaultNoScroll.document.scrollHeight).toBeLessThanOrEqual(defaultNoScroll.document.clientHeight)
  expect(defaultNoScroll.preview.width).toBeGreaterThanOrEqual(232)
  expect(defaultNoScroll.preview.height).toBeGreaterThanOrEqual(232)
  expect(defaultNoScroll.selectors).toEqual({ bodyColor: 22, cornerColor: 13, style: 7, corners: 11, eyes: 10 })
  expect(defaultNoScroll.destination.tagName).toBe('INPUT')
  expect(defaultNoScroll.destination.bottom).toBeLessThanOrEqual(844)
  expect(defaultNoScroll.hiddenPublicPanels).toEqual({ Candidates: 0, Checkout: 0, Export: 0 })
  await expect(page.getByRole('button', { name: 'Text' })).toHaveCount(0)
  await expect(page.getByTestId('qr-side-controls').getByRole('group', { name: 'QR size' })).toBeVisible()
  await expect(page.getByTestId('qr-side-controls').getByRole('group', { name: 'Intensity' })).toBeVisible()

  const preview = page.getByRole('img', { name: 'QR Preview' })
  const before = await preview.getAttribute('src')
  await page.getByRole('textbox', { name: 'Final destination URL' }).fill('https://example.com/b22-public-draft')
  await page.getByRole('button', { name: 'Continue with this QR' }).click()
  await expect(page.getByRole('status')).toContainText('QR activates after payment')
  expect(await preview.getAttribute('src')).toBe(before)
  const afterActivation = await measure()
  expect(afterActivation.document.verticalScrollRequired).toBe(false)
  await page.screenshot({ path: path.join(b21EvidenceDir, 'version-b-no-scroll.png') })

  await page.goto('/?uxVariant=scroll')
  await expect(page.getByTestId('studio-app')).toHaveAttribute('data-ux-variant', 'default')
  const versionA = await measure()
  expect(versionA.preview).toMatchObject({ width: 232, height: 232 })
  expect(versionA.document.verticalScrollRequired).toBe(true)
  await page.screenshot({ path: path.join(b21EvidenceDir, 'version-a-after-b20.png') })

  await fs.writeFile(path.join(b21EvidenceDir, 'layout-metrics.json'), JSON.stringify({
    versionA, versionB: { ...defaultNoScroll, reachableFamilies }, versionBAfterActivation: afterActivation,
    target: { noScrollDefault: true, minimumPreview: { width: 232, height: 232 } },
  }, null, 2))

  const [a, b] = await Promise.all([
    fs.readFile(path.join(b21EvidenceDir, 'version-a-after-b20.png')),
    fs.readFile(path.join(b21EvidenceDir, 'version-b-no-scroll.png')),
  ])
  await page.setViewportSize({ width: 820, height: 900 })
  await page.setContent(`<main style="margin:0;padding:12px;background:#020617;color:white;font:600 18px system-ui;display:flex;gap:12px"><figure style="margin:0"><figcaption style="margin-bottom:8px">Version A · Scroll fallback</figcaption><img width="390" height="844" src="data:image/png;base64,${a.toString('base64')}"></figure><figure style="margin:0"><figcaption style="margin-bottom:8px">Version B · Default no-scroll</figcaption><img width="390" height="844" src="data:image/png;base64,${b.toString('base64')}"></figure></main>`)
  await page.screenshot({ path: path.join(b21EvidenceDir, 'comparison-contact-sheet.png') })
  expect(errors).toEqual([])
})

test('B20 aligns QR-size glyphs and gives selector families one perimeter grammar', async ({ page }) => {
  const errors = await assertNoConsoleErrors(page)
  await page.setViewportSize({ width: 390, height: 844 })
  await page.goto('/?uxVariant=scroll')
  await page.addStyleTag({ content: '*,*::before,*::after{transition:none!important;animation:none!important}' })

  const selectorMeasurements = []
  const representatives = [
    ['body-color', page.getByRole('option', { name: /^Rainbow horizontal/ })],
    ['corner-color', page.getByRole('option', { name: /^Classic Black corner color/ })],
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
    bodyColor: await page.locator('[data-selector-family="body-color"]').count(),
    cornerColor: await page.locator('[data-selector-family="corner-color"]').count(),
    style: await page.getByRole('listbox', { name: 'Style' }).getByRole('option').count(),
    corners: await page.getByRole('listbox', { name: 'Corners' }).getByRole('option').count(),
    eyes: await page.getByRole('listbox', { name: 'Eyes' }).getByRole('option').count(),
  }
  expect(optionCounts).toEqual({ bodyColor: 22, cornerColor: 13, style: 7, corners: 11, eyes: 10 })
  const allOptionGeometry = await page.locator('[data-selector-family="body-color"], [data-selector-family="corner-color"], [data-selector-family="style"], [data-selector-family="corners"], [data-selector-family="eyes"]').evaluateAll((elements) => elements.map((element) => {
    const style = getComputedStyle(element)
    const box = element.getBoundingClientRect()
    return { family: element.getAttribute('data-selector-family'), width: box.width, height: box.height, borderWidth: style.borderWidth, borderRadius: style.borderRadius, padding: style.padding }
  }))
  expect(new Set(allOptionGeometry.map(({ width, height, borderWidth, borderRadius, padding }) => JSON.stringify({ width, height, borderWidth, borderRadius, padding }))).size).toBe(1)
  expect(allOptionGeometry[0]).toMatchObject({ width: 56, height: 56, borderWidth: '2px', borderRadius: '12px', padding: '0px' })
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
  await page.goto('/?uxVariant=scroll')
  const preview = page.getByRole('img', { name: 'QR Preview' })
  const before = await preview.getAttribute('src')
  const destination = page.getByRole('textbox', { name: 'Final destination URL' })
  expect(await destination.evaluate((element) => element.tagName)).toBe('INPUT')
  await expect(page.getByRole('button', { name: 'Text' })).toHaveCount(0)
  await expect(page.getByRole('listbox', { name: 'Style' }).getByRole('option')).toHaveCount(7)
  await expect(page.getByRole('listbox', { name: 'Corners' }).getByRole('option')).toHaveCount(11)
  await expect(page.getByRole('listbox', { name: 'Eyes' }).getByRole('option')).toHaveCount(10)
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
    optionCounts: { style: 7, corners: 11, eyes: 10 },
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
  await page.goto('/?uxVariant=scroll')

  const preview = page.getByRole('img', { name: 'QR Preview' })
  const previewBox = await preview.boundingBox()
  expect(previewBox).not.toBeNull()
  const families = [
    { row: 'Style', count: 7, suffix: 'QR style', options: [['Notched', 'notched'], ['Shield', 'shield']] },
    { row: 'Corners', count: 11, suffix: 'corner style', options: [['Diamond', 'diamond'], ['Hex', 'hex']] },
    { row: 'Eyes', count: 10, suffix: 'eye style', options: [['Hex', 'hex'], ['Vertical capsule', 'vertical-capsule'], ['Horizontal capsule', 'horizontal-capsule']] },
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
  await page.goto('/?uxVariant=scroll')

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
  const optionCounts = { Style: 7, Corners: 11, Eyes: 10 } as const
  for (const row of iconRows) {
    const options = page.getByRole('listbox', { name: row }).getByRole('option')
    await expect(options).toHaveCount(optionCounts[row])
    for (let index = 0; index < optionCounts[row]; index += 1) {
      expect((await options.nth(index).innerText()).replace('✓', '').trim()).toBe('')
      await expect(options.nth(index)).toHaveAttribute('aria-label', /style/)
      await expect(options.nth(index)).toHaveAttribute('data-setting', /square|rounded|circle|vertical-bars|horizontal-bars|squircle|chamfered|notched|shield|diamond|hex|vertical-capsule|horizontal-capsule|leaf-frame|opposing-leaf-frame|d-frame|inset-leaf-frame|star/)
    }
  }
  for (const removed of ['Classic', 'Rounded', 'Dots', 'Soft', 'Circle', 'Squircle', 'Chamfered', 'Mellow', 'Balanced', 'Punchy']) {
    await expect(page.getByText(removed, { exact: true })).toHaveCount(0)
  }

  const sideControls = page.getByTestId('qr-side-controls')
  await expect(sideControls.getByRole('group', { name: 'QR size' })).toBeVisible()
  await expect(sideControls.getByRole('group', { name: 'Intensity' })).toBeVisible()
  const solidHashes: Record<string, string> = {}
  await page.getByRole('listbox', { name: 'Body Color' }).getByRole('option', { name: /^Studio Blue/ }).click()
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

  await page.getByRole('listbox', { name: 'Body Color' }).screenshot({ path: path.join(b16EvidenceDir, 'expanded-solid-palette-row.png') })
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
  await page.goto('/?uxVariant=scroll')
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
  await page.goto('/?uxVariant=scroll')
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
  await page.goto('/?uxVariant=scroll')

  const preview = page.getByRole('img', { name: 'QR Preview' })
  const destination = page.getByRole('textbox', { name: 'Final destination URL' })
  const continueButton = page.getByRole('button', { name: 'Continue with this QR' })
  await expect(preview).toBeVisible()
  await expect(continueButton).toBeDisabled()
  for (const removedLabel of ['Color', 'Palette', 'Style', 'Corners', 'Intensity']) {
    await expect(page.getByText(removedLabel, { exact: true })).toHaveCount(0)
  }
  await expect(page.getByRole('listbox', { name: 'Body Color' })).toBeVisible()
  await expect(page.getByRole('listbox', { name: 'Corner Color' })).toBeVisible()
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
  await page.goto('/?uxVariant=scroll')

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
  await page.getByRole('listbox', { name: 'Body Color' }).getByRole('option', { name: 'Classic Black', exact: true }).click()
  await expect(page.getByRole('option', { name: 'Classic Black selected' })).toHaveAttribute('aria-selected', 'true')
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
