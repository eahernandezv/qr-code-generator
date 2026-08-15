import { IMAGE_FIT_CONTRACT, type ImageFitDetail, type ImageFitLinkMode, type ImageFitStrength, type ImageFitTreatment } from '../imageFitContract'

export type ImageFitRequestV1 = {
  request_id: string
  destination: { kind: 'url'; normalized_url: string; display_url: string; safety: { verdict: 'pass'; policy_version: string } }
  target_image: { image_ref: string; mime_type: 'image/png' | 'image/jpeg' | 'image/webp' | 'image/svg+xml'; width_px: number; height_px: number; sha256: string; complexity: 'simple_mark' | 'medium_logo' | 'complex_photo_like' | 'high_risk_thin_detail' }
  user_controls: { treatment: ImageFitTreatment; strength: ImageFitStrength; detail: ImageFitDetail; link_mode: ImageFitLinkMode }
  constraints: { max_candidates: number; max_search_ms: number; allowed_ecc: ('Q' | 'H')[]; allowed_masks: number[]; allowed_versions: number[] }
  entitlement_context: { mode: 'preview'; export_entitled: false }
}

export type ImageFitCandidateV1 = {
  candidate_id: string
  mode: ImageFitStrength
  status: 'generated' | 'validated' | 'failed' | 'experimental'
  qr_settings: {
    payload_mode: ImageFitLinkMode
    short_link?: { slug: string; state: 'reserved' | 'committed' | 'expired' | 'disabled'; route: string }
    encoded_payload_display: string
    payload_sha256?: string
    version: number
    module_count: number
    ecc: 'Q' | 'H'
    mask: number
  }
  image_treatment: { kind: string; modified_modules: number; modified_fraction: number }
  protected_regions: { quiet_zone: true; finder: true; separator: true; timing: true; alignment: true; format: true; version_info: boolean; immutable_modules_policy_version: string; violations: string[] }
  scan_evidence: { verdict: 'pass' | 'fail' | 'not_run'; decoder_suite_version: string; checks_passed: number; checks_total: number; decoders: Array<{ name: string; version: string; pass: boolean }>; physical_scan: 'not_performed' | 'pass' | 'fail'; print_scan: 'not_performed' | 'pass' | 'fail'; disclaimer: string }
  image_fit_evidence: { fit_label: 'readable' | 'balanced' | 'experimental' | 'failed'; score_version: string; recognition_score: number; protected_zone_conflict_score: number }
  export_authority: { export_allowed: boolean; blockers: string[]; requires_payment_or_internal_entitlement: true; preview_export_parity: 'proven' | 'not_proven' | 'not_applicable' }
  artifacts: Array<{ kind: 'preview_png' | 'export_png' | 'export_svg' | 'metadata_json'; uri: string; sha256: string }>
  warnings: Array<{ code: string; message: string; block_export: boolean }>
}

export type ImageFitGenerationResponseV1 = {
  schema_version: 'image-fit-qr-api.v1'
  request: ImageFitRequestV1
  candidates: ImageFitCandidateV1[]
  selection_policy: { default_mode: 'balanced'; export_requires_entitlement: true; image_first_default_export_allowed: false }
  fallback: { available: boolean; kind: 'level1_styled_qr' | 'none'; reason: string }
  authorized_fallback?: ImageFitAuthorizedFallbackV1
}

export type ImageFitAuthorizedFallbackV1 = {
  artifact: { kind: 'export_svg'; uri: string; sha256: string }
  encoded_payload: string
  payload_sha256: string
  scan_evidence: ImageFitCandidateV1['scan_evidence']
}

export type ImageFitRequestControls = {
  destination: string
  treatment: ImageFitTreatment
  strength: ImageFitStrength
  detail: ImageFitDetail
  linkMode: ImageFitLinkMode
  targetImage: ImageFitRequestV1['target_image']
}

export const IMAGE_FIT_STRENGTHS = [
  { label: 'Mellow', mode: 'readable' },
  { label: 'Balanced', mode: 'balanced' },
  { label: 'Punchy', mode: 'image_first' },
] as const satisfies ReadonlyArray<{ label: string; mode: ImageFitStrength }>

export type ImageFitExportDecision = {
  allowed: boolean
  blockers: string[]
  artifact?: ImageFitCandidateV1['artifacts'][number]
}

