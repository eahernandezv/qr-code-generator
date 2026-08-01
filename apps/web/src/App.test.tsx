import { describe, it, expect, beforeEach } from 'vitest'
import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import App from './App'
import { useStudioStore } from './store'
import { FEATURE_FLAGS } from './config/flags'

function resetStore() {
  window.history.replaceState({}, '', '/')
  useStudioStore.getState().resetProject()
  useStudioStore.setState({ featureFlags: { ...FEATURE_FLAGS } })
}

describe('App integration', () => {
  beforeEach(resetStore)

  it('keeps the public path focused on the compact editor and destination', () => {
    render(<App />)
    expect(screen.getByRole('heading', { name: /Design your QR/i })).toBeInTheDocument()
    expect(screen.getByRole('img', { name: 'QR Preview' })).toBeInTheDocument()
    expect(screen.getByRole('heading', { name: /Destination/i })).toBeInTheDocument()
    expect(screen.queryByText('Love this look?')).not.toBeInTheDocument()
    expect(screen.queryByRole('heading', { name: /Candidates/i })).not.toBeInTheDocument()
    expect(screen.queryByRole('heading', { name: 'Export' })).not.toBeInTheDocument()
    expect(screen.queryByText('Live Core-backed preview')).not.toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Continue with this QR' })).toBeDisabled()
    expect(screen.getByText('After checkout: PNG + SVG downloads · Social and print sizes')).toBeInTheDocument()
    expect(screen.queryByText(/1200|2400|3600/)).not.toBeInTheDocument()
  })

  it('uses accessible Core-backed Color, Style, and Corners choices', async () => {
    const user = userEvent.setup()
    render(<App />)
    expect(screen.queryByRole('combobox')).not.toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Studio Blue selected' })).toHaveAttribute('aria-pressed', 'true')

    await user.click(screen.getByRole('button', { name: 'Classic Black' }))
    expect(useStudioStore.getState().project.artDirection.palette).toMatchObject({ primary: '#000000', background: '#ffffff' })

    await user.click(screen.getByRole('option', { name: 'Dots QR style' }))
    expect(useStudioStore.getState().project.artDirection.moduleStyle).toBe('dot')
    expect(screen.getByRole('option', { name: 'Dots QR style selected' })).toHaveAttribute('aria-selected', 'true')

    await user.click(screen.getByRole('option', { name: 'Circle corner style' }))
    expect(useStudioStore.getState().project.artDirection.eyeStyle).toBe('circle')
    expect(screen.getByRole('option', { name: 'Circle corner style selected' })).toHaveAttribute('aria-selected', 'true')
  })

  it('keeps gated generation/export authority available only in the explicit internal workflow', () => {
    window.history.replaceState({}, '', '/?workflow=internal')
    render(<App />)
    expect(screen.getByRole('heading', { name: /Candidates/i })).toBeInTheDocument()
    expect(screen.getByRole('heading', { name: 'Export' })).toBeInTheDocument()
    expect(screen.getByRole('button', { name: /Generate 4|Generation offline/ })).toBeDisabled()
  })
})
