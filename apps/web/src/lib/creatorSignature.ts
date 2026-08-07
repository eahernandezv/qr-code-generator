import type {
  CreatorSignatureBoundaryOffsetMm,
  CreatorSignatureColor,
  CreatorSignatureFont,
  CreatorSignatureFontSize,
  CreatorSignaturePosition,
  CreatorSignatureTemplateFields,
  TemplateArtSpec,
} from '../types'

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
    line1Text: '',
    line2Text: '',
    line1Font: 'sans',
    line2Font: 'sans',
    line1Size: 'medium',
    line2Size: 'medium',
    line1Color: 'dark-ink',
    line2Color: 'secondary',
    boundaryOffsetMm: 0,
    signaturePosition: 'bottom-right-outside',
  },
}

export const CREATOR_SIGNATURE_FONTS: ReadonlyArray<{ value: CreatorSignatureFont; label: string }> = [
  { value: 'sans', label: 'Sans' },
  { value: 'serif', label: 'Serif' },
  { value: 'mono', label: 'Mono' },
  { value: 'cursive', label: 'Cursive' },
  { value: 'handwritten', label: 'Handwritten' },
  { value: 'display', label: 'Display' },
]

export const CREATOR_SIGNATURE_FONT_SIZES: ReadonlyArray<{ value: CreatorSignatureFontSize; label: string }> = [
  { value: 'small', label: 'Small' },
  { value: 'medium', label: 'Medium' },
  { value: 'large', label: 'Large' },
  { value: 'extra-large', label: 'Extra Large' },
]

export const CREATOR_SIGNATURE_COLORS: ReadonlyArray<{ value: CreatorSignatureColor; label: string }> = [
  { value: 'primary', label: 'Body color' },
  { value: 'secondary', label: 'Corner color' },
  { value: 'accent', label: 'Accent' },
  { value: 'dark-ink', label: 'Dark ink' },
]

export const CREATOR_SIGNATURE_OFFSETS: ReadonlyArray<CreatorSignatureBoundaryOffsetMm> = [0, 1, 2, 3]
export const CREATOR_SIGNATURE_PX_PER_MM = 4
export const BOTTOM_SIGNATURE_LINE1_BASE_OFFSET_MM = 2
export const LINE_GAP_REDUCTION_MM = 2

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

export function creatorSignatureGeometry(
  position: CreatorSignaturePosition,
  qrSource?: string,
  boundaryOffsetMm: CreatorSignatureBoundaryOffsetMm = 0,
): CreatorSignatureGeometry {
  const qrImage = { x: 0, y: 0, width: 720, height: 720 }
  const qrContent = visibleQrContent(qrImage, qrSource)
  const qrCard = { x: 0, y: 0, width: 720, height: 720 }
  const bottomShelfY = Math.min(qrImage.y + qrImage.height - 86, qrContent.y + qrContent.height + 8)
  const topShelfY = Math.max(qrImage.y + 8, qrContent.y - 78)
  const baseLabelSlot = position === 'bottom-left-outside'
    ? { x: qrContent.x, y: bottomShelfY, width: 260, height: 76 }
    : position === 'below-centered'
      ? { x: qrContent.x, y: bottomShelfY, width: qrContent.width, height: 76 }
      : position === 'top-left-corner'
        ? { x: qrContent.x, y: topShelfY, width: 260, height: 76 }
        : position === 'top-right-corner'
          ? { x: qrContent.x + qrContent.width - 260, y: topShelfY, width: 260, height: 76 }
          : { x: qrContent.x + qrContent.width - 260, y: bottomShelfY, width: 260, height: 76 }
  const direction = position === 'top-left-corner' || position === 'top-right-corner' ? -1 : 1
  const labelSlot = { ...baseLabelSlot, y: baseLabelSlot.y + direction * boundaryOffsetMm * CREATOR_SIGNATURE_PX_PER_MM }
  return { qrImage, qrContent, qrCard, labelSlot }
}

const FONT_FAMILIES: Record<CreatorSignatureFont, string> = {
  sans: 'Inter,system-ui,sans-serif',
  serif: 'Georgia,Times New Roman,serif',
  mono: 'ui-monospace,SFMono-Regular,Menlo,monospace',
  cursive: 'Brush Script MT,Segoe Script,cursive',
  handwritten: 'Segoe Print,Bradley Hand,cursive',
  display: 'Impact,Arial Black,sans-serif',
}

const DEFAULT_COLORS: Record<CreatorSignatureColor, string> = {
  primary: '#5162da',
  secondary: '#323eaf',
  accent: '#a5bdff',
  'dark-ink': '#18213a',
}

export interface CreatorSignaturePalette {
  primary?: string
  secondary?: string
  accent?: string
  darkInk?: string
}

function selectedColor(value: CreatorSignatureColor | undefined, palette: CreatorSignaturePalette): string {
  const selected = CREATOR_SIGNATURE_COLORS.some((option) => option.value === value) ? value! : 'dark-ink'
  if (selected === 'dark-ink') return palette.darkInk ?? DEFAULT_COLORS[selected]
  return palette[selected] ?? DEFAULT_COLORS[selected]
}

function selectedFont(value: CreatorSignatureFont | undefined): CreatorSignatureFont {
  return CREATOR_SIGNATURE_FONTS.some((option) => option.value === value) ? value! : 'sans'
}

function selectedFontSize(value: CreatorSignatureFontSize | undefined, line: 1 | 2): number {
  const selected = CREATOR_SIGNATURE_FONT_SIZES.some((option) => option.value === value) ? value! : 'medium'
  if (line === 1) return selected === 'small' ? 18 : selected === 'large' ? 26 : selected === 'extra-large' ? 30 : 22
  return selected === 'small' ? 9 : selected === 'large' ? 13 : selected === 'extra-large' ? 15 : 11
}

