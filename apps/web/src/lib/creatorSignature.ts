import type { CreatorSignaturePosition, CreatorSignatureTemplateFields, TemplateArtSpec } from '../types'

export const CREATOR_SIGNATURE_POSITIONS: ReadonlyArray<{ value: CreatorSignaturePosition; label: string }> = [
  { value: 'bottom-right-outside', label: 'Bottom right' },
  { value: 'bottom-left-outside', label: 'Bottom left' },
  { value: 'below-centered', label: 'Below centered' },
  { value: 'right-side-vertical', label: 'Right side vertical' },
  { value: 'top-right-badge', label: 'Top right badge' },
]

export const DEFAULT_CREATOR_SIGNATURE: TemplateArtSpec = {
  templateId: 'creator-signature',
  outputIntent: 'square-card',
  fields: {
    signatureText: 'Ernesto Creates',
    handleText: '@ernesto',
    ctaText: 'Scan to connect',
    signaturePosition: 'bottom-right-outside',
  },
}

const escapeXml = (value: string) => value.replace(/[<>&"']/g, (character) => ({
  '<': '&lt;', '>': '&gt;', '&': '&amp;', '"': '&quot;', "'": '&apos;',
}[character]!))

const bounded = (value: string | undefined, maximum: number) => escapeXml((value ?? '').trim().slice(0, maximum))

function textLayer(fields: CreatorSignatureTemplateFields): string {
  const signature = bounded(fields.signatureText, 32)
  const handle = bounded(fields.handleText, 36)
  const cta = bounded(fields.ctaText || 'Scan to connect', 28)
  const position = fields.signaturePosition ?? 'bottom-right-outside'
  const fit = (value: string, fontSize: number, maxWidth: number) => value.length * fontSize * 0.58 > maxWidth
    ? ` textLength="${maxWidth}" lengthAdjust="spacingAndGlyphs"`
    : ''
  const lines = (
    anchor: 'start' | 'middle' | 'end',
    x: number,
    y: number,
    options: { signatureSize?: number; handleSize?: number; ctaSize?: number; maxWidth?: number; lineGap?: number } = {},
  ) => {
    const signatureSize = options.signatureSize ?? 30
    const handleSize = options.handleSize ?? 15
    const ctaSize = options.ctaSize ?? 13
    const maxWidth = options.maxWidth ?? 560
    const lineGap = options.lineGap ?? 28
    return `
    <text x="${x}" y="${y}" text-anchor="${anchor}" fill="#f8fafc" font-family="Inter,system-ui,sans-serif" font-size="${signatureSize}" font-weight="750" letter-spacing="-0.5"${fit(signature, signatureSize, maxWidth)}>${signature}</text>
    <text x="${x}" y="${y + lineGap}" text-anchor="${anchor}" fill="#94a3b8" font-family="Inter,system-ui,sans-serif" font-size="${handleSize}" font-weight="550"${fit(handle, handleSize, maxWidth)}>${handle}</text>
    <text x="${x}" y="${y + lineGap * 2}" text-anchor="${anchor}" fill="#38bdf8" font-family="Inter,system-ui,sans-serif" font-size="${ctaSize}" font-weight="700" letter-spacing="1.8"${fit(cta, ctaSize, maxWidth)}>${cta.toUpperCase()}</text>`
  }

  if (position === 'bottom-left-outside') return lines('start', 70, 606)
  if (position === 'below-centered') return lines('middle', 360, 606)
  if (position === 'right-side-vertical') return `<g transform="translate(627 360) rotate(90)">${lines('middle', 0, 0, { maxWidth: 430 })}</g>`
  if (position === 'top-right-badge') return `<g><rect x="384" y="34" width="270" height="92" rx="28" fill="#0f172a" stroke="#38bdf8" stroke-width="2"/>${lines('middle', 519, 66, { signatureSize: 18, handleSize: 10, ctaSize: 8, maxWidth: 220, lineGap: 22 })}</g>`
  return lines('end', 650, 606)
}

function qrGeometry(position: CreatorSignaturePosition) {
  if (position === 'right-side-vertical') return { x: 65, y: 110, size: 440 }
  if (position === 'top-right-badge') return { x: 125, y: 154, size: 470 }
  return { x: 110, y: 55, size: 500 }
}

export function composeCreatorSignatureSvg(
  qrSource: string,
  fields: CreatorSignatureTemplateFields,
  options: { width?: number; height?: number } = {},
): string {
  const width = options.width ?? 720
  const height = options.height ?? 720
  const position = fields.signaturePosition ?? 'bottom-right-outside'
  const qr = qrGeometry(position)
  const safeQrSource = escapeXml(qrSource)
  return `<svg xmlns="http://www.w3.org/2000/svg" width="${width}" height="${height}" viewBox="0 0 720 720" role="img" aria-label="Creator Signature Template Art QR">
  <defs><linearGradient id="cs-bg" x1="0" y1="0" x2="1" y2="1"><stop stop-color="#020617"/><stop offset="1" stop-color="#111827"/></linearGradient></defs>
  <rect width="720" height="720" rx="42" fill="url(#cs-bg)"/>
  <path d="M42 82V42h40 M638 42h40v40 M42 638v40h40 M638 678h40v-40" fill="none" stroke="#38bdf8" stroke-width="3" stroke-linecap="round" opacity=".8"/>
  <circle cx="660" cy="660" r="80" fill="#2563eb" opacity=".08"/><circle cx="54" cy="55" r="42" fill="#38bdf8" opacity=".06"/>
  <rect x="${qr.x - 14}" y="${qr.y - 14}" width="${qr.size + 28}" height="${qr.size + 28}" rx="26" fill="#fff" stroke="#cbd5e1" stroke-width="2"/>
  <image href="${safeQrSource}" x="${qr.x}" y="${qr.y}" width="${qr.size}" height="${qr.size}" preserveAspectRatio="xMidYMid meet"/>
  <g data-template-layer="creator-signature" data-signature-position="${position}">${textLayer(fields)}</g>
</svg>`
}

export function svgDataUrl(svg: string): string {
  return `data:image/svg+xml;charset=utf-8,${encodeURIComponent(svg)}`
}

export async function composeCreatorSignaturePng(
  qrSource: string,
  fields: CreatorSignatureTemplateFields,
  width: number,
  height: number,
): Promise<string> {
  const svg = composeCreatorSignatureSvg(qrSource, fields, { width, height })
  const image = new Image()
  image.src = svgDataUrl(svg)
  await image.decode()
  const canvas = document.createElement('canvas')
  canvas.width = width
  canvas.height = height
  const context = canvas.getContext('2d')
  if (!context) throw new Error('Template Art composition canvas is unavailable.')
  context.drawImage(image, 0, 0, width, height)
  const output = canvas.toDataURL('image/png')
  canvas.width = 0
  canvas.height = 0
  return output
}
