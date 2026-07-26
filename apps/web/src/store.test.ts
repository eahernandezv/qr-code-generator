import { describe, it, expect, beforeEach } from 'vitest'
import { useStudioStore } from './store'
import type { GenerationBoard } from './types'

// Helper to reset store between tests
function resetStore() {
  useStudioStore.setState({
    project: {
      projectId: expect.any(String) as unknown as string,
      payload: { raw: '', normalized: '', mode: 'url' },
      artDirection: {
        templateId: 'watercolor',
        artisticStrength: 0.5,
        composition: 'centered',
        protectedQrProminence: 0.7,
        palette: { primary: '#5b6ef5', secondary: '#323eaf', accent: '#a5bdff' },
      },
      style: { foreground: '#181b3a', background: '#f0f4ff', margin: 4, eyeStyle: 'rounded', moduleStyle: 'rounded' },
      boards: [],
      entitlement: { type: 'preview', maxRounds: 1, usedRounds: 0, maxCandidates: 4, exportAllowed: false, expiresAt: expect.any(String) as unknown as string },
      createdAt: expect.any(String) as unknown as string,
      updatedAt: expect.any(String) as unknown as string,
    },
    activeBoardId: null,
    isGenerating: false,
  })
}

describe('StudioStore', () => {
  beforeEach(() => {
    resetStore()
  })

  it('creates a new project with required fields', () => {
    const state = useStudioStore.getState()
    expect(state.project.projectId).toBeTruthy()
    expect(state.project.payload.mode).toBe('url')
    expect(state.project.boards).toEqual([])
    expect(state.project.entitlement.exportAllowed).toBe(false)
  })

  it('updates payload and normalizes URL', () => {
    const { setPayload } = useStudioStore.getState()
    setPayload({ raw: 'example.com', normalized: 'https://example.com', mode: 'url' })
    const state = useStudioStore.getState()
    expect(state.project.payload.normalized).toBe('https://example.com')
  })

  it('adds a board and tracks activeBoardId', () => {
    const { addBoard } = useStudioStore.getState()
    const board: GenerationBoard = {
      boardId: 'b1',
      projectId: 'p1',
      roundNumber: 1,
      candidates: [],
      status: 'pending',
      createdAt: new Date().toISOString(),
    }
    addBoard(board)
    const state = useStudioStore.getState()
    expect(state.project.boards).toHaveLength(1)
    expect(state.activeBoardId).toBe('b1')
  })

  it('selects a candidate', () => {
    const { selectCandidate } = useStudioStore.getState()
    selectCandidate('c1')
    const state = useStudioStore.getState()
    expect(state.project.selectedCandidateId).toBe('c1')
  })

  it('tracks isGenerating flag', () => {
    const { setIsGenerating } = useStudioStore.getState()
    setIsGenerating(true)
    expect(useStudioStore.getState().isGenerating).toBe(true)
    setIsGenerating(false)
    expect(useStudioStore.getState().isGenerating).toBe(false)
  })

  it('persists state through reset and maintains updatedAt', () => {
    const { setPayload, resetProject } = useStudioStore.getState()
    setPayload({ raw: 'test', normalized: 'test', mode: 'text' })
    resetProject()
    const after = useStudioStore.getState().project
    expect(after.payload.raw).toBe('')
    expect(new Date(after.updatedAt).toISOString()).toBe(after.updatedAt)
  })
})
