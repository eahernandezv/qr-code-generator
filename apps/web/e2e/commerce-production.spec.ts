import { expect, test } from '@playwright/test'

const api = 'http://127.0.0.1:4174'

test.beforeEach(async ({ page }) => {
  await page.goto('/')
  await page.evaluate(() => localStorage.clear())
  await page.reload()
})

test('production checkout uses HTTP authority and exposes no mock payment controls', async ({ page, request }) => {
  const projectPayload = 'https://example.com/customer-project'
  await page.getByPlaceholder('Enter destination URL…').fill(projectPayload)
  const responsePromise = page.waitForResponse((response) => response.url() === `${api}/api/commerce/checkouts` && response.request().method() === 'POST')
  await page.getByRole('button', { name: /Start guest checkout — \$12/ }).click()
  const checkoutResponse = await responsePromise
  expect(checkoutResponse.status()).toBe(201)
  const checkout = await checkoutResponse.json() as { checkoutSessionId: string; redirectUrl: string }

  await expect(page.getByRole('button', { name: 'Complete test payment' })).toHaveCount(0)
  await expect(page.getByRole('button', { name: 'Simulate failure' })).toHaveCount(0)
  await expect(page.getByRole('button', { name: 'Cancel checkout' })).toHaveCount(0)
  await expect(page.getByRole('button', { name: 'Check payment status' })).toBeVisible()
  const checkoutLink = page.getByRole('link', { name: 'Continue to secure checkout' })
  await expect(checkoutLink).toBeVisible()
  await expect(checkoutLink).toHaveAttribute('href', checkout.redirectUrl)
  await expect(checkoutLink).toHaveAttribute('target', '_blank')

  await checkoutLink.click({ noWaitAfter: true })
  await expect(page.getByPlaceholder('Enter destination URL…')).toHaveValue(projectPayload)
  await expect(page.getByRole('button', { name: 'Check payment status' })).toBeVisible()

  const eventResult = await request.post(`${api}/__test__/commerce/checkouts/${checkout.checkoutSessionId}/events`, { data: { type: 'succeeded', providerEventId: `browser-success-${crypto.randomUUID()}` } })
  expect(eventResult.ok()).toBe(true)
  const statusResponse = page.waitForResponse((response) => response.url().includes(`/api/commerce/checkouts/${checkout.checkoutSessionId}`))
  await page.getByRole('button', { name: 'Check payment status' }).click()
  expect((await statusResponse).status()).toBe(200)
  await expect(page.getByText('Paid access active')).toBeVisible()
  await expect(page.getByText(/0 \/ 3/).first()).toBeVisible()
})

test('localStorage manipulation grants neither rounds nor finished export', async ({ page }) => {
  const now = new Date().toISOString()
  await page.evaluate(({ now }) => {
    localStorage.setItem('qr-studio-project', JSON.stringify({ state: { project: {
      projectId: 'tampered-browser-project',
      payload: { raw: 'https://example.com', normalized: 'https://example.com', mode: 'url' },
      artDirection: { templateId: 'watercolor' }, style: { foreground: '#000', background: '#fff', margin: 4 },
      boards: [{ boardId: 'tampered-board', projectId: 'tampered-browser-project', roundNumber: 1, status: 'complete', createdAt: now,
        candidates: [{ candidateId: 'tampered-candidate', projectId: 'tampered-browser-project', status: 'ready', createdAt: now, previewUrl: 'data:image/svg+xml,%3Csvg xmlns="http://www.w3.org/2000/svg" width="32" height="32"%3E%3Crect width="32" height="32"/%3E%3C/svg%3E' }] }],
      selectedCandidateId: 'tampered-candidate', entitlement: { type: 'project', maxRounds: 999, usedRounds: 0, maxCandidates: 999, candidatesConsumed: 0, exportAllowed: true, exportsAllowed: 99, exportsConsumed: 0, checkoutStatus: 'succeeded', extraExplorationAvailable: true }, createdAt: now, updatedAt: now,
    }, activeBoardId: 'tampered-board' }, version: 0 }))
  }, { now })
  await page.reload()
  const exportResponse = page.waitForResponse((response) => response.url() === `${api}/api/commerce/exports`)
  await page.getByRole('button', { name: 'Export PNG' }).click()
  expect((await exportResponse).status()).toBe(403)
  await expect(page.getByRole('alert')).toContainText(/verified project access|required|invalid/i)
  const generationStatus = await page.evaluate(async (base) => (await fetch(`${base}/api/commerce/generations`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ operationId: 'tampered-round', outcome: 'succeeded', candidateCount: 4 }) })).status, api)
  expect(generationStatus).toBe(403)
})

test('production path fails closed when commerce API is unavailable', async ({ page }) => {
  await page.route(`${api}/api/commerce/**`, (route) => route.abort())
  await page.getByRole('button', { name: /Start guest checkout/ }).click()
  await expect(page.getByRole('alert')).toContainText('Commerce service is unavailable')
  await expect(page.getByText('Paid access active')).toHaveCount(0)
})
