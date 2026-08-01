import { create } from 'zustand'
import { persist } from 'zustand/middleware'
import type { ProjectState, Payload, ArtDirection, StyleSpec, Entitlement, GenerationBoard } from './types'
import { FEATURE_FLAGS, type FeatureFlags } from './config/flags'
import { guestCommerce, type CheckoutStatus, type CommerceEntitlementSnapshot } from './lib/commerceClient'

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
  palettePattern: 'solid',
  colorIntensity: 'balanced',
  moduleStyle: 'square',
  eyeFrameStyle: 'rounded',
  eyeBallStyle: 'rounded',
  palette: {
    primary: '#5b6ef5',
    secondary: '#323eaf',
    accent: '#a5bdff',
    background: '#f0f4ff',
  },
})

const defaultStyle = (): StyleSpec => ({
  foreground: '#181b3a',
  background: '#f0f4ff',
  margin: 4,
  eyeFrameStyle: 'rounded',
  eyeBallStyle: 'rounded',
  moduleStyle: 'rounded',
})

const defaultEntitlement = (): Entitlement => ({
  type: 'preview',
  maxRounds: 1,
  usedRounds: 0,
  maxCandidates: 4,
  exportAllowed: false,
  checkoutStatus: 'idle',
  candidatesConsumed: 0,
  exportsAllowed: 0,
  exportsConsumed: 0,
  extraExplorationAvailable: false,
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
  setCheckoutStatus: (status: CheckoutStatus) => void
  syncCommerceEntitlement: (entitlement: CommerceEntitlementSnapshot) => void
  consumePreviewRoundIfSuccessful: (boardId: string) => void
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

      setCheckoutStatus: (checkoutStatus) =>
        set((s) => ({
          project: {
            ...s.project,
            entitlement: { ...s.project.entitlement, checkoutStatus },
            updatedAt: nowIso(),
          },
        })),

      syncCommerceEntitlement: (commerce) =>
        set((s) => ({
          project: {
            ...s.project,
            projectId: commerce.projectId,
            entitlement: {
              type: commerce.extraExplorationPurchased ? 'exploration' : 'project',
              maxRounds: commerce.totalRounds,
              usedRounds: commerce.roundsConsumed,
              maxCandidates: commerce.totalCandidates,
              candidatesConsumed: commerce.candidatesConsumed,
              exportAllowed: commerce.finishedArtworksConsumed < commerce.totalFinishedArtworks,
              exportsAllowed: commerce.totalFinishedArtworks,
              exportsConsumed: commerce.finishedArtworksConsumed,
              extraExplorationAvailable: !commerce.extraExplorationPurchased,
              checkoutStatus: commerce.status === 'active' ? 'succeeded' : 'pending',
            },
            updatedAt: nowIso(),
          },
        })),

      consumePreviewRoundIfSuccessful: (boardId) =>
        set((s) => {
          const board = s.project.boards.find((item) => item.boardId === boardId)
          const successfulCandidates = board?.candidates.filter(
            (candidate) => candidate.status === 'ready' || candidate.status === 'validated',
          ).length ?? 0
          if (s.project.entitlement.type !== 'preview' || board?.status !== 'complete' || successfulCandidates === 0) {
            return {}
          }
          return {
            project: {
              ...s.project,
              entitlement: {
                ...s.project.entitlement,
                usedRounds: Math.min(s.project.entitlement.usedRounds + 1, s.project.entitlement.maxRounds),
                candidatesConsumed: Math.min(
                  (s.project.entitlement.candidatesConsumed ?? 0) + successfulCandidates,
                  s.project.entitlement.maxCandidates,
                ),
              },
              updatedAt: nowIso(),
            },
          }
        }),

      resetProject: () => {
        guestCommerce.clearAccess()
        set({ project: createProject(), activeBoardId: null, isGenerating: false })
      },

      hydrateProject: (project) =>
        set({
          project: { ...project, updatedAt: nowIso() },
          activeBoardId: project.boards[project.boards.length - 1]?.boardId ?? null,
        }),

      cloneProject: () => ({ ...get().project }),

      cancelBoard: (boardId) =>
        set((s) => {
          return {
            project: {
              ...s.project,
              boards: s.project.boards.map((b) =>
                b.boardId === boardId && b.status === 'generating'
                  ? { ...b, status: 'failed' as const, completedAt: nowIso() }
                  : b
              ),
              entitlement: s.project.entitlement,
              updatedAt: nowIso(),
            },
            isGenerating: s.project.boards.some(
              (b) => b.boardId !== boardId && b.status === 'generating'
            ),
          }
        }),

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