/** Studio never upgrades preview evidence into export authority. */
export function imageFitExportDecision(candidate: ImageFitCandidateV1): ImageFitExportDecision {
  const artifact = candidate.artifacts.find((item) => item.kind === 'export_svg' || item.kind === 'export_png')
  const blockers = [...candidate.export_authority.blockers]
  if (candidate.scan_evidence.verdict !== 'pass') blockers.push('scan_not_passed')
  if (candidate.mode === 'image_first') blockers.push('image_first_experimental')
  if (candidate.export_authority.preview_export_parity !== 'proven') blockers.push('preview_export_parity_not_proven')
  if (!artifact) blockers.push('authorized_export_artifact_missing')
  return {
    allowed: candidate.export_authority.export_allowed && blockers.length === 0,
    blockers: [...new Set(blockers)],
    ...(artifact ? { artifact } : {}),
  }
}

const SHA256 = /^[a-f0-9]{64}$/
const CANDIDATE_ID = /^[a-z0-9._:-]{6,128}$/
const ARTIFACT_KINDS = new Set(['preview_png', 'export_png', 'export_svg', 'metadata_json'])
const MODES = new Set(IMAGE_FIT_CONTRACT.controls.strengths)

export type ImageFitUploadResponseV1 = {
  success: true
  target_image: ImageFitRequestV1['target_image']
}

export function buildImageFitRequest(controls: ImageFitRequestControls, requestId = createRequestId()): ImageFitRequestV1 {
  const url = normalizePublicHttpsUrl(controls.destination)
  return {
    request_id: requestId,
    destination: {
      kind: 'url',
      normalized_url: url.toString(),
      display_url: redactDisplayUrl(url),
      safety: { verdict: 'pass', policy_version: 'studio-public-https-input-v1' },
    },
    target_image: { ...controls.targetImage },
    user_controls: { treatment: controls.treatment, strength: controls.strength, detail: controls.detail, link_mode: controls.linkMode },
    constraints: { max_candidates: 12, max_search_ms: 45_000, allowed_ecc: ['Q', 'H'], allowed_masks: [0, 1, 2, 3, 4, 5, 6, 7], allowed_versions: [8, 9, 10, 11, 12] },
    entitlement_context: { mode: 'preview', export_entitled: false },
  }
}

function createRequestId() {
  const random = globalThis.crypto?.randomUUID?.() ?? `${Date.now()}-${Math.random().toString(36).slice(2)}`
  return `l2req-${random}`.slice(0, 128)
}

function normalizePublicHttpsUrl(value: string) {
  let url: URL
  try { url = new URL(value) } catch { throw new Error('Enter a complete HTTPS destination URL.') }
  const hasControlCharacter = [...value].some((character) => {
    const code = character.charCodeAt(0)
    return code <= 31 || code === 127
  })
  if (url.protocol !== 'https:' || url.username || url.password || url.port || hasControlCharacter) throw new Error('Enter a public HTTPS destination without credentials, a port, or control characters.')
  const host = url.hostname.toLowerCase().replace(/\.$/, '')
  if (!host.includes('.') || host === 'localhost' || host.endsWith('.localhost') || host.endsWith('.local') || host.endsWith('.internal') || /^(127\.|10\.|192\.168\.|169\.254\.)/.test(host)) throw new Error('Enter a public HTTPS destination.')
  url.hash = ''
  return url
}

function redactDisplayUrl(url: URL) {
  const value = `${url.origin}${url.pathname}`
  return value.length <= 220 ? value : `${value.slice(0, 217)}...`
}

export class ImageFitGenerationClient {
  constructor(private readonly endpoint = import.meta.env.VITE_IMAGE_FIT_QR_API_URL || '/api/artistic-qr/image-fit/candidates') {}

