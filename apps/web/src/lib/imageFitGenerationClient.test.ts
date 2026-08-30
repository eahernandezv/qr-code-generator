import { describe, expect, it, vi } from 'vitest'
import { createHash, webcrypto } from 'node:crypto'
import fixture from '../../../../packages/contracts/fixtures/image-fit-qr/valid-balanced-response.v1.json'
import { buildImageFitRequest, IMAGE_FIT_STRENGTHS, imageFitExportDecision, ImageFitGenerationClient, isGenerationResponse, unwrapGenerationResponse, verifyInlineArtifactHashes } from './imageFitGenerationClient'

const controls = {
  destination: 'https://example.com/a?source=test#fragment',
  treatment: 'pixel_blend' as const,
  strength: 'balanced' as const,
  detail: 'detailed' as const,
  linkMode: 'optimized_short_link' as const,
  targetImage: fixture.request.target_image as Parameters<typeof buildImageFitRequest>[0]['targetImage'],
}

describe('Image-Fit real generation boundary', () => {
  it('maps customer intensity names to the frozen deterministic Core modes', () => {
    expect(IMAGE_FIT_STRENGTHS).toEqual([
      { label: 'Mellow', mode: 'readable' },
      { label: 'Balanced', mode: 'balanced' },
      { label: 'Punchy', mode: 'image_first' },
    ])
  })

  it('keeps preview, parity, scan, and Image-first blockers authoritative', () => {
    const balanced = fixture.candidates[0] as Parameters<typeof imageFitExportDecision>[0]
    expect(imageFitExportDecision(balanced)).toMatchObject({ allowed: false, blockers: expect.arrayContaining(['preview_export_parity_not_proven', 'preview_not_paid', 'short_link_not_committed']) })
    const punchy = { ...balanced, mode: 'image_first' as const, export_authority: { ...balanced.export_authority, export_allowed: true, blockers: [], preview_export_parity: 'proven' as const } }
    expect(imageFitExportDecision(punchy)).toMatchObject({ allowed: false, blockers: expect.arrayContaining(['image_first_experimental']) })
  })

  it('verifies inline preview bytes against the Core artifact hash and rejects mismatch', async () => {
    vi.stubGlobal('crypto', webcrypto)
    const svg = '<svg xmlns="http://www.w3.org/2000/svg"><rect width="1" height="1"/></svg>'
    const uri = `data:image/svg+xml;base64,${Buffer.from(svg).toString('base64')}`
    const sha256 = createHash('sha256').update(svg).digest('hex')
    const response = structuredClone(fixture) as Parameters<typeof verifyInlineArtifactHashes>[0]
    response.candidates[0].artifacts = [{ kind: 'export_svg', uri, sha256 }]
    await expect(verifyInlineArtifactHashes(response)).resolves.toBeUndefined()
    response.candidates[0].artifacts[0].sha256 = '0'.repeat(64)
    await expect(verifyInlineArtifactHashes(response)).rejects.toThrow(/did not match the authoritative hash/)
  })

  it('creates the frozen contract-shaped preview request with deterministic constraints and no export entitlement', () => {
    const request = buildImageFitRequest(controls, 'l2req-test-0001')
    expect(request).toEqual(expect.objectContaining({
      request_id: 'l2req-test-0001',
      destination: expect.objectContaining({ normalized_url: 'https://example.com/a?source=test', safety: { verdict: 'pass', policy_version: 'studio-public-https-input-v1' } }),
      user_controls: { treatment: 'pixel_blend', strength: 'balanced', detail: 'detailed', link_mode: 'optimized_short_link' },
      constraints: { max_candidates: 12, max_search_ms: 45000, allowed_ecc: ['Q', 'H'], allowed_masks: [0, 1, 2, 3, 4, 5, 6, 7], allowed_versions: [8, 9, 10, 11, 12] },
      entitlement_context: { mode: 'preview', export_entitled: false },
    }))
  })

  it.each(['http://example.com', 'https://localhost/path', 'https://127.0.0.1/path', 'not a url'])('rejects unsafe/invalid destination %s before a request is sent', (destination) => {
    expect(() => buildImageFitRequest({ ...controls, destination }, 'l2req-test-0002')).toThrow()
  })

  it('posts the exact request and accepts only a request-bound contract response', async () => {
    const request = buildImageFitRequest(controls, fixture.request.request_id)
    const fetchMock = vi.fn().mockResolvedValue({ ok: true, json: async () => fixture })
    vi.stubGlobal('fetch', fetchMock)
    const response = await new ImageFitGenerationClient('/api/artistic-qr/image-fit/candidates').generate(request)
    expect(response.candidates).toHaveLength(1)
    expect(fetchMock).toHaveBeenCalledWith('/api/artistic-qr/image-fit/candidates', expect.objectContaining({ method: 'POST', body: JSON.stringify(request) }))
  })

  it('unwraps the live Core HTTP success envelope before contract validation', async () => {
    const request = buildImageFitRequest(controls, fixture.request.request_id)
    const envelope = { success: true, result: fixture }
    expect(unwrapGenerationResponse(envelope)).toBe(fixture)
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue({ ok: true, json: async () => envelope }))
    const response = await new ImageFitGenerationClient('/api/artistic-qr/image-fit/candidates').generate(request)
    expect(response.schema_version).toBe('image-fit-qr-api.v1')
    expect(response.candidates).toHaveLength(1)
  })

  it('accepts a hash- and payload-bound Core fallback without upgrading Q7 export authority', async () => {
    vi.stubGlobal('crypto', webcrypto)
    const request = buildImageFitRequest(controls, fixture.request.request_id)
    const svg = '<svg xmlns="http://www.w3.org/2000/svg"><rect width="2" height="2"/></svg>'
    const uri = `data:image/svg+xml;base64,${Buffer.from(svg).toString('base64')}`
    const sha256 = createHash('sha256').update(svg).digest('hex')
    const encodedPayload = 'https://placeholder-online.com/r/bD7xQ2'
    const payloadSha256 = createHash('sha256').update(encodedPayload).digest('hex')
    const result = { ...fixture, candidates: [{ ...fixture.candidates[0], qr_settings: { ...fixture.candidates[0].qr_settings, payload_sha256: payloadSha256 } }] }
    const envelope = {
      success: true,
      result,
      authorized_fallback: { artifact: { kind: 'export_svg', uri, sha256 }, encoded_payload: encodedPayload, payload_sha256: payloadSha256, scan_evidence: fixture.candidates[0].scan_evidence },
    }
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue({ ok: true, json: async () => envelope }))
    const response = await new ImageFitGenerationClient('/real').generate(request)
    expect(response.authorized_fallback).toMatchObject({ artifact: { sha256 }, payload_sha256: payloadSha256, scan_evidence: { verdict: 'pass' } })
    expect(imageFitExportDecision(response.candidates[0]).allowed).toBe(false)
  })

  it('rejects a zero-candidate fallback unless its exact encoded payload matches the declared payload hash', async () => {
    vi.stubGlobal('crypto', webcrypto)
    const request = buildImageFitRequest(controls, fixture.request.request_id)
    const svg = '<svg xmlns="http://www.w3.org/2000/svg"/>'
    const uri = `data:image/svg+xml;base64,${Buffer.from(svg).toString('base64')}`
    const envelope = {
      success: true,
      result: { ...fixture, candidates: [] },
      authorized_fallback: { artifact: { kind: 'export_svg', uri, sha256: createHash('sha256').update(svg).digest('hex') }, encoded_payload: 'https://wrong.example/', payload_sha256: '0'.repeat(64), scan_evidence: fixture.candidates[0].scan_evidence },
    }
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue({ ok: true, json: async () => envelope }))
    const response = await new ImageFitGenerationClient('/real').generate(request)
    expect(response.candidates).toEqual([])
    expect(response.authorized_fallback).toBeUndefined()
  })

  it('fails closed for malformed or cross-request responses', async () => {
    const request = buildImageFitRequest(controls, 'l2req-test-0003')
    expect(isGenerationResponse(fixture, request.request_id)).toBe(false)
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue({ ok: true, json: async () => ({ ...fixture, request: { ...fixture.request, request_id: request.request_id }, candidates: [{ ...fixture.candidates[0], protected_regions: { ...fixture.candidates[0].protected_regions, alignment: false } }] }) }))
    await expect(new ImageFitGenerationClient('/real').generate(request)).rejects.toThrow(/invalid Image-Fit response/)
  })

  it('does not substitute fixture evidence when Creator is unavailable', async () => {
    const request = buildImageFitRequest(controls, 'l2req-test-0004')
    vi.stubGlobal('fetch', vi.fn().mockRejectedValue(new TypeError('network down')))
    await expect(new ImageFitGenerationClient('/real').generate(request)).rejects.toThrow(/service is unavailable/)
  })

  it('runs readiness after upload and uses the prepared asset for generation', async () => {
    vi.stubGlobal('crypto', webcrypto)
    const sourceAsset = { assetId: 'sha256:source', uri: 'uploads/' + '1'.repeat(64) + '.png', mimeType: 'image/png' as const, sha256: '1'.repeat(64), width: 80, height: 48, byteLength: 256 }
    const preparedAsset = { assetId: 'sha256:prepared', uri: 'uploads/' + '2'.repeat(64) + '.png', mimeType: 'image/png' as const, sha256: '2'.repeat(64), width: 1024, height: 1024, byteLength: 1024 }
    const uploadTarget = { image_ref: sourceAsset.uri, mime_type: 'image/png' as const, width_px: 80, height_px: 48, sha256: sourceAsset.sha256, complexity: 'simple_mark' as const }
    const fetchMock = vi.fn()
      .mockResolvedValueOnce({ ok: true, json: async () => ({ success: true, target_image: uploadTarget, source_asset: sourceAsset }) })
      .mockResolvedValueOnce({ ok: true, json: async () => ({
        success: true,
        report: {
          requestId: 'imgready-test-1',
          decision: 'prepared',
          sourceAsset,
          preparedAsset,
          issues: [{ code: 'LOW_RESOLUTION', severity: 'warning', message: 'Prepared to launch dimensions.' }],
          cleanupActions: [{ action: 'pad', applied: true }],
          proof: { attempted: true, pass: true, appOrCorePath: '@qr/artistic-qr.generateCandidates', candidateIds: ['a', 'b'], scanSummary: { passed: 2, failed: 0, thresholdVersion: 'qr-core-validation.v1' } },
        },
      }) })
    vi.stubGlobal('fetch', fetchMock)

    const upload = await new ImageFitGenerationClient('/api/artistic-qr/image-fit/candidates').uploadTargetImage('data:image/png;base64,abc')

    expect(upload.sourceAsset).toEqual(sourceAsset)
    expect(upload.readinessReport?.decision).toBe('prepared')
    expect(upload.targetImage).toMatchObject({ image_ref: preparedAsset.uri, sha256: preparedAsset.sha256, width_px: 1024, height_px: 1024, complexity: 'simple_mark' })
    expect(fetchMock).toHaveBeenNthCalledWith(1, '/api/artistic-qr/image-fit/uploads', expect.objectContaining({ method: 'POST' }))
    expect(fetchMock).toHaveBeenNthCalledWith(2, '/api/artistic-qr/image-readiness/assess', expect.objectContaining({ method: 'POST' }))
  })

  it('fails closed when readiness proof rejects an upload', async () => {
    vi.stubGlobal('crypto', webcrypto)
    const sourceAsset = { assetId: 'sha256:source', uri: 'uploads/' + '3'.repeat(64) + '.png', mimeType: 'image/png' as const, sha256: '3'.repeat(64), width: 80, height: 48, byteLength: 256 }
    vi.stubGlobal('fetch', vi.fn()
      .mockResolvedValueOnce({ ok: true, json: async () => ({ success: true, target_image: { image_ref: sourceAsset.uri, mime_type: 'image/png', width_px: 80, height_px: 48, sha256: sourceAsset.sha256, complexity: 'simple_mark' }, source_asset: sourceAsset }) })
      .mockResolvedValueOnce({ ok: true, json: async () => ({ success: true, report: { requestId: 'imgready-test-2', decision: 'rejected', sourceAsset, issues: [{ code: 'SCAN_PROOF_FAILED', severity: 'blocking', message: 'No proof pass.' }], cleanupActions: [], proof: { attempted: true, pass: false, candidateIds: [] } } }) }))

    await expect(new ImageFitGenerationClient('/api/artistic-qr/image-fit/candidates').uploadTargetImage('data:image/png;base64,abc')).rejects.toThrow(/readiness/i)
  })

})
