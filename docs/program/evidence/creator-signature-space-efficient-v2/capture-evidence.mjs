import playwright from '../../../../apps/web/node_modules/@playwright/test/index.js'
const { chromium } = playwright
import { writeFile } from 'node:fs/promises'
import path from 'node:path'

const base = 'http://127.0.0.1:4189'
const out = path.resolve('docs/program/evidence/creator-signature-space-efficient-v2')
const errors = []
const browser = await chromium.launch({ headless: true })

async function measure(page, route, activateMain = false) {
  await page.goto(`${base}${route}`, { waitUntil: 'networkidle' })
  page.on('pageerror', (error) => errors.push(`${route}: ${error.message}`))
  page.on('console', (message) => { if (message.type() === 'error') errors.push(`${route}: console: ${message.text()}`) })
  if (activateMain) await page.getByRole('button', { name: 'Creator Signature' }).click()
  const tray = page.locator('[data-template-controls-tray="creator-signature"]')
  await tray.waitFor()
  return page.evaluate(() => {
    const tray = document.querySelector('[data-template-controls-tray="creator-signature"]')
    const editor = document.querySelector('[aria-label="Live QR design editor"]')
    const preview = document.querySelector('[aria-label="QR Preview"]')
    const styleGroups = [...document.querySelectorAll('[role="group"]')].filter((node) => /Line [12] (font|size|colour)/.test(node.getAttribute('aria-label') ?? ''))
    const activeCards = [...document.querySelectorAll('[data-active-line]')].map((node) => ({ line: node.getAttribute('aria-label'), active: node.getAttribute('data-active-line') }))
    const rect = (node) => node ? { x: Math.round(node.getBoundingClientRect().x), y: Math.round(node.getBoundingClientRect().y), width: Math.round(node.getBoundingClientRect().width), height: Math.round(node.getBoundingClientRect().height), bottom: Math.round(node.getBoundingClientRect().bottom) } : null
    return {
      viewport: { width: innerWidth, height: innerHeight },
      document: { scrollHeight: document.scrollingElement.scrollHeight, clientHeight: document.scrollingElement.clientHeight },
      tray: rect(tray), editor: rect(editor), preview: rect(preview),
      textboxCount: document.querySelectorAll('input[aria-label="Line 1"],input[aria-label="Line 2"]').length,
      styleGroupCount: styleGroups.length,
      activeCards,
      positionCount: document.querySelectorAll('[aria-label="Fixed signature position"] [role="radio"]').length,
      offsetCount: document.querySelectorAll('[aria-label="Signature boundary offset"] [role="radio"]').length,
      hasThirdLineOrCta: !![...document.querySelectorAll('input')].find((node) => /line 3|cta/i.test(node.getAttribute('aria-label') ?? '')),
    }
  })
}

const mobile = await browser.newPage({ viewport: { width: 390, height: 844 }, deviceScaleFactor: 1 })
const currentMobile = await measure(mobile, '/', true)
const currentHeight = currentMobile.tray.height
const conceptMobile = await measure(mobile, '/concepts/creator-signature-ux/space-studio')
await mobile.getByRole('textbox', { name: 'Line 1' }).fill('Maria Manastireanu')
await mobile.getByRole('textbox', { name: 'Line 2' }).fill('@maria10')
await mobile.getByRole('button', { name: 'Style line 2' }).click()
await mobile.getByRole('button', { name: 'Line 2 mono font' }).click()
await mobile.getByRole('button', { name: 'Line 2 small size' }).click()
await mobile.screenshot({ path: path.join(out, 'space-studio-mobile-390x844.png'), fullPage: false })
const conceptMobileFinal = await mobile.evaluate(() => ({
  activeLine: document.querySelector('[data-active-line="true"]')?.getAttribute('aria-label'),
  scrollHeight: document.scrollingElement.scrollHeight,
  clientHeight: document.scrollingElement.clientHeight,
  trayHeight: Math.round(document.querySelector('[data-template-controls-tray="creator-signature"]').getBoundingClientRect().height),
  viewportOverflowX: document.documentElement.scrollWidth > document.documentElement.clientWidth,
}))

const desktop = await browser.newPage({ viewport: { width: 1440, height: 1000 }, deviceScaleFactor: 1 })
const conceptDesktop = await measure(desktop, '/concepts/creator-signature-ux/space-studio')
await desktop.getByRole('textbox', { name: 'Line 1' }).fill('Maria Manastireanu')
await desktop.getByRole('textbox', { name: 'Line 2' }).fill('@maria10')
await desktop.getByRole('button', { name: 'Style line 2' }).click()
await desktop.screenshot({ path: path.join(out, 'space-studio-desktop-1440x1000.png'), fullPage: false })

const metrics = {
  route: '/concepts/creator-signature-ux/space-studio',
  url: `${base}/concepts/creator-signature-ux/space-studio`,
  currentDuplicatedMobile: currentMobile,
  sharedInspectorMobileInitial: conceptMobile,
  sharedInspectorMobileFinal: conceptMobileFinal,
  sharedInspectorDesktop: conceptDesktop,
  footprint: {
    duplicatedTrayHeightPx: currentHeight,
    sharedTrayHeightPx: conceptMobile.tray.height,
    reductionPx: currentHeight - conceptMobile.tray.height,
    reductionPercent: Number((((currentHeight - conceptMobile.tray.height) / currentHeight) * 100).toFixed(1)),
  },
  browserErrors: errors,
}
await writeFile(path.join(out, 'layout-metrics.json'), `${JSON.stringify(metrics, null, 2)}\n`)
await browser.close()
if (errors.length) throw new Error(`Browser errors: ${errors.join('; ')}`)
if (metrics.footprint.reductionPx <= 0) throw new Error('Shared inspector did not reduce the mobile tray height')
if (conceptMobile.styleGroupCount !== 3 || conceptMobile.textboxCount !== 2 || conceptMobile.positionCount !== 5 || conceptMobile.offsetCount !== 4 || conceptMobile.hasThirdLineOrCta) throw new Error('Concept cardinality contract failed')
console.log(JSON.stringify(metrics.footprint))
console.log('EVIDENCE_CAPTURE_SUCCESS')
