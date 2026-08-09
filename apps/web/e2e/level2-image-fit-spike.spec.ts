import { test, expect } from '@playwright/test'
import fs from 'node:fs'
import path from 'node:path'

const evidenceDir = path.resolve(process.cwd(), '../../docs/program/evidence/level2-production-image-fit-ui-shortlink')

test.use({ viewport: { width: 390, height: 844 } })

test('proves contract-backed fixture preview and fail-closed invalidation without export authority', async ({ page }) => {
  fs.mkdirSync(evidenceDir, { recursive: true })
  const pageErrors: string[] = []
  const consoleErrors: string[] = []
  page.on('pageerror', (error) => pageErrors.push(error.message))
  page.on('console', (message) => { if (message.type() === 'error') consoleErrors.push(message.text()) })

  await page.goto('/concepts/level2-image-fit-qr')
  const concept = page.getByTestId('image-fit-qr-concept')
  await expect(concept).toBeVisible()
  await expect(concept).toHaveAttribute('data-schema-version', 'image-fit-qr-api.v1')
  await expect(concept).toHaveAttribute('data-export-payload-bound', 'false')
  await expect(page.getByText('Fixture preview · export locked')).toBeVisible()
  await expect(page.getByRole('button', { name: 'Balanced', exact: true })).toHaveAttribute('aria-pressed', 'true')
  await expect(page.getByRole('img', { name: /candidate thumbnail/i })).toHaveCount(1)
  const selected = page.getByTestId('selected-image-fit-candidate')
  await expect(selected).toHaveAttribute('src', /bold-diamond__module-recolor__v10-Q-m1-b8\.png/)
  expect(await selected.evaluate((image: HTMLImageElement) => image.complete && image.naturalWidth > 0)).toBe(true)
  await page.getByText(/Technical evidence · v10 · 57 modules · ECC Q · mask 1/).click()
  await expect(page.getByText('jsQR 1.4.0')).toBeVisible()
  await expect(page.getByRole('status')).toContainText('unpaid')
  await expect(page.getByRole('status')).toContainText('reserved—not committed')
  await page.screenshot({ path: path.join(evidenceDir, 'balanced-contract-preview-mobile.png'), fullPage: true })

  await expect(page.getByRole('article', { name: 'Balanced contract candidate' })).toContainText('8/8 checks · fixture response')

  await expect(page.getByText(/Passed 8\/8 controlled decoder checks/)).toBeVisible()
  await expect(page.getByText(/Physical-device and print scans were not performed/)).toBeVisible()
  await expect(page.getByText(/not a universal scan guarantee/)).toBeVisible()
  await expect(page.getByText(/Awaiting Creator|Confidence:\s*\d+%|production approved/i)).toHaveCount(0)
  await expect(page.getByRole('button', { name: /^(Generate|Export|Create short link)$/i })).toHaveCount(0)

  const currentMetrics = await page.evaluate(() => ({
    viewport: { width: innerWidth, height: innerHeight },
    document: { width: document.documentElement.scrollWidth, height: document.documentElement.scrollHeight },
    horizontalOverflow: document.documentElement.scrollWidth > innerWidth,
    candidateCards: document.querySelectorAll('[aria-label="Candidate evidence"] article').length,
    candidateImages: Array.from(document.querySelectorAll<HTMLImageElement>('[aria-label="Candidate evidence"] img')).map((image) => ({ src: image.getAttribute('src'), loaded: image.complete && image.naturalWidth > 0 })),
    publicDefaultStillIsolated: location.pathname === '/concepts/level2-image-fit-qr',
    exportPayloadBound: document.querySelector('[data-testid="image-fit-qr-concept"]')?.getAttribute('data-export-payload-bound'),
  }))
  expect(currentMetrics.horizontalOverflow).toBe(false)
  expect(currentMetrics.candidateCards).toBe(1)
  expect(currentMetrics.candidateImages).toHaveLength(1)
  expect(currentMetrics.candidateImages.every((image) => image.loaded)).toBe(true)
  expect(currentMetrics.exportPayloadBound).toBe('false')

  await page.getByRole('textbox', { name: 'Level 2 destination URL' }).fill('https://example.org/changed')
  await expect(selected).toHaveCount(0)
  await expect(page.getByText(/Previous fixture evidence is hidden/)).toBeVisible()
  await expect(page.getByLabel('Image-Fit QR preview').getByText('Evidence invalidated', { exact: true })).toBeVisible()
  await expect(page.getByRole('article', { name: 'Balanced contract candidate' })).toContainText('Evidence invalidated')
  await page.screenshot({ path: path.join(evidenceDir, 'destination-change-invalidates-evidence-mobile.png'), fullPage: true })

  const invalidatedMetrics = await page.evaluate(() => ({
    horizontalOverflow: document.documentElement.scrollWidth > innerWidth,
    staleCandidateImages: document.querySelectorAll('[aria-label="Candidate evidence"] img').length,
    selectedArtifactPresent: Boolean(document.querySelector('[data-testid="selected-image-fit-candidate"]')),
    exportPayloadBound: document.querySelector('[data-testid="image-fit-qr-concept"]')?.getAttribute('data-export-payload-bound'),
  }))
  expect(invalidatedMetrics).toEqual({ horizontalOverflow: false, staleCandidateImages: 0, selectedArtifactPresent: false, exportPayloadBound: 'false' })
  expect(pageErrors).toEqual([])
  expect(consoleErrors).toEqual([])
  fs.writeFileSync(path.join(evidenceDir, 'browser-proof.json'), `${JSON.stringify({ currentMetrics, invalidatedMetrics, pageErrors, consoleErrors }, null, 2)}\n`)
})
