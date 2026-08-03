import type { CreatorSignaturePosition, CreatorSignatureTemplateFields, TemplateArtSpec } from '../types'

export const CREATOR_SIGNATURE_POSITIONS: ReadonlyArray<{ value: CreatorSignaturePosition; label: string }> = [
  { value: 'bottom-right-outside', label: 'Bottom right' },
  { value: 'bottom-left-outside', label: 'Bottom left' },
  { value: 'below-centered', label: 'Below centered' },
  { value: 'top-right-corner', label: 'Top right corner' },
  { value: 'top-left-corner', label: 'Top left corner' },
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
  qrContent: CreatorSignatureRect
  qrCard: CreatorSignatureRect
  labelSlot: CreatorSignatureRect
}

function decodeSvgDataUrl(source: string): string | null {
  const trimmed = source.trim()
  if (trimmed.startsWith('<svg') || trimmed.startsWith('<?xml')) return trimmed
  const match = trimmed.match(/^data:image\/svg\+xml(?:;charset=[^,]+)?,(.*)$/i)
  if (!match) return null
  try { return decodeURIComponent(match[1]) } catch { return match[1] }
}

function numericAttribute(element: string, name: string): number | null {
  const match = element.match(new RegExp(`${name}="([0-9.-]+)"`))
  return match ? Number(match[1]) : null
}

function fillLooksLikeQrModule(fill: string): boolean {
  const normalized = fill.trim().toLowerCase()
  if (normalized === 'none' || normalized.startsWith('url(')) return false
  const hex = normalized.match(/^#([0-9a-f]{3}|[0-9a-f]{6})$/)
  if (!hex) return true
  const expanded = hex[1].length === 3 ? [...hex[1]].map((part) => part + part).join('') : hex[1]
  const r = Number.parseInt(expanded.slice(0, 2), 16)
  const g = Number.parseInt(expanded.slice(2, 4), 16)
  const b = Number.parseInt(expanded.slice(4, 6), 16)
  return (0.2126 * r + 0.7152 * g + 0.0722 * b) < 220
}

function mergeBounds(current: CreatorSignatureRect | null, x: number, y: number, width: number, height: number): CreatorSignatureRect {
  if (!current) return { x, y, width, height }
  const minX = Math.min(current.x, x)
  const minY = Math.min(current.y, y)
  const maxX = Math.max(current.x + current.width, x + width)
  const maxY = Math.max(current.y + current.height, y + height)
  return { x: minX, y: minY, width: maxX - minX, height: maxY - minY }
}

function mapRectToImage(sourceRect: CreatorSignatureRect, viewBox: CreatorSignatureRect, qrImage: CreatorSignatureRect): CreatorSignatureRect {
  return {
    x: Math.round(qrImage.x + ((sourceRect.x - viewBox.x) / viewBox.width) * qrImage.width),
    y: Math.round(qrImage.y + ((sourceRect.y - viewBox.y) / viewBox.height) * qrImage.height),
    width: Math.round((sourceRect.width / viewBox.width) * qrImage.width),
    height: Math.round((sourceRect.height / viewBox.height) * qrImage.height),
  }
}

function fallbackVisibleQrContent(qrImage: CreatorSignatureRect): CreatorSignatureRect {
  const inset = Math.round(qrImage.width * 0.146)
  return { x: qrImage.x + inset, y: qrImage.y + inset, width: qrImage.width - inset * 2, height: qrImage.height - inset * 2 }
}

function visibleQrContent(qrImage: CreatorSignatureRect, qrSource?: string): CreatorSignatureRect {
  const svg = qrSource ? decodeSvgDataUrl(qrSource) : null
  if (!svg) return fallbackVisibleQrContent(qrImage)
  const svgTag = svg.match(/<svg\b[^>]*>/)?.[0] ?? ''
  const viewBoxValues = svgTag.match(/viewBox="([0-9.\-\s]+)"/)?.[1]?.trim().split(/\s+/).map(Number)
  const width = numericAttribute(svgTag, 'width') ?? viewBoxValues?.[2]
  const height = numericAttribute(svgTag, 'height') ?? viewBoxValues?.[3]
  const viewBox = viewBoxValues?.length === 4
    ? { x: viewBoxValues[0], y: viewBoxValues[1], width: viewBoxValues[2], height: viewBoxValues[3] }
    : width && height ? { x: 0, y: 0, width, height } : null
  if (!viewBox || !Number.isFinite(viewBox.width) || !Number.isFinite(viewBox.height) || viewBox.width <= 0 || viewBox.height <= 0) return fallbackVisibleQrContent(qrImage)

  let bounds: CreatorSignatureRect | null = null
  for (const element of svg.match(/<(rect|circle|path)\b[^>]*fill="[^"]+"[^>]*>/gi) ?? []) {
    const fill = element.match(/fill="([^"]+)"/i)?.[1] ?? ''
    if (!fillLooksLikeQrModule(fill)) continue
    if (element.includes('width="100%"') || element.includes('height="100%"')) continue
    if (element.startsWith('<rect')) {
      const x = numericAttribute(element, 'x') ?? 0
      const y = numericAttribute(element, 'y') ?? 0
      const rectWidth = numericAttribute(element, 'width')
      const rectHeight = numericAttribute(element, 'height')
      if (rectWidth && rectHeight) bounds = mergeBounds(bounds, x, y, rectWidth, rectHeight)
    } else if (element.startsWith('<circle')) {
      const cx = numericAttribute(element, 'cx')
      const cy = numericAttribute(element, 'cy')
      const r = numericAttribute(element, 'r')
      if (cx !== null && cy !== null && r !== null) bounds = mergeBounds(bounds, cx - r, cy - r, r * 2, r * 2)
    } else {
      const numbers = element.match(/[-+]?[0-9]*\.?[0-9]+/g)?.map(Number) ?? []
      const xs = numbers.filter((_, index) => index % 2 === 0)
      const ys = numbers.filter((_, index) => index % 2 === 1)
      if (xs.length && ys.length) bounds = mergeBounds(bounds, Math.min(...xs), Math.min(...ys), Math.max(...xs) - Math.min(...xs), Math.max(...ys) - Math.min(...ys))
    }
  }
  return bounds ? mapRectToImage(bounds, viewBox, qrImage) : fallbackVisibleQrContent(qrImage)
}

