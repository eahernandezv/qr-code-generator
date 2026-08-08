import { test, expect } from '@playwright/test'
import fs from 'node:fs/promises'
import path from 'node:path'

const evidenceDir = path.resolve(process.cwd(), '../../docs/program/evidence/ux-harmony-b31')

type StyleSnapshot = {
  backgroundColor: string
  borderColor: string
  borderRadius: string
  borderWidth: string
  boxShadow: string
  color: string
  padding: string
}

const styles = (element: Element): StyleSnapshot => {
  const style = getComputedStyle(element)
  return {
    backgroundColor: style.backgroundColor,
    borderColor: style.borderColor,
    borderRadius: style.borderRadius,
    borderWidth: style.borderWidth,
    boxShadow: style.boxShadow,
    color: style.color,
    padding: style.padding,
  }
}

const contrastRatio = (foreground: string, background: string) => {
  const channels = (value: string) => value.match(/[\d.]+/g)!.slice(0, 3).map(Number).map((channel) => {
    const normalized = channel / 255
    return normalized <= 0.04045 ? normalized / 12.92 : ((normalized + 0.055) / 1.055) ** 2.4
  })
  const luminance = (value: string) => {
    const [r, g, b] = channels(value)
    return 0.2126 * r + 0.7152 * g + 0.0722 * b
  }
  const [lighter, darker] = [luminance(foreground), luminance(background)].sort((a, b) => b - a)
  return (lighter + 0.05) / (darker + 0.05)
}

test('B31 uses one mobile selection grammar across QR Style, Creator Signature, and Destination', async ({ page }) => {
  await fs.mkdir(evidenceDir, { recursive: true })
  await page.setViewportSize({ width: 390, height: 844 })
  const consoleErrors: string[] = []
  page.on('console', (message) => { if (message.type() === 'error') consoleErrors.push(message.text()) })
  page.on('pageerror', (error) => consoleErrors.push(error.message))
  await page.goto('/')
  await page.addStyleTag({ content: '*,*::before,*::after{transition:none!important;animation:none!important}' })

  const app = page.getByTestId('studio-app')
  const previewZone = page.getByTestId('qr-side-controls')
  const previewBox = await previewZone.boundingBox()
  const panels: Record<string, StyleSnapshot> = {}
  const selectedTabs: Record<string, StyleSnapshot> = {}
  const screenshots: Record<string, string> = {}

  for (const [label, filename] of [
    ['QR Style', 'qr-style-mobile.png'],
    ['Creator Signature', 'creator-signature-mobile.png'],
    ['Destination', 'destination-mobile.png'],
  ] as const) {
    const tab = page.getByRole('button', { name: label, exact: true })
    if (label !== 'QR Style') await tab.click()
    await expect(tab).toHaveAttribute('aria-pressed', 'true')
    await expect(tab).toHaveAttribute('data-selection-token', 'primary')
    await expect(tab).toHaveAttribute('data-selection-state', 'selected')
    const panel = page.locator('[data-testid="lower-design-controls"] [data-ui-panel="harmony"]')
    await expect(panel).toHaveCount(1)
    await expect(panel).toBeVisible()
    panels[label] = await panel.evaluate(styles)
    selectedTabs[label] = await tab.evaluate(styles)
    const target = path.join(evidenceDir, filename)
    await page.screenshot({ path: target, fullPage: false })
    screenshots[label] = target
  }

  expect(selectedTabs['Creator Signature']).toEqual(selectedTabs['QR Style'])
  expect(selectedTabs.Destination).toEqual(selectedTabs['QR Style'])
  expect(panels['Creator Signature']).toEqual(panels['QR Style'])
  expect(panels.Destination).toEqual(panels['QR Style'])

  const selectedUrl = page.getByRole('button', { name: 'URL', exact: true })
  await expect(selectedUrl).toHaveAttribute('data-selection-token', 'primary')
  await expect(selectedUrl).toHaveAttribute('data-selection-state', 'selected')
  const cta = page.getByRole('button', { name: 'Continue with this QR' })
  await expect(cta).toBeDisabled()
  await expect(cta).toHaveAttribute('data-selection-state', 'disabled')
  const ctaStyle = await cta.evaluate(styles)
  const ctaContrast = contrastRatio(ctaStyle.color, ctaStyle.backgroundColor)
  expect(ctaContrast).toBeGreaterThanOrEqual(4.5)
  await expect(page.getByText('After checkout: PNG + SVG downloads · Social and print sizes')).toBeVisible()

  const afterPreviewBox = await previewZone.boundingBox()
  expect(afterPreviewBox).toEqual(previewBox)
  const layout = await page.evaluate(() => ({
    viewport: { width: innerWidth, height: innerHeight },
    document: {
      scrollHeight: document.scrollingElement!.scrollHeight,
      clientHeight: document.scrollingElement!.clientHeight,
      verticalScrollRequired: document.scrollingElement!.scrollHeight > document.scrollingElement!.clientHeight,
    },
  }))
  expect(layout.document.verticalScrollRequired).toBe(false)
  await expect(app).toHaveAttribute('data-ux-variant', 'no-scroll')
  expect(consoleErrors).toEqual([])

  await fs.writeFile(path.join(evidenceDir, 'ux-harmony-metrics.json'), JSON.stringify({
    viewport: layout.viewport,
    layout: layout.document,
    selectedTabs,
    panels,
    previewZoneBefore: previewBox,
    previewZoneAfter: afterPreviewBox,
    previewZoneStable: JSON.stringify(afterPreviewBox) === JSON.stringify(previewBox),
    disabledCtaContrastRatio: ctaContrast,
    screenshots,
    consoleErrors,
  }, null, 2))
})
