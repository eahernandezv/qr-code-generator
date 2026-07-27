import React from 'react'
import { useStudioStore } from '../store'

type RecoveryState = 'idle' | 'loading' | 'success' | 'not_found' | 'expired' | 'invalid'

interface RecoveryPanelProps {
  onRecovered?: () => void
}

function validateProjectShape(data: unknown): data is import('../types').ProjectState {
  if (!data || typeof data !== 'object') return false
  const d = data as Record<string, unknown>
  return (
    typeof d.projectId === 'string' &&
    d.payload !== undefined &&
    d.artDirection !== undefined &&
    Array.isArray(d.boards) &&
    d.entitlement !== undefined &&
    typeof d.createdAt === 'string'
  )
}

const RecoveryPanel: React.FC<RecoveryPanelProps> = ({ onRecovered }) => {
  const [input, setInput] = React.useState('')
  const [status, setStatus] = React.useState<RecoveryState>('idle')
  const [recoveredProjectId, setRecoveredProjectId] = React.useState<string | null>(null)
  const { hydrateProject } = useStudioStore()

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    const trimmed = input.trim()
    if (!trimmed) {
      setStatus('invalid')
      return
    }

    setStatus('loading')

    // Simulate async recovery lookup.
    // In production this calls a backend endpoint:
    //   GET /api/projects/:id/recover  or  POST /api/recover { token }
    try {
      // Try localStorage first (guest session persistence)
      const stored = typeof localStorage !== 'undefined'
        ? localStorage.getItem(`qr-studio-recovery-${trimmed}`)
        : null

      if (stored) {
        const parsed = JSON.parse(stored)
        if (validateProjectShape(parsed)) {
          hydrateProject(parsed)
          setRecoveredProjectId(parsed.projectId)
          setStatus('success')
          onRecovered?.()
          return
        }
      }

      // Fallback: try loading from a well-known demo/seed project
      // In the real implementation this would be the API call.
      await new Promise((resolve) => setTimeout(resolve, 800))

      // For now, simulate not-found when localStorage miss
      setStatus('not_found')
    } catch {
      setStatus('invalid')
    }
  }

  const stateMeta: Record<RecoveryState, { label: string; color: string }> = {
    idle: { label: '', color: '' },
    loading: { label: 'Recovering…', color: 'text-slate-400' },
    success: { label: `Recovered project ${recoveredProjectId?.slice(0, 8) ?? ''}`, color: 'text-emerald-400' },
    not_found: { label: 'Project not found. Check your ID or link.', color: 'text-amber-400' },
    expired: { label: 'Recovery link expired.', color: 'text-rose-400' },
    invalid: { label: 'Invalid project ID or token.', color: 'text-rose-400' },
  }

  const meta = stateMeta[status]

  return (
    <section className="rounded-2xl border border-slate-800 bg-slate-900/60 p-4 md:p-6">
      <div className="mb-4">
        <h2 className="text-sm font-semibold uppercase tracking-wider text-slate-400">Recover Project</h2>
        <p className="mt-0.5 text-xs text-slate-500">
          Enter your project ID or recovery link to resume editing
        </p>
      </div>

      <form onSubmit={handleSubmit} className="space-y-3">
        <input
          type="text"
          value={input}
          onChange={(e) => { setInput(e.target.value); if (status !== 'idle') setStatus('idle') }}
          placeholder="project-id or recovery-token"
          className="w-full rounded-lg border border-slate-800 bg-slate-950/50 px-3 py-2 text-sm text-slate-200 placeholder:text-slate-700 focus:border-studio-500/60 focus:outline-none"
          disabled={status === 'loading'}
        />

        <button
          type="submit"
          disabled={status === 'loading' || !input.trim()}
          className={`w-full rounded-lg py-2.5 text-sm font-semibold transition-colors ${
            status === 'loading' || !input.trim()
              ? 'cursor-not-allowed bg-slate-800 text-slate-500'
              : 'bg-studio-600 text-white hover:bg-studio-500'
          }`}
        >
          {status === 'loading' ? 'Recovering…' : 'Recover Project'}
        </button>
      </form>

      {status !== 'idle' && (
        <p className={`mt-3 text-center text-xs ${meta.color}`}>{meta.label}</p>
      )}

      {status === 'success' && (
        <p className="mt-2 text-center text-[10px] text-slate-500">
          Your project has been restored. You can continue editing.
        </p>
      )}
    </section>
  )
}

export default RecoveryPanel
