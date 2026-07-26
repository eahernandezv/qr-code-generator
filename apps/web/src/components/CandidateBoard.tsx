import React from 'react'
import { useStudioStore } from '../store'
import type { Candidate, CandidateStatus, GenerationBoard } from '../types'

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
  const { project, selectCandidate, setIsGenerating, addBoard, updateBoard, updateCandidate, isGenerating } = useStudioStore()
  const { boards, selectedCandidateId, entitlement } = project

  const handleGenerate = () => {
    if (isGenerating) return
    if (!project.payload.raw.trim()) return
    if (entitlement.usedRounds >= entitlement.maxRounds) return

    setIsGenerating(true)

    const boardId = Math.random().toString(36).slice(2)
    const now = new Date().toISOString()
    const candidates: import('../types').Candidate[] = Array.from({ length: 4 }, () => ({
      candidateId: Math.random().toString(36).slice(2),
      projectId: project.projectId,
      status: 'generating',
      createdAt: now,
    }))

    addBoard({
      boardId,
      projectId: project.projectId,
      roundNumber: boards.length + 1,
      candidates,
      status: 'generating',
      createdAt: now,
    })

    // Simulate async generation with staggered resolution
    candidates.forEach((candidate, index) => {
      const delay = 2000 + index * 1500
      setTimeout(() => {
        updateCandidate(boardId, candidate.candidateId, {
          status: 'ready',
          previewUrl: generateMockPreview(project.payload.normalized || project.payload.raw, index),
          artisticScore: 0.6 + Math.random() * 0.35,
          renderResult: {
            success: true,
            format: 'png',
            dataUrl: '',
            widthPx: 1024,
            heightPx: 1024,
          },
        })

        // When last candidate finishes, update board status
        if (index === candidates.length - 1) {
          setTimeout(() => {
            updateBoard(boardId, { status: 'complete', completedAt: new Date().toISOString() })
            setIsGenerating(false)
          }, 500)
        }
      }, delay)
    })
  }

  return (
    <section className="rounded-2xl border border-slate-800 bg-slate-900/60 p-4 md:p-6">
      <div className="mb-4 flex items-center justify-between">
        <div>
          <h2 className="text-sm font-semibold uppercase tracking-wider text-slate-400">Candidates</h2>
          <p className="mt-0.5 text-xs text-slate-500">
            Round {entitlement.usedRounds}/{entitlement.maxRounds} · {boards.length} board{boards.length !== 1 ? 's' : ''}
          </p>
        </div>
        <button
          onClick={handleGenerate}
          disabled={isGenerating || !project.payload.raw.trim() || entitlement.usedRounds >= entitlement.maxRounds}
          className={`rounded-lg px-4 py-2 text-xs font-semibold transition-colors ${
            isGenerating || !project.payload.raw.trim() || entitlement.usedRounds >= entitlement.maxRounds
              ? 'cursor-not-allowed bg-slate-800 text-slate-500'
              : 'bg-studio-600 text-white hover:bg-studio-500'
          }`}
        >
          {isGenerating ? 'Generating…' : 'Generate 4'}
        </button>
      </div>

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
    </section>
  )
}

// Deterministic mock preview using canvas dataURL
function generateMockPreview(payload: string, index: number): string {
  const canvas = document.createElement('canvas')
  canvas.width = 256
  canvas.height = 256
  const ctx = canvas.getContext('2d')!
  const hues = [220, 10, 140, 40]
  const hue = hues[index % hues.length]
  // Background gradient
  const grad = ctx.createLinearGradient(0, 0, 256, 256)
  grad.addColorStop(0, `hsl(${hue}, 60%, 90%)`)
  grad.addColorStop(1, `hsl(${hue}, 50%, 80%)`)
  ctx.fillStyle = grad
  ctx.fillRect(0, 0, 256, 256)
  // QR-ish grid
  ctx.fillStyle = `hsl(${hue}, 60%, 20%)`
  const seed = payload.length + index * 7
  for (let y = 0; y < 32; y++) {
    for (let x = 0; x < 32; x++) {
      const on = ((seed + x * 13 + y * 17) % 7) > 2
      if (on) ctx.fillRect(x * 8, y * 8, 8, 8)
    }
  }
  // Finder patterns
  ctx.fillStyle = `hsl(${hue}, 70%, 15%)`
  ;[0, 24, 0].forEach((_offset, i) => {
    const ox = i === 2 ? 0 : i * 200
    const oy = i === 2 ? 200 : 0
    ctx.fillRect(ox, oy, 56, 56)
    ctx.clearRect(ox + 8, oy + 8, 40, 40)
    ctx.fillRect(ox + 16, oy + 16, 24, 24)
  })
  return canvas.toDataURL('image/png')
}

export default CandidateBoard