export function creatorSignatureGeometry(position: CreatorSignaturePosition, qrSource?: string): CreatorSignatureGeometry {
  const qrImage = { x: 110, y: 55, width: 500, height: 500 }
  const qrContent = visibleQrContent(qrImage, qrSource)
  const qrCard = { x: 96, y: 41, width: 528, height: 620 }
  const bottomShelfY = qrContent.y + qrContent.height + 8
  const topShelfY = Math.max(qrCard.y, qrContent.y - 84)
  const labelSlot = position === 'bottom-left-outside'
    ? { x: qrContent.x, y: bottomShelfY, width: 260, height: 76 }
    : position === 'below-centered'
      ? { x: qrContent.x, y: bottomShelfY, width: qrContent.width, height: 76 }
      : position === 'top-left-corner'
        ? { x: qrContent.x, y: topShelfY, width: 260, height: 76 }
        : position === 'top-right-corner'
          ? { x: qrContent.x + qrContent.width - 260, y: topShelfY, width: 260, height: 76 }
          : { x: qrContent.x + qrContent.width - 260, y: bottomShelfY, width: 260, height: 76 }
  return { qrImage, qrContent, qrCard, labelSlot }
}

function textLayer(fields: CreatorSignatureTemplateFields, geometry: CreatorSignatureGeometry): string {
  const signature = bounded(fields.signatureText, 32)
  const handle = bounded(fields.handleText, 36)
  const cta = bounded(fields.ctaText, 28)
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

  const shelfTextY = geometry.qrContent.y + geometry.qrContent.height + 22
  const topShelfTextY = labelSlot.y + 22
  if (position === 'bottom-left-outside') return `${reservedShelf}${lines('start', geometry.qrContent.x, shelfTextY)}`
  if (position === 'below-centered') return `${reservedShelf}${lines('middle', geometry.qrContent.x + geometry.qrContent.width / 2, shelfTextY, { maxWidth: geometry.qrContent.width })}`
  if (position === 'top-left-corner') return `${reservedShelf}${lines('start', geometry.qrContent.x, topShelfTextY)}`
  if (position === 'top-right-corner') return `${reservedShelf}${lines('end', geometry.qrContent.x + geometry.qrContent.width, topShelfTextY)}`
  return `${reservedShelf}${lines('end', geometry.qrContent.x + geometry.qrContent.width, shelfTextY)}`
}

export function composeCreatorSignatureSvg(
  qrSource: string,
  fields: CreatorSignatureTemplateFields,
  options: { width?: number; height?: number; geometrySource?: string } = {},
): string {
  const width = options.width ?? 720
  const height = options.height ?? 720
  const position = fields.signaturePosition ?? 'bottom-right-outside'
  const geometry = creatorSignatureGeometry(position, options.geometrySource ?? qrSource)
  const { qrImage, qrContent, qrCard, labelSlot } = geometry
  const safeQrSource = escapeXml(qrSource)
  return `<svg xmlns="http://www.w3.org/2000/svg" width="${width}" height="${height}" viewBox="0 0 720 720" role="img" aria-label="Creator Signature Template Art QR">
  <defs><linearGradient id="cs-bg" x1="0" y1="0" x2="1" y2="1"><stop stop-color="#020617"/><stop offset="1" stop-color="#111827"/></linearGradient></defs>
  <rect width="720" height="720" rx="42" fill="url(#cs-bg)"/>
  <path d="M42 82V42h40 M638 42h40v40 M42 638v40h40 M638 678h40v-40" fill="none" stroke="#38bdf8" stroke-width="3" stroke-linecap="round" opacity=".8"/>
  <circle cx="660" cy="660" r="80" fill="#2563eb" opacity=".08"/><circle cx="54" cy="55" r="42" fill="#38bdf8" opacity=".06"/>
  <rect data-qr-card-zone="${qrCard.x},${qrCard.y},${qrCard.width},${qrCard.height}" x="${qrCard.x}" y="${qrCard.y}" width="${qrCard.width}" height="${qrCard.height}" rx="26" fill="#fff" stroke="#cbd5e1" stroke-width="2"/>
  <image data-qr-active-zone="${qrImage.x},${qrImage.y},${qrImage.width},${qrImage.height}" data-qr-content-zone="${qrContent.x},${qrContent.y},${qrContent.width},${qrContent.height}" href="${safeQrSource}" x="${qrImage.x}" y="${qrImage.y}" width="${qrImage.width}" height="${qrImage.height}" preserveAspectRatio="xMidYMid meet"/>
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
  geometrySource?: string,
): Promise<string> {
  const svg = composeCreatorSignatureSvg(qrSource, fields, { width, height, geometrySource })
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
