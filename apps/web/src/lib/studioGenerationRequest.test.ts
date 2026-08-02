import { describe, expect, it } from 'vitest'
import fs from 'node:fs'
import path from 'node:path'
import { resolveArtisticRenderIntent } from '@qr/artistic-qr/render-intent'
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

  it('omits Match body and maps an explicit corner color separately from body color intent', () => {
    const matchBody = request()
    expect(matchBody).not.toHaveProperty('cornerColor')

    const explicit = request({ cornerColor: '#a51d31' })
    expect(explicit.cornerColor).toBe('#a51d31')
    expect(explicit.palette?.primary).toBe(baseArt.palette?.primary)

    const explicitIntent = resolveArtisticRenderIntent(explicit)
    expect(explicitIntent.cornerColor.requested).toBe('#a51d31')
    expect(explicitIntent.cornerColor.effective).toBe(explicitIntent.previewOptions.functionalColor)

    const bodyChanged = request({ palette: { ...baseArt.palette, primary: '#2d6a4f' } })
    expect(resolveArtisticRenderIntent(bodyChanged).palette.primary).toBe('#2d6a4f')
    expect(bodyChanged).not.toHaveProperty('cornerColor')
    expect(renderStudioPreview(explicit).data).not.toBe(renderStudioPreview(matchBody).data)

    const evidenceDir = path.resolve(process.cwd(), '../../.work-loop/evidence/studio-b25b-body-corner-color-ui')
    fs.mkdirSync(evidenceDir, { recursive: true })
    fs.writeFileSync(path.join(evidenceDir, 'body-corner-intent-mapping.json'), JSON.stringify({
      matchBody: {
        studioArtDirectionCornerColor: 'omitted',
        generationRequestHasCornerColor: Object.prototype.hasOwnProperty.call(matchBody, 'cornerColor'),
        resolvedCornerColor: resolveArtisticRenderIntent(matchBody).cornerColor,
      },
      selectedCornerColor: {
        studioArtDirection: { cornerColor: '#a51d31' },
        generationRequest: { cornerColor: explicit.cornerColor, palette: explicit.palette },
        resolvedCornerColor: explicitIntent.cornerColor,
        coreRenderFunctionalColor: explicitIntent.previewOptions.functionalColor,
      },
      bodyColorOnly: {
        generationRequest: { palette: bodyChanged.palette, cornerColorOmitted: !Object.prototype.hasOwnProperty.call(bodyChanged, 'cornerColor') },
        resolvedBodyPrimary: resolveArtisticRenderIntent(bodyChanged).palette.primary,
      },
      distinctPreviewArtifacts: renderStudioPreview(explicit).data !== renderStudioPreview(matchBody).data,
    }, null, 2))
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

  it('renders all three curated solid intensity variants through the canonical request', () => {
    const variants = [
      { intensity: 'mellow' as const, primary: '#405b91' },
      { intensity: 'balanced' as const, primary: '#5162da' },
      { intensity: 'punchy' as const, primary: '#2344d9' },
    ]
    const requests = variants.map(({ intensity, primary }) => request({
      colorIntensity: intensity,
      palettePattern: 'solid',
      palette: { primary, secondary: primary, accent: primary, background: '#f0f4ff' },
    }))
    expect(requests.map((value) => value.colorIntensity)).toEqual(['mellow', 'balanced', 'punchy'])
    const previews = requests.map((value) => renderStudioPreview(value))
    expect(new Set(previews.map((artifact) => artifact.data))).toHaveLength(3)
    expect(new Set(previews.map((artifact) => `${artifact.width}x${artifact.height}`))).toHaveLength(1)
  })

  it('maps Smaller, Balanced, and Larger QR size to distinct Core prominence intent and render framing', () => {
    const prominences = [0.25, 0.7, 0.85]
    const requests = prominences.map((protectedQrProminence) => request({ protectedQrProminence }))
    expect(requests.map((value) => value.composition?.qrProminence)).toEqual(prominences)
    const previews = requests.map((value) => renderStudioPreview(value))
    expect(new Set(previews.map((artifact) => artifact.data))).toHaveLength(3)
    // Core changes protected framing dimensions; QRPreview keeps its customer-visible viewport stable.
    expect(new Set(previews.map((artifact) => `${artifact.width}x${artifact.height}`))).toHaveLength(3)
  })

  it('maps all expanded body, frame, and ball treatments independently without changing the SVG viewport', () => {
    const modules = ['square', 'rounded', 'circle', 'vertical-bars', 'horizontal-bars', 'notched', 'shield'] as const
    const frames = ['square', 'rounded', 'circle', 'squircle', 'chamfered', 'diamond', 'hex', 'leaf-frame', 'opposing-leaf-frame', 'd-frame', 'inset-leaf-frame'] as const
    const balls = ['square', 'rounded', 'circle', 'squircle', 'chamfered', 'hex', 'vertical-capsule', 'horizontal-capsule', 'star', 'diamond'] as const
    const previews = [
      ...modules.map((moduleStyle) => renderStudioPreview(request({ moduleStyle, eyeFrameStyle: 'square', eyeBallStyle: 'square' }))),
      ...frames.map((eyeFrameStyle) => renderStudioPreview(request({ moduleStyle: 'square', eyeFrameStyle, eyeBallStyle: 'square' }))),
      ...balls.map((eyeBallStyle) => renderStudioPreview(request({ moduleStyle: 'square', eyeFrameStyle: 'square', eyeBallStyle }))),
    ]
    expect(request({ moduleStyle: 'shield', eyeFrameStyle: 'diamond', eyeBallStyle: 'vertical-capsule' })).toMatchObject({
      moduleShape: 'shield', eyeFrameShape: 'diamond', eyeBallShape: 'vertical-capsule',
    })
    expect(new Set(previews.slice(0, 7).map((artifact) => artifact.data))).toHaveLength(7)
    expect(new Set(previews.slice(7, 18).map((artifact) => artifact.data))).toHaveLength(11)
    expect(new Set(previews.slice(18).map((artifact) => artifact.data))).toHaveLength(10)
    for (const preview of previews) {
      expect(preview.width).toBe(previews[0].width)
      expect(preview.height).toBe(previews[0].height)
    }
  })

  it('uses legacy eyeShape only when split finder fields are absent', () => {
    expect(request({ eyeStyle: 'circle' })).toMatchObject({ eyeShape: 'circle' })
    expect(request({ eyeStyle: 'circle', eyeFrameStyle: 'squircle' })).toMatchObject({
      eyeFrameShape: 'squircle', eyeBallShape: 'circle',
    })
    expect(request({ eyeStyle: 'circle', eyeBallStyle: 'chamfered' })).toMatchObject({
      eyeFrameShape: 'circle', eyeBallShape: 'chamfered',
    })
    expect(request({ eyeStyle: 'circle', eyeFrameStyle: 'squircle' })).not.toHaveProperty('eyeShape')
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
