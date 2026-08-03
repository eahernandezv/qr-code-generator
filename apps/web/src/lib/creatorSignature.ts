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

export interface CreatorSignatureRect {
  x: number
  y: number
  width: number
  height: number
}

export interface CreatorSignatureGeometry {
  qrImage: CreatorSignatureRect
  qrCard: CreatorSignatureRect
  labelSlot: CreatorSignatureRect
}

export function creatorSignatureGeometry(position: CreatorSignaturePosition): CreatorSignatureGeometry {
  const qrImage = position === 'right-side-vertical'
    ? { x: 65, y: 110, width: 440, height: 440 }
    : position === 'top-right-badge'
      ? { x: 125, y: 154, width: 470, height: 470 }
      : { x: 110, y: 55, width: 500, height: 500 }
  const qrCard = position === 'right-side-vertical'
    ? { x: 51, y: 96, width: 568, height: 468 }
    : position === 'top-right-badge'
      ? { x: 111, y: 48, width: 498, height: 590 }
      : { x: 96, y: 41, width: 528, height: 620 }
  const labelSlot = position === 'bottom-left-outside'
    ? { x: qrImage.x, y: qrImage.y + qrImage.height, width: 260, height: 92 }
    : position === 'below-centered'
      ? { x: 155, y: qrImage.y + qrImage.height, width: 410, height: 92 }
      : position === 'right-side-vertical'
        ? { x: qrImage.x + qrImage.width, y: qrImage.y, width: 100, height: qrImage.height }
        : position === 'top-right-badge'
          ? { x: qrImage.x + qrImage.width - 260, y: 62, width: 260, height: 78 }
          : { x: qrImage.x + qrImage.width - 260, y: qrImage.y + qrImage.height, width: 260, height: 92 }
  return { qrImage, qrCard, labelSlot }
}

function textLayer(fields: CreatorSignatureTemplateFields, geometry: CreatorSignatureGeometry): string {
  const signature = bounded(fields.signatureText, 32)
  const handle = bounded(fields.handleText, 36)
  const cta = bounded(fields.ctaText || 'Scan to connect', 28)
  const position = fields.signaturePosition ?? 'bottom-right-outside'
  const { labelSlot } = geometry
  const fit = (value: string, fontSize: number, maxWidth: number) => value.length * fontSize * 0.58 > maxWidth
    ? ` textLength="${maxWidth}" lengthAdjust="spacingAndGlyphs"`
    : ''
  const lines = (
    anchor: 'start' | 'middle' | 'end',
    x: number,
    y: number,
    options: { signatureSize?: number; handleSize?: number; ctaSize?: number; maxWidth?: number; lineGap?: number } = {},
  ) => {
    const signatureSize = options.signatureSize ?? 22
    const handleSize = options.handleSize ?? 11
    const ctaSize = options.ctaSize ?? 9
    const maxWidth = options.maxWidth ?? 220
    const lineGap = options.lineGap ?? 22
    return `
    <text x="${x}" y="${y}" text-anchor="${anchor}" fill="#18213a" font-family="Inter,system-ui,sans-serif" font-size="${signatureSize}" font-weight="750" letter-spacing="-0.5"${fit(signature, signatureSize, maxWidth)}>${signature}</text>
    <text x="${x}" y="${y + lineGap}" text-anchor="${anchor}" fill="#64748b" font-family="Inter,system-ui,sans-serif" font-size="${handleSize}" font-weight="550"${fit(handle, handleSize, maxWidth)}>${handle}</text>
    <text x="${x}" y="${y + lineGap * 2}" text-anchor="${anchor}" fill="#036b8f" font-family="Inter,system-ui,sans-serif" font-size="${ctaSize}" font-weight="700" letter-spacing="1.8"${fit(cta, ctaSize, maxWidth)}>${cta.toUpperCase()}</text>`
  }
  const reservedShelf = `<rect data-signature-reserved-shelf="true" x="${labelSlot.x}" y="${labelSlot.y}" width="${labelSlot.width}" height="${labelSlot.height}" fill="none" stroke="none" aria-hidden="true"/>`

  const shelfTextY = geometry.qrImage.y + geometry.qrImage.height + 24
  if (position === 'bottom-left-outside') return `${reservedShelf}${lines('start', geometry.qrImage.x, shelfTextY)}`
  if (position === 'below-centered') return `${reservedShelf}${lines('middle', 360, shelfTextY, { maxWidth: 380 })}`
  if (position === 'right-side-vertical') return `${reservedShelf}<g transform="translate(538 330) rotate(90)">${lines('middle', 0, 0, { maxWidth: 400 })}</g>`
  if (position === 'top-right-badge') return `${reservedShelf}${lines('end', geometry.qrImage.x + geometry.qrImage.width, 82)}`
  return `${reservedShelf}${lines('end', geometry.qrImage.x + geometry.qrImage.width, shelfTextY)}`
}

export function composeCreatorSignatureSvg(
  qrSource: string,
  fields: CreatorSignatureTemplateFields,
  options: { width?: number; height?: number } = {},
): string {
  const width = options.width ?? 720
  const height = options.height ?? 720
  const position = fields.signaturePosition ?? 'bottom-right-outside'
  const geometry = creatorSignatureGeometry(position)
  const { qrImage, qrCard, labelSlot } = geometry
  const safeQrSource = escapeXml(qrSource)
  return `<svg xmlns="http://www.w3.org/2000/svg" width="${width}" height="${height}" viewBox="0 0 720 720" role="img" aria-label="Creator Signature Template Art QR">
  <defs><linearGradient id="cs-bg" x1="0" y1="0" x2="1" y2="1"><stop stop-color="#020617"/><stop offset="1" stop-color="#111827"/></linearGradient></defs>
  <rect width="720" height="720" rx="42" fill="url(#cs-bg)"/>
  <path d="M42 82V42h40 M638 42h40v40 M42 638v40h40 M638 678h40v-40" fill="none" stroke="#38bdf8" stroke-width="3" stroke-linecap="round" opacity=".8"/>
  <circle cx="660" cy="660" r="80" fill="#2563eb" opacity=".08"/><circle cx="54" cy="55" r="42" fill="#38bdf8" opacity=".06"/>
  <rect data-qr-card-zone="${qrCard.x},${qrCard.y},${qrCard.width},${qrCard.height}" x="${qrCard.x}" y="${qrCard.y}" width="${qrCard.width}" height="${qrCard.height}" rx="26" fill="#fff" stroke="#cbd5e1" stroke-width="2"/>
  <image data-qr-active-zone="${qrImage.x},${qrImage.y},${qrImage.width},${qrImage.height}" href="${safeQrSource}" x="${qrImage.x}" y="${qrImage.y}" width="${qrImage.width}" height="${qrImage.height}" preserveAspectRatio="xMidYMid meet"/>
  <g data-template-layer="creator-signature" data-signature-position="${position}" data-signature-slot="${labelSlot.x},${labelSlot.y},${labelSlot.width},${labelSlot.height}">${textLayer(fields, geometry)}</g>
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
