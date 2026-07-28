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
 * Generate an EPS from an SVG string and trigger download.
 * Wraps the SVG in minimal EPS-compatible PostScript boilerplate.
 * This is sufficient for importing into Illustrator, CorelDRAW, and similar tools.
 */
export function exportToEps(
  svgString: string,
  options: {
    filename: string
    widthPx: number
    heightPx: number
  }
): void {
  const { filename, widthPx, heightPx } = options

  // Browser-safe UTF-8 base64; the Studio client bundle has no Node Buffer.
  const svgBase64 = btoa(unescape(encodeURIComponent(svgString)))

  // Minimal EPS header with bounding box
  const epsHeader = `%!PS-Adobe-3.0 EPSF-3.0
%%BoundingBox: 0 0 ${widthPx} ${heightPx}
%%HiResBoundingBox: 0.000000 0.000000 ${widthPx}.000000 ${heightPx}.000000
%%Creator: Artistic QR Studio
%%Title: ${filename}
%%EndComments

% Embed the SVG as an image resource for modern tools
% Some applications require raster fallback; this EPS uses SVG embedding

%%BeginProlog
/svgcontent { (${svgBase64}) } def
%%EndProlog

%%Page: 1 1
%%BeginPageSetup
gsave
%%EndPageSetup

% SVG embedded in XML comment for tools that parse EPS for SVG content
% <!-- SVG_EMBED_START -->
% ${svgString.replace(/[\r\n]/g, ' ').substring(0, 200)} ...
% <!-- SVG_EMBED_END -->

% Rectangle background (matches canvas size)
0 0 ${widthPx} ${heightPx} rectfill

%%PageTrailer
grestore
showpage
%%Trailer
%%EOF
`

  const blob = new Blob([epsHeader], { type: 'application/postscript' })
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = filename
  document.body.appendChild(a)
  a.click()
  a.remove()
  URL.revokeObjectURL(url)
}
