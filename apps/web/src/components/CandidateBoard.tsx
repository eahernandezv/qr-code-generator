import React from 'react'
import { useStudioStore } from '../store'
import type { Candidate, CandidateStatus, GenerationBoard } from '../types'
import { guestCommerce } from '../lib/commerceClient'
import { coreGenerationClient } from '../lib/coreGenerationClient'

const statusMeta: Record<CandidateStatus, { label: string; color: string; bg: string }> = {
  pending: { label: 'Pending', color: 'text-slate-400', bg: 'bg-slate-800' },
  generating: { label: 'Generating', color: 'text-amber-300', bg: 'bg-amber-950/40' },
  ready: { label: 'Ready', color: 'text-sky-300', bg: 'bg-sky-950/40' },
  validating: { label: 'Validating', color: 'text-indigo-300', bg: 'bg-indigo-950/40' },
  validated: { label: 'Validated', color: 'text-emerald-300', bg: 'bg-emerald-950/40' },
  failed: { label: 'Failed', color: 'text-red-300', bg: 'bg-red-950/40' },
  rejected: { label: 'Rejected', color: 'text-rose-300', bg: 'bg-rose-950/40' },
}

function CandidateCard({
  candidate,
  selected,
  onSelect,
}: {
  candidate: Candidate
  selected: boolean
  onSelect: () => void
}) {
  const meta = statusMeta[candidate.status]

  return (
    <button
      onClick={onSelect}
      className={`group relative overflow-hidden rounded-xl border text-left transition-all ${
        selected
          ? 'border-studio-500/80 bg-studio-950/30 ring-1 ring-studio-500/30'
          : 'border-slate-800 bg-slate-900/40 hover:border-slate-700'
      }`}
    >
      {/* Preview area */}
      <div className="relative aspect-square bg-slate-950">
        {candidate.previewUrl ? (
          <img
            src={candidate.previewUrl}
            alt={`Candidate ${candidate.candidateId.slice(0, 6)}`}
            className="h-full w-full object-cover"
          />
        ) : (
          <div className="flex h-full w-full items-center justify-center">
            {candidate.status === 'generating' ? (
              <div className="h-6 w-6 animate-spin rounded-full border-2 border-slate-800 border-t-amber-400" />
            ) : candidate.status === 'failed' ? (
              <span className="text-xs text-red-400">Failed</span>
            ) : (
              <span className="text-xs text-slate-600">No preview</span>
            )}
          </div>
        )}

        {/* Score badge */}
        {typeof candidate.artisticScore === 'number' && (
          <span className="absolute right-2 top-2 rounded-md bg-slate-950/70 px-1.5 py-0.5 text-[10px] font-semibold text-slate-300 backdrop-blur">
            {Math.round(candidate.artisticScore * 100)}%
          </span>
        )}
      </div>

      {/* Info */}
      <div className="p-3">
        <div className="flex items-center justify-between">
          <span className={`inline-flex rounded px-1.5 py-0.5 text-[10px] font-medium uppercase tracking-wide ${meta.bg} ${meta.color}`}>
            {meta.label}
          </span>
          <span className="text-[10px] text-slate-600">{candidate.candidateId.slice(0, 6)}</span>
        </div>

        {candidate.validationResult && (
          <p className="mt-1.5 text-[10px] text-slate-500">
            Confidence: {Math.round((candidate.validationResult.confidence ?? 0) * 100)}%
          </p>
        )}

        {candidate.error && (
          <p className="mt-1 text-[10px] text-red-400">{candidate.error.message}</p>
        )}
      </div>
    </button>
  )
}

function BoardRow({ board, selectedId, onSelect }: { board: GenerationBoard; selectedId?: string; onSelect: (id: string) => void }) {
  return (
    <div className="mb-6">
      <div className="mb-3 flex items-center justify-between">
        <h3 className="text-xs font-semibold uppercase tracking-wider text-slate-500">
          Round {board.roundNumber}
        </h3>
        <span
          className={`rounded-full px-2 py-0.5 text-[10px] font-medium uppercase tracking-wide ${
            board.status === 'complete'
              ? 'bg-emerald-950/40 text-emerald-400'
              : board.status === 'failed'
              ? 'bg-red-950/40 text-red-400'
              : 'bg-slate-800 text-slate-400'
          }`}
        >
          {board.status}
        </span>
      </div>

      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
        {board.candidates.map((c) => (
          <CandidateCard
            key={c.candidateId}
            candidate={c}
            selected={selectedId === c.candidateId}
            onSelect={() => onSelect(c.candidateId)}
          />
        ))}
      </div>
    </div>
  )
}

