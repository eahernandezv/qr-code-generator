import { describe, it, expect, beforeEach } from 'vitest'
import { render, screen, act } from '@testing-library/react'
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

describe('CandidateBoard', () => {
  beforeEach(() => {
    resetStore()
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

  it('shows refinement UI only when enabled and candidate selected', () => {
    seedPayload()
    enableFlags({ artistic_generative_enabled: true, artistic_refinement_enabled: true })
    seedCompleteBoard()
    render(<CandidateBoard />)
    expect(screen.getByText(/Refine from selected candidate/i)).toBeInTheDocument()
  })

  it('does not show refinement UI when feature disabled', () => {
    seedPayload()
    enableFlags({ artistic_generative_enabled: true, artistic_refinement_enabled: false })
    seedCompleteBoard()
    render(<CandidateBoard />)
    expect(screen.queryByText(/Refine from selected candidate/i)).not.toBeInTheDocument()
  })

  it('does not show refinement UI when no candidate is selected', () => {
    seedPayload()
    enableFlags({ artistic_generative_enabled: true, artistic_refinement_enabled: true })
    seedCompleteBoard()
    // deselect candidate
    useStudioStore.getState().selectCandidate('')
    render(<CandidateBoard />)
    expect(screen.queryByText(/Refine from selected candidate/i)).not.toBeInTheDocument()
  })

  it('disables refinement when max rounds are exhausted', async () => {
    seedPayload()
    enableFlags({ artistic_generative_enabled: true, artistic_refinement_enabled: true })
    seedCompleteBoard()
    // exhaust rounds
    act(() => {
      useStudioStore.getState().incrementUsedRounds()
    })
    render(<CandidateBoard />)

    const refineToggle = screen.getByText(/Refine from selected candidate/i)
    await act(async () => {
      await userEvent.click(refineToggle)
    })

    const applyBtn = screen.getByRole('button', { name: /Max rounds reached/i })
    expect(applyBtn).toBeDisabled()
  })

  it('updates art direction prompt on successful refinement', async () => {
    seedPayload()
    enableFlags({ artistic_generative_enabled: true, artistic_refinement_enabled: true })
    seedCompleteBoard()
    render(<CandidateBoard />)

    // Toggle refine section open
    await act(async () => {
      await userEvent.click(screen.getByText(/Refine from selected candidate/i))
    })

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
