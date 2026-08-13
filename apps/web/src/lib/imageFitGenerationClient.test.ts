import { describe, expect, it, vi } from 'vitest'
import fixture from '../../../../packages/contracts/fixtures/image-fit-qr/valid-balanced-response.v1.json'
import { buildImageFitRequest, ImageFitGenerationClient, isGenerationResponse } from './imageFitGenerationClient'

const controls = {
  destination: 'https://example.com/a?source=test#fragment',
  treatment: 'pixel_blend' as const,
  strength: 'balanced' as const,
  detail: 'detailed' as const,
  linkMode: 'optimized_short_link' as const,
  targetImage: fixture.request.target_image as Parameters<typeof buildImageFitRequest>[0]['targetImage'],
}

describe('Image-Fit real generation boundary', () => {
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
