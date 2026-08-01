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
        palette: { primary: '#5162da', secondary: '#323eaf', accent: '#a5bdff' },
      },
      style: { foreground: '#181b3a', background: '#f0f4ff', margin: 4, eyeStyle: 'rounded', moduleStyle: 'rounded' },
      boards: [],
      entitlement: { type: 'preview', maxRounds: 1, usedRounds: 0, maxCandidates: 4, exportAllowed: false, expiresAt: expect.any(String) as unknown as string },
      createdAt: expect.any(String) as unknown as string,
      updatedAt: expect.any(String) as unknown as string,
    },
    activeBoardId: null,
    isGenerating: false,
    featureFlags: {
      artistic_checkout_enabled: false,
      artistic_generative_enabled: false,
      artistic_refinement_enabled: false,
    },
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

  it('increments usedRounds up to maxRounds', () => {
    const { incrementUsedRounds } = useStudioStore.getState()
    expect(useStudioStore.getState().project.entitlement.usedRounds).toBe(0)
    incrementUsedRounds()
    expect(useStudioStore.getState().project.entitlement.usedRounds).toBe(1)
    // Attempting past max should clamp
    incrementUsedRounds()
    expect(useStudioStore.getState().project.entitlement.usedRounds).toBe(1)
  })

  it('persists state through reset and maintains updatedAt', () => {
    const { setPayload, resetProject } = useStudioStore.getState()
    setPayload({ raw: 'test', normalized: 'test', mode: 'text' })
    resetProject()
    const after = useStudioStore.getState().project
    expect(after.payload.raw).toBe('')
    expect(new Date(after.updatedAt).toISOString()).toBe(after.updatedAt)
  })

  it('exposes feature flags with default values', () => {
    const { featureFlags } = useStudioStore.getState()
    expect(featureFlags).toBeDefined()
    expect(typeof featureFlags.artistic_checkout_enabled).toBe('boolean')
    expect(typeof featureFlags.artistic_generative_enabled).toBe('boolean')
    expect(typeof featureFlags.artistic_refinement_enabled).toBe('boolean')
  })

  it('hydrates project from recovery payload', () => {
    const { hydrateProject } = useStudioStore.getState()
    const recovered: import('./types').ProjectState = {
      projectId: 'recovered-123',
      payload: { raw: 'https://example.com', normalized: 'https://example.com', mode: 'url' },
      artDirection: {
        templateId: 'geometric',
        artisticStrength: 0.7,
        composition: 'centered',
        protectedQrProminence: 0.8,
        palette: { primary: '#ff0000', secondary: '#00ff00', accent: '#0000ff' },
      },
      style: { foreground: '#000000', background: '#ffffff', margin: 2, eyeStyle: 'circle', moduleStyle: 'dot' },
      boards: [],
      entitlement: { type: 'project', maxRounds: 3, usedRounds: 1, maxCandidates: 4, exportAllowed: true },
      createdAt: '2024-01-01T00:00:00Z',
      updatedAt: '2024-01-01T00:00:00Z',
    }
    hydrateProject(recovered)
    const state = useStudioStore.getState()
    expect(state.project.projectId).toBe('recovered-123')
    expect(state.project.payload.raw).toBe('https://example.com')
    expect(state.project.entitlement.exportAllowed).toBe(true)
    expect(new Date(state.project.updatedAt).getTime()).toBeGreaterThan(new Date('2024-01-01T00:00:00Z').getTime())
  })

  it('cancels a generating board without changing prior successful-round usage', () => {
    const { addBoard, cancelBoard, setIsGenerating, incrementUsedRounds } = useStudioStore.getState()
    setIsGenerating(true)
    incrementUsedRounds()
    addBoard({
      boardId: 'b-cancel',
      projectId: 'p1',
      roundNumber: 1,
      candidates: [],
      status: 'generating',
      createdAt: new Date().toISOString(),
    })
    cancelBoard('b-cancel')
    const state = useStudioStore.getState()
    const board = state.project.boards.find((b) => b.boardId === 'b-cancel')
    expect(board?.status).toBe('failed')
    expect(state.project.entitlement.usedRounds).toBe(1)
  })

  it('refines art direction from a selected candidate', () => {
    const { setPayload, addBoard, selectCandidate, refineFromCandidate } = useStudioStore.getState()
    setPayload({ raw: 'https://example.com', normalized: 'https://example.com', mode: 'url' })
    addBoard({
      boardId: 'b-refine',
      projectId: useStudioStore.getState().project.projectId,
      roundNumber: 1,
      candidates: [{
        candidateId: 'c1',
        projectId: useStudioStore.getState().project.projectId,
        status: 'ready',
        createdAt: new Date().toISOString(),
      }],
      status: 'complete',
      createdAt: new Date().toISOString(),
    })
    selectCandidate('c1')
    refineFromCandidate('c1', 'darker palette')
    const { project } = useStudioStore.getState()
    expect(project.artDirection.prompt).toBe('darker palette')
    expect(project.boards[0].candidates[0].candidateId).toBe('c1')
  })

  it('does not refine when max rounds are exhausted', () => {
    const { setPayload, addBoard, selectCandidate, refineFromCandidate, incrementUsedRounds } = useStudioStore.getState()
    setPayload({ raw: 'https://example.com', normalized: 'https://example.com', mode: 'url' })
    addBoard({
      boardId: 'b-refine-2',
      projectId: useStudioStore.getState().project.projectId,
      roundNumber: 1,
      candidates: [{
        candidateId: 'c2',
        projectId: useStudioStore.getState().project.projectId,
        status: 'ready',
        createdAt: new Date().toISOString(),
      }],
      status: 'complete',
      createdAt: new Date().toISOString(),
    })
    selectCandidate('c2')
    incrementUsedRounds() // Exhaust the single preview round
    refineFromCandidate('c2', 'should not apply')
    const { project } = useStudioStore.getState()
    expect(project.artDirection.prompt).toBeUndefined()
  })
})
