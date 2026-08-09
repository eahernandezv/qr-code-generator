import { test, expect } from '@playwright/test'
import fs from 'node:fs'
import path from 'node:path'

const evidenceDir = path.resolve(process.cwd(), '../../docs/program/evidence/level2-image-fit-qr-spike/studio-evidence-integration')

test.use({ viewport: { width: 390, height: 844 } })

test('captures real Readable, Balanced, and Image-first evidence without runtime errors', async ({ page }) => {
  fs.mkdirSync(evidenceDir, { recursive: true })
  const pageErrors: string[] = []
  const consoleErrors: string[] = []
  page.on('pageerror', (error) => pageErrors.push(error.message))
  page.on('console', (message) => { if (message.type() === 'error') consoleErrors.push(message.text()) })

  await page.goto('/concepts/level2-image-fit-qr')
  await expect(page.getByTestId('image-fit-qr-concept')).toBeVisible()
  await expect(page.getByText('Validated spike · not exportable')).toBeVisible()
  await expect(page.getByRole('button', { name: 'Balanced', exact: true })).toHaveAttribute('aria-pressed', 'true')
  await expect(page.getByRole('img', { name: /candidate thumbnail/i })).toHaveCount(3)
  const selected = page.getByTestId('selected-image-fit-candidate')
  await expect(selected).toHaveAttribute('src', /bold-diamond__module-recolor__v10-Q-m1-b8\.png/)
  expect(await selected.evaluate((image: HTMLImageElement) => image.complete && image.naturalWidth > 0)).toBe(true)
  await page.getByText(/Technical evidence · v10 · 57 modules · ECC Q · mask 1/).click()
  await expect(page.getByText('jsQR 1.4.0')).toBeVisible()
  await page.screenshot({ path: path.join(evidenceDir, 'balanced-real-evidence-mobile.png'), fullPage: true })

  await page.getByRole('button', { name: 'Readable', exact: true }).click()
  await expect(selected).toHaveAttribute('src', /bold-diamond__background-silhouette__v10-Q-m3-b8\.png/)
  await expect(page.getByText(/Technical evidence · v10 · 57 modules · ECC Q · mask 3/)).toBeVisible()
  await page.screenshot({ path: path.join(evidenceDir, 'readable-real-evidence-mobile.png'), fullPage: true })

  await page.getByRole('button', { name: 'Image-first', exact: true }).click()
  await expect(selected).toHaveAttribute('src', /bold-diamond__central-logo-pixel__v10-Q-m0-b8\.png/)
  await expect(page.getByText('Experimental', { exact: true })).toBeVisible()
  await expect(page.getByText(/Experimental destructive treatment; not export-ready/)).toBeVisible()
  await expect(page.getByText(/Technical evidence · v10 · 57 modules · ECC Q · mask 0/)).toBeVisible()
  await page.screenshot({ path: path.join(evidenceDir, 'image-first-experimental-mobile.png'), fullPage: true })

  await expect(page.getByText(/Passed 8\/8 controlled decoder checks/)).toBeVisible()
  await expect(page.getByText(/No physical-device or printed scan was performed/)).toBeVisible()
  await expect(page.getByText(/not a universal scan guarantee or production export approval/)).toBeVisible()
  await expect(page.getByText(/Awaiting Creator/)).toHaveCount(0)

  const metrics = await page.evaluate(() => ({
    viewport: { width: innerWidth, height: innerHeight },
    document: { width: document.documentElement.scrollWidth, height: document.documentElement.scrollHeight },
    horizontalOverflow: document.documentElement.scrollWidth > innerWidth,
    candidateCards: document.querySelectorAll('[aria-label="Candidate evidence"] button').length,
    candidateImages: Array.from(document.querySelectorAll<HTMLImageElement>('[aria-label="Candidate evidence"] img')).map((image) => ({ src: image.getAttribute('src'), loaded: image.complete && image.naturalWidth > 0 })),
    publicDefaultStillIsolated: location.pathname === '/concepts/level2-image-fit-qr',
  }))
  expect(metrics.horizontalOverflow).toBe(false)
  expect(metrics.candidateCards).toBe(3)
  expect(metrics.candidateImages).toHaveLength(3)
  expect(metrics.candidateImages.every((image) => image.loaded)).toBe(true)
  expect(pageErrors).toEqual([])
  expect(consoleErrors).toEqual([])
  fs.writeFileSync(path.join(evidenceDir, 'browser-proof.json'), `${JSON.stringify({ metrics, pageErrors, consoleErrors }, null, 2)}\n`)
})
