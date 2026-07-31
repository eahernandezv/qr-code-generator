import React, { useCallback } from 'react'
import { useStudioStore } from '../store'
import type { Payload, QrMode } from '../types'

const MODES: { value: QrMode; label: string }[] = [
  { value: 'url', label: 'URL' },
  { value: 'text', label: 'Text' },
  { value: 'email', label: 'Email' },
  { value: 'phone', label: 'Phone' },
  { value: 'wifi', label: 'Wi-Fi' },
]

function normalizeUrl(raw: string): string {
  let url = raw.trim()
  if (!url) return ''
  if (!/^https?:\/\//i.test(url) && !/^mailto:/i.test(url) && !/^tel:/i.test(url)) {
    url = 'https://' + url
  }
  try {
    const u = new URL(url)
    return u.toString()
  } catch {
    return url
  }
}

function validatePayload(mode: QrMode, raw: string): { valid: boolean; error?: string } {
  if (!raw.trim()) return { valid: false, error: 'Payload is required' }
  if (mode === 'url') {
    try {
      new URL(normalizeUrl(raw))
      return { valid: true }
    } catch {
      return { valid: false, error: 'Invalid URL' }
    }
  }
  if (raw.length > 4096) return { valid: false, error: 'Payload too long (max 4096 chars)' }
  return { valid: true }
}

const PayloadInput: React.FC = () => {
  const { project, setPayload } = useStudioStore()
  const { payload } = project

  const [error, setError] = React.useState<string | null>(null)

  const handleChange = useCallback(
    (field: keyof Payload, value: string) => {
      const next: Payload = { ...payload, [field]: value }
      if (field === 'raw') {
        next.normalized = next.mode === 'url' ? normalizeUrl(value) : value.trim()
      }
      if (field === 'mode') {
        next.normalized = value === 'url' ? normalizeUrl(next.raw) : next.raw.trim()
      }
      const validation = validatePayload(next.mode, next.raw)
      setError(validation.valid ? null : validation.error ?? null)
      setPayload(next)
    },
    [payload, setPayload]
  )

  return (
    <section className="rounded-2xl border border-slate-800 bg-slate-900/60 p-4 md:p-6">
      <div className="flex items-center justify-between mb-4">
        <h2 className="text-sm font-semibold uppercase tracking-wider text-slate-400">Payload</h2>
        <span className="text-xs text-slate-500">{payload.raw.length}/4096</span>
      </div>

      <div className="flex flex-wrap gap-2 mb-3">
        {MODES.map((m) => (
          <button
            key={m.value}
            onClick={() => handleChange('mode', m.value)}
            className={`rounded-lg px-3 py-1.5 text-xs font-medium transition-colors ${
              payload.mode === m.value
                ? 'bg-studio-600 text-white'
                : 'bg-slate-800 text-slate-400 hover:bg-slate-700'
            }`}
          >
            {m.label}
          </button>
        ))}
      </div>

      <textarea
        value={payload.raw}
        onChange={(e) => handleChange('raw', e.target.value)}
        placeholder={`Enter ${payload.mode}…`}
        rows={2}
        className="w-full rounded-xl border border-slate-700 bg-slate-950 px-3 py-2.5 text-sm text-slate-100 placeholder-slate-600 outline-none transition-colors focus:border-studio-500 focus:ring-1 focus:ring-studio-500/50 resize-y"
      />

      {payload.normalized && (
        <p className="mt-2 truncate text-xs text-slate-500" title={payload.normalized}>
          Normalized: {payload.normalized}
        </p>
      )}

      {error && (
        <p className="mt-2 text-xs text-red-400">{error}</p>
      )}
    </section>
  )
}

export default PayloadInput
