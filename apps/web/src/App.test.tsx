import { describe, it, expect, beforeEach, vi } from 'vitest'
import { render, screen } from '@testing-library/react'
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

  it('renders main studio sections', () => {
    render(<App />)
    expect(screen.getByRole('heading', { name: /Artistic QR Studio/i })).toBeInTheDocument()
    expect(screen.getByRole('heading', { name: /Payload/i })).toBeInTheDocument()
    expect(screen.getByRole('heading', { name: /Art Direction/i })).toBeInTheDocument()
    expect(screen.getByRole('heading', { name: /Candidates/i })).toBeInTheDocument()
    expect(screen.getByRole('heading', { name: /Export/i })).toBeInTheDocument()
    expect(screen.getByRole('heading', { name: /Recover Project/i })).toBeInTheDocument()
  })

  it('uses compact palette dropdowns, preserves request fields, and hides QR Frame', async () => {
    const user = userEvent.setup()
    render(<App />)

    expect(screen.queryByText('QR Frame')).not.toBeInTheDocument()
    expect(screen.getByRole('combobox', { name: 'Solid Palette Presets' })).toHaveValue('Studio Blue')
    expect(screen.getByRole('combobox', { name: 'Patterned Palette Presets' })).toHaveValue('')

    await user.selectOptions(screen.getByRole('combobox', { name: 'Patterned Palette Presets' }), 'Rainbow diagonal')
    await user.click(screen.getByRole('button', { name: 'Punchy' }))
    expect(useStudioStore.getState().project.artDirection).toMatchObject({
      paletteFamily: 'rainbow',
      palettePattern: 'diagonalGradient',
      colorIntensity: 'punchy',
    })
    expect(screen.getByRole('combobox', { name: 'Patterned Palette Presets' })).toHaveValue('Rainbow diagonal')

    await user.selectOptions(screen.getByRole('combobox', { name: 'Solid Palette Presets' }), 'Berry')
    expect(useStudioStore.getState().project.artDirection).toMatchObject({ palettePattern: 'solid' })
    expect(useStudioStore.getState().project.artDirection.paletteFamily).toBeUndefined()
    expect(screen.getByRole('combobox', { name: 'Solid Palette Presets' })).toHaveValue('Berry')
  })

  it('truthfully constrains Artistic Strength to three meaningful render stages', () => {
    render(<App />)
    expect(screen.getByRole('slider', { name: 'Artistic Strength' })).toHaveAttribute('step', '0.5')
    expect(screen.getByText(/Three scan-safe stages change module treatment and framing/i)).toBeInTheDocument()
  })
})
