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
})
