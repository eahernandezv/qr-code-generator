import type { ArtDirection, Candidate, GenerationBoard, Payload, StyleSpec, ValidationResult } from '../types'
import { buildStudioGenerationRequest } from './studioGenerationRequest'

interface CoreScanResult {
  pass: boolean
  decoder: string
  scannedPayload: string
  tests: Array<{ name: string; pass: boolean; perturbation?: string }>
  overallConfidence: 'high' | 'medium' | 'low' | 'failed'
}

interface CoreCandidate {
  candidateId: string
  rendered: {
    format: 'svg' | 'png-dataurl'
    data: string
    width: number
    height: number
  }
  scanResults: CoreScanResult[]
  exportAllowed: boolean
  artisticScore: number
  provenance?: {
    generationMode: string
    provider?: string
    modelVersion?: string
    adapterVersion: string
    validationVersion: string
    createdAt: string
  }
}

interface CoreGenerationBoard {
  boardId: string
  candidates: CoreCandidate[]
  status: 'completed'
}

interface CoreGenerationResponse {
  success: true
  board: CoreGenerationBoard
}

export interface StudioGenerationInput {
  projectId: string
  roundNumber: number
  payload: Payload
  artDirection: ArtDirection
  style?: StyleSpec
  signal?: AbortSignal
}

export class CoreGenerationClient {
  constructor(private readonly baseUrl = import.meta.env.VITE_ARTISTIC_QR_API_URL || '/api/artistic-qr') {}

  async generateBoard(input: StudioGenerationInput): Promise<GenerationBoard> {
    const request = buildStudioGenerationRequest(input)
    let response: Response
    try {
      response = await fetch(`${this.baseUrl}/candidates`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(request),
        signal: input.signal,
      })
    } catch (error) {
      if (error instanceof DOMException && error.name === 'AbortError') throw error
      throw new Error('Core generation service is unavailable. Please try again.')
    }

    const value = await response.json().catch(() => undefined) as unknown
    if (!response.ok) {
      const error = value as { code?: unknown; message?: unknown } | undefined
      const code = typeof error?.code === 'string' ? `${error.code}: ` : ''
      const message = typeof error?.message === 'string' ? error.message : 'Core candidate generation could not be completed.'
      throw new Error(`${code}${message}`)
    }
    return mapBoard(value, input)
  }
}

function mapBoard(value: unknown, input: StudioGenerationInput): GenerationBoard {
  if (!value || typeof value !== 'object') throw invalidResponse()
  const response = value as Partial<CoreGenerationResponse>
  const board = response.board
  if (
    response.success !== true
    || !board
    || typeof board.boardId !== 'string'
    || board.status !== 'completed'
    || !Array.isArray(board.candidates)
    || board.candidates.length !== 4
  ) throw invalidResponse()

  const createdAt = new Date().toISOString()
  return {
    boardId: board.boardId,
    projectId: input.projectId,
    roundNumber: input.roundNumber,
    candidates: board.candidates.map((candidate) => mapCandidate(candidate, input.projectId, createdAt)),
    status: 'complete',
    createdAt,
    completedAt: createdAt,
  }
}

function mapCandidate(candidate: CoreCandidate, projectId: string, fallbackCreatedAt: string): Candidate {
  if (
    !candidate
    || typeof candidate.candidateId !== 'string'
    || !candidate.rendered
    || (candidate.rendered.format !== 'svg' && candidate.rendered.format !== 'png-dataurl')
    || typeof candidate.rendered.data !== 'string'
    || candidate.rendered.data.length === 0
    || !Number.isFinite(candidate.rendered.width)
    || !Number.isFinite(candidate.rendered.height)
    || !Array.isArray(candidate.scanResults)
    || typeof candidate.exportAllowed !== 'boolean'
  ) throw invalidResponse()

  const previewUrl = candidate.rendered.format === 'svg'
    ? `data:image/svg+xml;charset=utf-8,${encodeURIComponent(candidate.rendered.data)}`
    : candidate.rendered.data
  const validationResult = mapValidation(candidate.scanResults[0])
  const provenance = candidate.provenance
  const validMode = provenance?.generationMode === 'provider_generative'
    ? 'provider_generative'
    : 'deterministic_template'

  return {
    candidateId: candidate.candidateId,
    projectId,
    status: candidate.exportAllowed && validationResult?.pass ? 'validated' : 'rejected',
    previewUrl,
    renderResult: {
      success: true,
      format: candidate.rendered.format === 'svg' ? 'svg' : 'png',
      dataUrl: previewUrl,
      widthPx: candidate.rendered.width,
      heightPx: candidate.rendered.height,
      ...(provenance ? {
        provenance: {
          engine: provenance.adapterVersion,
          version: provenance.validationVersion,
        },
      } : {}),
    },
    ...(validationResult ? { validationResult } : {}),
    artisticScore: candidate.artisticScore,
    ...(provenance ? {
      provenance: {
        mode: validMode,
        provider: provenance.provider,
        model: provenance.modelVersion,
        version: provenance.adapterVersion,
      },
    } : {}),
    createdAt: provenance?.createdAt ?? fallbackCreatedAt,
  }
}

function mapValidation(result: CoreScanResult | undefined): ValidationResult | undefined {
  if (!result || !Array.isArray(result.tests)) return undefined
  const confidence = result.tests.length > 0
    ? result.tests.filter((test) => test.pass).length / result.tests.length
    : confidenceValue(result.overallConfidence)
  const perturbations = new Map<string, { pass: number; total: number }>()
  for (const test of result.tests) {
    const type = test.perturbation ?? test.name
    const current = perturbations.get(type) ?? { pass: 0, total: 0 }
    current.total += 1
    if (test.pass) current.pass += 1
    perturbations.set(type, current)
  }
  return {
    pass: result.pass,
    confidence,
    decoderResults: [{
      decoder: result.decoder,
      pass: result.pass,
      decodedPayload: result.scannedPayload,
      match: result.pass,
    }],
    perturbationSummary: Array.from(perturbations, ([type, counts]) => ({
      type,
      passRate: counts.total === 0 ? 0 : counts.pass / counts.total,
    })),
  }
}

function confidenceValue(confidence: CoreScanResult['overallConfidence']): number {
  return confidence === 'high' ? 1 : confidence === 'medium' ? 0.75 : confidence === 'low' ? 0.5 : 0
}

function invalidResponse(): Error {
  return new Error('Core generation returned an invalid candidate board.')
}

export const coreGenerationClient = new CoreGenerationClient()
