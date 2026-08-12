import { beforeEach, describe, expect, it } from 'vitest'
import { act, render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import ArtDirectionPanel, { CORNER_COLOR_OPTIONS, PATTERNED_PRESETS, SOLID_PRESETS } from './ArtDirectionPanel'
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

describe('ArtDirectionPanel B18 controls', () => {
  beforeEach(resetStore)

  it('keeps all fifty-one solid foreground variants dark against their backgrounds', () => {
    const variants = SOLID_PRESETS.flatMap((preset) => Object.entries(preset.variants)
      .map(([intensity, palette]) => ({ name: preset.name, intensity, palette })))
    expect(variants).toHaveLength(51)
    for (const variant of variants) {
      expect(
        contrastRatio(variant.palette.primary, variant.palette.background),
        `${variant.name} ${variant.intensity}`,
      ).toBeGreaterThanOrEqual(4.5)
    }
  })

  it('combines seventeen solids and eleven patterns in Body Color and offers Match body plus seventeen corner colors', async () => {
    const user = userEvent.setup()
    render(<ArtDirectionPanel />)

    const bodyColors = screen.getByRole('listbox', { name: 'Body Color' })
    expect(bodyColors.querySelectorAll('[role="option"]')).toHaveLength(28)
    expect(SOLID_PRESETS).toHaveLength(17)
    expect(PATTERNED_PRESETS).toHaveLength(11)
    expect(bodyColors.querySelector('[data-body-color-separator="true"]')).toBeInTheDocument()

    const purple = screen.getByRole('option', { name: 'Electric Purple' })
    await user.click(purple)
    expect(screen.getByRole('option', { name: 'Electric Purple selected' })).toHaveAttribute('aria-selected', 'true')
    await user.click(screen.getByRole('option', { name: 'Rainbow horizontal' }))
    expect(useStudioStore.getState().project.artDirection).toMatchObject({
      paletteFamily: 'rainbow',
      palettePattern: 'horizontalGradient',
    })
    await user.click(screen.getByRole('option', { name: 'Dora Pink' }))
    expect(useStudioStore.getState().project.artDirection).toMatchObject({
      paletteFamily: undefined,
      palettePattern: 'solid',
      palette: { primary: '#c01978', secondary: '#80104f', accent: '#ff7bb8', background: '#fff0f8' },
    })
    await user.click(screen.getByRole('option', { name: 'Dora mixed diagonal' }))
    expect(useStudioStore.getState().project.artDirection).toMatchObject({
      paletteFamily: 'dora',
      palettePattern: 'diagonalGradient',
    })

    const cornerColors = screen.getByRole('listbox', { name: 'Corner Color' })
    expect(CORNER_COLOR_OPTIONS).toHaveLength(17)
    expect(cornerColors.querySelectorAll('[role="option"]')).toHaveLength(18)
    expect(screen.getByRole('option', { name: 'Match body selected' })).toHaveAttribute('data-setting', 'match-body')
    await user.click(screen.getByRole('option', { name: 'Dora Navy corner color' }))
    expect(useStudioStore.getState().project.artDirection.cornerColor).toBe('#071258')
    await user.click(screen.getByRole('option', { name: 'Match body' }))
    expect(useStudioStore.getState().project.artDirection.cornerColor).toBeUndefined()
    expect(JSON.stringify(useStudioStore.getState().project.artDirection)).not.toContain('cornerColor')

    for (const row of ['Style', 'Corners', 'Eyes']) {
      expect(screen.getByRole('listbox', { name: row })).toBeInTheDocument()
    }
    await user.click(screen.getByRole('option', { name: 'Circle corner style' }))
    expect(useStudioStore.getState().project.artDirection.eyeFrameStyle).toBe('circle')

    const expectedSettings = {
      Style: ['square', 'rounded', 'circle', 'vertical-bars', 'horizontal-bars', 'notched', 'shield'],
      Corners: ['square', 'rounded', 'circle', 'squircle', 'chamfered', 'diamond', 'hex', 'leaf-frame', 'opposing-leaf-frame', 'd-frame', 'inset-leaf-frame'],
      Eyes: ['square', 'rounded', 'circle', 'squircle', 'chamfered', 'hex', 'vertical-capsule', 'horizontal-capsule', 'star', 'diamond'],
    } as const
    for (const rowName of ['Style', 'Corners', 'Eyes'] as const) {
      const options = screen.getByRole('listbox', { name: rowName }).querySelectorAll('[role="option"]')
      expect(options).toHaveLength(expectedSettings[rowName].length)
      expect(Array.from(options, (option) => option.getAttribute('data-setting'))).toEqual(expectedSettings[rowName])
      for (const option of options) expect(option.textContent).toMatch(/^✓?$/)
    }
    expect(screen.getByRole('option', { name: /^Classic QR style/ })).toHaveAttribute('data-setting', 'square')
    expect(screen.getByRole('option', { name: /^Dots QR style/ })).toHaveAttribute('data-setting', 'circle')
    expect(screen.getByRole('option', { name: /^Chamfered eye style/ })).toHaveAttribute('data-setting', 'chamfered')

    const newOptions = [
      ['Notched QR style', 'notched', 'notched'],
      ['Shield QR style', 'shield', 'shield'],
      ['Diamond corner style', 'diamond', 'eye-frame-diamond'],
      ['Hex corner style', 'hex', 'eye-frame-hex'],
      ['Hex eye style', 'hex', 'eye-ball-hex'],
      ['Vertical capsule eye style', 'vertical-capsule', 'eye-ball-vertical-capsule'],
      ['Horizontal capsule eye style', 'horizontal-capsule', 'eye-ball-horizontal-capsule'],
      ['Leaf frame corner style', 'leaf-frame', 'eye-frame-leaf-frame'],
      ['Opposing leaf frame corner style', 'opposing-leaf-frame', 'eye-frame-opposing-leaf-frame'],
      ['D frame corner style', 'd-frame', 'eye-frame-d-frame'],
      ['Inset leaf frame corner style', 'inset-leaf-frame', 'eye-frame-inset-leaf-frame'],
      ['Star eye style', 'star', 'eye-ball-star'],
      ['Diamond eye style', 'diamond', 'eye-ball-diamond'],
    ] as const
    for (const [name, setting, recipe] of newOptions) {
      const option = screen.getByRole('option', { name })
      expect(option).toHaveAttribute('data-setting', setting)
      expect(option).toHaveAttribute('title', name)
      expect(option).toHaveTextContent('')
      expect(option.querySelector('img')).toHaveAttribute('data-icon-recipe', recipe)
      await user.click(option)
      expect(screen.getByRole('option', { name: `${name} selected` })).toHaveAttribute('aria-selected', 'true')
    }
    expect(useStudioStore.getState().project.artDirection).toMatchObject({
      moduleStyle: 'shield',
      eyeFrameStyle: 'inset-leaf-frame',
      eyeBallStyle: 'diamond',
    })
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
