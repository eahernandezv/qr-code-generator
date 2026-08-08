import { describe, expect, it } from 'vitest'
import {
  composeCreatorSignatureSvg,
  creatorSignatureGeometry,
  CREATOR_SIGNATURE_FONTS,
  CREATOR_SIGNATURE_FONT_SIZES,
  CREATOR_SIGNATURE_POSITIONS,
  CREATOR_SIGNATURE_PX_PER_MM,
  BOTTOM_SIGNATURE_LINE1_BASE_OFFSET_MM,
  DEFAULT_CREATOR_SIGNATURE,
} from './creatorSignature'

const qr = 'data:image/svg+xml;charset=utf-8,%3Csvg%20xmlns%3D%22http%3A%2F%2Fwww.w3.org%2F2000%2Fsvg%22%2F%3E'

describe('Creator Signature template contract', () => {

  it('keeps the default Creator Signature text fields empty and renders no default signature copy', () => {
    expect(DEFAULT_CREATOR_SIGNATURE.fields.line1Text).toBe('')
    expect(DEFAULT_CREATOR_SIGNATURE.fields.line2Text).toBe('')
    expect(DEFAULT_CREATOR_SIGNATURE.fields.line1Size).toBe('medium')
    expect(DEFAULT_CREATOR_SIGNATURE.fields.line2Size).toBe('medium')
    const svg = composeCreatorSignatureSvg(qr, DEFAULT_CREATOR_SIGNATURE.fields)
    expect(svg).not.toContain('Ernesto Creates')
    expect(svg).not.toContain('@ernesto')
    expect(svg.match(/data-signature-line=/g)).toBeNull()
  })
  it('exposes the fixed positions with top corners replacing badge/vertical options', () => {
    expect(CREATOR_SIGNATURE_POSITIONS.map(({ value }) => value)).toEqual([
      'bottom-right-outside',
      'bottom-left-outside',
      'below-centered',
      'top-right-corner',
      'top-left-corner',
    ])
    expect(CREATOR_SIGNATURE_POSITIONS.map(({ label }) => label)).toEqual([
      'Bottom right',
      'Bottom left',
      'Below centered',
      'Top right corner',
      'Top left corner',
    ])
    expect(DEFAULT_CREATOR_SIGNATURE.templateId).toBe('creator-signature')
  })

  it.each(CREATOR_SIGNATURE_POSITIONS)('composes $value as an outside decorative layer', ({ value }) => {
    const svg = composeCreatorSignatureSvg(qr, {
      signatureText: 'Creator <Signature>',
      handleText: '@creator',
      ctaText: 'Scan now',
      signaturePosition: value,
    })
    expect(svg).toContain('data-template-layer="creator-signature"')
    expect(svg).toContain(`data-signature-position="${value}"`)
    expect(svg).toContain('Creator &lt;Signature&gt;')
    expect(svg).toContain('<image')
    expect(svg).not.toContain('Creator <Signature>')
  })

  it('bounds user-facing text and preserves a clean empty-field composition', () => {
    const long = 'x'.repeat(100)
    const bounded = composeCreatorSignatureSvg(qr, { signatureText: long, handleText: long, ctaText: long, signaturePosition: 'top-right-corner' })
    expect(bounded).not.toContain('x'.repeat(37))
    expect(bounded).not.toContain('textLength=')
    expect(bounded).not.toContain('lengthAdjust=')
    const empty = composeCreatorSignatureSvg(qr, { signatureText: 'Creator', handleText: 'Handle', ctaText: '' })
    expect(empty).not.toContain('SCAN TO CONNECT')
    expect(empty).not.toContain('Scan to connect')
    expect(empty.match(/data-signature-line=/g)).toHaveLength(2)
    expect(empty).toContain('data-signature-position="bottom-right-outside"')
  })

  it('uses the Basic QR render as the full canvas instead of an independent template card', () => {
    const svg = composeCreatorSignatureSvg(qr, { signatureText: 'Creator', handleText: 'Handle', ctaText: '', signaturePosition: 'bottom-right-outside' })
    expect(svg).toContain('data-template-layer="creator-signature"')
    expect(svg).toContain('data-qr-active-zone="0,0,720,720"')
    expect(svg).toContain('data-qr-card-zone="0,0,720,720"')
    expect(svg).not.toContain('id="cs-bg"')
    expect(svg).not.toContain('stroke="#38bdf8"')
    expect(svg).not.toContain('data-qr-card-zone="96,41,528,620"')
  })

  it.each(CREATOR_SIGNATURE_POSITIONS)('keeps %s label slots outside active QR modules and near the QR card', ({ value }) => {
    const { qrImage, qrContent, qrCard, labelSlot } = creatorSignatureGeometry(value)
    const overlaps = (a: typeof qrImage, b: typeof qrImage) =>
      a.x < b.x + b.width && a.x + a.width > b.x && a.y < b.y + b.height && a.y + a.height > b.y
    const gapX = Math.max(qrCard.x - (labelSlot.x + labelSlot.width), labelSlot.x - (qrCard.x + qrCard.width), 0)
    const gapY = Math.max(qrCard.y - (labelSlot.y + labelSlot.height), labelSlot.y - (qrCard.y + qrCard.height), 0)

    expect(overlaps(labelSlot, qrContent)).toBe(false)
    expect(Math.hypot(gapX, gapY)).toBeLessThanOrEqual(1)
    expect(composeCreatorSignatureSvg(qr, { signaturePosition: value })).toContain(
      `data-signature-slot="${labelSlot.x},${labelSlot.y},${labelSlot.width},${labelSlot.height}"`,
    )
  })

  it.each(CREATOR_SIGNATURE_POSITIONS)('$value reserves card whitespace and renders text without a visible label container', ({ value }) => {
    const { qrImage, qrCard, labelSlot } = creatorSignatureGeometry(value)
    const contains = (outer: typeof qrCard, inner: typeof qrCard) =>
      inner.x >= outer.x && inner.y >= outer.y
      && inner.x + inner.width <= outer.x + outer.width
      && inner.y + inner.height <= outer.y + outer.height
    const svg = composeCreatorSignatureSvg(qr, { signaturePosition: value })

    expect(contains(qrCard, qrImage)).toBe(true)
    expect(contains(qrCard, labelSlot)).toBe(true)
    expect(svg).toContain('data-signature-reserved-shelf="true"')
    expect(svg).not.toContain('fill="#0f172a" stroke="#38bdf8"')
  })

  it('aligns the mirrored bottom shelves to the active QR vertical boundaries', () => {
    const right = creatorSignatureGeometry('bottom-right-outside')
    const left = creatorSignatureGeometry('bottom-left-outside')
    const rightSvg = composeCreatorSignatureSvg(qr, { line1Text: 'Creator', signaturePosition: 'bottom-right-outside' })
    const leftSvg = composeCreatorSignatureSvg(qr, { line1Text: 'Creator', signaturePosition: 'bottom-left-outside' })

    expect(right.labelSlot.x + right.labelSlot.width).toBe(right.qrContent.x + right.qrContent.width)
    expect(left.labelSlot.x).toBe(left.qrContent.x)
    expect(rightSvg).toContain(`data-qr-content-zone="${right.qrContent.x},${right.qrContent.y},${right.qrContent.width},${right.qrContent.height}"`)
    const bottomLine1Y = right.qrContent.y + right.qrContent.height + 22 + BOTTOM_SIGNATURE_LINE1_BASE_OFFSET_MM * CREATOR_SIGNATURE_PX_PER_MM
    expect(rightSvg).toContain(`x="${right.qrContent.x + right.qrContent.width}" y="${bottomLine1Y}" text-anchor="end"`)
    expect(leftSvg).toContain(`x="${left.qrContent.x}" y="${bottomLine1Y}" text-anchor="start"`)
    expect(rightSvg).not.toContain('stroke="#e2e8f0"')
    expect(leftSvg).not.toContain('stroke="#e2e8f0"')
  })

  it('aligns the mirrored top corners to the visible QR vertical boundaries and close to the top border', () => {
    const right = creatorSignatureGeometry('top-right-corner')
    const left = creatorSignatureGeometry('top-left-corner')
    const rightSvg = composeCreatorSignatureSvg(qr, { line1Text: 'Creator', signaturePosition: 'top-right-corner' })
    const leftSvg = composeCreatorSignatureSvg(qr, { line1Text: 'Creator', signaturePosition: 'top-left-corner' })

    expect(right.labelSlot.x + right.labelSlot.width).toBe(right.qrContent.x + right.qrContent.width)
    expect(left.labelSlot.x).toBe(left.qrContent.x)
    const defaultLineGap = 18
    const topTextY = right.qrContent.y - 22 - defaultLineGap
    const topLine2Baseline = topTextY + defaultLineGap
    expect(right.qrContent.y - (right.labelSlot.y + right.labelSlot.height)).toBeLessThanOrEqual(12)
    expect(left.qrContent.y - (left.labelSlot.y + left.labelSlot.height)).toBeLessThanOrEqual(12)
    expect(right.qrContent.y - topLine2Baseline).toBe(22)
    expect(left.qrContent.y - topLine2Baseline).toBe(22)
    expect(rightSvg).toContain(`x="${right.qrContent.x + right.qrContent.width}" y="${topTextY}" text-anchor="end"`)
    expect(leftSvg).toContain(`x="${left.qrContent.x}" y="${topTextY}" text-anchor="start"`)
    expect(rightSvg).not.toContain('top-right-badge')
    expect(leftSvg).not.toContain('right-side-vertical')
  })

  it('moves the signature with the rendered Core QR content bounds without resizing text', () => {
    const source = (start: number, size: number) => `data:image/svg+xml;charset=utf-8,${encodeURIComponent(`<svg xmlns="http://www.w3.org/2000/svg" width="512" height="512" viewBox="0 0 512 512"><rect width="512" height="512" fill="#ffffff"/><rect x="${start}" y="${start}" width="${size}" height="${size}" fill="#111827"/></svg>`)}`
    const smallSvg = composeCreatorSignatureSvg(source(150, 212), { line1Text: 'Creator', signaturePosition: 'bottom-right-outside' })
    const largeSvg = composeCreatorSignatureSvg(source(80, 352), { line1Text: 'Creator', signaturePosition: 'bottom-right-outside' })
    const zone = (svg: string) => svg.match(/data-qr-content-zone="([0-9,]+)"/)![1]
    const text = (svg: string) => svg.match(/<text data-signature-line="1"[^>]*x="([0-9.]+)" y="([0-9.]+)" text-anchor="end"[^>]*>/)!.slice(1).map(Number)
    const [smallX, smallY] = text(smallSvg)
    const [largeX, largeY] = text(largeSvg)

    expect(zone(smallSvg)).not.toBe(zone(largeSvg))
    expect(largeX).toBeGreaterThan(smallX)
    expect(largeY).toBeGreaterThan(smallY)
    expect(smallSvg).toContain('font-size="22"')
    expect(largeSvg).toContain('font-size="22"')
  })

  it('maps legacy text to two lines, ignores CTA, and applies independent fonts and palette colours', () => {
    const svg = composeCreatorSignatureSvg(qr, {
      signatureText: 'Legacy creator', handleText: '@legacy', ctaText: 'Never render this',
      line1Font: 'serif', line2Font: 'mono', line1Color: 'primary', line2Color: 'accent',
    }, { palette: { primary: '#112233', accent: '#445566' } })

    expect(svg.match(/data-signature-line=/g)).toHaveLength(2)
    expect(svg).toContain('Legacy creator')
    expect(svg).toContain('@legacy')
    expect(svg).not.toContain('Never render this')
    expect(svg).toContain('font-family="Georgia,Times New Roman,serif"')
    expect(svg).toContain('font-family="ui-monospace,SFMono-Regular,Menlo,monospace"')
    expect(svg).toContain('fill="#112233"')
    expect(svg).toContain('fill="#445566"')
  })

  it.each([
    ['bottom-right-outside', 1], ['bottom-left-outside', 1], ['below-centered', 1],
    ['top-right-corner', -1], ['top-left-corner', -1],
  ] as const)('moves %s by 4px per mm in the correct direction without scaling text', (position, direction) => {
    const zero = composeCreatorSignatureSvg(qr, { line1Text: 'Creator', signaturePosition: position, boundaryOffsetMm: 0 })
    const three = composeCreatorSignatureSvg(qr, { line1Text: 'Creator', signaturePosition: position, boundaryOffsetMm: 3 })
    const y = (svg: string) => Number(svg.match(/data-signature-line="1"[^>]*x="[0-9.]+" y="([0-9.]+)"/)![1])

    expect(y(three) - y(zero)).toBe(direction * 3 * CREATOR_SIGNATURE_PX_PER_MM)
    expect(zero).toContain('font-size="22"')
    expect(three).toContain('font-size="22"')
    expect(three).toContain('data-signature-offset-mm="3"')
  })

  it('adds a stronger built-in 4mm bottom baseline at visible 0mm and keeps the enlarged line 2 readable', () => {
    const bottom = composeCreatorSignatureSvg(qr, { line1Text: 'Creator', line2Text: 'Handle', signaturePosition: 'bottom-right-outside', boundaryOffsetMm: 0 })
    const top = composeCreatorSignatureSvg(qr, { line1Text: 'Creator', line2Text: 'Handle', signaturePosition: 'top-right-corner', boundaryOffsetMm: 0 })
    const lineYs = (svg: string) => [...svg.matchAll(/data-signature-line="([12])"[^>]*y="([0-9.]+)"/g)].map((match) => Number(match[2]))
    const bottomGeometry = creatorSignatureGeometry('bottom-right-outside')
    const topGeometry = creatorSignatureGeometry('top-right-corner')
    const readableGap = 18

    expect(lineYs(bottom)[0]).toBe(bottomGeometry.qrContent.y + bottomGeometry.qrContent.height + 22 + BOTTOM_SIGNATURE_LINE1_BASE_OFFSET_MM * CREATOR_SIGNATURE_PX_PER_MM)
    expect(lineYs(bottom)[1] - lineYs(bottom)[0]).toBe(readableGap)
    expect(lineYs(top)[1] - lineYs(top)[0]).toBe(readableGap)
    expect(lineYs(top)[0]).toBe(topGeometry.qrContent.y - 22 - readableGap)
  })

  it('renders all six contracted fonts, four sizes, and keeps position-independent type metrics', () => {
    expect(CREATOR_SIGNATURE_FONTS.map(({ value }) => value)).toEqual(['sans', 'serif', 'mono', 'cursive', 'handwritten', 'display'])
    expect(CREATOR_SIGNATURE_FONT_SIZES.map(({ value }) => value)).toEqual(['small', 'medium', 'large', 'extra-large'])

    for (const font of CREATOR_SIGNATURE_FONTS) {
      const svg = composeCreatorSignatureSvg(qr, { line1Text: 'Creator', line1Font: font.value })
      expect(svg).toContain(`data-signature-font="${font.value}"`)
    }
    const renderedTypeStyles = CREATOR_SIGNATURE_FONTS.map(({ value }) => {
      const svg = composeCreatorSignatureSvg(qr, { line1Text: 'Creator', line1Font: value })
      return svg.match(/<text data-signature-line="1"[^>]*>/)![0]
        .match(/font-family="[^"]+" font-size="22"(?: font-style="[^"]+")? font-weight="[^"]+" letter-spacing="[^"]+"/)![0]
    })
    expect(new Set(renderedTypeStyles).size).toBe(CREATOR_SIGNATURE_FONTS.length)

    const medium = composeCreatorSignatureSvg(qr, { line1Text: 'Creator', line2Text: 'Subtitle' })
    const extraSmall = composeCreatorSignatureSvg(qr, { line1Text: 'Creator', line2Text: 'Subtitle', line1Size: 'extra-large', line2Size: 'small' })
    const positions = (svg: string) => [...svg.matchAll(/data-signature-line="([12])"[^>]*y="([0-9.]+)"[^>]*font-size="([0-9.]+)"/g)].map((match) => ({ line: match[1], y: Number(match[2]), size: Number(match[3]) }))
    const mediumLines = positions(medium)
    const extraSmallLines = positions(extraSmall)

    expect(mediumLines.map((line) => line.size)).toEqual([22, 15])
    expect(mediumLines[1].y - mediumLines[0].y).toBe(18)
    expect(extraSmallLines.map((line) => line.size)).toEqual([30, 13])
    for (const [size, expectedPx] of [['small', 13], ['medium', 15], ['large', 17], ['extra-large', 19]] as const) {
      const rendered = composeCreatorSignatureSvg(qr, { line2Text: 'Subtitle', line2Size: size })
      expect(rendered).toContain(`data-signature-line="2"`)
      expect(rendered).toContain(`data-signature-size="${size}"`)
      expect(rendered).toContain(`font-size="${expectedPx}"`)
    }
    expect(extraSmall).toContain('data-signature-size="extra-large"')
    expect(extraSmall).toContain('data-signature-size="small"')
    expect(extraSmall).not.toContain('textLength=')

    for (const { value } of CREATOR_SIGNATURE_POSITIONS) {
      const positioned = composeCreatorSignatureSvg(qr, { line1Text: 'Creator', line1Size: 'extra-large', signaturePosition: value })
      expect(positioned).toContain('data-signature-size="extra-large"')
      expect(positioned).toContain('font-size="30"')
      expect(positioned).not.toContain('textLength=')
      expect(positioned).not.toContain('lengthAdjust=')
    }
  })
})
