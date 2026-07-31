/**
 * Contract-derived TypeScript types from qr-core-api.v1 and artistic-qr-api.v1.
 * These are read-only consumption contracts — Studio does not own generation.
 */

export type QrMode = 'url' | 'text' | 'wifi' | 'email' | 'phone'

export type ErrorCorrectionLevel = 'L' | 'M' | 'Q' | 'H'

export type EyeStyle = 'square' | 'rounded' | 'circle' | 'leaf'

export type ModuleStyle = 'square' | 'rounded' | 'dot' | 'diamond'

export type CompositionType = 'centered' | 'offset' | 'integrated' | 'surround'

export type PaletteFamily = 'rainbow' | 'pride' | 'trans' | 'bi' | 'berry' | 'forest'

export type PalettePattern =
  | 'solid'
  | 'horizontalGradient'
  | 'verticalGradient'
  | 'diagonalGradient'
  | 'flagRows'
  | 'spiral'
  | 'radialRings'

export type ColorIntensity = 'mellow' | 'balanced' | 'punchy'

export type ExportFormat = 'svg' | 'png' | 'pdf' | 'eps'

export type CandidateStatus =
  | 'pending'
  | 'generating'
  | 'ready'
  | 'validating'
  | 'validated'
  | 'failed'
  | 'rejected'

export type BoardStatus = 'pending' | 'generating' | 'complete' | 'partial' | 'failed'

export type EntitlementType = 'preview' | 'project' | 'exploration'

export interface Payload {
  raw: string
  normalized: string
  mode: QrMode
}

export interface Palette {
  primary?: string
  secondary?: string
  accent?: string
  background?: string
}

export interface ArtDirection {
  templateId: string
  prompt?: string
  referenceImage?: string
  artisticStrength?: number
  composition?: CompositionType
  palette?: Palette
  paletteFamily?: PaletteFamily
  palettePattern?: PalettePattern
  colorIntensity?: ColorIntensity
  protectedQrProminence?: number
}

export interface StyleSpec {
  foreground?: string
  background?: string
  margin?: number
  eyeStyle?: EyeStyle
  moduleStyle?: ModuleStyle
  logo?: {
    dataUrl: string
    sizeRatio: number
    cornerRadius: number
  }
}

export interface RenderResult {
  success: boolean
  format: ExportFormat
  dataUrl: string
  blobSizeBytes?: number
  widthPx: number
  heightPx: number
  provenance?: {
    engine: string
    version: string
    matrixSpec?: MatrixSpec
  }
  error?: ErrorEnvelope
}

export interface MatrixSpec {
  version: number
  modules: number
  mask: number
  errorCorrectionLevel: ErrorCorrectionLevel
  functionalModuleCoords?: Array<{ x: number; y: number; role: string }>
}

export interface ErrorEnvelope {
  code: string
  message: string
  requestId: string
  retryable?: boolean
  details?: Record<string, unknown>
}

export interface Candidate {
  candidateId: string
  projectId: string
  status: CandidateStatus
  previewUrl?: string
  renderResult?: RenderResult
  validationResult?: ValidationResult
  artisticScore?: number
  provenance?: {
    mode: 'deterministic_template' | 'provider_generative'
    provider?: string
    model?: string
    version?: string
    seed?: string
  }
  createdAt: string
  error?: { code: string; message: string }
}

export interface GenerationBoard {
  boardId: string
  projectId: string
  roundNumber: number
  candidates: Candidate[]
  status: BoardStatus
  createdAt: string
  completedAt?: string
}

export interface ValidationResult {
  pass: boolean
  confidence: number
  decoderResults?: Array<{
    decoder: string
    pass: boolean
    decodedPayload?: string
    match?: boolean
    latencyMs?: number
  }>
  perturbationSummary?: Array<{ type: string; passRate: number; details?: string }>
  recommendations?: string[]
}

export interface Entitlement {
  type: EntitlementType
  maxRounds: number
  usedRounds: number
  maxCandidates: number
  exportAllowed: boolean
  checkoutStatus?: 'idle' | 'pending' | 'succeeded' | 'failed' | 'canceled' | 'expired'
  candidatesConsumed?: number
  exportsAllowed?: number
  exportsConsumed?: number
  extraExplorationAvailable?: boolean
  expiresAt?: string
}

export interface ProjectState {
  projectId: string
  payload: Payload
  artDirection: ArtDirection
  style?: StyleSpec
  boards: GenerationBoard[]
  selectedCandidateId?: string
  entitlement: Entitlement
  createdAt: string
  updatedAt: string
}
