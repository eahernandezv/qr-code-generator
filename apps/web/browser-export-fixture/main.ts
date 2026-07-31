import { generateMatrix, normalizePayload, renderDeterministicSvg } from '@qr/qr-core/browser'

const normalized = normalizePayload({
  mode: 'url',
  content: 'example.com/browser-boundary',
  errorCorrectionLevel: 'H',
})
const matrix = generateMatrix(normalized)
const artifact = renderDeterministicSvg(matrix, {
  format: 'svg',
  moduleSize: 7,
  margin: 5,
  shape: 'rounded',
  eyeShape: 'circle',
})

document.querySelector('#result')!.textContent = 'ready'
;(window as typeof window & { qrCoreProof?: unknown }).qrCoreProof = { normalized, matrix, artifact }