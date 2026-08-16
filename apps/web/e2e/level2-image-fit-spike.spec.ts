import { test, expect } from '@playwright/test'
import fs from 'node:fs'
import path from 'node:path'
import { createHash } from 'node:crypto'

const evidenceRoot = path.resolve(process.cwd(), '../../docs/program/evidence/q9-quality-loop/cycle-8-target-aware-centering')
const evidenceDir = path.resolve(process.cwd(), '../../docs/program/evidence/studio-q9-integration/browser')
const fixture = JSON.parse(fs.readFileSync(path.resolve(process.cwd(), '../../packages/contracts/fixtures/image-fit-qr/valid-balanced-response.v1.json'), 'utf8'))
const q9Evidence = JSON.parse(fs.readFileSync(path.join(evidenceRoot, 'objective-evidence.json'), 'utf8'))
const q9Medium = q9Evidence.targets.find((target: { id: string }) => target.id === 'medium-logo')
const q9Balanced = q9Medium.candidates.find((candidate: { mode: string }) => candidate.mode === 'balanced')
const q9BalancedSvg = fs.readFileSync(path.join(evidenceRoot, q9Balanced.artifact.path), 'utf8')
const fallbackSvg = fs.readFileSync(path.join(evidenceRoot, 'medium-logo/artifacts/fallback.svg'), 'utf8')

function q9BalancedCandidate() {
  if (!q9Balanced) throw new Error('Missing Q9 balanced evidence')
  return {
    ...fixture.candidates[0],
    candidate_id: q9Balanced.candidate_id,
    mode: q9Balanced.mode,
    status: 'validated',
    scan_evidence: q9Balanced.scan,
    qr_settings: { ...fixture.candidates[0].qr_settings, ...q9Balanced.settings },
    image_fit_evidence: {
      ...fixture.candidates[0].image_fit_evidence,
      fit_label: 'balanced',
      recognition_score: q9Balanced.recognition_score,
      protected_zone_conflict_score: q9Balanced.protected_conflict_score,
      score_version: 'image-fit-negative-space-showcase-q9-target-aware-centering',
    },
    protected_regions: { ...fixture.candidates[0].protected_regions, violations: q9Balanced.protected_violations },
    export_authority: {
      ...fixture.candidates[0].export_authority,
      blockers: ['requires_payment_or_internal_entitlement', 'preview_export_parity_not_proven'],
      preview_export_parity: 'not_proven',
    },
    artifacts: [{ kind: 'export_svg', uri: `data:image/svg+xml;base64,${Buffer.from(q9BalancedSvg).toString('base64')}`, sha256: q9Balanced.artifact.sha256 }],
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
    await route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify({ ...fixture, request: { ...fixture.request, request_id: request.request_id }, candidates: [q9BalancedCandidate()] }) })
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
  await expect(selected).toHaveAttribute('data-artifact-sha256', q9Balanced.artifact.sha256)
  await expect(page.getByRole('article')).toHaveCount(0)
  await expect(page.getByRole('group', { name: 'Validated size options' })).toHaveCount(0)
  const selectedEvidence = page.getByRole('region', { name: 'Selected candidate evidence' })
  await expect(selectedEvidence).toContainText('Scan verdictPass')
  await expect(selectedEvidence).toContainText('Image recognition / fit97%')
  await expect(selectedEvidence).toContainText('Pending visual review')
  await expect(selectedEvidence).toContainText('Not sponsor-approved')
  await expect(selectedEvidence).toContainText('a scan pass reports controlled decoder results only')
  await expect(page.getByText(/sponsor-ready/i)).toHaveCount(1)
  await expect(page.getByRole('button', { name: 'Generate another set' })).toHaveCount(0)
  await page.screenshot({ path: path.join(evidenceDir, 'mobile-creator-response-bound.png'), fullPage: true })

  expect(requests).toHaveLength(1)
  const expectedControls = { ...fixture.request.user_controls }
  delete (expectedControls as { logo_size?: string }).logo_size
  expect(requests[0]).toMatchObject({ destination: { normalized_url: fixture.request.destination.normalized_url, safety: { verdict: 'pass' } }, user_controls: expectedControls, entitlement_context: { mode: 'preview', export_entitled: false } })
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

