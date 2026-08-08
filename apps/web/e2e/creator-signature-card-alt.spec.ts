import { test, expect } from '@playwright/test'
import fs from 'node:fs'
import path from 'node:path'

const evidenceDir = path.resolve(process.cwd(), '../../docs/program/evidence/creator-signature-card-ux-alt')

test.use({ viewport: { width: 390, height: 844 } })

test('card alternative preserves two-line editing in one mobile viewport', async ({ page }) => {
  fs.mkdirSync(evidenceDir, { recursive: true })
  const pageErrors: string[] = []
  const consoleErrors: string[] = []
  page.on('pageerror', (error) => pageErrors.push(error.message))
  page.on('console', (message) => { if (message.type() === 'error') consoleErrors.push(message.text()) })

  await page.goto('/?creatorSignatureUX=card')
  await page.getByRole('button', { name: 'Creator Signature' }).click()
  const card = page.getByTestId('creator-signature-card-alt')
  await expect(card).toBeVisible()
  await expect(page.getByRole('tab', { name: /Line 1/ })).toHaveAttribute('aria-selected', 'true')
  await expect(page.getByRole('textbox', { name: 'Line 1' })).toHaveValue('')
  await expect(page.getByRole('tab', { name: /Line 2/ })).toContainText('Line 2')
  await expect(page.getByRole('tab', { name: 'Placement' })).toHaveAttribute('aria-selected', 'false')

  await page.getByRole('textbox', { name: 'Line 1' }).fill('Studio signature')
  await page.getByRole('button', { name: 'Line 1 handwritten font' }).click()
  await page.getByRole('tab', { name: /Line 2/ }).click()
  await page.getByRole('textbox', { name: 'Line 2' }).fill('@studio')
  await page.getByRole('tab', { name: 'Size' }).click()
  await page.getByRole('button', { name: 'Line 2 extra large size' }).click()
  await page.getByRole('tab', { name: 'Colour' }).click()
  await page.getByRole('button', { name: 'Line 2 accent' }).click()

  const collapsedMetrics = await page.evaluate(() => ({
    viewport: { width: innerWidth, height: innerHeight },
    documentHeight: document.documentElement.scrollHeight,
    bodyHeight: document.body.scrollHeight,
    card: (() => { const r = document.querySelector('[data-testid="creator-signature-card-alt"]')!.getBoundingClientRect(); return { top: r.top, bottom: r.bottom, width: r.width, height: r.height } })(),
    textboxes: document.querySelectorAll('input[aria-label^="Line "]').length,
    lineTabs: document.querySelectorAll('[aria-label="Signature lines"] [role="tab"]').length,
  }))
  expect(collapsedMetrics.documentHeight).toBeLessThanOrEqual(844)
  expect(collapsedMetrics.bodyHeight).toBeLessThanOrEqual(844)
  expect(collapsedMetrics.card.bottom).toBeLessThanOrEqual(844)
  expect(collapsedMetrics.textboxes).toBe(1)
  expect(collapsedMetrics.lineTabs).toBe(2)
  fs.writeFileSync(path.join(evidenceDir, 'mobile-metrics.json'), `${JSON.stringify(collapsedMetrics, null, 2)}\n`)
  await page.screenshot({ path: path.join(evidenceDir, 'creator-signature-card-mobile.png'), fullPage: false })

  await page.getByRole('tab', { name: 'Placement' }).click()
  await expect(page.getByRole('tab', { name: 'Placement' })).toHaveAttribute('aria-selected', 'true')
  await expect(page.getByRole('radiogroup', { name: 'Fixed signature position' })).toBeVisible()
  await page.getByRole('radio', { name: 'Top left corner' }).click()
  await page.getByRole('radio', { name: '3mm boundary offset' }).click()
  await page.screenshot({ path: path.join(evidenceDir, 'creator-signature-card-placement-mobile.png'), fullPage: false })

  expect(pageErrors).toEqual([])
  expect(consoleErrors).toEqual([])
  fs.writeFileSync(path.join(evidenceDir, 'browser-errors.json'), `${JSON.stringify({ pageErrors, consoleErrors }, null, 2)}\n`)
})
