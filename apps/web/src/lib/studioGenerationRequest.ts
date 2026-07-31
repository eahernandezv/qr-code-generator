import type { GenerationRequest } from '@qr/artistic-qr'
import { resolveArtisticRenderIntent } from '@qr/artistic-qr/render-intent'
import {
  generateMatrix,
  normalizePayload,
  renderDeterministicSvg,
  type NormalizedPayload,
  type RenderedArtifact,
} from '@qr/qr-core/browser'
import type { ArtDirection, Payload } from '../types'

export type StudioGenerationRequest = GenerationRequest & { normalizedPayload: NormalizedPayload }

const ART_DIRECTION_IDS: Record<string, string> = {
  watercolor: 'organic-botanical',
  geometric: 'architectural-geometric',
  minimalist: 'premium-minimal',
}

const FOCAL_AREAS: Record<string, NonNullable<NonNullable<GenerationRequest['composition']>['focalArea']>> = {
  centered: 'center',
  offset: 'right',
  integrated: 'balanced',
  surround: 'top',
}

export function buildStudioGenerationRequest(input: {
  payload: Payload
  artDirection: ArtDirection
}): StudioGenerationRequest {
  const { payload, artDirection } = input
  const canonical = payload.normalized || payload.raw.trim()
  const normalizedPayload = normalizePayload({ content: canonical, mode: payload.mode, errorCorrectionLevel: 'M' })

  return {
    normalizedPayload,
    mode: 'deterministic_template',
    artDirectionId: ART_DIRECTION_IDS[artDirection.templateId] ?? 'premium-minimal',
    ...(artDirection.prompt ? { prompt: artDirection.prompt } : {}),
    ...(typeof artDirection.artisticStrength === 'number'
      ? { artisticStrength: artDirection.artisticStrength }
      : {}),
    palette: { ...artDirection.palette },
    ...(artDirection.paletteFamily ? { paletteFamily: artDirection.paletteFamily } : {}),
    ...(artDirection.palettePattern ? { palettePattern: artDirection.palettePattern } : {}),
    ...(artDirection.colorIntensity ? { colorIntensity: artDirection.colorIntensity } : {}),
    composition: {
      focalArea: FOCAL_AREAS[artDirection.composition ?? 'centered'],
      qrProminence: artDirection.protectedQrProminence,
    },
  }
}

export function renderStudioPreview(request: StudioGenerationRequest): RenderedArtifact {
  const intent = resolveArtisticRenderIntent(request)
  const matrix = generateMatrix(request.normalizedPayload)
  return renderDeterministicSvg(matrix, {
    ...intent.previewOptions,
    format: 'svg',
  })
}