  async uploadTargetImage(dataUrl: string, signal?: AbortSignal): Promise<ImageFitRequestV1['target_image']> {
    let response: Response
    try {
      response = await fetch('/api/artistic-qr/image-fit/uploads', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ data_url: dataUrl }), signal })
    } catch (error) {
      if (error instanceof DOMException && error.name === 'AbortError') throw error
      throw new Error('Image upload service is unavailable. Keep the controlled target or retry.')
    }
    const body = await response.json().catch(() => undefined) as unknown
    if (!response.ok) {
      const serverError = body as { message?: unknown } | undefined
      throw new Error(typeof serverError?.message === 'string' ? serverError.message : 'Image upload could not be accepted.')
    }
    const targetImage = (body as ImageFitUploadResponseV1 | undefined)?.target_image
    if (!isTargetImage(targetImage)) throw new Error('Image upload returned an invalid target image.')
    return targetImage
  }

  async generate(request: ImageFitRequestV1, signal?: AbortSignal): Promise<ImageFitGenerationResponseV1> {
    let response: Response
    try {
      response = await fetch(this.endpoint, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(request), signal })
    } catch (error) {
      if (error instanceof DOMException && error.name === 'AbortError') throw error
      throw new Error('Real Image-Fit generation service is unavailable. No candidate evidence was accepted.')
    }
    const body = await response.json().catch(() => undefined) as unknown
    if (!response.ok) {
      const serverError = body as { code?: unknown; message?: unknown } | undefined
      const message = typeof serverError?.message === 'string' ? serverError.message : 'Real Image-Fit generation could not be completed.'
      throw new Error(message)
    }
    const result = unwrapGenerationResponse(body)
    if (!isGenerationResponse(result, request.request_id)) throw new Error('Creator returned an invalid Image-Fit response. No candidate evidence was accepted.')
    await verifyInlineArtifactHashes(result)
    const authorizedFallback = await readAuthorizedFallback(body, result)
    return { ...result, ...(authorizedFallback ? { authorized_fallback: authorizedFallback } : {}) }
  }
}

async function readAuthorizedFallback(value: unknown, response: ImageFitGenerationResponseV1): Promise<ImageFitAuthorizedFallbackV1 | undefined> {
  if (!value || typeof value !== 'object' || (value as { success?: unknown }).success !== true) return undefined
  const fallback = (value as { authorized_fallback?: unknown }).authorized_fallback
  if (!fallback || typeof fallback !== 'object') return undefined
  const candidate = fallback as Partial<ImageFitAuthorizedFallbackV1>
  const artifact = candidate.artifact
  if (response.fallback.available !== true
    || response.fallback.kind !== 'level1_styled_qr'
    || artifact?.kind !== 'export_svg'
    || typeof artifact.uri !== 'string'
    || !artifact.uri.startsWith('data:image/svg+xml')
    || !SHA256.test(artifact.sha256 ?? '')
    || typeof candidate.encoded_payload !== 'string'
    || candidate.encoded_payload.length === 0
    || !SHA256.test(candidate.payload_sha256 ?? '')
    || candidate.scan_evidence?.verdict !== 'pass') return undefined
  const payloadHashes = response.candidates.map((item) => item.qr_settings.payload_sha256).filter((hash): hash is string => typeof hash === 'string')
  if (payloadHashes.length > 0 && payloadHashes.some((hash) => hash !== candidate.payload_sha256)) return undefined
  if (response.request.user_controls.link_mode === 'original_url' && candidate.encoded_payload !== response.request.destination.normalized_url) return undefined
  const payloadDigest = await globalThis.crypto.subtle.digest('SHA-256', new TextEncoder().encode(candidate.encoded_payload))
  const actualPayloadHash = Array.from(new Uint8Array(payloadDigest), (byte) => byte.toString(16).padStart(2, '0')).join('')
  if (actualPayloadHash !== candidate.payload_sha256) return undefined
  const digest = await globalThis.crypto.subtle.digest('SHA-256', decodeDataUri(artifact.uri))
  const actual = Array.from(new Uint8Array(digest), (byte) => byte.toString(16).padStart(2, '0')).join('')
  return actual === artifact.sha256 ? candidate as ImageFitAuthorizedFallbackV1 : undefined
}

/** Verify the exact bytes used by the browser whenever Core returns inline artifacts. */
export async function verifyInlineArtifactHashes(response: ImageFitGenerationResponseV1): Promise<void> {
  for (const candidate of response.candidates) {
    for (const artifact of candidate.artifacts) {
      if (!artifact.uri.startsWith('data:')) continue
      const digest = await globalThis.crypto.subtle.digest('SHA-256', decodeDataUri(artifact.uri))
      const actual = Array.from(new Uint8Array(digest), (byte) => byte.toString(16).padStart(2, '0')).join('')
      if (actual !== artifact.sha256) {
        throw new Error('Creator artifact bytes did not match the authoritative hash. No candidate evidence was accepted.')
      }
    }
  }
}

