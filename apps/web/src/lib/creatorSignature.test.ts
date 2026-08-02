import { describe, expect, it } from 'vitest'
import {
  composeCreatorSignatureSvg,
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
})
