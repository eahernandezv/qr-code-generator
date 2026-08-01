import { beforeEach, describe, expect, it } from 'vitest'
import { act, render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import ArtDirectionPanel, { SOLID_PRESETS } from './ArtDirectionPanel'
import { useStudioStore } from '../store'

function resetStore() {
  act(() => useStudioStore.getState().resetProject())
}

function relativeLuminance(hex: string): number {
  const channels = [1, 3, 5]
    .map((offset) => Number.parseInt(hex.slice(offset, offset + 2), 16) / 255)
    .map((channel) => channel <= 0.04045 ? channel / 12.92 : ((channel + 0.055) / 1.055) ** 2.4)
  return 0.2126 * channels[0] + 0.7152 * channels[1] + 0.0722 * channels[2]
}

function contrastRatio(foreground: string, background: string): number {
  const [lighter, darker] = [relativeLuminance(foreground), relativeLuminance(background)].sort((a, b) => b - a)
  return (lighter + 0.05) / (darker + 0.05)
}

describe('ArtDirectionPanel B16 controls', () => {
  beforeEach(resetStore)

  it('keeps all thirty-six solid foreground variants dark against their backgrounds', () => {
    const variants = SOLID_PRESETS.flatMap((preset) => Object.entries(preset.variants)
      .map(([intensity, palette]) => ({ name: preset.name, intensity, palette })))
    expect(variants).toHaveLength(36)
    for (const variant of variants) {
      expect(
        contrastRatio(variant.palette.primary, variant.palette.background),
        `${variant.name} ${variant.intensity}`,
      ).toBeGreaterThanOrEqual(4.5)
    }
  })

  it('offers twelve accessible solid swatches and keeps Style, Corners, and Eyes functional', async () => {
    const user = userEvent.setup()
    render(<ArtDirectionPanel />)

    const colors = screen.getByRole('group', { name: 'Color' })
    expect(colors.querySelectorAll('button')).toHaveLength(12)
    const purple = screen.getByRole('button', { name: 'Electric Purple' })
    await user.click(purple)
    expect(screen.getByRole('button', { name: 'Electric Purple selected' })).toHaveAttribute('aria-pressed', 'true')

    for (const row of ['Style', 'Corners', 'Eyes']) {
      expect(screen.getByRole('listbox', { name: row })).toBeInTheDocument()
    }
    await user.click(screen.getByRole('option', { name: 'Circle corner style' }))
    expect(useStudioStore.getState().project.artDirection.eyeFrameStyle).toBe('circle')

    for (const rowName of ['Style', 'Corners', 'Eyes']) {
      const options = screen.getByRole('listbox', { name: rowName }).querySelectorAll('[role="option"]')
      expect(options).toHaveLength(5)
      for (const option of options) expect(option.textContent).toMatch(/^✓?$/)
    }
    expect(screen.getByRole('option', { name: /^Classic QR style/ })).toHaveAttribute('data-setting', 'square')
    expect(screen.getByRole('option', { name: /^Dots QR style/ })).toHaveAttribute('data-setting', 'circle')
    expect(screen.getByRole('option', { name: /^Chamfered eye style/ })).toHaveAttribute('data-setting', 'chamfered')
  })

  it('uses QR-side accessible controls and maps solid intensity plus QR prominence into art direction', async () => {
    const user = userEvent.setup()
    render(<ArtDirectionPanel />)

    const sideControls = screen.getByTestId('qr-side-controls')
    expect(sideControls).toContainElement(screen.getByRole('group', { name: 'QR size' }))
    expect(sideControls).toContainElement(screen.getByRole('group', { name: 'Intensity' }))
    expect(screen.getByRole('button', { name: 'Balanced QR size' })).toHaveAttribute('aria-pressed', 'true')
    expect(screen.getByRole('button', { name: 'Balanced color intensity' })).toHaveAttribute('aria-pressed', 'true')
    expect(screen.getByRole('button', { name: 'Balanced QR size' })).toHaveTextContent('')
    expect(screen.getByRole('button', { name: 'Balanced color intensity' })).toHaveTextContent('')

    const balancedPrimary = useStudioStore.getState().project.artDirection.palette?.primary
    await user.click(screen.getByRole('button', { name: 'Mellow color intensity' }))
    expect(useStudioStore.getState().project.artDirection).toMatchObject({
      colorIntensity: 'mellow',
      palette: { primary: '#405b91' },
    })
    expect(useStudioStore.getState().project.artDirection.palette?.primary).not.toBe(balancedPrimary)

    await user.click(screen.getByRole('button', { name: 'Larger QR size' }))
    expect(useStudioStore.getState().project.artDirection.protectedQrProminence).toBe(0.85)
  })
})