test('non-qualifying Image-Fit keeps Q9 hidden and downloads only the Core-authorized fallback bytes', async ({ page }) => {
  const outputRoot = path.resolve(process.cwd(), '../../docs/program/evidence/studio-q9-fallback-parity')
  const browserDir = path.join(outputRoot, 'browser')
  fs.mkdirSync(browserDir, { recursive: true })
  const fallbackHash = createHash('sha256').update(fallbackSvg).digest('hex')
  const encodedPayload = 'https://placeholder-online.com/r/bD7xQ2'
  const payloadSha256 = createHash('sha256').update(encodedPayload).digest('hex')
  const failedCandidates = q9Medium.candidates.map((candidate: { mode: string }) => ({
    ...fixture.candidates[0], candidate_id: `failed-${candidate.mode.replace('_', '-')}`, mode: candidate.mode, status: 'failed',
    qr_settings: { ...fixture.candidates[0].qr_settings, payload_sha256: payloadSha256 },
    scan_evidence: { ...fixture.candidates[0].scan_evidence, verdict: 'fail', checks_passed: 0 },
    image_fit_evidence: { ...fixture.candidates[0].image_fit_evidence, fit_label: 'failed' },
    export_authority: { ...fixture.candidates[0].export_authority, export_allowed: false, blockers: ['scan_not_passed', 'preview_export_parity_not_proven'] },
  }))
  await page.route('**/api/artistic-qr/image-fit/candidates', async (route) => {
    const request = route.request().postDataJSON()
    await route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify({
      success: true,
      result: { ...fixture, request: { ...fixture.request, request_id: request.request_id }, candidates: failedCandidates },
      authorized_fallback: {
        artifact: { kind: 'export_svg', uri: `data:image/svg+xml;base64,${Buffer.from(fallbackSvg).toString('base64')}`, sha256: fallbackHash },
        encoded_payload: encodedPayload,
        payload_sha256: payloadSha256,
        scan_evidence: fixture.candidates[0].scan_evidence,
      },
    }) })
  })
  await page.goto('/concepts/level2-image-fit-qr')
  await page.getByRole('button', { name: 'Generate candidates' }).click()
  await expect(page.getByRole('alert')).toContainText('Image-Fit did not qualify')
  await expect(page.getByTestId('selected-image-fit-candidate')).toHaveCount(0)
  await expect(page.getByRole('article')).toHaveCount(0)
  const fallbackPreview = page.getByTestId('level1-fallback-preview')
  await expect(fallbackPreview).toHaveAttribute('data-artifact-sha256', fallbackHash)
  await expect(fallbackPreview).toHaveAttribute('data-payload-sha256', payloadSha256)
  await expect(page.getByRole('status')).toContainText('Payment, committed short-link, scan, parity, and Image-first experimental blockers remain visible and fail closed')
  await expect(page.getByRole('button', { name: /Export|Checkout|Create short link/i })).toHaveCount(0)
  const [download] = await Promise.all([page.waitForEvent('download'), page.getByRole('button', { name: 'Download Core-authorized Level 1 fallback' }).click()])
  const downloadedPath = path.join(outputRoot, 'fallback-level1-downloaded.svg')
  await download.saveAs(downloadedPath)
  const downloadedHash = createHash('sha256').update(fs.readFileSync(downloadedPath)).digest('hex')
  expect(downloadedHash).toBe(fallbackHash)
  await page.screenshot({ path: path.join(browserDir, 'mobile-failure-fallback-download.png'), fullPage: true })
  fs.writeFileSync(path.join(outputRoot, 'fallback-download-proof.json'), `${JSON.stringify({
    schema_version: 'studio-q9-fallback-parity.v1', provider_generative_exposed: false,
    fallback: { preview_sha256: fallbackHash, downloaded_sha256: downloadedHash, encoded_payload: encodedPayload, payload_sha256: payloadSha256, candidate_payload_hashes_equal: failedCandidates.every((candidate: { qr_settings: { payload_sha256: string } }) => candidate.qr_settings.payload_sha256 === payloadSha256), scan_verdict: 'pass', downloadable: true },
    q9_modes: q9Medium.candidates.map((candidate: { mode: string; artifact: { sha256: string } }) => ({ studio_label: candidate.mode === 'readable' ? 'Mellow' : candidate.mode === 'balanced' ? 'Balanced' : 'Punchy', core_mode: candidate.mode, preview_sha256: candidate.artifact.sha256, checkout_hash: null, final_png_hash: null, final_svg_hash: null, export_denied: true, denial_blockers: ['scan_not_passed', 'preview_export_parity_not_proven'] })),
    assertions: { q9_candidates_hidden: true, q9_export_not_unlocked: true, checkout_does_not_alter_bytes: true, checkout_absent: true, fallback_preview_download_parity: downloadedHash === fallbackHash },
  }, null, 2)}\n`)
})
