import { expect, test } from '@playwright/test'
import { createHash } from 'node:crypto'
import fs from 'node:fs/promises'
import path from 'node:path'

const evidenceRoot = path.resolve(process.cwd(), '../../.work-loop/evidence/studio-a4-production-runtime')
const b7EvidenceRoot = path.resolve(process.cwd(), '../../.work-loop/evidence/studio-b7-production-runtime-refine-visibility')
const exportPath = path.join(evidenceRoot, 'artistic-qr-production-runtime.svg')
const metadataPath = path.join(evidenceRoot, 'browser-proof.json')

function sameOriginApi(pathname: string) {
  return (response: import('@playwright/test').Response) => {
    const url = new URL(response.url())
    return url.origin === 'http://127.0.0.1:4175' && url.pathname === pathname
  }
}

test.beforeAll(async () => {
  await fs.mkdir(evidenceRoot, { recursive: true })
  await fs.mkdir(b7EvidenceRoot, { recursive: true })
})

test('normal Studio path uses real Core and commerce HTTP authorities', async ({ page, request }) => {
  const pageErrors: string[] = []
  const consoleErrors: string[] = []
  page.on('pageerror', (error) => pageErrors.push(error.message))
  page.on('console', (message) => { if (message.type() === 'error') consoleErrors.push(message.text()) })

  await page.goto('/')
  await page.evaluate(() => localStorage.clear())
  await page.reload()
  await page.getByPlaceholder('Enter destination URL…').fill('https://example.com/production-runtime-proof')

  const initialCandidatesResponse = page.waitForResponse(sameOriginApi('/api/artistic-qr/candidates'))
  await page.getByRole('button', { name: 'Generate 4' }).click()
  const initialCandidates = await initialCandidatesResponse
  expect(initialCandidates.status()).toBe(200)
  const initialBody = await initialCandidates.json() as { board: { candidates: Array<{ candidateId: string; rendered: { data: string } }> } }
  expect(initialBody.board.candidates).toHaveLength(4)
  await expect(page.getByRole('img', { name: /^Candidate / })).toHaveCount(4)

  const firstCandidateId = initialBody.board.candidates[0].candidateId
  const firstPreview = page.getByRole('img', { name: `Candidate ${firstCandidateId.slice(0, 6)}` })
  await expect(firstPreview).toBeVisible()
  const previewSource = await firstPreview.getAttribute('src')
  expect(previewSource).toContain(encodeURIComponent(initialBody.board.candidates[0].rendered.data).slice(0, 120))
  await firstPreview.locator('..').click()
  await expect(page.getByRole('button', { name: 'Refine from selected candidate' })).toHaveCount(0)

  const checkoutResponsePromise = page.waitForResponse(sameOriginApi('/api/commerce/checkouts'))
  await page.getByRole('button', { name: /Start guest checkout — \$12/ }).click()
  const checkoutResponse = await checkoutResponsePromise
  expect(checkoutResponse.status()).toBe(201)
  const checkout = await checkoutResponse.json() as { checkoutSessionId: string }
  await expect(page.getByRole('button', { name: 'Complete test payment' })).toHaveCount(0)
  await expect(page.getByRole('button', { name: 'Check payment status' })).toBeVisible()

  const paymentEvent = await request.post(`http://127.0.0.1:4174/__test__/commerce/checkouts/${checkout.checkoutSessionId}/events`, {
    data: { type: 'succeeded', providerEventId: `a4-${crypto.randomUUID()}` },
  })
  expect(paymentEvent.ok()).toBe(true)
  await page.getByRole('button', { name: 'Check payment status' }).click()
  await expect(page.getByText('Paid access active')).toBeVisible()

  const refinementControl = page.getByRole('button', { name: 'Refine from selected candidate' })
  await expect(refinementControl).toBeVisible()
  await expect(refinementControl).toHaveAttribute('aria-expanded', 'true')
  await page.screenshot({ path: path.join(b7EvidenceRoot, 'paid-refinement-visible.png'), fullPage: true })
  await page.getByPlaceholder(/Describe changes/).fill('Use a darker indigo palette')
  const refinementCandidatesResponse = page.waitForResponse(sameOriginApi('/api/artistic-qr/candidates'))
  const refinementAllowanceResponse = page.waitForResponse(sameOriginApi('/api/commerce/generations'))
  await page.getByRole('button', { name: 'Apply & Generate New Round' }).click()
  expect((await refinementCandidatesResponse).status()).toBe(200)
  expect((await refinementAllowanceResponse).status()).toBe(200)
  await expect(page.getByText('Round 2')).toBeVisible()
  await expect(page.getByRole('img', { name: /^Candidate / })).toHaveCount(8)
  await page.screenshot({ path: path.join(b7EvidenceRoot, 'round-2-after-refinement.png'), fullPage: true })

  const roundTwo = page.getByText('Round 2').locator('../..')
  await roundTwo.getByText('Validated', { exact: true }).first().click()
  const selectedCandidateId = await page.evaluate(() => {
    const stored = JSON.parse(localStorage.getItem('qr-studio-project') ?? '{}')
    return stored.state.project.selectedCandidateId as string
  })

  const commerceExportResponse = page.waitForResponse(sameOriginApi('/api/commerce/exports'))
  const coreExportResponse = page.waitForResponse(sameOriginApi('/api/artistic-qr/exports'))
  const downloadPromise = page.waitForEvent('download')
  await page.getByRole('button', { name: /^SVG/ }).click()
  await page.getByRole('button', { name: 'Export SVG' }).click()
  expect((await commerceExportResponse).status()).toBe(200)
  expect((await coreExportResponse).status()).toBe(200)
  const download = await downloadPromise
  await download.saveAs(exportPath)
  const bytes = await fs.readFile(exportPath)
  const svg = bytes.toString('utf8')
  expect(svg).toContain('<svg')
  expect(svg).toMatch(/width=["']512["']/)
  expect(svg).toMatch(/height=["']512["']/)
  const sha256 = createHash('sha256').update(bytes).digest('hex')
  expect(pageErrors).toEqual([])
  expect(consoleErrors).toEqual([])

  const restartResponse = await request.post('http://127.0.0.1:8788/restart')
  expect(restartResponse.status()).toBe(204)
  await expect.poll(async () => {
    const response = await request.post('http://127.0.0.1:4175/api/artistic-qr/exports', {
      data: { candidateId: selectedCandidateId, formats: ['svg'], sizes: [{ label: 'probe', widthPx: 512, heightPx: 512 }] },
    }).catch(() => undefined)
    return response?.status()
  }).toBe(404)

  const restartFailureResponse = page.waitForResponse(sameOriginApi('/api/artistic-qr/exports'))
  await page.getByRole('button', { name: 'Export SVG' }).click()
  expect((await restartFailureResponse).status()).toBe(404)
  await expect(page.getByRole('alert')).toContainText('Authoritative candidate was not found')
  await expect(page.getByText('Core keeps candidate authority in process memory. If the Core service restarts, regenerate before export.')).toBeVisible()

  expect(pageErrors).toEqual([])
  expect(consoleErrors.filter((message) => (
    !message.includes('Export failed:')
    && !message.includes('Failed to load resource: the server responded with a status of 404')
  ))).toEqual([])
  await fs.writeFile(metadataPath, `${JSON.stringify({
    candidateRequests: 2,
    commerceCheckoutStatus: checkoutResponse.status(),
    paidRefinement: true,
    export: { path: exportPath, format: 'svg', bytes: bytes.length, width: 512, height: 512, sha256 },
    restartFailureStatus: 404,
    browserAuthorityBridgesUsed: false,
    playwrightCoreRoutesUsed: false,
  }, null, 2)}\n`)
})
