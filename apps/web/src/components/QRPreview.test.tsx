import { describe, it, expect, vi } from 'vitest'
import { render, screen, waitFor } from '@testing-library/react'
import QRPreview from './QRPreview'
import { useStudioStore } from '../store'

vi.mock('qrcode', async () => {
  return {
    default: {
      toDataURL: vi.fn((_payload: string, _opts: unknown) =>
        Promise.resolve('data:image/png;base64,mockedqr'),
      ),
    },
  }
})

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
})