function decodeDataUri(uri: string): Uint8Array {
  const comma = uri.indexOf(',')
  if (comma < 0) throw new Error('Creator returned an invalid inline artifact.')
  const metadata = uri.slice(0, comma)
  const payload = uri.slice(comma + 1)
  if (metadata.endsWith(';base64')) {
    const binary = atob(payload)
    return Uint8Array.from(binary, (character) => character.charCodeAt(0))
  }
  return new TextEncoder().encode(decodeURIComponent(payload))
}

export function unwrapGenerationResponse(value: unknown): unknown {
  if (value && typeof value === 'object' && (value as { success?: unknown }).success === true && 'result' in value) {
    return (value as { result?: unknown }).result
  }
  return value
}

export function isGenerationResponse(value: unknown, requestId: string): value is ImageFitGenerationResponseV1 {
  if (!value || typeof value !== 'object') return false
  const response = value as Partial<ImageFitGenerationResponseV1>
  return response.schema_version === 'image-fit-qr-api.v1'
    && response.request?.request_id === requestId
    && response.selection_policy?.export_requires_entitlement === true
    && response.selection_policy?.image_first_default_export_allowed === false
    && Array.isArray(response.candidates)
    && response.candidates.length <= 12
    && response.candidates.every(isCandidate)
}

function isTargetImage(value: unknown): value is ImageFitRequestV1['target_image'] {
  if (!value || typeof value !== 'object') return false
  const target = value as Partial<ImageFitRequestV1['target_image']>
  return typeof target.image_ref === 'string'
    && ['image/png', 'image/jpeg', 'image/webp', 'image/svg+xml'].includes(target.mime_type ?? '')
    && Number.isInteger(target.width_px) && Number.isInteger(target.height_px)
    && SHA256.test(target.sha256 ?? '')
    && ['simple_mark', 'medium_logo', 'complex_photo_like', 'high_risk_thin_detail'].includes(target.complexity ?? '')
}

function isCandidate(value: unknown): value is ImageFitCandidateV1 {
  if (!value || typeof value !== 'object') return false
  const candidate = value as Partial<ImageFitCandidateV1>
  const preview = candidate.artifacts?.find((artifact) => artifact.kind === 'preview_png' || artifact.kind === 'export_svg')
  return typeof candidate.candidate_id === 'string' && CANDIDATE_ID.test(candidate.candidate_id)
    && typeof candidate.mode === 'string' && MODES.has(candidate.mode)
    && ['generated', 'validated', 'failed', 'experimental'].includes(candidate.status ?? '')
    && !!candidate.qr_settings && Number.isInteger(candidate.qr_settings.version) && Number.isInteger(candidate.qr_settings.module_count) && ['Q', 'H'].includes(candidate.qr_settings.ecc) && Number.isInteger(candidate.qr_settings.mask)
    && !!candidate.protected_regions && candidate.protected_regions.quiet_zone === true && candidate.protected_regions.finder === true && candidate.protected_regions.separator === true && candidate.protected_regions.timing === true && candidate.protected_regions.alignment === true && candidate.protected_regions.format === true && Array.isArray(candidate.protected_regions.violations)
    && !!candidate.scan_evidence && ['pass', 'fail', 'not_run'].includes(candidate.scan_evidence.verdict) && Number.isInteger(candidate.scan_evidence.checks_passed) && Number.isInteger(candidate.scan_evidence.checks_total) && Array.isArray(candidate.scan_evidence.decoders)
    && !!candidate.image_fit_evidence && Number.isFinite(candidate.image_fit_evidence.recognition_score) && Number.isFinite(candidate.image_fit_evidence.protected_zone_conflict_score)
    && candidate.export_authority?.requires_payment_or_internal_entitlement === true && Array.isArray(candidate.export_authority.blockers)
    && Array.isArray(candidate.artifacts) && candidate.artifacts.every((artifact) => ARTIFACT_KINDS.has(artifact.kind) && typeof artifact.uri === 'string' && SHA256.test(artifact.sha256))
    && !!preview
    && Array.isArray(candidate.warnings)
}

export const imageFitGenerationClient = new ImageFitGenerationClient()
