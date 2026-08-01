import { describe, it, expect, beforeEach } from 'vitest'
import { render, screen, act } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import PayloadInput from './PayloadInput'
import { useStudioStore } from '../store'
import { FEATURE_FLAGS } from '../config/flags'

function resetStore() {
  useStudioStore.getState().resetProject()
  useStudioStore.setState({ featureFlags: { ...FEATURE_FLAGS } })
}

describe('PayloadInput', () => {
  beforeEach(resetStore)

  it('shows a compact content selector and two-row input', () => {
    render(<PayloadInput />)
    expect(screen.getByRole('textbox', { name: 'Final destination URL' })).toHaveAttribute('rows', '2')
    expect(screen.getByRole('button', { name: 'URL' })).toHaveAttribute('aria-pressed', 'true')
    expect(screen.getByRole('button', { name: 'Email' })).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Text' })).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Phone' })).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Continue with this QR' })).toBeDisabled()
    expect(screen.getByText('After checkout: PNG + SVG downloads · Social and print sizes')).toBeInTheDocument()
  })

  it('keeps typed content as a draft until explicit activation', async () => {
    const user = userEvent.setup()
    render(<PayloadInput />)
    await act(async () => user.type(screen.getByRole('textbox'), 'example.com'))
    expect(screen.getByText(/Encoded:/i)).toHaveTextContent('https://example.com')
    expect(useStudioStore.getState().project.payload.normalized).toBe('')
    const activation = screen.getByRole('button', { name: 'Continue with this QR' })
    expect(activation).toBeEnabled()
    await user.click(activation)
    expect(useStudioStore.getState().project.payload.normalized).toBe('https://example.com/')
    expect(screen.getByRole('status')).toHaveTextContent('Content confirmed · Checkout coming next')
  })

  it('switches to Email and constructs a mailto payload', async () => {
    const user = userEvent.setup()
    render(<PayloadInput />)
    await user.click(screen.getByRole('button', { name: 'Email' }))
    const input = screen.getByRole('textbox', { name: 'Email address' })
    expect(input).toHaveAttribute('placeholder', 'name@example.com')
    await user.type(input, 'studio@example.com')
    expect(useStudioStore.getState().project.payload.normalized).toBe('')
    await user.click(screen.getByRole('button', { name: 'Continue with this QR' }))
    expect(useStudioStore.getState().project.payload).toMatchObject({
      mode: 'email',
      normalized: 'mailto:studio@example.com',
    })
  })

  it('validates URL and Email input truthfully', async () => {
    const user = userEvent.setup()
    render(<PayloadInput />)
    await user.type(screen.getByRole('textbox'), 'foo bar')
    expect(screen.getByRole('alert')).toHaveTextContent('Invalid URL')
    await user.click(screen.getByRole('button', { name: 'Email' }))
    await user.clear(screen.getByRole('textbox'))
    await user.type(screen.getByRole('textbox'), 'not-an-email')
    expect(screen.getByRole('alert')).toHaveTextContent('Invalid email address')
  })
})
