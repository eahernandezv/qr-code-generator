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
    expect(screen.queryByText('Bind the real destination before generation.')).not.toBeInTheDocument()
    for (const removedLabel of ['Color', 'Palette', 'Style', 'Corners', 'Eyes', 'Intensity']) {
      expect(screen.queryByText(removedLabel, { exact: true })).not.toBeInTheDocument()
    }
    expect(screen.queryByText(/1200|2400|3600/)).not.toBeInTheDocument()
  })

  it('uses the no-scroll comparison layout as the default public route and keeps scrollable Version A behind an explicit query', async () => {
    const user = userEvent.setup()
    render(<App />)
    expect(screen.getByTestId('studio-app')).toHaveAttribute('data-ux-variant', 'no-scroll')
    expect(screen.getByRole('tablist', { name: 'Design control families' })).toBeInTheDocument()
    const colorTab = screen.getByRole('tab', { name: 'Show color controls' })
    const paletteTab = screen.getByRole('tab', { name: 'Show palette controls' })
    expect(colorTab).toHaveAttribute('aria-selected', 'true')
    colorTab.focus()
    await user.keyboard('{ArrowRight}')
    expect(paletteTab).toHaveAttribute('aria-selected', 'true')
    expect(paletteTab).toHaveFocus()

    window.history.replaceState({}, '', '/?uxVariant=scroll')
    render(<App />)
    const apps = screen.getAllByTestId('studio-app')
    expect(apps[apps.length - 1]).toHaveAttribute('data-ux-variant', 'default')
    expect(screen.getAllByRole('tablist', { name: 'Design control families' })).toHaveLength(1)
  })

  it('uses accessible Core-backed Color, Style, Corners, and Eyes choices', async () => {
    const user = userEvent.setup()
    render(<App />)
    expect(screen.queryByRole('combobox')).not.toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Studio Blue selected' })).toHaveAttribute('aria-pressed', 'true')

    await user.click(screen.getByRole('button', { name: 'Classic Black' }))
    expect(useStudioStore.getState().project.artDirection.palette).toMatchObject({ primary: '#000000', background: '#ffffff' })

    await user.click(screen.getByRole('option', { name: 'Dots QR style' }))
    expect(useStudioStore.getState().project.artDirection.moduleStyle).toBe('circle')
    expect(screen.getByRole('option', { name: 'Dots QR style selected' })).toHaveAttribute('aria-selected', 'true')

    for (const name of ['Classic', 'Rounded', 'Dots', 'Vertical', 'Horizontal']) {
      expect(screen.getByRole('option', { name: new RegExp(`^${name} QR style`) })).toBeInTheDocument()
    }

    await user.click(screen.getByRole('option', { name: 'Circle corner style' }))
    expect(useStudioStore.getState().project.artDirection.eyeFrameStyle).toBe('circle')
    expect(screen.getByRole('option', { name: 'Circle corner style selected' })).toHaveAttribute('aria-selected', 'true')

    await user.click(screen.getByRole('option', { name: 'Chamfered eye style' }))
    expect(useStudioStore.getState().project.artDirection.eyeBallStyle).toBe('chamfered')
    expect(screen.getByRole('option', { name: 'Chamfered eye style selected' })).toHaveAttribute('aria-selected', 'true')

    for (const suffix of ['corner style', 'eye style']) {
      for (const name of ['Classic', 'Soft', 'Circle', 'Squircle', 'Chamfered']) {
        expect(screen.getByRole('option', { name: new RegExp(`^${name} ${suffix}`) })).toBeInTheDocument()
      }
    }
  })

  it('keeps gated generation/export authority available only in the explicit internal workflow', () => {
    window.history.replaceState({}, '', '/?workflow=internal')
    render(<App />)
    expect(screen.getByRole('heading', { name: /Candidates/i })).toBeInTheDocument()
    expect(screen.getByRole('heading', { name: 'Export' })).toBeInTheDocument()
    expect(screen.getByRole('button', { name: /Generate 4|Generation offline/ })).toBeDisabled()
  })

  it('keeps public typing draft-only while internal entitlement can live-update', async () => {
    const user = userEvent.setup()
    const publicView = render(<App />)
    await user.type(screen.getByRole('textbox', { name: 'Final destination URL' }), 'public.example')
    expect(useStudioStore.getState().project.payload.raw).toBe('')
    publicView.unmount()

    resetStore()
    window.history.replaceState({}, '', '/?workflow=internal')
    render(<App />)
    await user.type(screen.getByRole('textbox', { name: 'Final destination URL' }), 'member.example')
    expect(useStudioStore.getState().project.payload.normalized).toBe('https://member.example/')
  })
})