const CandidateBoard: React.FC = () => {
  const {
    project, featureFlags, selectCandidate, setIsGenerating, addBoard,
    isGenerating, cancelBoard, refineFromCandidate,
    consumePreviewRoundIfSuccessful, syncCommerceEntitlement,
  } = useStudioStore()
  const { boards, selectedCandidateId, entitlement } = project
  const generativeEnabled = featureFlags.artistic_generative_enabled
  const refinementEnabled = featureFlags.artistic_refinement_enabled
  const [prompt, setPrompt] = React.useState('')
  const [showRefine, setShowRefine] = React.useState(false)
  const [allowanceError, setAllowanceError] = React.useState<string | null>(null)
  const [generationError, setGenerationError] = React.useState<string | null>(null)
  const generationAbort = React.useRef<AbortController | null>(null)

  React.useEffect(() => () => {
    generationAbort.current?.abort()
  }, [])

  const handleGenerate = async () => {
    if (isGenerating) return
    const liveProject = useStudioStore.getState().project
    if (!liveProject.payload.raw.trim()) return
    if (entitlement.usedRounds >= entitlement.maxRounds) return

    setIsGenerating(true)
    setAllowanceError(null)
    setGenerationError(null)
    const controller = new AbortController()
    generationAbort.current = controller
    try {
      const board = await coreGenerationClient.generateBoard({
        projectId: liveProject.projectId,
        roundNumber: liveProject.boards.length + 1,
        payload: liveProject.payload,
        artDirection: liveProject.artDirection,
        style: liveProject.style,
        signal: controller.signal,
      })
      addBoard(board)
      if (useStudioStore.getState().project.entitlement.type === 'preview') {
        consumePreviewRoundIfSuccessful(board.boardId)
      } else {
        try {
          syncCommerceEntitlement(await guestCommerce.recordGeneration({
            operationId: board.boardId,
            outcome: 'succeeded',
            candidateCount: board.candidates.length,
          }))
        } catch (error) {
          setAllowanceError(error instanceof Error ? error.message : 'Allowance could not be confirmed.')
        }
      }
    } catch (error) {
      if (!(error instanceof DOMException && error.name === 'AbortError')) {
        setGenerationError(error instanceof Error ? error.message : 'Core candidate generation failed. Please try again.')
      }
    } finally {
      if (generationAbort.current === controller) generationAbort.current = null
      setIsGenerating(false)
    }
  }

  const selectedCandidate = boards
    .flatMap((b) => b.candidates)
    .find((c) => c.candidateId === selectedCandidateId)
  const hasCompletedBoard = boards.some((board) => board.status === 'complete')
  const canRefineSelectedCandidate = refinementEnabled
    && entitlement.type !== 'preview'
    && Boolean(selectedCandidate)
    && hasCompletedBoard

  React.useEffect(() => {
    if (canRefineSelectedCandidate) setShowRefine(true)
  }, [canRefineSelectedCandidate])

  const activeBoard = boards.find((b) => b.status === 'generating')
  const generationActive = isGenerating || Boolean(activeBoard)

  return (
    <section className="rounded-2xl border border-slate-800 bg-slate-900/60 p-4 md:p-6">
      <div className="mb-4 flex items-center justify-between">
        <div>
          <h2 className="text-sm font-semibold uppercase tracking-wider text-slate-400">Candidates</h2>
          <p className="mt-0.5 text-xs text-slate-500">
            Round {entitlement.usedRounds}/{entitlement.maxRounds} · {boards.length} board{boards.length !== 1 ? 's' : ''}
          </p>
        </div>
        {generationActive ? (
          <button
            onClick={() => {
              generationAbort.current?.abort()
              if (activeBoard) cancelBoard(activeBoard.boardId)
              else setIsGenerating(false)
              if (entitlement.type !== 'preview') {
                void guestCommerce.recordGeneration({
                  operationId: activeBoard?.boardId ?? crypto.randomUUID(),
                  outcome: 'canceled',
                  candidateCount: 0,
                }).then(syncCommerceEntitlement).catch((error: unknown) => {
                  setAllowanceError(error instanceof Error ? error.message : 'Cancellation could not be confirmed.')
                })
              }
            }}
            className="rounded-lg border border-red-900/50 bg-red-950/30 px-4 py-2 text-xs font-semibold text-red-300 transition-colors hover:bg-red-950/50"
          >
            Cancel
          </button>
        ) : (
          <button
            onClick={handleGenerate}
            disabled={isGenerating || !project.payload.raw.trim() || entitlement.usedRounds >= entitlement.maxRounds || !generativeEnabled}
            className={`rounded-lg px-4 py-2 text-xs font-semibold transition-colors ${
              isGenerating || !project.payload.raw.trim() || entitlement.usedRounds >= entitlement.maxRounds || !generativeEnabled
                ? 'cursor-not-allowed bg-slate-800 text-slate-500'
                : 'bg-studio-600 text-white hover:bg-studio-500'
            }`}
          >
            {isGenerating ? 'Generating…' : !generativeEnabled ? 'Generation offline' : 'Generate 4'}
          </button>
        )}
      </div>

      {allowanceError && (
        <p role="alert" className="mb-3 rounded-lg border border-amber-900/40 bg-amber-950/30 p-2 text-xs text-amber-300">
          {allowanceError}
        </p>
      )}

      {generationError && (
        <p role="alert" className="mb-3 rounded-lg border border-red-900/40 bg-red-950/30 p-2 text-xs text-red-300">
          {generationError}
        </p>
      )}

      {boards.length === 0 ? (
        <div className="flex flex-col items-center justify-center rounded-xl border border-dashed border-slate-800 py-12">
          <p className="text-sm text-slate-500">No candidates yet</p>
          <p className="mt-1 text-xs text-slate-600">Enter a payload and click Generate</p>
        </div>
      ) : (
        <div>
          {boards.map((board) => (
            <BoardRow
              key={board.boardId}
              board={board}
              selectedId={selectedCandidateId}
              onSelect={selectCandidate}
            />
          ))}
        </div>
      )}

      {hasCompletedBoard && (
        <p className="mt-3 text-[10px] text-slate-600">
          Core keeps candidate authority in process memory. If the Core service restarts, regenerate before export.
        </p>
      )}

      {/* Refinement prompt */}
      {canRefineSelectedCandidate && selectedCandidate && (
        <div
          aria-labelledby="selected-candidate-refinement-label"
          className="mt-4 rounded-xl border border-studio-700/60 bg-slate-950/50 p-3"
          role="region"
        >
          <button
            aria-controls="selected-candidate-refinement-form"
            aria-expanded={showRefine}
            onClick={() => setShowRefine((v) => !v)}
            className="flex w-full items-center justify-between text-xs font-semibold text-slate-200"
            type="button"
          >
            <span id="selected-candidate-refinement-label">Refine from selected candidate</span>
            <span aria-hidden="true" className={`transition-transform ${showRefine ? 'rotate-180' : ''}`}>▼</span>
          </button>
          {showRefine && (
            <div className="mt-3 space-y-2" id="selected-candidate-refinement-form">
              <textarea
                value={prompt}
                onChange={(e) => setPrompt(e.target.value)}
                placeholder="Describe changes (e.g., more watercolor, darker palette)..."
                rows={2}
                className="w-full rounded-lg border border-slate-800 bg-slate-950/50 px-2.5 py-2 text-xs text-slate-200 placeholder:text-slate-700 focus:border-studio-500/60 focus:outline-none resize-y"
              />
              <button
                onClick={() => {
                  if (prompt.trim() && entitlement.usedRounds < entitlement.maxRounds) {
                    refineFromCandidate(selectedCandidate.candidateId, prompt.trim())
                    setPrompt('')
                    setShowRefine(false)
                    handleGenerate()
                  }
                }}
                disabled={!prompt.trim() || entitlement.usedRounds >= entitlement.maxRounds}
                className={`w-full rounded-lg py-2 text-xs font-semibold transition-colors ${
                  !prompt.trim() || entitlement.usedRounds >= entitlement.maxRounds
                    ? 'cursor-not-allowed bg-slate-800 text-slate-500'
                    : 'bg-studio-600 text-white hover:bg-studio-500'
                }`}
              >
                {entitlement.usedRounds >= entitlement.maxRounds ? 'Max rounds reached' : 'Apply & Generate New Round'}
              </button>
            </div>
          )}
        </div>
      )}
    </section>
  )
}

export default CandidateBoard
