import React from 'react'
import { useStudioStore } from '../store'
import type { CompositionType, ArtDirection } from '../types'

const TEMPLATES = ['watercolor', 'geometric', 'minimalist']

const COMPOSITIONS: { value: CompositionType; label: string }[] = [
  { value: 'centered', label: 'Centered' },
  { value: 'offset', label: 'Offset' },
  { value: 'integrated', label: 'Integrated' },
  { value: 'surround', label: 'Surround' },
]

const PRESETS = [
  { name: 'Studio Blue', primary: '#5b6ef5', secondary: '#323eaf', accent: '#a5bdff', background: '#f0f4ff' },
  { name: 'Warm Sunset', primary: '#ff7a5c', secondary: '#c44d3a', accent: '#ffd6a5', background: '#fff3e8' },
  { name: 'Forest', primary: '#2d6a4f', secondary: '#1b4332', accent: '#95d5b2', background: '#edf7f0' },
  { name: 'Monochrome', primary: '#2a336e', secondary: '#181b3a', accent: '#e0eaff', background: '#f4f5fa' },
  { name: 'Berry', primary: '#c9184a', secondary: '#800f2f', accent: '#ff8fa3', background: '#f9e8ef' },
]

const ArtDirectionPanel: React.FC = () => {
  const { project, setArtDirection } = useStudioStore()
  const art = project.artDirection

  const update = (patch: Partial<ArtDirection>) =>
    setArtDirection({ ...art, ...patch })

  return (
    <section className="rounded-2xl border border-slate-800 bg-slate-900/60 p-4 md:p-6">
      <div className="mb-4 flex items-center justify-between">
        <h2 className="text-sm font-semibold uppercase tracking-wider text-slate-400">Art Direction</h2>
        <span className="rounded-full bg-slate-800 px-2 py-0.5 text-[10px] font-medium uppercase tracking-wide text-slate-500">
          {art.templateId}
        </span>
      </div>

      {/* Template */}
      <div className="mb-5">
        <label className="mb-2 block text-xs font-medium text-slate-400">Template</label>
        <div className="flex flex-wrap gap-2">
          {TEMPLATES.map((t) => (
            <button
              key={t}
              onClick={() => update({ templateId: t })}
              className={`rounded-lg px-3 py-1.5 text-xs font-medium capitalize transition-colors ${
                art.templateId === t
                  ? 'bg-studio-600 text-white'
                  : 'bg-slate-800 text-slate-400 hover:bg-slate-700'
              }`}
            >
              {t}
            </button>
          ))}
        </div>
      </div>

      {/* Palette Presets */}
      <div className="mb-5">
        <label className="mb-2 block text-xs font-medium text-slate-400">Palette Preset</label>
        <div className="grid grid-cols-2 gap-2 sm:grid-cols-3">
          {PRESETS.map((preset) => (
            <button
              key={preset.name}
              onClick={() =>
                update({
                  palette: {
                    primary: preset.primary,
                    secondary: preset.secondary,
                    accent: preset.accent,
                    background: preset.background,
                  },
                })
              }
              className={`flex items-center gap-2 rounded-lg border px-2.5 py-2 text-left text-xs transition-colors ${
                art.palette?.primary === preset.primary
                  ? 'border-studio-500/60 bg-studio-950/40 text-slate-200'
                  : 'border-slate-800 bg-slate-900 text-slate-400 hover:border-slate-700'
              }`}
            >
              <span className="flex h-4 w-4 shrink-0 overflow-hidden rounded-full">
                <span className="h-full w-1/3" style={{ background: preset.primary }} />
                <span className="h-full w-1/3" style={{ background: preset.secondary }} />
                <span className="h-full w-1/3" style={{ background: preset.accent }} />
              </span>
              {preset.name}
            </button>
          ))}
        </div>
      </div>

      {/* Artistic Strength */}
      <div className="mb-5">
        <div className="mb-2 flex items-center justify-between">
          <label className="text-xs font-medium text-slate-400">Artistic Strength</label>
          <span className="text-xs tabular-nums text-slate-500">
            {Math.round((art.artisticStrength ?? 0.5) * 100)}%
          </span>
        </div>
        <input
          type="range"
          min={0}
          max={1}
          step={0.05}
          value={art.artisticStrength ?? 0.5}
          onChange={(e) => update({ artisticStrength: Number(e.target.value) })}
          className="h-2 w-full cursor-pointer appearance-none rounded-full bg-slate-800 accent-studio-500"
        />
        <div className="mt-1 flex justify-between text-[10px] text-slate-600">
          <span>Subtle</span>
          <span>Bold</span>
        </div>
      </div>

      {/* Composition */}
      <div className="mb-5">
        <label className="mb-2 block text-xs font-medium text-slate-400">Composition</label>
        <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
          {COMPOSITIONS.map((c) => (
            <button
              key={c.value}
              onClick={() => update({ composition: c.value })}
              className={`rounded-lg border px-2 py-2 text-center text-xs font-medium transition-colors ${
                art.composition === c.value
                  ? 'border-studio-500/60 bg-studio-950/40 text-slate-200'
                  : 'border-slate-800 bg-slate-900 text-slate-400 hover:border-slate-700'
              }`}
            >
              {c.label}
            </button>
          ))}
        </div>
      </div>

      {/* QR Prominence */}
      <div>
        <div className="mb-2 flex items-center justify-between">
          <label className="text-xs font-medium text-slate-400">QR Prominence</label>
          <span className="text-xs tabular-nums text-slate-500">
            {Math.round((art.protectedQrProminence ?? 0.7) * 100)}%
          </span>
        </div>
        <input
          type="range"
          min={0.1}
          max={1}
          step={0.05}
          value={art.protectedQrProminence ?? 0.7}
          onChange={(e) => update({ protectedQrProminence: Number(e.target.value) })}
          className="h-2 w-full cursor-pointer appearance-none rounded-full bg-slate-800 accent-studio-500"
        />
      </div>
    </section>
  )
}

export default ArtDirectionPanel
