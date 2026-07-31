import { describe, it, expect, beforeEach, vi } from 'vitest'
import { render, screen, act, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import CandidateBoard from './CandidateBoard'
import { useStudioStore } from '../store'
import { FEATURE_FLAGS } from '../config/flags'
import type { GenerationBoard, Candidate } from '../types'

function resetStore() {
  const { resetProject, setIsGenerating } = useStudioStore.getState()
  setIsGenerating(false)
  resetProject()
  useStudioStore.setState({ featureFlags: { ...FEATURE_FLAGS } })
}

function enableFlags(
  flags: Partial<{ artistic_generative_enabled: boolean; artistic_refinement_enabled: boolean }> = {},
) {
  useStudioStore.setState((s) => ({
    featureFlags: {
      ...s.featureFlags,
      ...flags,
    },
  }))
}

function seedPayload() {
  const { setPayload } = useStudioStore.getState()
  setPayload({ raw: 'https://example.com', normalized: 'https://example.com', mode: 'url' })
}

function seedPaidEntitlement(maxRounds = 3, usedRounds = 0) {
  useStudioStore.setState((state) => ({
    project: {
      ...state.project,
      entitlement: {
        ...state.project.entitlement,
        type: 'project',
        maxRounds,
        usedRounds,
        exportAllowed: true,
      },
    },
  }))
}

function seedCompleteBoard() {
  const state = useStudioStore.getState()
  const candidate: Candidate = {
    candidateId: 'c1',
    projectId: state.project.projectId,
    status: 'ready',
    previewUrl: 'data:image/png;base64,',
    artisticScore: 0.85,
    createdAt: new Date().toISOString(),
  }
  const board: GenerationBoard = {
    boardId: 'b1',
    projectId: state.project.projectId,
    roundNumber: 1,
    candidates: [candidate],
    status: 'complete',
    createdAt: new Date().toISOString(),
    completedAt: new Date().toISOString(),
  }
  state.addBoard(board)
  state.selectCandidate(candidate.candidateId)
}

function seedGeneratingBoard() {
  const state = useStudioStore.getState()
  const candidate: Candidate = {
    candidateId: 'c-gen',
    projectId: state.project.projectId,
    status: 'generating',
    createdAt: new Date().toISOString(),
  }
  const board: GenerationBoard = {
    boardId: 'b-gen',
    projectId: state.project.projectId,
    roundNumber: 1,
    candidates: [candidate],
    status: 'generating',
    createdAt: new Date().toISOString(),
  }
  state.addBoard(board)
  state.setIsGenerating(true)
}

function coreBoardResponse() {
  return {
    success: true,
    board: {
      boardId: 'core-board-1',
      status: 'completed',
      candidates: Array.from({ length: 4 }, (_, index) => ({
        candidateId: `core-candidate-${index + 1}`,
        matrixRef: `qr:1:0:${index}`,
        rendered: {
          format: 'svg',
          data: '<svg xmlns="http://www.w3.org/2000/svg" width="256" height="256"><rect width="256" height="256"/></svg>',
          width: 256,
          height: 256,
        },
        scanResults: [{
          pass: true,
          decoder: 'jsqr',
          version: '1.4.0',
          thresholdVersion: 'scan-v1',
          scannedPayload: 'https://example.com/',
          tests: [{ name: 'baseline', pass: true, scale: 1, perturbation: 'none' }],
          overallConfidence: 'high',
        }],
        exportAllowed: true,
        artisticScore: 0.8,
        provenance: {
          generationMode: 'deterministic_template',
          provider: 'local',
          modelVersion: 'qr-core-v1',
          adapterVersion: 'artistic-qr-v1',
          validationVersion: 'scan-v1-real-75pct',
          createdAt: '2026-07-29T23:00:00.000Z',
        },
      })),
    },
  }
}

function successfulCoreFetch() {
  return vi.fn().mockResolvedValue(new Response(JSON.stringify(coreBoardResponse()), {
    status: 200,
    headers: { 'Content-Type': 'application/json' },
  }))
}

describe('CandidateBoard', () => {
  beforeEach(() => {
    resetStore()
    vi.stubGlobal('fetch', successfulCoreFetch())
  })

  it('shows empty state when no candidates exist', () => {
    render(<CandidateBoard />)
    expect(screen.getByText('No candidates yet')).toBeInTheDocument()
    expect(screen.getByText(/Enter a payload and click Generate/i)).toBeInTheDocument()
  })

  it('disables Generate when no payload is entered', () => {
    enableFlags({ artistic_generative_enabled: true })
    render(<CandidateBoard />)
    const btn = screen.getByRole('button', { name: /Generate 4/i })
    expect(btn).toBeDisabled()
  })

  it('disables Generate when generative feature is offline', () => {
    seedPayload()
    render(<CandidateBoard />)
    const btn = screen.getByRole('button', { name: /Generation offline/i })
    expect(btn).toBeDisabled()
  })

  it('calls Core /candidates and stores four authoritative candidate IDs and rendered previews', async () => {
    seedPayload()
    enableFlags({ artistic_generative_enabled: true })
    render(<CandidateBoard />)

    await userEvent.click(screen.getByRole('button', { name: /Generate 4/i }))

    await waitFor(() => expect(useStudioStore.getState().project.boards).toHaveLength(1))
    const fetchMock = vi.mocked(fetch)
    expect(fetchMock).toHaveBeenCalledTimes(1)
    expect(fetchMock.mock.calls[0][0]).toBe('/api/artistic-qr/candidates')
    const request = fetchMock.mock.calls[0][1]
    expect(request?.method).toBe('POST')
    const body = JSON.parse(String(request?.body))
    expect(body.mode).toBe('deterministic_template')
    expect(body.normalizedPayload.canonical).toBe('https://example.com/')

    const candidates = useStudioStore.getState().project.boards[0].candidates
    expect(candidates.map((candidate) => candidate.candidateId)).toEqual([
      'core-candidate-1', 'core-candidate-2', 'core-candidate-3', 'core-candidate-4',
    ])
    expect(candidates.every((candidate) => candidate.previewUrl?.startsWith('data:image/svg+xml'))).toBe(true)
    expect(candidates.every((candidate) => candidate.renderResult?.provenance?.engine === 'artistic-qr-v1')).toBe(true)
  })

  it('shows Core generation failure without creating mock candidates and permits retry', async () => {
    seedPayload()
    enableFlags({ artistic_generative_enabled: true })
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue(new Response(JSON.stringify({
      success: false,
      code: 'PROVIDER_FAILED',
      message: 'Candidate generation failed',
    }), { status: 502, headers: { 'Content-Type': 'application/json' } })))
    render(<CandidateBoard />)

    await userEvent.click(screen.getByRole('button', { name: /Generate 4/i }))

    expect(await screen.findByRole('alert')).toHaveTextContent('PROVIDER_FAILED: Candidate generation failed')
    expect(useStudioStore.getState().project.boards).toHaveLength(0)
    expect(screen.getByRole('button', { name: /Generate 4/i })).toBeEnabled()
  })

  it('shows cancel button when a board is generating', () => {
    seedPayload()
    enableFlags({ artistic_generative_enabled: true })
    seedGeneratingBoard()
    render(<CandidateBoard />)
    expect(screen.getByRole('button', { name: /Cancel/i })).toBeInTheDocument()
    expect(screen.queryByRole('button', { name: /Generate 4/i })).not.toBeInTheDocument()
  })

  it('cancels an active generation and recovers UI state', async () => {
    seedPayload()
    enableFlags({ artistic_generative_enabled: true })
    seedGeneratingBoard()
    render(<CandidateBoard />)

    const cancelBtn = screen.getByRole('button', { name: /Cancel/i })
    await act(async () => {
      await userEvent.click(cancelBtn)
    })

    const state = useStudioStore.getState()
    const failedBoard = state.project.boards.find((b) => b.status === 'failed')
    expect(failedBoard).toBeTruthy()
    expect(state.isGenerating).toBe(false)

    // Cancel button should disappear after cancel
    expect(screen.queryByRole('button', { name: /^Cancel$/i })).not.toBeInTheDocument()
    // Generate button should return
    expect(screen.getByRole('button', { name: /Generate 4/i })).toBeInTheDocument()
  })

  it('shows expanded refinement UI only for a paid selected candidate', () => {
    seedPayload()
    seedPaidEntitlement()
    enableFlags({ artistic_generative_enabled: true, artistic_refinement_enabled: true })
    seedCompleteBoard()
    render(<CandidateBoard />)
    expect(screen.getByRole('button', { name: /Refine from selected candidate/i })).toHaveAttribute('aria-expanded', 'true')
    expect(screen.getByPlaceholderText(/Describe changes/i)).toBeVisible()
  })

  it('does not show refinement UI when feature disabled', () => {
    seedPayload()
    seedPaidEntitlement()
    enableFlags({ artistic_generative_enabled: true, artistic_refinement_enabled: false })
    seedCompleteBoard()
    render(<CandidateBoard />)
    expect(screen.queryByText(/Refine from selected candidate/i)).not.toBeInTheDocument()
  })

  it('does not show refinement UI when no candidate is selected', () => {
    seedPayload()
    seedPaidEntitlement()
    enableFlags({ artistic_generative_enabled: true, artistic_refinement_enabled: true })
    seedCompleteBoard()
    useStudioStore.getState().selectCandidate('')
    render(<CandidateBoard />)
    expect(screen.queryByText(/Refine from selected candidate/i)).not.toBeInTheDocument()
  })

  it('disables refinement when max rounds are exhausted', () => {
    seedPayload()
    seedPaidEntitlement(1, 1)
    enableFlags({ artistic_generative_enabled: true, artistic_refinement_enabled: true })
    seedCompleteBoard()
    render(<CandidateBoard />)

    const applyBtn = screen.getByRole('button', { name: /Max rounds reached/i })
    expect(applyBtn).toBeDisabled()
  })

  it('updates art direction prompt on successful refinement', async () => {
    seedPayload()
    seedPaidEntitlement()
    enableFlags({ artistic_generative_enabled: true, artistic_refinement_enabled: true })
    seedCompleteBoard()
    render(<CandidateBoard />)

    const textarea = screen.getByPlaceholderText(/Describe changes/i)
    await act(async () => {
      await userEvent.type(textarea, 'darker palette')
    })

    const applyBtn = screen.getByRole('button', { name: /Apply & Generate New Round/i })
    await act(async () => {
      await userEvent.click(applyBtn)
    })

    const state = useStudioStore.getState()
    expect(state.project.artDirection.prompt).toBe('darker palette')
  })
})
