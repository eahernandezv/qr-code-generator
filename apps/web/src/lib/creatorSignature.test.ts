import { describe, expect, it } from 'vitest'
import {
  composeCreatorSignatureSvg,
  creatorSignatureGeometry,
  CREATOR_SIGNATURE_POSITIONS,
  DEFAULT_CREATOR_SIGNATURE,
} from './creatorSignature'

const qr = 'data:image/svg+xml;charset=utf-8,%3Csvg%20xmlns%3D%22http%3A%2F%2Fwww.w3.org%2F2000%2Fsvg%22%2F%3E'

describe('Creator Signature template contract', () => {
  it('exposes exactly the five frozen fixed positions and one template id', () => {
    expect(CREATOR_SIGNATURE_POSITIONS.map(({ value }) => value)).toEqual([
      'bottom-right-outside',
      'bottom-left-outside',
      'below-centered',
      'right-side-vertical',
      'top-right-badge',
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
    const bounded = composeCreatorSignatureSvg(qr, { signatureText: long, handleText: long, ctaText: long, signaturePosition: 'top-right-badge' })
    expect(bounded).not.toContain('x'.repeat(37))
    expect(bounded).toContain('textLength="220"')
    expect(bounded).toContain('lengthAdjust="spacingAndGlyphs"')
    const empty = composeCreatorSignatureSvg(qr, {})
    expect(empty).toContain('SCAN TO CONNECT')
    expect(empty).toContain('data-signature-position="bottom-right-outside"')
  })

  it.each(CREATOR_SIGNATURE_POSITIONS)('$value keeps its label slot attached to the QR card and outside the active QR', ({ value }) => {
    const { qrImage, qrCard, labelSlot } = creatorSignatureGeometry(value)
    const overlaps = (a: typeof qrImage, b: typeof qrImage) =>
      a.x < b.x + b.width && a.x + a.width > b.x && a.y < b.y + b.height && a.y + a.height > b.y
    const gapX = Math.max(qrCard.x - (labelSlot.x + labelSlot.width), labelSlot.x - (qrCard.x + qrCard.width), 0)
    const gapY = Math.max(qrCard.y - (labelSlot.y + labelSlot.height), labelSlot.y - (qrCard.y + qrCard.height), 0)

    expect(overlaps(labelSlot, qrImage)).toBe(false)
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
    const rightSvg = composeCreatorSignatureSvg(qr, { signaturePosition: 'bottom-right-outside' })
    const leftSvg = composeCreatorSignatureSvg(qr, { signaturePosition: 'bottom-left-outside' })

    expect(right.labelSlot.x + right.labelSlot.width).toBe(right.qrImage.x + right.qrImage.width)
    expect(left.labelSlot.x).toBe(left.qrImage.x)
    expect(rightSvg).toContain(`x="${right.qrImage.x + right.qrImage.width}" y="${right.qrImage.y + right.qrImage.height + 24}" text-anchor="end"`)
    expect(leftSvg).toContain(`x="${left.qrImage.x}" y="${left.qrImage.y + left.qrImage.height + 24}" text-anchor="start"`)
    expect(rightSvg).not.toContain('stroke="#e2e8f0"')
    expect(leftSvg).not.toContain('stroke="#e2e8f0"')
  })
})
