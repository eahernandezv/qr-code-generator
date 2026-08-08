import { test, expect } from '@playwright/test'
import fs from 'node:fs'
import path from 'node:path'

const evidenceDir = path.resolve(process.cwd(), '../../docs/program/evidence/level2-image-fit-qr-spike/studio')

test.use({ viewport: { width: 390, height: 844 } })

test('captures truthful Level 2 Image-Fit QR controls and original URL warning', async ({ page }) => {
  fs.mkdirSync(evidenceDir, { recursive: true })
  const pageErrors: string[] = []
  const consoleErrors: string[] = []
  page.on('pageerror', (error) => pageErrors.push(error.message))
  page.on('console', (message) => { if (message.type() === 'error') consoleErrors.push(message.text()) })

  await page.goto('/concepts/level2-image-fit-qr')
  await expect(page.getByTestId('image-fit-qr-concept')).toBeVisible()
  await expect(page.getByRole('button', { name: 'Pixel blend' })).toHaveAttribute('aria-pressed', 'true')
  await expect(page.getByRole('button', { name: 'Balanced' })).toHaveAttribute('aria-pressed', 'true')
  await expect(page.getByRole('button', { name: 'Detailed' })).toHaveAttribute('aria-pressed', 'true')
  await expect(page.getByRole('button', { name: /Optimized short link/ })).toHaveAttribute('aria-pressed', 'true')
  await expect(page.getByText('Not run')).toHaveCount(4)
  await expect(page.getByText('— modules')).toHaveCount(4)
  await page.screenshot({ path: path.join(evidenceDir, 'image-fit-optimized-mobile.png'), fullPage: true })

  await page.getByRole('button', { name: /Original URL/ }).click()
  await expect(page.getByRole('alert')).toContainText('increase QR density and reduce image clarity')
  await page.screenshot({ path: path.join(evidenceDir, 'image-fit-original-url-warning-mobile.png'), fullPage: true })

  const metrics = await page.evaluate(() => ({
    viewport: { width: innerWidth, height: innerHeight },
    document: { width: document.documentElement.scrollWidth, height: document.documentElement.scrollHeight },
    horizontalOverflow: document.documentElement.scrollWidth > innerWidth,
    candidateCards: document.querySelectorAll('[aria-label="Candidate evidence preview"] article').length,
  }))
  expect(metrics.horizontalOverflow).toBe(false)
  expect(metrics.candidateCards).toBe(3)
  expect(pageErrors).toEqual([])
  expect(consoleErrors).toEqual([])
  fs.writeFileSync(path.join(evidenceDir, 'ux-runtime.json'), `${JSON.stringify({ metrics, pageErrors, consoleErrors }, null, 2)}\n`)
})