function selectedOffset(value: CreatorSignatureBoundaryOffsetMm | undefined): CreatorSignatureBoundaryOffsetMm {
  return CREATOR_SIGNATURE_OFFSETS.some((offset) => offset === value) ? value! : 0
}

function textLayer(fields: CreatorSignatureTemplateFields, geometry: CreatorSignatureGeometry, palette: CreatorSignaturePalette): string {
  const line1 = bounded(fields.line1Text ?? fields.signatureText, 32)
  const line2 = bounded(fields.line2Text ?? fields.handleText, 36)
  const position = fields.signaturePosition ?? 'bottom-right-outside'
  const { labelSlot } = geometry
  const line1Size = selectedFontSize(fields.line1Size, 1)
  const line2Size = selectedFontSize(fields.line2Size, 2)
  const line1Font = selectedFont(fields.line1Font)
  const line2Font = selectedFont(fields.line2Font)
  const lineGap = line1Size + CREATOR_SIGNATURE_PX_PER_MM - LINE_GAP_REDUCTION_MM * CREATOR_SIGNATURE_PX_PER_MM
  const lines = (
    anchor: 'start' | 'middle' | 'end',
    x: number,
    y: number,
  ) => {
    const renderedLine1 = line1 ? `<text data-signature-line="1" data-signature-font="${line1Font}" data-signature-size="${fields.line1Size ?? 'medium'}" x="${x}" y="${y}" text-anchor="${anchor}" fill="${selectedColor(fields.line1Color, palette)}" font-family="${FONT_FAMILIES[line1Font]}" font-size="${line1Size}" font-weight="750" letter-spacing="-0.5">${line1}</text>` : ''
    const renderedLine2 = line2 ? `<text data-signature-line="2" data-signature-font="${line2Font}" data-signature-size="${fields.line2Size ?? 'medium'}" x="${x}" y="${y + lineGap}" text-anchor="${anchor}" fill="${selectedColor(fields.line2Color ?? 'secondary', palette)}" font-family="${FONT_FAMILIES[line2Font]}" font-size="${line2Size}" font-weight="550">${line2}</text>` : ''
    return `\n    ${renderedLine1}\n    ${renderedLine2}`
  }
  const reservedShelf = `<rect data-signature-reserved-shelf="true" x="${labelSlot.x}" y="${labelSlot.y}" width="${labelSlot.width}" height="${labelSlot.height}" fill="none" stroke="none" aria-hidden="true"/>`

  const shelfTextY = geometry.qrContent.y + geometry.qrContent.height + 22
    + (BOTTOM_SIGNATURE_LINE1_BASE_OFFSET_MM + selectedOffset(fields.boundaryOffsetMm)) * CREATOR_SIGNATURE_PX_PER_MM
  const topShelfTextY = geometry.qrContent.y - 22 - lineGap
    - selectedOffset(fields.boundaryOffsetMm) * CREATOR_SIGNATURE_PX_PER_MM
  if (position === 'bottom-left-outside') return `${reservedShelf}${lines('start', geometry.qrContent.x, shelfTextY)}`
  if (position === 'below-centered') return `${reservedShelf}${lines('middle', geometry.qrContent.x + geometry.qrContent.width / 2, shelfTextY)}`
  if (position === 'top-left-corner') return `${reservedShelf}${lines('start', geometry.qrContent.x, topShelfTextY)}`
  if (position === 'top-right-corner') return `${reservedShelf}${lines('end', geometry.qrContent.x + geometry.qrContent.width, topShelfTextY)}`
  return `${reservedShelf}${lines('end', geometry.qrContent.x + geometry.qrContent.width, shelfTextY)}`
}

export function composeCreatorSignatureSvg(
  qrSource: string,
  fields: CreatorSignatureTemplateFields,
  options: { width?: number; height?: number; geometrySource?: string; palette?: CreatorSignaturePalette } = {},
): string {
  const width = options.width ?? 720
  const height = options.height ?? 720
  const position = fields.signaturePosition ?? 'bottom-right-outside'
  const boundaryOffsetMm = selectedOffset(fields.boundaryOffsetMm)
  const geometry = creatorSignatureGeometry(position, options.geometrySource ?? qrSource, boundaryOffsetMm)
  const { qrImage, qrContent, qrCard, labelSlot } = geometry
  const safeQrSource = escapeXml(qrSource)
  return `<svg xmlns="http://www.w3.org/2000/svg" width="${width}" height="${height}" viewBox="0 0 720 720" role="img" aria-label="Creator Signature Template Art QR">
  <image data-qr-card-zone="${qrCard.x},${qrCard.y},${qrCard.width},${qrCard.height}" data-qr-active-zone="${qrImage.x},${qrImage.y},${qrImage.width},${qrImage.height}" data-qr-content-zone="${qrContent.x},${qrContent.y},${qrContent.width},${qrContent.height}" href="${safeQrSource}" x="${qrImage.x}" y="${qrImage.y}" width="${qrImage.width}" height="${qrImage.height}" preserveAspectRatio="xMidYMid meet"/>
  <g data-template-layer="creator-signature" data-signature-position="${position}" data-signature-offset-mm="${boundaryOffsetMm}" data-signature-slot="${labelSlot.x},${labelSlot.y},${labelSlot.width},${labelSlot.height}">${textLayer(fields, geometry, options.palette ?? {})}</g>
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
  palette?: CreatorSignaturePalette,
): Promise<string> {
  const svg = composeCreatorSignatureSvg(qrSource, fields, { width, height, geometrySource, palette })
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
