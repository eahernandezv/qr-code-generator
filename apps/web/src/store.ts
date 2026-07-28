import { create } from 'zustand'
import { persist } from 'zustand/middleware'
import type { ProjectState, Payload, ArtDirection, StyleSpec, Entitlement, GenerationBoard } from './types'
import { FEATURE_FLAGS, type FeatureFlags } from './config/flags'

const generateId = (): string => {
  const hex = () => Math.floor(Math.random() * 16).toString(16)
  return Array.from({ length: 16 }, hex).join('')
}

const nowIso = (): string => new Date().toISOString()

const emptyPayload = (): Payload => ({
  raw: '',
  normalized: '',
  mode: 'url',
})

const defaultArtDirection = (): ArtDirection => ({
  templateId: 'watercolor',
  artisticStrength: 0.5,
  composition: 'centered',
  protectedQrProminence: 0.7,
  palette: {
    primary: '#5b6ef5',
    secondary: '#323eaf',
    accent: '#a5bdff',
  },
})

const defaultStyle = (): StyleSpec => ({
  foreground: '#181b3a',
  background: '#f0f4ff',
  margin: 4,
  eyeStyle: 'rounded',
  moduleStyle: 'rounded',
})

const defaultEntitlement = (): Entitlement => ({
  type: 'preview',
  maxRounds: 1,
  usedRounds: 0,
  maxCandidates: 4,
  exportAllowed: false,
  expiresAt: new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString(),
})

const createProject = (): ProjectState => ({
  projectId: generateId(),
  payload: emptyPayload(),
  artDirection: defaultArtDirection(),
  style: defaultStyle(),
  boards: [],
  entitlement: defaultEntitlement(),
  createdAt: nowIso(),
  updatedAt: nowIso(),
})

interface StudioStore {
  project: ProjectState
  activeBoardId: string | null
  isGenerating: boolean
  featureFlags: FeatureFlags
  setPayload: (payload: Payload) => void
  setArtDirection: (art: ArtDirection) => void
  setStyle: (style: StyleSpec) => void
  addBoard: (board: GenerationBoard) => void
  updateBoard: (boardId: string, patch: Partial<GenerationBoard>) => void
  updateCandidate: (boardId: string, candidateId: string, patch: Partial<import('./types').Candidate>) => void
  selectCandidate: (candidateId: string) => void
  setIsGenerating: (v: boolean) => void
  incrementUsedRounds: () => void
  resetProject: () => void
  hydrateProject: (project: ProjectState) => void
  cloneProject: () => ProjectState
  cancelBoard: (boardId: string) => void
  refineFromCandidate: (candidateId: string, promptOverride?: string) => void
}

export const useStudioStore = create<StudioStore>()(
  persist(
    (set, get) => ({
      project: createProject(),
      activeBoardId: null,
      isGenerating: false,
      featureFlags: FEATURE_FLAGS,

      setPayload: (payload) =>
        set((s) => ({
          project: { ...s.project, payload, updatedAt: nowIso() },
        })),

      setArtDirection: (artDirection) =>
        set((s) => ({
          project: { ...s.project, artDirection, updatedAt: nowIso() },
        })),

      setStyle: (style) =>
        set((s) => ({
          project: { ...s.project, style, updatedAt: nowIso() },
        })),

      addBoard: (board) =>
        set((s) => ({
          project: {
            ...s.project,
            boards: [...s.project.boards, board],
            updatedAt: nowIso(),
          },
          activeBoardId: board.boardId,
        })),

      updateBoard: (boardId, patch) =>
        set((s) => ({
          project: {
            ...s.project,
            boards: s.project.boards.map((b) =>
              b.boardId === boardId ? { ...b, ...patch } : b
            ),
            updatedAt: nowIso(),
          },
        })),

      updateCandidate: (boardId, candidateId, patch) =>
        set((s) => ({
          project: {
            ...s.project,
            boards: s.project.boards.map((b) =>
              b.boardId !== boardId
                ? b
                : {
                    ...b,
                    candidates: b.candidates.map((c) =>
                      c.candidateId === candidateId ? { ...c, ...patch } : c
                    ),
                  }
            ),
            updatedAt: nowIso(),
          },
        })),

      selectCandidate: (candidateId) =>
        set((s) => ({
          project: { ...s.project, selectedCandidateId: candidateId, updatedAt: nowIso() },
        })),

      setIsGenerating: (isGenerating) => set({ isGenerating }),

      incrementUsedRounds: () =>
        set((s) => ({
          project: {
            ...s.project,
            entitlement: {
              ...s.project.entitlement,
              usedRounds: Math.min(s.project.entitlement.usedRounds + 1, s.project.entitlement.maxRounds),
            },
            updatedAt: nowIso(),
          },
        })),

      resetProject: () => set({ project: createProject(), activeBoardId: null }),

      hydrateProject: (project) =>
        set({
          project: { ...project, updatedAt: nowIso() },
          activeBoardId: project.boards[project.boards.length - 1]?.boardId ?? null,
        }),

      cloneProject: () => ({ ...get().project }),

      cancelBoard: (boardId) =>
        set((s) => ({
          project: {
            ...s.project,
            boards: s.project.boards.map((b) =>
              b.boardId === boardId && b.status === 'generating'
                ? { ...b, status: 'failed' as const, completedAt: nowIso() }
                : b
            ),
            updatedAt: nowIso(),
          },
          isGenerating: s.project.boards.some(
            (b) => b.boardId !== boardId && b.status === 'generating'
          ),
        })),

      refineFromCandidate: (candidateId, promptOverride) =>
        set((s) => {
          const candidate = s.project.boards
            .flatMap((b) => b.candidates)
            .find((c) => c.candidateId === candidateId)
          if (!candidate || s.project.entitlement.usedRounds >= s.project.entitlement.maxRounds) {
            return {}
          }
          const refinementArt: ArtDirection = promptOverride
            ? { ...s.project.artDirection, prompt: promptOverride }
            : s.project.artDirection
          return {
            project: {
              ...s.project,
              artDirection: refinementArt,
              updatedAt: nowIso(),
            },
          }
        }),
    }),
    {
      name: 'qr-studio-project',
      partialize: (state) => ({ project: state.project, activeBoardId: state.activeBoardId }),
    }
  )
)
