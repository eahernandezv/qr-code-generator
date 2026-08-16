import { chromium } from '@playwright/test'
import fs from 'node:fs'
import path from 'node:path'

const outDir = path.resolve(process.cwd(), '../../docs/program/evidence/studio-q9-live-proof')
fs.mkdirSync(outDir, { recursive: true })
const url = process.env.STUDIO_URL ?? 'http://127.0.0.1:8091/concepts/level2-image-fit-qr'
const browser = await chromium.launch({ headless: true })
const page = await browser.newPage({ viewport: { width: 390, height: 844 } })
const consoleErrors = []
const pageErrors = []
page.on('console', (msg) => { if (msg.type() === 'error') consoleErrors.push(msg.text()) })
page.on('pageerror', (err) => pageErrors.push(err.message))
await page.goto(url)
await page.getByRole('button', { name: 'Generate candidates' }).click()
const selected = page.getByTestId('selected-image-fit-candidate')
await selected.waitFor({ state: 'visible', timeout: 60000 })
const selectedHash = await selected.getAttribute('data-artifact-sha256')
const selectedAlt = await selected.getAttribute('alt')
const conceptAttrs = await page.getByTestId('image-fit-qr-concept').evaluate((el) => ({
  exportPayloadBound: el.getAttribute('data-export-payload-bound'),
  checkoutBound: el.getAttribute('data-checkout-bound'),
  schemaVersion: el.getAttribute('data-schema-version'),
}))
const bodyText = await page.locator('body').innerText()
await page.screenshot({ path: path.join(outDir, 'q9-live-generation.png'), fullPage: true })
const blockers = await page.getByTestId('image-fit-export-blockers').innerText().catch(() => '')
const cards = await page.getByRole('article').evaluateAll((nodes) => nodes.map((node) => node.textContent ?? ''))
const proof = {
  schema_version: 'studio-q9-live-proof.v1',
  url,
  selectedHash,
  selectedAlt,
  conceptAttrs,
  blockers,
  hasQ9PolicyText: bodyText.includes('image-fit-negative-space-showcase-q9-target-aware-centering'),
  visibleQ9Heading: bodyText.includes('Q9 Image-Fit'),
  cards,
  consoleErrors,
  pageErrors,
  screenshot: 'q9-live-generation.png',
}
fs.writeFileSync(path.join(outDir, 'proof.json'), `${JSON.stringify(proof, null, 2)}\n`)
await browser.close()
if (!proof.visibleQ9Heading || !proof.hasQ9PolicyText || conceptAttrs.exportPayloadBound !== 'false' || !blockers.includes('preview_export_parity_not_proven') || pageErrors.length) {
  throw new Error(`Q9 live proof failed: ${JSON.stringify(proof, null, 2)}`)
}
console.log(JSON.stringify(proof, null, 2))
