import { describe, it, expect, beforeEach, vi } from 'vitest'
import { render, screen, act } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import ExportPanel from './ExportPanel'
import { useStudioStore } from '../store'
import { FEATURE_FLAGS } from '../config/flags'

vi.mock('../lib/exportFormats', async () => {
  return {
    exportToPdf: vi.fn(() => Promise.resolve()),
    exportToEps: vi.fn(() => Promise.resolve()),
  }
})

function resetStore() {
  const { resetProject } = useStudioStore.getState()
  resetProject()
  useStudioStore.setState({ featureFlags: { ...FEATURE_FLAGS } })
}

function seedProjectWithCandidate(exportAllowed = false) {
  const state = useStudioStore.getState()
  state.setPayload({ raw: 'https://example.com', normalized: 'https://example.com', mode: 'url' })
  state.addBoard({
    boardId: 'b1',
    projectId: state.project.projectId,
    roundNumber: 1,
    candidates: [{
      candidateId: 'c1',
      projectId: state.project.projectId,
      status: 'ready',
      previewUrl: 'data:image/png;base64,abc',
      artisticScore: 0.85,
      createdAt: new Date().toISOString(),
      validationResult: {
        pass: true,
        confidence: 0.92,
        decoderResults: [
          { decoder: 'zxing', pass: true, decodedPayload: 'https://example.com', match: true, latencyMs: 42 },
          { decoder: 'jsqr', pass: true, decodedPayload: 'https://example.com', match: true },
        ],
        perturbationSummary: [
          { type: 'blur', passRate: 0.8, details: 'Minor scannable under soft blur' },
          { type: 'contrast', passRate: 0.95 },
        ],
        recommendations: ['Increase quiet zone for lower-end scanners'],
      },
    }],
    status: 'complete',
    createdAt: new Date().toISOString(),
    completedAt: new Date().toISOString(),
  })
  state.selectCandidate('c1')
  if (exportAllowed) {
    useStudioStore.setState((s) => ({
      project: {
        ...s.project,
        entitlement: { ...s.project.entitlement, exportAllowed: true, maxRounds: 3, usedRounds: 0 },
      },
    }))
  }
}

describe('ExportPanel', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    resetStore()
  })

  it('shows checkout offline when checkout is disabled', () => {
    seedProjectWithCandidate()
    render(<ExportPanel />)
    expect(screen.getByText(/Checkout offline/i)).toBeInTheDocument()
  })

  it('shows validation summary and labels evidence without Core provenance as unverified', () => {
    seedProjectWithCandidate()
    render(<ExportPanel />)
    expect(screen.getByText(/Validation Summary/i)).toBeInTheDocument()
    expect(screen.getByText(/92%/i)).toBeInTheDocument()
    expect(screen.getByText(/zxing/i)).toBeInTheDocument()
    expect(screen.getByText(/blur/i)).toBeInTheDocument()
    expect(screen.getByText(/Increase quiet zone/i)).toBeInTheDocument()
    expect(screen.getByText(/Evidence source not supplied/i)).toBeInTheDocument()
  })

  it('does not show validation summary when candidate lacks validation data', () => {
    seedProjectWithCandidate()
    // remove validation result from candidate
    act(() => {
      useStudioStore.getState().updateCandidate('b1', 'c1', { validationResult: undefined })
    })
    const { container } = render(<ExportPanel />)
    expect(container.querySelector('.rounded-lg')).toBeInTheDocument()
    expect(screen.queryByText(/Validation Summary/i)).not.toBeInTheDocument()
  })

  it('toggles export type between single and bundle when checkout enabled', () => {
    seedProjectWithCandidate(true)
    useStudioStore.setState((s) => ({
      featureFlags: { ...s.featureFlags, artistic_checkout_enabled: true },
    }))
    render(<ExportPanel />)

    // Format selector is visible in single mode
    expect(screen.getByText(/Format/i)).toBeInTheDocument()

    const bundleBtn = screen.getByRole('button', { name: /Bundle \(/i })
    act(() => {
      bundleBtn.click()
    })

    // After choosing bundle, format selection should disappear
    expect(screen.queryByText(/Format/i)).not.toBeInTheDocument()
  })

  it('restricts large sizes when export is not allowed', () => {
    seedProjectWithCandidate(false)
    useStudioStore.setState((s) => ({
      featureFlags: { ...s.featureFlags, artistic_checkout_enabled: true },
    }))
    render(<ExportPanel />)

    const largeSizeBtn = screen.getByRole('button', { name: /Large Print/i })
    expect(largeSizeBtn).toBeDisabled()
    // "Purchase required" appears on each blocked size button
    expect(screen.getAllByText(/Purchase required/i).length).toBeGreaterThanOrEqual(1)

    const socialBtn = screen.getByRole('button', { name: /Social/i })
    expect(socialBtn).not.toBeDisabled()
  })

  it('opens and closes print preview overlay', async () => {
    seedProjectWithCandidate(false)
    render(<ExportPanel />)

    const previewBtn = screen.getByRole('button', { name: /Preview at size/i })
    await act(async () => {
      await userEvent.click(previewBtn)
    })

    expect(screen.getByText(/Print Preview/i)).toBeInTheDocument()
    expect(screen.getByRole('dialog', { name: /Print preview/i })).toBeInTheDocument()

    // Close via close button
    const closeBtn = screen.getByRole('button', { name: /Close/i })
    await act(async () => {
      await userEvent.click(closeBtn)
    })

    expect(screen.queryByRole('dialog')).not.toBeInTheDocument()
  })

  it('closes print preview with Escape key', async () => {
    seedProjectWithCandidate(false)
    render(<ExportPanel />)

    await act(async () => {
      await userEvent.click(screen.getByRole('button', { name: /Preview at size/i }))
    })

    expect(screen.getByRole('dialog')).toBeInTheDocument()

    // The close button receives focus when modal opens
    await act(async () => {
      await userEvent.keyboard('{Escape}')
    })

    expect(screen.queryByRole('dialog')).not.toBeInTheDocument()
  })

  it('does not show decoder section when candidate has no decoder results', () => {
    seedProjectWithCandidate()
    // Replace validation with confidence only
    act(() => {
      useStudioStore.getState().updateCandidate('b1', 'c1', {
        validationResult: {
          pass: true,
          confidence: 0.85,
        },
      })
    })
    render(<ExportPanel />)
    expect(screen.getByText(/Validation Summary/i)).toBeInTheDocument()
    expect(screen.queryByText(/Decoders/i)).not.toBeInTheDocument()
    expect(screen.queryByText(/Perturbation Tests/i)).not.toBeInTheDocument()
  })

  it('announces canvas export failures', async () => {
    seedProjectWithCandidate(true)
    useStudioStore.setState((s) => ({
      featureFlags: { ...s.featureFlags, artistic_checkout_enabled: true },
    }))
    const getContext = vi.spyOn(HTMLCanvasElement.prototype, 'getContext').mockReturnValue(null)
    const consoleError = vi.spyOn(console, 'error').mockImplementation(() => undefined)
    render(<ExportPanel />)

    await userEvent.click(screen.getByRole('button', { name: 'Export PNG' }))

    expect(await screen.findByRole('alert')).toHaveTextContent('Canvas renderer unavailable')
    expect(consoleError).toHaveBeenCalledWith('Export failed:', expect.any(Error))
    getContext.mockRestore()
    consoleError.mockRestore()
  })
})
