import React, { useCallback } from 'react'
import { useStudioStore } from '../store'
import type { Payload, QrMode } from '../types'

const PAYLOAD_TYPES: Array<{
  mode: Extract<QrMode, 'url' | 'email' | 'phone'>
  label: string
  inputLabel: string
  placeholder: string
}> = [
  { mode: 'url', label: 'URL', inputLabel: 'Final destination URL', placeholder: 'Enter destination URL…' },
  { mode: 'email', label: 'Email', inputLabel: 'Email address', placeholder: 'name@example.com' },
  { mode: 'phone', label: 'Phone', inputLabel: 'Phone number', placeholder: '+1 555 123 4567' },
]

function normalizePayload(mode: QrMode, raw: string): string {
  const value = raw.trim()
  if (!value) return ''
  if (mode === 'url') {
    const withScheme = /^https?:\/\//i.test(value) ? value : `https://${value}`
    try {
      return new URL(withScheme).toString()
    } catch {
      return withScheme
    }
  }
  if (mode === 'email') return `mailto:${value.replace(/^mailto:/i, '')}`
  if (mode === 'phone') return `tel:${value.replace(/^tel:/i, '')}`
  return value
}

function validatePayload(mode: QrMode, raw: string): { valid: boolean; error?: string } {
  const value = raw.trim()
  if (!value) return { valid: false, error: 'Payload is required' }
  if (new TextEncoder().encode(normalizePayload(mode, raw)).length > 2953) {
    return { valid: false, error: 'Payload too long (max 2953 bytes)' }
  }
  if (mode === 'url') {
    try {
      const parsed = new URL(normalizePayload(mode, raw))
      return parsed.protocol === 'http:' || parsed.protocol === 'https:'
        ? { valid: true }
        : { valid: false, error: 'Invalid URL' }
    } catch {
      return { valid: false, error: 'Invalid URL' }
    }
  }
  if (mode === 'email' && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value.replace(/^mailto:/i, ''))) {
    return { valid: false, error: 'Invalid email address' }
  }
  if (mode === 'phone' && !/^\+?[0-9()\-\s.]{5,}$/.test(value.replace(/^tel:/i, ''))) {
    return { valid: false, error: 'Invalid phone number' }
  }
  return { valid: true }
}

interface PayloadInputProps {
  /** Paid, member, and explicit internal workflows may bind valid drafts to the live Core preview. */
  livePreviewPayloadUpdates?: boolean
}

const PayloadInput: React.FC<PayloadInputProps> = ({ livePreviewPayloadUpdates = false }) => {
  const { project, setPayload } = useStudioStore()
  const { payload } = project
  const [draft, setDraft] = React.useState<Payload>(payload)
  const [error, setError] = React.useState<string | null>(null)
  const [activationMessage, setActivationMessage] = React.useState<string | null>(null)
  const selectedType = PAYLOAD_TYPES.find((type) => type.mode === draft.mode) ?? PAYLOAD_TYPES[0]
  const validation = validatePayload(draft.mode, draft.raw)
  const normalizedDraft = normalizePayload(draft.mode, draft.raw)

  const updateDraft = useCallback((next: Payload) => {
    const nextValidation = validatePayload(next.mode, next.raw)
    setDraft({ ...next, normalized: normalizePayload(next.mode, next.raw) })
    setError(next.raw.trim() && !nextValidation.valid ? nextValidation.error ?? null : null)
    setActivationMessage(null)
    if (livePreviewPayloadUpdates && nextValidation.valid) {
      setPayload({ ...next, normalized: normalizePayload(next.mode, next.raw) })
    }
  }, [livePreviewPayloadUpdates, setPayload])

  const activate = useCallback(() => {
    const nextValidation = validatePayload(draft.mode, draft.raw)
    if (!nextValidation.valid) {
      setError(nextValidation.error ?? 'Valid content is required')
      return
    }
    if (livePreviewPayloadUpdates) {
      setPayload({ ...draft, normalized: normalizePayload(draft.mode, draft.raw) })
      setActivationMessage('Content confirmed · Checkout coming next')
      return
    }
    setActivationMessage('Ready for checkout · QR activates after payment')
  }, [draft, livePreviewPayloadUpdates, setPayload])

  return (
    <section aria-labelledby="destination-title" className="rounded-2xl border border-slate-800 bg-slate-900/60 p-3 sm:p-4">
      <div className="mb-2 flex items-center justify-between gap-3">
        <h2 id="destination-title" className="text-sm font-semibold text-slate-200">Destination</h2>
        <div className="flex gap-1 rounded-xl bg-slate-950 p-1" role="group" aria-label="QR content type">
          {PAYLOAD_TYPES.map((type) => {
            const selected = type.mode === draft.mode
            return (
              <button
                key={type.mode}
                type="button"
                aria-pressed={selected}
                onClick={() => updateDraft({ ...draft, mode: type.mode })}
                className={`min-h-9 rounded-lg px-2.5 text-[10px] font-semibold transition focus:outline-none focus-visible:ring-2 focus-visible:ring-white ${selected ? 'bg-studio-600 text-white shadow' : 'text-slate-400 hover:text-white'}`}
              >
                {type.label}
              </button>
            )
          })}
        </div>
      </div>

      <label htmlFor="destination-content" className="sr-only">{selectedType.inputLabel}</label>
      <input
        id="destination-content"
        type={draft.mode === 'email' ? 'email' : draft.mode === 'phone' ? 'tel' : 'url'}
        value={draft.raw}
        onChange={(event) => updateDraft({ ...draft, raw: event.target.value })}
        placeholder={selectedType.placeholder}
        className="h-11 w-full rounded-xl border border-slate-700 bg-slate-950 px-3 text-sm text-slate-100 outline-none transition-colors placeholder:text-slate-600 focus:border-studio-500 focus:ring-1 focus:ring-studio-500/50"
      />

      <div className="mt-1.5 flex items-center justify-between gap-3">
        {normalizedDraft ? (
          <p className="min-w-0 truncate text-[10px] text-slate-500" title={normalizedDraft}>Encoded: {normalizedDraft}</p>
        ) : <span />}
        <span className="shrink-0 text-[10px] text-slate-600">{new TextEncoder().encode(normalizedDraft).length}/2953 bytes</span>
      </div>
      {error && <p role="alert" className="mt-1.5 text-xs text-red-400">{error}</p>}

      <button
        type="button"
        disabled={!validation.valid}
        onClick={activate}
        className="mt-2 min-h-10 w-full rounded-xl bg-studio-600 px-3 py-2 text-xs font-semibold text-white transition hover:bg-studio-500 focus:outline-none focus-visible:ring-2 focus-visible:ring-white disabled:cursor-not-allowed disabled:bg-slate-800 disabled:text-slate-500"
      >
        Continue with this QR
      </button>
      <p className="mt-1.5 text-center text-[10px] font-medium text-slate-300">
        After checkout: PNG + SVG downloads · Social and print sizes
      </p>
      {activationMessage && <p role="status" className="mt-1 text-center text-[10px] font-medium text-emerald-300">{activationMessage}</p>}
    </section>
  )
}

export default PayloadInput
