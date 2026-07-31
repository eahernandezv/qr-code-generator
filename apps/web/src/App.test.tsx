import { describe, it, expect, beforeEach, vi } from 'vitest'
import { render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import App from './App'
import { useStudioStore } from './store'
import { FEATURE_FLAGS } from './config/flags'

vi.mock('html-to-image', async () => ({
  toPng: vi.fn(() => Promise.resolve('data:image/png;base64,mocked')),
  toSvg: vi.fn(() => Promise.resolve('data:image/svg+xml;base64,mocked')),
}))

vi.mock('./lib/exportFormats', async () => ({
  exportToPdf: vi.fn(() => Promise.resolve()),
  exportToEps: vi.fn(() => Promise.resolve()),
}))

function resetStore() {
  useStudioStore.getState().resetProject()
  useStudioStore.setState({ featureFlags: { ...FEATURE_FLAGS } })
}

describe('App integration', () => {
  beforeEach(() => {
    resetStore()
  })

  it('renders the live editor first and keeps validation/export secondary', async () => {
    render(<App />)
    expect(screen.getByRole('heading', { name: /Artistic QR Studio/i })).toBeInTheDocument()
    expect(screen.getByRole('heading', { name: /Design your QR/i })).toBeInTheDocument()
    expect(screen.getByRole('img', { name: 'QR Preview' })).toBeInTheDocument()
    expect(screen.getByText(/Demo destination/i)).toBeInTheDocument()
    expect(useStudioStore.getState().project.payload.raw).toBe('')
    expect(screen.getByRole('button', { name: /Generate 4|Generation offline/ })).toBeDisabled()
    expect(screen.getByRole('heading', { name: /Destination/i })).toBeInTheDocument()
    expect(screen.getByRole('heading', { name: /Candidates/i })).toBeInTheDocument()
    expect(screen.getByRole('heading', { name: 'Export' })).toBeInTheDocument()
  })

  it('uses visual color and palette controls with obvious accessible selection', async () => {
    const user = userEvent.setup()
    render(<App />)

    expect(screen.queryByRole('combobox')).not.toBeInTheDocument()
    expect(screen.queryByText('QR Frame')).not.toBeInTheDocument()
    expect(screen.queryByText('Template')).not.toBeInTheDocument()
    expect(screen.queryByRole('slider', { name: 'Artistic Strength' })).not.toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Studio Blue selected' })).toHaveAttribute('aria-pressed', 'true')

    await user.click(screen.getByRole('option', { name: 'Rainbow diagonal' }))
    await user.click(screen.getByRole('button', { name: 'Punchy' }))
    expect(useStudioStore.getState().project.artDirection).toMatchObject({
      paletteFamily: 'rainbow',
      palettePattern: 'diagonalGradient',
      colorIntensity: 'punchy',
    })
    expect(screen.getByRole('option', { name: 'Rainbow diagonal selected' })).toHaveAttribute('aria-selected', 'true')

    await user.click(screen.getByRole('button', { name: 'Berry Pink' }))
    expect(useStudioStore.getState().project.artDirection).toMatchObject({ palettePattern: 'solid' })
    expect(useStudioStore.getState().project.artDirection.paletteFamily).toBeUndefined()
    expect(screen.getByRole('button', { name: 'Berry Pink selected' })).toHaveAttribute('aria-pressed', 'true')
  })

  it('maps compact Style choices into the canonical Core-backed art direction', async () => {
    const user = userEvent.setup()
    render(<App />)

    expect(screen.getByRole('option', { name: 'Rounded QR style selected' })).toHaveAttribute('aria-selected', 'true')
    await user.click(screen.getByRole('option', { name: 'Bold QR style' }))
    expect(useStudioStore.getState().project.artDirection).toMatchObject({
      templateId: 'geometric',
      artisticStrength: 1,
      composition: 'centered',
    })
    expect(screen.getByRole('option', { name: 'Bold QR style selected' })).toHaveAttribute('aria-selected', 'true')
  })

  it('moves from demo design to the real destination stage', async () => {
    const user = userEvent.setup()
    render(<App />)
    await user.click(screen.getByRole('button', { name: 'Use this design' }))
    await waitFor(() => expect(screen.getByRole('textbox', { name: 'Final destination URL' })).toHaveFocus())
  })
})
