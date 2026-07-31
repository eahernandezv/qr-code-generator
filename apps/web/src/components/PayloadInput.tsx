import React, { useCallback } from 'react'
import { useStudioStore } from '../store'
import type { Payload, QrMode } from '../types'

const PAYLOAD_TYPES: Array<{
  mode: Extract<QrMode, 'url' | 'email' | 'text' | 'phone'>
  label: string
  inputLabel: string
  placeholder: string
  help: string
}> = [
  { mode: 'url', label: 'URL', inputLabel: 'Final destination URL', placeholder: 'Enter destination URL…', help: 'Bind the real destination before generation.' },
  { mode: 'email', label: 'Email', inputLabel: 'Email address', placeholder: 'name@example.com', help: 'Creates a mailto QR for this address.' },
  { mode: 'text', label: 'Text', inputLabel: 'Text content', placeholder: 'Enter short text…', help: 'Encodes the text exactly as entered.' },
  { mode: 'phone', label: 'Phone', inputLabel: 'Phone number', placeholder: '+1 555 123 4567', help: 'Creates a telephone QR for this number.' },
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

const PayloadInput: React.FC = () => {
  const { project, setPayload } = useStudioStore()
  const { payload } = project
  const [error, setError] = React.useState<string | null>(null)
  const selectedType = PAYLOAD_TYPES.find((type) => type.mode === payload.mode) ?? PAYLOAD_TYPES[0]

  const commit = useCallback((next: Payload) => {
    const normalized = normalizePayload(next.mode, next.raw)
    const validation = validatePayload(next.mode, next.raw)
    setError(validation.valid ? null : validation.error ?? null)
    setPayload({ ...next, normalized })
  }, [setPayload])

  return (
    <section aria-labelledby="destination-title" className="rounded-2xl border border-slate-800 bg-slate-900/60 p-3 sm:p-4">
      <div className="mb-2 flex items-center justify-between gap-3">
        <h2 id="destination-title" className="text-sm font-semibold text-slate-200">Destination</h2>
        <div className="flex gap-1 rounded-xl bg-slate-950 p-1" role="group" aria-label="QR content type">
          {PAYLOAD_TYPES.map((type) => {
            const selected = type.mode === payload.mode
            return (
              <button
                key={type.mode}
                type="button"
                aria-pressed={selected}
                onClick={() => commit({ ...payload, mode: type.mode })}
                className={`min-h-9 rounded-lg px-2.5 text-[10px] font-semibold transition focus:outline-none focus-visible:ring-2 focus-visible:ring-white ${selected ? 'bg-studio-600 text-white shadow' : 'text-slate-400 hover:text-white'}`}
              >
                {type.label}
              </button>
            )
          })}
        </div>
      </div>

      <p className="mb-2 text-[10px] text-slate-500">{selectedType.help}</p>
      <label htmlFor="destination-content" className="sr-only">{selectedType.inputLabel}</label>
      <textarea
        id="destination-content"
        value={payload.raw}
        onChange={(event) => commit({ ...payload, raw: event.target.value })}
        placeholder={selectedType.placeholder}
        rows={2}
        className="w-full resize-y rounded-xl border border-slate-700 bg-slate-950 px-3 py-2.5 text-sm text-slate-100 outline-none transition-colors placeholder:text-slate-600 focus:border-studio-500 focus:ring-1 focus:ring-studio-500/50"
      />

      <div className="mt-1.5 flex items-center justify-between gap-3">
        {payload.normalized ? (
          <p className="min-w-0 truncate text-[10px] text-slate-500" title={payload.normalized}>Encoded: {payload.normalized}</p>
        ) : <span />}
        <span className="shrink-0 text-[10px] text-slate-600">{new TextEncoder().encode(payload.normalized).length}/2953 bytes</span>
      </div>
      {error && <p role="alert" className="mt-1.5 text-xs text-red-400">{error}</p>}
    </section>
  )
}

export default PayloadInput
