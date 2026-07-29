export interface CoreExportRequest {
  candidateId: string
  formats: Array<'png' | 'svg'>
  sizes?: Array<{
    label: string
    widthPx: number
    heightPx: number
    dpi?: number
  }>
}

export interface CoreExportArtifact {
  artifactId: string
  candidateId: string
  files: Array<{
    format: 'png' | 'svg'
    data: string
    width: number
    height: number
  }>
  provenance: {
    generationMode: string
    provider?: string
    modelVersion?: string
    adapterVersion: string
    validationVersion: string
  }
}

interface CoreExportTestBridge {
  exportArtifact(request: CoreExportRequest): Promise<CoreExportArtifact>
}

declare global {
  interface Window {
    __QR_CORE_EXPORT_TEST__?: CoreExportTestBridge
  }
}

class CoreExportClient {
  constructor(private readonly baseUrl = import.meta.env.VITE_ARTISTIC_QR_API_URL || '/api/artistic-qr') {}

  async exportArtifact(request: CoreExportRequest): Promise<CoreExportArtifact> {
    const injected = import.meta.env.DEV ? window.__QR_CORE_EXPORT_TEST__ : undefined
    if (injected) return validateArtifact(await injected.exportArtifact(request), request)

    let response: Response
    try {
      response = await fetch(`${this.baseUrl}/exports`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(request),
      })
    } catch {
      throw new Error('Core export service is unavailable. Please try again.')
    }

    const value = await response.json().catch(() => undefined) as unknown
    if (!response.ok) {
      const error = value as { code?: unknown; message?: unknown } | undefined
      const code = typeof error?.code === 'string' ? `${error.code}: ` : ''
      const message = typeof error?.message === 'string' ? error.message : 'Core export could not be completed.'
      throw new Error(`${code}${message}`)
    }
    return validateArtifact(value, request)
  }
}

function validateArtifact(value: unknown, request: CoreExportRequest): CoreExportArtifact {
  if (!value || typeof value !== 'object') throw new Error('Core export returned an invalid artifact.')
  const artifact = value as Partial<CoreExportArtifact>
  if (
    typeof artifact.artifactId !== 'string'
    || artifact.candidateId !== request.candidateId
    || !Array.isArray(artifact.files)
    || artifact.files.length === 0
    || !artifact.provenance
    || typeof artifact.provenance.validationVersion !== 'string'
  ) {
    throw new Error('Core export returned an invalid artifact.')
  }

  const expectedSizes = request.sizes ?? []
  if (expectedSizes.length > 0 && artifact.files.length !== request.formats.length * expectedSizes.length) {
    throw new Error('Core export returned an incomplete artifact.')
  }
  for (const file of artifact.files) {
    if (
      !file
      || !request.formats.includes(file.format)
      || typeof file.data !== 'string'
      || file.data.length === 0
      || !Number.isInteger(file.width)
      || !Number.isInteger(file.height)
      || (expectedSizes.length > 0 && !expectedSizes.some((size) => size.widthPx === file.width && size.heightPx === file.height))
    ) {
      throw new Error('Core export returned an invalid artifact file.')
    }
  }
  return artifact as CoreExportArtifact
}

export const coreExportClient = new CoreExportClient()
