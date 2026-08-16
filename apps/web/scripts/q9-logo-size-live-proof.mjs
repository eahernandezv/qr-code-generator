import { chromium } from '@playwright/test'
import fs from 'node:fs'
import path from 'node:path'

const outDir = path.resolve(process.cwd(), '../../docs/program/evidence/q9-logo-size-integration-live')
fs.mkdirSync(outDir, { recursive: true })
const browser = await chromium.launch({ headless: true })
const page = await browser.newPage({ viewport: { width: 390, height: 1100 }, deviceScaleFactor: 1 })
const consoleErrors = []
const pageErrors = []
page.on('console', (msg) => { if (msg.type() === 'error') consoleErrors.push(msg.text()) })
page.on('pageerror', (err) => pageErrors.push(err.message))
const requests = []
page.on('request', (request) => {
  if (request.url().includes('/api/artistic-qr/image-fit/candidates')) {
    try { requests.push(JSON.parse(request.postData() ?? '{}')) } catch {}
  }
})
await page.goto(process.env.STUDIO_URL || 'http://127.0.0.1:8092/concepts/level2-image-fit-qr', { waitUntil: 'networkidle' })
const texts = await page.locator('body').innerText()
if (texts.includes('Treatment') || texts.includes('Image-Fit strength') || texts.includes('Detail')) throw new Error('No-op controls are still visible')
await page.getByRole('button', { name: 'Large' }).click()
await page.getByRole('button', { name: 'Generate candidates' }).click()
await page.getByTestId('selected-image-fit-candidate').waitFor({ timeout: 120000 })
const selectedHash = await page.getByTestId('selected-image-fit-candidate').getAttribute('data-artifact-sha256')
const blockers = await page.getByTestId('image-fit-export-blockers').innerText()
const cards = await page.locator('article').evaluateAll((nodes) => nodes.map((node) => node.textContent?.replace(/\s+/g, ' ').trim()))
await page.screenshot({ path: path.join(outDir, 'large-logo-size-live.png'), fullPage: true })
const proof = { schema_version: 'q9-logo-size-integration-live.v1', selectedHash, submittedLogoSize: requests.at(-1)?.user_controls?.logo_size, hiddenNoopControls: true, blockers, cards, consoleErrors, pageErrors, screenshot: 'large-logo-size-live.png' }
fs.writeFileSync(path.join(outDir, 'proof.json'), JSON.stringify(proof, null, 2) + '\n')
console.log(JSON.stringify(proof, null, 2))
await browser.close()
