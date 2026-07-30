import { expect, test, type Page } from '@playwright/test'
import fs from 'node:fs/promises'
import path from 'node:path'
import { createArtisticQrHttpService } from '../../../packages/artistic-qr/dist/http-service.js'

let coreService: ReturnType<typeof createArtisticQrHttpService> | undefined
let coreBaseUrl = ''

test.beforeAll(async () => {
  coreService = createArtisticQrHttpService()
  await new Promise<void>((resolve, reject) => {
    coreService!.server.once('error', reject)
    coreService!.server.listen(0, '127.0.0.1', resolve)
  })
  const address = coreService.server.address()
  if (!address || typeof address === 'string') throw new Error('Core test service did not bind a TCP port')
  coreBaseUrl = `http://127.0.0.1:${address.port}`
})

test.afterAll(async () => {
  if (!coreService) return
  await new Promise<void>((resolve, reject) => coreService!.server.close((error) => error ? reject(error) : resolve()))
})

async function routeToRealCore(page: Page) {
  await page.route('**/api/artistic-qr/**', async (route) => {
    const suffix = new URL(route.request().url()).pathname.replace('/api/artistic-qr', '')
    const response = await route.fetch({ url: `${coreBaseUrl}${suffix}` })
    await route.fulfill({ response })
  })
}

async function consoleErrors(page: Page) {
  const errors: string[] = []
  page.on('console', (message) => {
    if (message.type() === 'error') errors.push(message.text())
  })
  return errors
}

