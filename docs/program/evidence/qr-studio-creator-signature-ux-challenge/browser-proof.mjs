import playwright from '../../../../apps/web/node_modules/@playwright/test/index.js'
import fs from 'node:fs/promises'

const { chromium } = playwright

const base = 'http://127.0.0.1:4183/concepts/creator-signature-ux/studio'
const out = new URL('.', import.meta.url).pathname
const browser = await chromium.launch({ headless: true })
const results = []
for (const viewport of [
  { name: 'mobile', width: 390, height: 844 },
  { name: 'desktop', width: 1440, height: 1000 },
]) {
  const page = await browser.newPage({ viewport: { width: viewport.width, height: viewport.height } })
  const consoleErrors = []
  page.on('console', (message) => { if (message.type() === 'error') consoleErrors.push(message.text()) })
  page.on('pageerror', (error) => consoleErrors.push(error.message))
  const response = await page.goto(base, { waitUntil: 'networkidle' })
  const concept = page.locator('[data-creator-signature-concept="studio"]')
  await concept.waitFor()
  await page.getByRole('textbox', { name: 'Line 1' }).fill('Ernesto Creates')
  await page.getByRole('textbox', { name: 'Line 2' }).fill('@ernesto')
  await page.getByRole('radiogroup', { name: 'Line 1 font' }).getByRole('radio', { name: 'Serif' }).click()
  await page.getByRole('radiogroup', { name: 'Line 1 size' }).getByRole('radio', { name: 'Large' }).click()
  await page.getByRole('radiogroup', { name: 'Line 2 colour' }).getByRole('radio', { name: 'Accent' }).click()
  await page.getByRole('radio', { name: 'Top left corner' }).click()
  await page.getByRole('radio', { name: '3mm' }).click()
  await page.waitForTimeout(150)
  const screenshot = `${out}creator-signature-concept-${viewport.name}.png`
  await page.screenshot({ path: screenshot, fullPage: false })
  const metrics = await concept.evaluate((element) => {
    const rect = element.getBoundingClientRect()
    const visibleText = Array.from(element.querySelectorAll('*')).filter((node) => {
      const style = getComputedStyle(node)
      return node.children.length === 0 && style.display !== 'none' && style.visibility !== 'hidden' && !node.classList.contains('sr-only') && (node.textContent ?? '').trim()
    }).map((node) => (node.textContent ?? '').trim())
    return {
      rect: { x: rect.x, y: rect.y, width: rect.width, height: rect.height, bottom: rect.bottom },
      viewport: { width: innerWidth, height: innerHeight },
      horizontalOverflow: element.scrollWidth > element.clientWidth,
      visibleLeafText: visibleText,
      selectedCount: element.querySelectorAll('[data-selected="true"]').length,
      textInputs: element.querySelectorAll('input[type="text"], input:not([type])').length,
      radioGroups: element.querySelectorAll('[role="radiogroup"]').length,
    }
  })
  results.push({ viewport, status: response?.status(), url: page.url(), consoleErrors, metrics, screenshot })
  await page.close()
}
await browser.close()
await fs.writeFile(`${out}browser-proof.json`, JSON.stringify(results, null, 2))
console.log(JSON.stringify(results, null, 2))
