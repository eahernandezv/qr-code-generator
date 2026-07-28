import { jsPDF } from 'jspdf'

/**
 * Generate a PDF from an image data URL and trigger download.
 * Uses jspdf for client-side PDF generation.
 */
export async function exportToPdf(
  imageDataUrl: string,
  options: {
    filename: string
    widthPx: number
    heightPx: number
    dpi?: number
  }
): Promise<void> {
  const { filename, widthPx, heightPx, dpi = 300 } = options

  // Convert pixels to mm at given DPI
  const pxToMm = (px: number) => (px / dpi) * 25.4
  const widthMm = pxToMm(widthPx)
  const heightMm = pxToMm(heightPx)

  const pdf = new jsPDF({
    orientation: widthPx >= heightPx ? 'l' : 'p',
    unit: 'mm',
    format: [widthMm, heightMm],
  })

  pdf.addImage(imageDataUrl, 'PNG', 0, 0, widthMm, heightMm)
  pdf.save(filename)
}

/**
 * Generate a binary EPS containing the actual RGB artwork and trigger download.
 * The image operator reads exactly width*height*3 bytes, avoiding the 2x memory
 * overhead of ASCII-hex encoding for large print exports.
 */
export function exportToEps(
  rgbData: Uint8Array,
  options: {
    filename: string
    widthPx: number
    heightPx: number
  }
): void {
  const { filename, widthPx, heightPx } = options
  const expectedBytes = widthPx * heightPx * 3
  if (rgbData.byteLength !== expectedBytes) {
    throw new Error(`EPS RGB data length ${rgbData.byteLength} does not match ${expectedBytes}`)
  }

  const header = `%!PS-Adobe-3.0 EPSF-3.0
%%BoundingBox: 0 0 ${widthPx} ${heightPx}
%%HiResBoundingBox: 0.000000 0.000000 ${widthPx}.000000 ${heightPx}.000000
%%Creator: Artistic QR Studio
%%Title: ${filename}
%%LanguageLevel: 2
%%EndComments
/picstr ${widthPx * 3} string def
${widthPx} ${heightPx} 8
[${widthPx} 0 0 -${heightPx} 0 ${heightPx}]
{ currentfile picstr readstring pop }
false 3 colorimage
%%BeginBinary: ${expectedBytes}
`
  const trailer = `
%%EndBinary
showpage
%%EOF
`

  const binary = Uint8Array.from(rgbData)
  const blob = new Blob([header, binary.buffer as ArrayBuffer, trailer], { type: 'application/postscript' })
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = filename
  document.body.appendChild(a)
  a.click()
  a.remove()
  URL.revokeObjectURL(url)
}
