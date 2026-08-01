import { describe, it, expect } from 'vitest'
import { render, screen, waitFor } from '@testing-library/react'
import QRPreview, { normalizeBrowserSvg } from './QRPreview'
import { useStudioStore } from '../store'

describe('QRPreview', () => {
  it('shows placeholder when no payload is entered', () => {
    render(<QRPreview size={320} />)
    expect(screen.getByText(/Enter a payload to preview/i)).toBeInTheDocument()
  })

  it('renders a preview when payload is provided', async () => {
    const state = useStudioStore.getState()
    state.setPayload({ raw: 'https://example.com', normalized: 'https://example.com', mode: 'url' })

    render(<QRPreview size={320} />)
    await waitFor(() => {
      expect(screen.getByAltText('QR Preview')).toBeInTheDocument()
    })
  })

  it('removes every byte-identical duplicate fill attribute from Core preview SVG transport', () => {
    const duplicateRows = '<svg><rect fill="#123" x="1" fill="#123"/><rect fill="#456" y="2" fill="#456"/></svg>'
    const normalized = normalizeBrowserSvg(duplicateRows)
    expect(normalized.match(/fill="#123"/g)).toHaveLength(1)
    expect(normalized.match(/fill="#456"/g)).toHaveLength(1)
    expect(normalized).toContain('x="1"')
    expect(normalized).toContain('y="2"')
  })
})
