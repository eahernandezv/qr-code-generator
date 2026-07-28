import React from 'react'
import { useStudioStore } from '../store'
import { guestCommerce } from '../lib/commerceClient'

type RecoveryState = 'idle' | 'loading' | 'success' | 'invalid' | 'expired' | 'replayed' | 'service_error'

interface RecoveryPanelProps {
  onRecovered?: () => void
}

const RecoveryPanel: React.FC<RecoveryPanelProps> = ({ onRecovered }) => {
  const [input, setInput] = React.useState('')
  const [status, setStatus] = React.useState<RecoveryState>('idle')
  const [replacementCode, setReplacementCode] = React.useState<string | null>(null)
  const { syncCommerceEntitlement } = useStudioStore()

  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault()
    const recoveryCode = input.trim()
    if (!recoveryCode) {
      setStatus('invalid')
      return
    }
    setStatus('loading')
    setReplacementCode(null)
    try {
      const recovered = await guestCommerce.recover(recoveryCode)
      syncCommerceEntitlement(recovered.entitlement)
      setInput('')
      setReplacementCode(recovered.replacementRecoveryCode)
      setStatus('success')
      onRecovered?.()
    } catch (recoveryError) {
      const code = typeof recoveryError === 'object' && recoveryError && 'code' in recoveryError
        ? String((recoveryError as { code: unknown }).code)
        : ''
      if (code === 'project_access_expired') setStatus('expired')
      else if (code === 'project_access_replayed') setStatus('replayed')
      else if (code === 'project_access_invalid') setStatus('invalid')
      else setStatus('service_error')
    }
  }

  const messages: Record<Exclude<RecoveryState, 'idle' | 'loading'>, string> = {
    success: 'Guest project access recovered. Paid capabilities are active again.',
    invalid: 'Recovery code is invalid. Check the code and try again.',
    expired: 'Recovery code expired. Start a new preview; no access was granted.',
    replayed: 'That one-time recovery code was already used. Use its replacement code.',
    service_error: 'Recovery service is unavailable. Your code was not consumed; retry shortly.',
  }

  return (
    <section className="rounded-2xl border border-slate-800 bg-slate-900/60 p-4 md:p-6" aria-labelledby="recovery-heading">
      <div className="mb-4">
        <h2 id="recovery-heading" className="text-sm font-semibold uppercase tracking-wider text-slate-400">Recover Project</h2>
        <p className="mt-0.5 text-xs text-slate-500">Use the opaque one-time code from guest checkout. No account is created.</p>
      </div>

      <form onSubmit={(event) => void handleSubmit(event)} className="space-y-3">
        <label htmlFor="recovery-code" className="text-xs font-medium text-slate-400">Recovery code</label>
        <input
          id="recovery-code"
          type="password"
          autoComplete="off"
          spellCheck={false}
          value={input}
          onChange={(event) => {
            setInput(event.target.value)
            if (status !== 'idle') setStatus('idle')
          }}
          placeholder="Paste one-time recovery code"
          className="w-full rounded-lg border border-slate-800 bg-slate-950/50 px-3 py-2 text-sm text-slate-200 placeholder:text-slate-700 focus:border-studio-500/60 focus:outline-none"
          disabled={status === 'loading'}
        />
        <button
          type="submit"
          disabled={status === 'loading' || !input.trim()}
          className="w-full rounded-lg bg-studio-600 py-2.5 text-sm font-semibold text-white hover:bg-studio-500 disabled:cursor-not-allowed disabled:bg-slate-800 disabled:text-slate-500"
        >
          {status === 'loading' ? 'Recovering…' : 'Recover guest project'}
        </button>
      </form>

      {status !== 'idle' && status !== 'loading' && (
        <p role={status === 'success' ? 'status' : 'alert'} className={`mt-3 text-xs ${status === 'success' ? 'text-emerald-300' : 'text-rose-300'}`}>
          {messages[status]}
        </p>
      )}

      {replacementCode && (
        <div className="mt-3 rounded-lg border border-sky-900/40 bg-sky-950/20 p-3">
          <p className="text-xs text-sky-200">Save the replacement recovery code; the code you entered cannot be replayed.</p>
          <code className="mt-1 block break-all rounded bg-slate-950 p-2 text-[10px] text-slate-300">{replacementCode}</code>
          <button type="button" className="mt-2 text-[10px] text-sky-300 underline" onClick={() => setReplacementCode(null)}>I saved it — hide code</button>
        </div>
      )}

      <p className="mt-3 text-[10px] text-slate-600">Codes are submitted in the request body and are not stored in this browser.</p>
    </section>
  )
}

export default RecoveryPanel
