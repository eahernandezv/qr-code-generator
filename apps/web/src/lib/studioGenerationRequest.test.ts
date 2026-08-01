import { describe, expect, it } from 'vitest'
import { buildStudioGenerationRequest, renderStudioPreview } from './studioGenerationRequest'
import type { ArtDirection, Payload } from '../types'

const payload: Payload = { raw: 'https://example.com', normalized: 'https://example.com/', mode: 'url' }
const baseArt: ArtDirection = {
  templateId: 'watercolor',
  artisticStrength: 0.5,
  composition: 'centered',
  protectedQrProminence: 0.7,
  palette: { primary: '#c9184a', secondary: '#800f2f', accent: '#ff8fa3', background: '#f9e8ef' },
}

function request(patch: Partial<ArtDirection> = {}) {
  return buildStudioGenerationRequest({ payload, artDirection: { ...baseArt, ...patch } })
}

function rendered(patch: Partial<ArtDirection> = {}) {
  return renderStudioPreview(request(patch)).data
}

describe('Studio canonical generation request and predictive preview', () => {
  it('maps Berry and Studio controls into the shared Core request', () => {
    const value = request()
    expect(value.artDirectionId).toBe('organic-botanical')
    expect(value.artisticStrength).toBe(0.5)
    expect(value.palette).toMatchObject({ primary: '#c9184a', background: '#f9e8ef' })
    expect(value.composition).toEqual({ focalArea: 'center', qrProminence: 0.7 })
    expect(value.normalizedPayload.canonical).toBe('https://example.com/')
  })

  it('maps every template and composition contract value', () => {
    expect(request({ templateId: 'geometric' }).artDirectionId).toBe('architectural-geometric')
    expect(request({ templateId: 'minimalist' }).artDirectionId).toBe('premium-minimal')
    expect(request({ composition: 'offset' }).composition?.focalArea).toBe('right')
    expect(request({ composition: 'integrated' }).composition?.focalArea).toBe('balanced')
    expect(request({ composition: 'surround' }).composition?.focalArea).toBe('top')
  })

  it('maps patterned palette and color intensity into the canonical Core request', () => {
    expect(request({
      paletteFamily: 'rainbow',
      palettePattern: 'diagonalGradient',
      colorIntensity: 'punchy',
    })).toMatchObject({
      paletteFamily: 'rainbow',
      palettePattern: 'diagonalGradient',
      colorIntensity: 'punchy',
    })
  })

  it('renders Berry colors and changes output for every visible fidelity control', () => {
    const berry = rendered()
    expect(berry).toContain('fill="#c9184a"')
    expect(berry).toContain('fill="#f9e8ef"')
    expect(rendered({ templateId: 'geometric' })).not.toBe(berry)
    expect(rendered({ artisticStrength: 0.1 })).not.toBe(berry)
    expect(rendered({ composition: 'offset' })).not.toBe(berry)
    expect(rendered({ protectedQrProminence: 0.8 })).not.toBe(berry)
  })

  it('renders visible patterned palettes and distinct intensity levels', () => {
    const balanced = rendered({
      paletteFamily: 'trans',
      palettePattern: 'diagonalGradient',
      colorIntensity: 'balanced',
    })
    expect(balanced).toContain('#176b89')
    expect(rendered({
      paletteFamily: 'trans',
      palettePattern: 'diagonalGradient',
      colorIntensity: 'mellow',
    })).not.toBe(balanced)
    expect(rendered({
      paletteFamily: 'trans',
      palettePattern: 'diagonalGradient',
      colorIntensity: 'punchy',
    })).not.toBe(balanced)
  })

  it('maps body and finder treatments independently without changing the SVG viewport', () => {
    const classic = renderStudioPreview(request({ moduleStyle: 'square', eyeStyle: 'square' }))
    const dots = renderStudioPreview(request({ moduleStyle: 'dot', eyeStyle: 'square' }))
    const roundedEyes = renderStudioPreview(request({ moduleStyle: 'square', eyeStyle: 'rounded' }))
    expect(request({ moduleStyle: 'dot', eyeStyle: 'circle' })).toMatchObject({ moduleShape: 'circle', eyeShape: 'circle' })
    expect(dots.data).not.toBe(classic.data)
    expect(roundedEyes.data).not.toBe(classic.data)
    expect(dots.width).toBe(classic.width)
    expect(dots.height).toBe(classic.height)
    expect(roundedEyes.width).toBe(classic.width)
  })

  it.each(['watercolor', 'geometric', 'minimalist'])(
    'gives %s distinct scan-safe low, expressive, and high strength previews and requests',
    (templateId) => {
      const subtleRequest = request({ templateId, artisticStrength: 0 })
      const expressiveRequest = request({ templateId, artisticStrength: 0.5 })
      const boldRequest = request({ templateId, artisticStrength: 1 })
      expect(subtleRequest.artisticStrength).toBe(0)
      expect(expressiveRequest.artisticStrength).toBe(0.5)
      expect(boldRequest.artisticStrength).toBe(1)
      expect(renderStudioPreview(subtleRequest).data).not.toBe(renderStudioPreview(expressiveRequest).data)
      expect(renderStudioPreview(expressiveRequest).data).not.toBe(renderStudioPreview(boldRequest).data)
      expect(renderStudioPreview(subtleRequest).data).not.toBe(renderStudioPreview(boldRequest).data)
    },
  )
})