test.beforeEach(async ({ page }) => {
  await page.addInitScript(() => {
    window.__QR_CORE_EXPORT_TEST__ = {
      async exportArtifact(request) {
        const files = []
        for (const format of request.formats) {
          for (const size of request.sizes ?? []) {
            const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="${size.widthPx}" height="${size.heightPx}" viewBox="0 0 512 512"><rect width="512" height="512" fill="#fff"/><rect x="32" y="32" width="448" height="448" fill="#181b3a"/><rect x="64" y="64" width="384" height="384" fill="#fff"/></svg>`
            if (format === 'svg') {
              files.push({ format, data: svg, width: size.widthPx, height: size.heightPx })
              continue
            }
            const image = new Image()
            image.src = `data:image/svg+xml;charset=utf-8,${encodeURIComponent(svg)}`
            await image.decode()
            const canvas = document.createElement('canvas')
            canvas.width = size.widthPx
            canvas.height = size.heightPx
            canvas.getContext('2d')!.drawImage(image, 0, 0, size.widthPx, size.heightPx)
            files.push({ format, data: canvas.toDataURL('image/png'), width: size.widthPx, height: size.heightPx })
            canvas.width = 0
            canvas.height = 0
          }
        }
        return {
          artifactId: crypto.randomUUID(),
          candidateId: request.candidateId,
          files,
          provenance: {
            generationMode: 'deterministic_template',
            adapterVersion: 'artistic-qr-v1',
            validationVersion: 'scan-v1-real-75pct',
          },
        }
      },
    }
  })
  await page.goto('/')
  await page.evaluate(() => window.__QR_COMMERCE_TEST__?.reset())
  await page.reload()
})

test('free preview → $12 checkout → paid refinement → service-authorized export', async ({ page }) => {
  const errors = await consoleErrors(page)
  await routeToRealCore(page)
  await page.evaluate(() => { delete window.__QR_CORE_EXPORT_TEST__ })
  await page.getByPlaceholder('Enter url…').fill('https://example.com')
  await page.getByRole('button', { name: 'Generate 4' }).click()
  await expect(page.getByText('complete', { exact: true })).toBeVisible({ timeout: 12_000 })
  await page.getByText('Validated', { exact: true }).first().click()
  const firstCoreCandidateId = await page.evaluate(() => {
    const stored = JSON.parse(localStorage.getItem('qr-studio-project') || '{}')
    return stored.state.project.selectedCandidateId as string
  })
  expect(firstCoreCandidateId).toMatch(/^[0-9a-f-]{36}$/)
  await expect(page.getByRole('button', { name: 'Purchase to export' })).toBeDisabled()

  await page.getByRole('button', { name: /Start guest checkout — \$12/ }).click()
  await expect(page.getByText(/Checkout created/)).toBeVisible()
  await page.getByRole('button', { name: 'Complete test payment' }).click()
  await expect(page.getByText('Paid access active')).toBeVisible()
  await expect(page.getByText(/Successful rounds/).locator('..')).toContainText('0 / 3')

  await page.getByText('Refine from selected candidate').click()
  await page.getByPlaceholder(/Describe changes/).fill('Use a darker indigo wash')
  await page.getByRole('button', { name: 'Apply & Generate New Round' }).click()
  await expect(page.getByText('Round 2')).toBeVisible()
  await expect(page.getByText('complete', { exact: true }).last()).toBeVisible({ timeout: 12_000 })
  await expect(page.getByText(/Successful rounds/).locator('..')).toContainText('1 / 3')
  await page.getByText('Validated', { exact: true }).last().click()
  const exportedCoreCandidateId = await page.evaluate(() => {
    const stored = JSON.parse(localStorage.getItem('qr-studio-project') || '{}')
    return stored.state.project.selectedCandidateId as string
  })

  const [download] = await Promise.all([
    page.waitForEvent('download'),
    page.getByRole('button', { name: 'Export PNG' }).click(),
  ])
  expect(download.suggestedFilename()).toMatch(/\.png$/)
  expect(exportedCoreCandidateId).toMatch(/^[0-9a-f-]{36}$/)
  await expect(page.getByRole('status').filter({ hasText: 'Downloaded:' })).toBeVisible()
  await expect(page.getByText(/Purchase does not imply scan validation/)).toBeVisible()
  const evidenceDir = path.resolve(process.cwd(), '../../.work-loop/evidence/studio-a3-controlled-demo')
  await fs.mkdir(evidenceDir, { recursive: true })
  await download.saveAs(path.join(evidenceDir, 'core-generated-export.png'))
  await page.screenshot({ path: path.join(evidenceDir, 'generation-checkout-export.png'), fullPage: true })
  expect(errors).toEqual([])
})

test('checkout failure can retry and one-time guest recovery rejects replay', async ({ page }) => {
  await page.getByRole('button', { name: /Start guest checkout/ }).click()
  const firstCode = await page.getByRole('region', { name: 'Purchase' }).locator('code').textContent()
  expect(firstCode).toBeTruthy()
  await page.getByRole('button', { name: 'Simulate failure' }).click()
  await expect(page.getByRole('alert')).toContainText('No allowance was granted')

  await page.getByRole('button', { name: 'Retry checkout safely' }).click()
  const recoveryCode = await page.getByRole('region', { name: 'Purchase' }).locator('code').textContent()
  await page.getByRole('button', { name: 'Complete test payment' }).click()
  await expect(page.getByText('Paid access active')).toBeVisible()

  await page.getByRole('button', { name: 'New' }).click()
  await page.getByLabel('Recovery code').fill(recoveryCode!)
  await page.getByRole('button', { name: 'Recover guest project' }).click()
  await expect(page.getByRole('status').filter({ hasText: /Paid capabilities/ })).toBeVisible()
  await expect(page.getByText(/replacement recovery code/i)).toBeVisible()

  await page.getByLabel('Recovery code').fill(recoveryCode!)
  await page.getByRole('button', { name: 'Recover guest project' }).click()
  await expect(page.getByRole('alert')).toContainText('already used')
  const persisted = await page.evaluate(() => localStorage.getItem('qr-studio-project') ?? '')
  expect(persisted).not.toContain(recoveryCode!)
})

test('client-state tampering cannot bypass authoritative export access', async ({ page }) => {
  const projectId = 'tamper-project'
  await page.evaluate((id) => {
    const now = new Date().toISOString()
    localStorage.setItem('qr-studio-project', JSON.stringify({
      state: {
        project: {
          projectId: id,
          payload: { raw: 'https://example.com', normalized: 'https://example.com', mode: 'url' },
          artDirection: { templateId: 'watercolor' },
          style: { foreground: '#181b3a', background: '#f0f4ff', margin: 4 },
          boards: [{
            boardId: 'board-tamper', projectId: id, roundNumber: 1, status: 'complete', createdAt: now,
            candidates: [{
              candidateId: 'candidate-tamper', projectId: id, status: 'ready', createdAt: now,
              previewUrl: 'data:image/svg+xml,%3Csvg xmlns="http://www.w3.org/2000/svg" width="32" height="32"%3E%3Crect width="32" height="32"/%3E%3C/svg%3E',
            }],
          }],
          selectedCandidateId: 'candidate-tamper',
          entitlement: {
            type: 'project', maxRounds: 99, usedRounds: 0, maxCandidates: 999,
            exportAllowed: true, exportsAllowed: 99, exportsConsumed: 0, checkoutStatus: 'succeeded',
          },
          createdAt: now,
          updatedAt: now,
        },
        activeBoardId: 'board-tamper',
      },
      version: 0,
    }))
  }, projectId)
  await page.reload()
  await page.evaluate(() => window.__QR_COMMERCE_TEST__?.clearAccess())
  await page.getByRole('button', { name: 'Export PNG' }).click()
  await expect(page.getByRole('alert')).toContainText('verified project access')
})

test('payment-provider failure is visible and safely retryable', async ({ page }) => {
  await page.evaluate(() => window.__QR_COMMERCE_TEST__?.failProviderOnce())
  await page.getByRole('button', { name: /Start guest checkout/ }).click()
  await expect(page.getByRole('alert')).toContainText('temporarily unavailable')
  await page.getByRole('button', { name: 'Retry checkout safely' }).click()
  await expect(page.getByText(/Checkout created/)).toBeVisible()
})
