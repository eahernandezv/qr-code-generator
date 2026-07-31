import { describe, it, expect, beforeEach } from 'vitest'
import { render, screen, act } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import PayloadInput from './PayloadInput'
import { useStudioStore } from '../store'
import { FEATURE_FLAGS } from '../config/flags'

function resetStore() {
  const { resetProject } = useStudioStore.getState()
  resetProject()
  useStudioStore.setState({ featureFlags: { ...FEATURE_FLAGS } })
}

describe('PayloadInput', () => {
  beforeEach(() => {
    resetStore()
  })

  it('uses a compact two-row textarea', () => {
    render(<PayloadInput />)
    expect(screen.getByRole('textbox')).toHaveAttribute('rows', '2')
  })

  it('switches modes and updates payload placeholder', async () => {
    render(<PayloadInput />)
    await act(async () => {
      await userEvent.click(screen.getByRole('button', { name: /Text/i }))
    })
    expect(screen.getByPlaceholderText(/Enter text/i)).toBeInTheDocument()
  })

  it('normalizes a URL with https prefix', async () => {
    render(<PayloadInput />)
    const textarea = screen.getByPlaceholderText(/Enter url/i)
    await act(async () => {
      await userEvent.type(textarea, 'example.com')
    })
    expect(screen.getByText(/Normalized:/i)).toHaveTextContent('https://example.com')
  })

  it('shows validation error for invalid URL (host with space)', async () => {
    render(<PayloadInput />)
    const textarea = screen.getByPlaceholderText(/Enter url/i)
    await act(async () => {
      await userEvent.clear(textarea)
      await userEvent.type(textarea, 'foo bar')
    })
    expect(screen.getByText(/Invalid URL/i)).toBeInTheDocument()
  })

  it('limits payload length indicator', async () => {
    render(<PayloadInput />)
    expect(screen.getByText(/0\/4096/i)).toBeInTheDocument()
    const textarea = screen.getByPlaceholderText(/Enter url/i)
    await act(async () => {
      await userEvent.type(textarea, 'hello')
    })
    expect(screen.getByText(/5\/4096/i)).toBeInTheDocument()
  })
})
