import { expect, test, type Page } from '@playwright/test'

async function consoleErrors(page: Page) {
  const errors: string[] = []
  page.on('console', (message) => {
    if (message.type() === 'error') errors.push(message.text())
  })
  return errors
}

test.beforeEach(async ({ page }) => {
  await page.goto('/')
  await page.evaluate(() => window.__QR_COMMERCE_TEST__?.reset())
  await page.reload()
})

test('free preview → $12 checkout → paid refinement → service-authorized export', async ({ page }) => {
  const errors = await consoleErrors(page)
  await page.getByPlaceholder('Enter url…').fill('https://example.com')
  await page.getByRole('button', { name: 'Generate 4' }).click()
  await expect(page.getByText('complete', { exact: true })).toBeVisible({ timeout: 12_000 })
  await page.getByText('Ready', { exact: true }).first().click()
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
  await page.getByText('Ready', { exact: true }).last().click()

  const [download] = await Promise.all([
    page.waitForEvent('download'),
    page.getByRole('button', { name: 'Export PNG' }).click(),
  ])
  expect(download.suggestedFilename()).toMatch(/\.png$/)
  await expect(page.getByRole('status').filter({ hasText: 'Downloaded:' })).toBeVisible()
  await expect(page.getByText(/Purchase does not imply scan validation/)).toBeVisible()
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
