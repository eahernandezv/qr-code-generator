import { test, expect } from '@playwright/test'
import fs from 'node:fs'
import path from 'node:path'

const evidenceRoot = path.resolve(process.cwd(), '../../docs/program/evidence/studio-q7-integration')
const evidenceDir = path.join(evidenceRoot, 'browser')
const fixture = JSON.parse(fs.readFileSync(path.resolve(process.cwd(), '../../packages/contracts/fixtures/image-fit-qr/valid-balanced-response.v1.json'), 'utf8'))
const q7Evidence = JSON.parse(fs.readFileSync(path.join(evidenceRoot, 'integration-evidence.json'), 'utf8'))
const q7Balanced = q7Evidence.image_fit_modes.find((mode: { core_mode: string }) => mode.core_mode === 'balanced')
const q7BalancedSvg = fs.readFileSync(path.join(evidenceRoot, 'artifacts/balanced.svg'), 'utf8')

function q7BalancedCandidate() {
  if (!q7Balanced) throw new Error('Missing Q7 balanced evidence')
  return {
    ...fixture.candidates[0],
    status: q7Balanced.core_status,
    image_fit_evidence: {
      ...fixture.candidates[0].image_fit_evidence,
      recognition_score: 0.18,
      score_version: q7Balanced.score_version,
    },
    export_authority: {
      ...fixture.candidates[0].export_authority,
      blockers: q7Balanced.denial_blockers,
      preview_export_parity: 'not_proven',
    },
    artifacts: [{ kind: 'export_svg', uri: `data:image/svg+xml;base64,${Buffer.from(q7BalancedSvg).toString('base64')}`, sha256: q7Balanced.preview_sha256 }],
  }
}

test.use({ viewport: { width: 390, height: 844 } })

test('mobile request binding keeps scan, fit, and visual acceptance evidence separate', async ({ page }) => {
  fs.mkdirSync(evidenceDir, { recursive: true })
  const pageErrors: string[] = []
  const consoleErrors: string[] = []
  const requests: unknown[] = []
  page.on('pageerror', (error) => pageErrors.push(error.message))
  page.on('console', (message) => { if (message.type() === 'error') consoleErrors.push(message.text()) })

  await page.route('**/api/artistic-qr/image-fit/candidates', async (route) => {
    const request = route.request().postDataJSON()
    requests.push(request)
    await route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify({ ...fixture, request, candidates: [q7BalancedCandidate()] }) })
  })
  await page.goto('/concepts/level2-image-fit-qr')
  const concept = page.getByTestId('image-fit-qr-concept')
  await expect(concept).toHaveAttribute('data-export-payload-bound', 'false')
  await expect(concept).toHaveAttribute('data-checkout-bound', 'false')
  await expect(page.getByRole('button', { name: 'Generate candidates' })).toBeVisible()
  await expect(page.getByText(/Test in four steps/)).toBeVisible()
  await page.screenshot({ path: path.join(evidenceDir, 'mobile-ready-to-generate.png'), fullPage: true })

  await page.getByRole('button', { name: 'Generate candidates' }).click()
  const selected = page.getByTestId('selected-image-fit-candidate')
  await expect(selected).toBeVisible()
  await expect(selected).toHaveAttribute('data-artifact-sha256', q7Balanced.preview_sha256)
  const candidateCard = page.getByRole('article', { name: 'Balanced generated candidate' })
  await expect(candidateCard).toContainText('Scan verdictPass · 8/8')
  await expect(candidateCard).toContainText('Image fit18% · Balanced')
  await expect(candidateCard).toContainText('Visual acceptancePending')
  const selectedEvidence = page.getByRole('region', { name: 'Selected candidate evidence' })
  await expect(selectedEvidence).toContainText('Scan verdictPass')
  await expect(selectedEvidence).toContainText('Image recognition / fit18%')
  await expect(selectedEvidence).toContainText('Pending visual review')
  await expect(selectedEvidence).toContainText('Not sponsor-approved')
  await expect(selectedEvidence).toContainText('a scan pass reports controlled decoder results only')
  await expect(page.getByText(/sponsor-ready/i)).toHaveCount(1)
  await expect(page.getByRole('button', { name: 'Generate another set' })).toHaveCount(0)
  await page.screenshot({ path: path.join(evidenceDir, 'mobile-creator-response-bound.png'), fullPage: true })

  expect(requests).toHaveLength(1)
  expect(requests[0]).toMatchObject({ destination: { normalized_url: fixture.request.destination.normalized_url, safety: { verdict: 'pass' } }, user_controls: fixture.request.user_controls, entitlement_context: { mode: 'preview', export_entitled: false } })
  await page.getByRole('textbox', { name: 'Level 2 destination URL' }).fill('https://example.org/changed')
  await expect(selected).toHaveCount(0)
  await expect(page.getByRole('article')).toHaveCount(0)
  await expect(concept).toHaveAttribute('data-export-payload-bound', 'false')

  expect(pageErrors).toEqual([])
  expect(consoleErrors).toEqual([])
  await page.unroute('**/api/artistic-qr/image-fit/candidates')
  await page.route('**/api/artistic-qr/image-fit/candidates', (route) => route.abort('failed'))
  await page.getByRole('button', { name: 'Generate candidates' }).click()
  await expect(page.getByRole('alert')).toContainText('Image-Fit did not qualify')
  await expect(selected).toHaveCount(0)
  await expect(page.getByRole('article')).toHaveCount(0)
  await expect(page.getByRole('button', { name: /Export|Checkout|Create short link/i })).toHaveCount(0)
  await page.screenshot({ path: path.join(evidenceDir, 'mobile-creator-unavailable-fail-closed.png'), fullPage: true })

  const metrics = await page.evaluate(() => ({ viewport: { width: innerWidth, height: innerHeight }, documentWidth: document.documentElement.scrollWidth, horizontalOverflow: document.documentElement.scrollWidth > innerWidth, exportPayloadBound: document.querySelector('[data-testid="image-fit-qr-concept"]')?.getAttribute('data-export-payload-bound'), checkoutBound: document.querySelector('[data-testid="image-fit-qr-concept"]')?.getAttribute('data-checkout-bound'), candidateImages: document.querySelectorAll('[data-testid="selected-image-fit-candidate"]').length }))
  expect(metrics.horizontalOverflow).toBe(false)
  expect(metrics.candidateImages).toBe(0)
  expect(pageErrors).toEqual([])
  expect(consoleErrors).toEqual(['Failed to load resource: net::ERR_FAILED'])
  fs.writeFileSync(path.join(evidenceDir, 'browser-proof.json'), `${JSON.stringify({ requests, metrics, expectedFailClosedNetworkConsoleErrors: consoleErrors, pageErrors }, null, 2)}\n`)
})
