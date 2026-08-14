import { describe, it, expect, beforeEach, vi } from 'vitest'
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

  it('builds a real request, renders Creator candidates, then invalidates them on edits', async () => {
    const user = userEvent.setup()
    window.history.replaceState({}, '', '/concepts/level2-image-fit-qr')
    const response = structuredClone((await import('../../../packages/contracts/fixtures/image-fit-qr/valid-balanced-response.v1.json')).default)
    vi.stubGlobal('fetch', vi.fn().mockImplementation(async (_url, init) => {
      const request = JSON.parse(String(init?.body))
      return { ok: true, json: async () => ({ ...response, request: { ...response.request, request_id: request.request_id } }) }
    }))
    render(<App />)

    const concept = screen.getByTestId('image-fit-qr-concept')
    expect(concept).toHaveAttribute('data-export-payload-bound', 'false')
    expect(concept).toHaveAttribute('data-checkout-bound', 'false')
    expect(screen.queryByTestId('selected-image-fit-candidate')).not.toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Generate candidates' })).toBeEnabled()
    expect(screen.getByLabelText('Choose target image')).toBeInTheDocument()
    expect(screen.queryByRole('button', { name: 'Upload locked' })).not.toBeInTheDocument()

    await user.click(screen.getByRole('button', { name: 'Generate candidates' }))
    const preview = await screen.findByTestId('selected-image-fit-candidate')
    expect(preview).toHaveAttribute('data-artifact-sha256', '6f9b0ba69475d860d3e22ad4e030e59e44b170c9ec3cdee4658f909c03f08940')
    expect(screen.getByRole('article', { name: 'Balanced generated candidate' })).toHaveTextContent(/8\/8 checks/)
    expect(screen.getByRole('status')).toHaveTextContent(/Export and Checkout remain unavailable/)

    await user.click(screen.getByRole('button', { name: 'Original URL' }))
    expect(screen.queryByTestId('selected-image-fit-candidate')).not.toBeInTheDocument()
    expect(screen.getByText('Ready for real generation')).toBeInTheDocument()
  })

  it('fails closed when Creator generation is unavailable and never shows fixture evidence', async () => {
    const user = userEvent.setup()
    window.history.replaceState({}, '', '/concepts/level2-image-fit-qr')
    vi.stubGlobal('fetch', vi.fn().mockRejectedValue(new TypeError('offline')))
    render(<App />)
    await user.click(screen.getByRole('button', { name: 'Generate candidates' }))
    expect(await screen.findByRole('alert')).toHaveTextContent(/Generation failed closed.*service is unavailable/i)
    expect(screen.queryByTestId('selected-image-fit-candidate')).not.toBeInTheDocument()
    expect(screen.queryByRole('article')).not.toBeInTheDocument()
    expect(screen.queryByRole('button', { name: /Export|Checkout|Create short link/i })).not.toBeInTheDocument()
  })

  it('disables generation for invalid input', async () => {
    const user = userEvent.setup()
    window.history.replaceState({}, '', '/concepts/level2-image-fit-qr')
    render(<App />)
    await user.clear(screen.getByRole('textbox', { name: 'Level 2 destination URL' }))
    expect(screen.getByRole('button', { name: 'Generate candidates' })).toBeDisabled()
    expect(screen.getByRole('textbox', { name: 'Level 2 destination URL' })).toHaveAttribute('aria-invalid', 'true')
  })

  it('uses the QR-Style Creator Signature card as the default Level 1 editor and preserves two independent lines', async () => {
    const user = userEvent.setup()
    render(<App />)
    await user.click(screen.getByRole('button', { name: 'Creator Signature' }))

    expect(screen.getByTestId('creator-signature-card-alt')).toBeInTheDocument()
    expect(screen.getByRole('tablist', { name: 'Signature lines' }).querySelectorAll('[role="tab"]')).toHaveLength(2)
    expect(screen.getByRole('tab', { name: /Line 1/ })).toHaveAttribute('aria-selected', 'true')
    screen.getByRole('tab', { name: /Line 1/ }).focus()
    await user.keyboard('{ArrowRight}')
    expect(screen.getByRole('tab', { name: /Line 2/ })).toHaveFocus()
    await user.keyboard('{ArrowLeft}')
    expect(screen.getAllByRole('textbox')).toHaveLength(1)
    expect(screen.getByRole('textbox', { name: 'Line 1' })).toHaveValue('')
    expect(screen.queryByRole('textbox', { name: /Line 3|CTA/i })).not.toBeInTheDocument()
    expect(screen.getByRole('tab', { name: /Placement/ })).toHaveAttribute('aria-selected', 'false')

    await user.type(screen.getByRole('textbox', { name: 'Line 1' }), 'Studio signature')
    await user.click(screen.getByRole('button', { name: 'Line 1 handwritten font' }))
    await user.click(screen.getByRole('tab', { name: /Line 2/ }))
    await user.type(screen.getByRole('textbox', { name: 'Line 2' }), '@studio')
    await user.click(screen.getByRole('tab', { name: /Size/ }))
    expect(screen.getByRole('group', { name: 'Line 2 size' }).querySelectorAll('button')).toHaveLength(4)
    await user.click(screen.getByRole('button', { name: 'Line 2 extra large size' }))
    await user.click(screen.getByRole('tab', { name: /Colour/ }))
    await user.click(screen.getByRole('button', { name: 'Line 2 accent' }))
    await user.click(screen.getByRole('tab', { name: /Placement/ }))
    await user.click(screen.getByRole('radio', { name: 'Top left corner' }))
    await user.click(screen.getByRole('radio', { name: '3mm boundary offset' }))

    expect(useStudioStore.getState().project.templateArt?.fields).toMatchObject({
      line1Text: 'Studio signature', line1Font: 'handwritten',
      line2Text: '@studio', line2Size: 'extra-large', line2Color: 'accent',
      signaturePosition: 'top-left-corner', boundaryOffsetMm: 3,
    })
    expect(screen.queryByText(/textLength|lengthAdjust/)).not.toBeInTheDocument()
  })

  it('uses one shared style toolbar for two independently editable lines on the space-efficient concept route', async () => {
    const user = userEvent.setup()
    window.history.replaceState({}, '', '/concepts/creator-signature-ux/space-creator')
    render(<App />)

    expect(screen.getByTestId('creator-signature-space-concept')).toBeInTheDocument()
    expect(screen.getAllByRole('textbox', { name: /^Signature line [12]$/ })).toHaveLength(2)
    expect(screen.queryByRole('textbox', { name: /Line 3|CTA/i })).not.toBeInTheDocument()
    expect(screen.getAllByRole('group', { name: /^Line [12] font$/ })).toHaveLength(1)
    expect(screen.getAllByRole('group', { name: /^Line [12] size$/ })).toHaveLength(1)
    expect(screen.getAllByRole('group', { name: /^Line [12] colour$/ })).toHaveLength(1)

    await user.click(screen.getByRole('button', { name: 'Line 1 handwritten font' }))
    await user.click(screen.getByRole('button', { name: 'Line 1 extra large size' }))
    await user.click(screen.getByRole('button', { name: 'Line 1 accent' }))
    await user.click(screen.getByRole('button', { name: 'Edit line 2 style' }))

    expect(screen.getByRole('group', { name: 'Line 2 font' }).querySelectorAll('button')).toHaveLength(6)
    expect(screen.getByRole('group', { name: 'Line 2 size' }).querySelectorAll('button')).toHaveLength(4)
    expect(screen.getByRole('group', { name: 'Line 2 colour' }).querySelectorAll('button')).toHaveLength(4)
    await user.click(screen.getByRole('button', { name: 'Line 2 mono font' }))
    await user.click(screen.getByRole('button', { name: 'Line 2 small size' }))
    await user.click(screen.getByRole('button', { name: 'Line 2 corner color' }))
    await user.click(screen.getByRole('radio', { name: 'Top left corner' }))
    await user.click(screen.getByRole('radio', { name: '3mm boundary offset' }))

    expect(useStudioStore.getState().project.templateArt?.fields).toMatchObject({
      line1Font: 'handwritten', line1Size: 'extra-large', line1Color: 'accent',
      line2Font: 'mono', line2Size: 'small', line2Color: 'secondary',
      signaturePosition: 'top-left-corner', boundaryOffsetMm: 3,
    })
  })

  it('renders the independent icon-first Creator Signature concept only on its child route', async () => {
    const user = userEvent.setup()
    const rootView = render(<App />)
    expect(screen.getByTestId('studio-app')).toBeInTheDocument()
    expect(screen.queryByTestId('creator-signature-icon-concept')).not.toBeInTheDocument()
    rootView.unmount()

    window.history.replaceState({}, '', '/concepts/creator-signature-ux/creator')
    const conceptView = render(<App />)

    expect(screen.getByTestId('creator-signature-icon-concept')).toBeInTheDocument()
    expect(screen.getAllByRole('textbox', { name: /^Signature line [12]$/ })).toHaveLength(2)
    expect(screen.queryByRole('heading', { name: 'Creator Signature' })).not.toBeInTheDocument()

    for (const line of [1, 2]) {
      expect(screen.getByRole('group', { name: `Line ${line} font` }).querySelectorAll('button')).toHaveLength(6)
      expect(screen.getByRole('group', { name: `Line ${line} size` }).querySelectorAll('button')).toHaveLength(4)
      expect(screen.getByRole('group', { name: `Line ${line} colour` }).querySelectorAll('button')).toHaveLength(4)
    }
    expect(Array.from(screen.getByRole('radiogroup', { name: 'Signature placement' }).querySelectorAll('[role="radio"]')).map((option) => option.getAttribute('aria-label'))).toEqual([
      'Bottom left', 'Bottom right', 'Below centered', 'Top left corner', 'Top right corner',
    ])
    expect(Array.from(screen.getByRole('radiogroup', { name: 'Boundary offset' }).querySelectorAll('[role="radio"]')).map((option) => option.getAttribute('aria-label'))).toEqual([
      '0mm boundary offset', '1mm boundary offset', '2mm boundary offset', '3mm boundary offset',
    ])

    await user.click(screen.getByRole('button', { name: 'Line 1 handwritten font' }))
    await user.click(screen.getByRole('button', { name: 'Line 1 extra large size' }))
    await user.click(screen.getByRole('button', { name: 'Line 1 accent' }))
    await user.click(screen.getByRole('button', { name: 'Line 2 mono font' }))
    await user.click(screen.getByRole('button', { name: 'Line 2 small size' }))
    await user.click(screen.getByRole('button', { name: 'Line 2 corner color' }))
    await user.click(screen.getByRole('radio', { name: 'Top left corner' }))
    await user.click(screen.getByRole('radio', { name: '3mm boundary offset' }))

    expect(useStudioStore.getState().project.templateArt?.fields).toMatchObject({
      line1Font: 'handwritten',
      line1Size: 'extra-large',
      line1Color: 'accent',
      line2Font: 'mono',
      line2Size: 'small',
      line2Color: 'secondary',
      signaturePosition: 'top-left-corner',
      boundaryOffsetMm: 3,
    })

    conceptView.unmount()
    expect(useStudioStore.getState().project.templateArtLevel).toBe('basic')
  })

  it('keeps the public path focused on the compact editor and destination', () => {
    render(<App />)
    expect(screen.queryByRole('heading', { name: /Design your QR/i })).not.toBeInTheDocument()
    expect(screen.getByRole('img', { name: 'QR Preview' })).toBeInTheDocument()
    expect(screen.queryByRole('heading', { name: /Destination/i })).not.toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Destination' })).toHaveAttribute('aria-pressed', 'false')
    expect(screen.queryByText('Love this look?')).not.toBeInTheDocument()
    expect(screen.queryByRole('heading', { name: /Candidates/i })).not.toBeInTheDocument()
    expect(screen.queryByRole('heading', { name: 'Export' })).not.toBeInTheDocument()
    expect(screen.queryByText('Live Core-backed preview')).not.toBeInTheDocument()
    expect(screen.queryByRole('button', { name: 'Continue with this QR' })).not.toBeInTheDocument()
    expect(screen.queryByText('After checkout: PNG + SVG downloads · Social and print sizes')).not.toBeInTheDocument()
    expect(screen.queryByText('Bind the real destination before generation.')).not.toBeInTheDocument()
    for (const removedLabel of ['Color', 'Palette', 'Style', 'Corners', 'Eyes', 'Intensity']) {
      expect(screen.queryByText(removedLabel, { exact: true })).not.toBeInTheDocument()
    }
    expect(screen.queryByText(/1200|2400|3600/)).not.toBeInTheDocument()
  })

  it('offers a compact, non-commerce path from the Level 1 apex to the isolated Level 2 concept', () => {
    render(<App />)

    expect(screen.getByTestId('studio-app')).toBeInTheDocument()
    expect(screen.queryByTestId('image-fit-qr-concept')).not.toBeInTheDocument()
    const conceptLink = screen.getByRole('link', { name: /Open Level 2 Image-Fit QR concept/i })
    expect(conceptLink).toHaveAttribute('href', '/concepts/level2-image-fit-qr')
    expect(conceptLink).toHaveTextContent('Image-Fit QR')
    expect(conceptLink).toHaveTextContent('Level 2 · export locked')
    expect(conceptLink).not.toHaveTextContent(/checkout|price|payment|unlock/i)
  })

  it('uses the no-scroll comparison layout as the default public route and keeps scrollable Version A behind an explicit query', async () => {
    const user = userEvent.setup()
    render(<App />)
    expect(screen.getByTestId('studio-app')).toHaveAttribute('data-ux-variant', 'no-scroll')
    expect(screen.getByRole('region', { name: 'QR Style' })).toHaveAttribute('data-basic-controls-tray', 'true')
    expect(screen.getByRole('region', { name: 'QR Style' }).className).toContain('border')
    expect(screen.getByRole('heading', { name: 'QR Style' })).toBeInTheDocument()
    expect(screen.getByRole('tablist', { name: 'Design control families' })).toBeInTheDocument()
    const bodyColorTab = screen.getByRole('tab', { name: 'Show Body Color controls' })
    const cornerColorTab = screen.getByRole('tab', { name: 'Show Corner Color controls' })
    expect(bodyColorTab).toHaveAttribute('aria-selected', 'true')
    bodyColorTab.focus()
    await user.keyboard('{ArrowRight}')
    expect(cornerColorTab).toHaveAttribute('aria-selected', 'true')
    expect(cornerColorTab).toHaveFocus()

    window.history.replaceState({}, '', '/?uxVariant=scroll')
    render(<App />)
    const apps = screen.getAllByTestId('studio-app')
    expect(apps[apps.length - 1]).toHaveAttribute('data-ux-variant', 'default')
    expect(screen.getAllByRole('tablist', { name: 'Design control families' })).toHaveLength(1)
  })

  it('toggles between Basic QR settings and Creator Signature settings while keeping one shared QR canvas', async () => {
    const user = userEvent.setup()
    render(<App />)
    expect(screen.getByTestId('studio-app')).toHaveAttribute('data-ux-variant', 'no-scroll')
    const previewZone = screen.getByTestId('qr-side-controls')
    const preview = screen.getByRole('img', { name: 'QR Preview' })
    expect(preview).toHaveAttribute('data-art-level', 'basic')
    expect(previewZone).toContainElement(preview)
    expect(previewZone).toContainElement(screen.getByRole('group', { name: 'QR size' }))
    expect(previewZone).toContainElement(screen.getByRole('group', { name: 'Intensity' }))
    expect(screen.getByRole('group', { name: 'Settings panel' })).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'QR Style' })).toHaveAttribute('aria-pressed', 'true')
    expect(screen.getByRole('tablist', { name: 'Design control families' })).toBeInTheDocument()

    await user.click(screen.getByRole('button', { name: 'Creator Signature' }))

    expect(preview).toHaveAttribute('data-art-level', 'template-art')
    expect(screen.getByTestId('studio-app')).toHaveAttribute('data-ux-variant', 'no-scroll')
    expect(screen.getByTestId('qr-side-controls')).toContainElement(preview)
    expect(screen.getByTestId('qr-side-controls')).toContainElement(screen.getByRole('group', { name: 'QR size' }))
    expect(screen.getByTestId('qr-side-controls')).toContainElement(screen.getByRole('group', { name: 'Intensity' }))
    const lowerControls = screen.getByTestId('lower-design-controls')
    expect(lowerControls).toContainElement(screen.getByRole('heading', { name: 'Creator Signature' }))
    expect(screen.getByTestId('creator-signature-card-alt')).toBeInTheDocument()
    const line1 = screen.getByRole('textbox', { name: 'Line 1' })
    expect(lowerControls).toContainElement(line1)
    expect(line1).toHaveValue('')
    expect(screen.getAllByRole('textbox')).toHaveLength(1)
    expect(screen.getByRole('tablist', { name: 'Signature lines' }).querySelectorAll('[role="tab"]')).toHaveLength(2)
    expect(screen.queryByDisplayValue('Ernesto Creates')).not.toBeInTheDocument()
    expect(screen.queryByDisplayValue('@ernesto')).not.toBeInTheDocument()
    expect(screen.queryByRole('textbox', { name: 'CTA text' })).not.toBeInTheDocument()
    expect(screen.queryByRole('tablist', { name: 'Design control families' })).not.toBeInTheDocument()
    expect(screen.queryByRole('listbox', { name: 'Body Color' })).not.toBeInTheDocument()

    await user.click(screen.getByRole('button', { name: 'QR Style' }))

    expect(screen.getByRole('button', { name: 'QR Style' })).toHaveAttribute('aria-pressed', 'true')
    expect(preview).toHaveAttribute('data-art-level', 'template-art')
    expect(screen.getByRole('tablist', { name: 'Design control families' })).toBeInTheDocument()
    expect(screen.getByRole('region', { name: 'QR Style' })).toContainElement(screen.getByRole('listbox', { name: 'Body Color' }))
    expect(screen.getByRole('listbox', { name: 'Body Color' })).toBeInTheDocument()
    expect(screen.getByRole('heading', { name: 'QR Style' })).toBeInTheDocument()
    await user.click(screen.getByRole('button', { name: 'Destination' }))

    expect(screen.getByRole('button', { name: 'Destination' })).toHaveAttribute('aria-pressed', 'true')
    expect(screen.getByTestId('lower-design-controls')).toContainElement(screen.getByRole('heading', { name: 'Destination' }))
    expect(screen.getByRole('textbox', { name: 'Final destination URL' })).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Continue with this QR' })).toBeDisabled()

    await user.click(screen.getByRole('button', { name: 'Creator Signature' }))
    expect(screen.queryByRole('heading', { name: 'Destination' })).not.toBeInTheDocument()
  })

  it('uses one icon-only five-position Creator Signature radio row', async () => {
    const user = userEvent.setup()
    render(<App />)
    await user.click(screen.getByRole('button', { name: 'Creator Signature' }))
    await user.click(screen.getByRole('tab', { name: /Placement/ }))

    const selector = screen.getByRole('radiogroup', { name: 'Fixed signature position' })
    const expected = ['Bottom left', 'Bottom right', 'Below centered', 'Top left corner', 'Top right corner']
    const radios = Array.from(selector.querySelectorAll<HTMLButtonElement>('[role="radio"]'))

    expect(radios).toHaveLength(5)
    expect(radios.map((radio) => radio.getAttribute('aria-label'))).toEqual(expected)
    expect(radios.every((radio) => radio.textContent?.trim() === '')).toBe(true)
    expect(screen.getByRole('radiogroup', { name: 'Signature boundary offset' }).querySelectorAll('[role="radio"]')).toHaveLength(4)
    for (const name of expected) {
      expect(screen.getByRole('radio', { name })).toHaveAttribute('title', name)
    }
    expect(screen.queryByRole('radio', { name: 'Right side vertical' })).not.toBeInTheDocument()
    expect(screen.queryByRole('radio', { name: 'Top right badge' })).not.toBeInTheDocument()

    const previewZone = screen.getByTestId('qr-side-controls')
    const preview = screen.getByRole('img', { name: 'QR Preview' })
    expect(previewZone).toContainElement(preview)
    await user.click(screen.getByRole('radio', { name: 'Top left corner' }))
    expect(screen.getByRole('radio', { name: 'Top left corner' })).toHaveAttribute('aria-checked', 'true')
    expect(useStudioStore.getState().project.templateArt?.fields.signaturePosition).toBe('top-left-corner')
    expect(previewZone).toContainElement(preview)

    await user.keyboard('{ArrowRight}')
    expect(screen.getByRole('radio', { name: 'Top right corner' })).toHaveAttribute('aria-checked', 'true')
    expect(screen.getByRole('radio', { name: 'Top right corner' })).toHaveFocus()
    expect(useStudioStore.getState().project.templateArt?.fields.signaturePosition).toBe('top-right-corner')
  })

  it('edits exactly two independently styled Creator Signature lines with fixed offset choices', async () => {
    const user = userEvent.setup()
    render(<App />)
    await user.click(screen.getByRole('button', { name: 'Creator Signature' }))

    expect(screen.getByTestId('creator-signature-card-alt')).toBeInTheDocument()
    expect(screen.getAllByRole('textbox').filter((input) => /^Line [12]$/.test(input.getAttribute('aria-label') ?? ''))).toHaveLength(1)
    expect(screen.queryByRole('textbox', { name: /CTA|Line 3/i })).not.toBeInTheDocument()
    expect(screen.queryByText('Level 2 · Template Art')).not.toBeInTheDocument()
    expect(screen.queryByText('ONLY TEMPLATE')).not.toBeInTheDocument()
    expect(screen.queryByRole('combobox', { name: /Line [12] (font|size|colour)/ })).not.toBeInTheDocument()
    expect(screen.getByRole('group', { name: 'Line 1 font' }).querySelectorAll('button')).toHaveLength(6)
    await user.click(screen.getByRole('tab', { name: /Size/ }))
    expect(screen.getByRole('group', { name: 'Line 1 size' }).querySelectorAll('button')).toHaveLength(4)
    await user.click(screen.getByRole('tab', { name: /Font/ }))
    await user.click(screen.getByRole('button', { name: 'Line 1 serif font' }))
    await user.click(screen.getByRole('tab', { name: /Size/ }))
    await user.click(screen.getByRole('button', { name: 'Line 1 large size' }))
    await user.click(screen.getByRole('tab', { name: /Colour/ }))
    await user.click(screen.getByRole('button', { name: 'Line 1 body color' }))
    await user.click(screen.getByRole('tab', { name: /Line 2/ }))
    await user.click(screen.getByRole('tab', { name: /Font/ }))
    expect(screen.getByRole('group', { name: 'Line 2 font' }).querySelectorAll('button')).toHaveLength(6)
    await user.click(screen.getByRole('button', { name: 'Line 2 mono font' }))
    await user.click(screen.getByRole('tab', { name: /Size/ }))
    expect(screen.getByRole('group', { name: 'Line 2 size' }).querySelectorAll('button')).toHaveLength(4)
    await user.click(screen.getByRole('button', { name: 'Line 2 small size' }))
    await user.click(screen.getByRole('tab', { name: /Colour/ }))
    await user.click(screen.getByRole('button', { name: 'Line 2 accent' }))
    await user.click(screen.getByRole('tab', { name: /Placement/ }))
    expect(Array.from(screen.getByRole('radiogroup', { name: 'Signature boundary offset' }).querySelectorAll('[role="radio"]')).map((option) => option.getAttribute('aria-label'))).toEqual(['0mm boundary offset', '1mm boundary offset', '2mm boundary offset', '3mm boundary offset'])
    await user.click(screen.getByRole('radio', { name: '3mm boundary offset' }))

    expect(useStudioStore.getState().project.templateArt?.fields).toMatchObject({
      line1Font: 'serif', line2Font: 'mono', line1Size: 'large', line2Size: 'small', line1Color: 'primary', line2Color: 'accent', boundaryOffsetMm: 3,
    })
  })

  it('uses accessible Core-backed Body Color, Corner Color, Style, Corners, and Eyes choices', async () => {
    const user = userEvent.setup()
    render(<App />)
    expect(screen.queryByRole('combobox')).not.toBeInTheDocument()
    const bodyColors = screen.getByRole('listbox', { name: 'Body Color' })
    expect(bodyColors).toContainElement(screen.getByRole('option', { name: 'Studio Blue selected' }))

    await user.click(bodyColors.getElementsByTagName('button')[0])
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
    await user.click(screen.getByRole('button', { name: 'Destination' }))
    await user.type(screen.getByRole('textbox', { name: 'Final destination URL' }), 'public.example')
    expect(useStudioStore.getState().project.payload.raw).toBe('')
    publicView.unmount()

    resetStore()
    window.history.replaceState({}, '', '/?workflow=internal')
    render(<App />)
    await user.click(screen.getByRole('button', { name: 'Destination' }))
    await user.type(screen.getByRole('textbox', { name: 'Final destination URL' }), 'member.example')
    expect(useStudioStore.getState().project.payload.normalized).toBe('https://member.example/')
  })
})
