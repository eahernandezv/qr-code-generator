import React from 'react'
import { useStudioStore } from '../store'
import type {
  ArtDirection,
  ColorIntensity,
  CompositionType,
  PaletteFamily,
  PalettePattern,
} from '../types'

const TEMPLATES = ['watercolor', 'geometric', 'minimalist']

const QR_FRAMES: { value: CompositionType; label: string }[] = [
  { value: 'integrated', label: 'Classic' },
  { value: 'centered', label: 'Soft frame' },
  { value: 'offset', label: 'Bold frame' },
  { value: 'surround', label: 'Poster frame' },
]

const SOLID_PRESETS = [
  { name: 'Studio Blue', primary: '#5b6ef5', secondary: '#323eaf', accent: '#a5bdff', background: '#f0f4ff' },
  { name: 'Warm Sunset', primary: '#ff7a5c', secondary: '#c44d3a', accent: '#ffd6a5', background: '#fff3e8' },
  { name: 'Forest', primary: '#2d6a4f', secondary: '#1b4332', accent: '#95d5b2', background: '#edf7f0' },
  { name: 'Monochrome', primary: '#2a336e', secondary: '#181b3a', accent: '#e0eaff', background: '#f4f5fa' },
  { name: 'Berry', primary: '#c9184a', secondary: '#800f2f', accent: '#ff8fa3', background: '#f9e8ef' },
]

const PATTERNED_PRESETS: Array<{
  name: string
  family: PaletteFamily
  pattern: PalettePattern
  swatch: string
}> = [
  { name: 'Rainbow horizontal', family: 'rainbow', pattern: 'horizontalGradient', swatch: 'linear-gradient(90deg, #b00035, #a83b00, #806400, #00733d, #004fc4, #7020a8)' },
  { name: 'Rainbow vertical', family: 'rainbow', pattern: 'verticalGradient', swatch: 'linear-gradient(180deg, #b00035, #a83b00, #806400, #00733d, #004fc4, #7020a8)' },
  { name: 'Rainbow diagonal', family: 'rainbow', pattern: 'diagonalGradient', swatch: 'linear-gradient(135deg, #b00035, #a83b00, #806400, #00733d, #004fc4, #7020a8)' },
  { name: 'Pride rows', family: 'pride', pattern: 'flagRows', swatch: 'linear-gradient(180deg, #b00035 0 17%, #a83b00 17% 33%, #806400 33% 50%, #00733d 50% 67%, #004fc4 67% 83%, #7020a8 83%)' },
  { name: 'Pride diagonal', family: 'pride', pattern: 'diagonalGradient', swatch: 'linear-gradient(135deg, #b00035, #a83b00, #806400, #00733d, #004fc4, #7020a8)' },
  { name: 'Bi vertical', family: 'bi', pattern: 'verticalGradient', swatch: 'linear-gradient(180deg, #b00069, #7500a8, #004fc4)' },
  { name: 'Berry spiral', family: 'berry', pattern: 'spiral', swatch: 'conic-gradient(#ad004c, #bd1767, #6c1b96, #0055a8, #ad004c)' },
  { name: 'Forest diagonal', family: 'forest', pattern: 'diagonalGradient', swatch: 'linear-gradient(135deg, #00713d, #277900, #806400, #00647f)' },
  { name: 'Rainbow rings', family: 'rainbow', pattern: 'radialRings', swatch: 'radial-gradient(circle, #b00035 0 18%, #a83b00 18% 34%, #806400 34% 50%, #00733d 50% 66%, #004fc4 66% 82%, #7020a8 82%)' },
  { name: 'Trans safe diagonal', family: 'trans', pattern: 'diagonalGradient', swatch: 'linear-gradient(135deg, #006c91, #b00059, #6546a8, #b00059, #006c91)' },
]

const INTENSITIES: Array<{ value: ColorIntensity; label: string }> = [
  { value: 'mellow', label: 'Mellow' },
  { value: 'balanced', label: 'Balanced' },
  { value: 'punchy', label: 'Punchy' },
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

      <div className="mb-5">
        <label className="mb-2 block text-xs font-medium text-slate-400">Template</label>
        <div className="flex flex-wrap gap-2">
          {TEMPLATES.map((template) => (
            <button
              key={template}
              type="button"
              aria-pressed={art.templateId === template}
              onClick={() => update({ templateId: template })}
              className={`rounded-lg px-3 py-1.5 text-xs font-medium capitalize transition-colors ${
                art.templateId === template
                  ? 'bg-studio-600 text-white'
                  : 'bg-slate-800 text-slate-400 hover:bg-slate-700'
              }`}
            >
              {template}
            </button>
          ))}
        </div>
      </div>

      <div className="mb-5">
        <label className="mb-2 block text-xs font-medium text-slate-400">Solid Palette Presets</label>
        <div className="grid grid-cols-2 gap-2 sm:grid-cols-3">
          {SOLID_PRESETS.map((preset) => {
            const selected = !art.paletteFamily && art.palette?.primary === preset.primary
            return (
              <button
                key={preset.name}
                type="button"
                aria-pressed={selected}
                onClick={() => update({
                  paletteFamily: undefined,
                  palettePattern: 'solid',
                  palette: {
                    primary: preset.primary,
                    secondary: preset.secondary,
                    accent: preset.accent,
                    background: preset.background,
                  },
                })}
                className={`flex items-center gap-2 rounded-lg border px-2.5 py-2 text-left text-xs transition-colors ${
                  selected
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
            )
          })}
        </div>
      </div>

      <div className="mb-5">
        <label className="mb-2 block text-xs font-medium text-slate-400">Patterned Palette Presets</label>
        <div className="grid grid-cols-2 gap-2 sm:grid-cols-3">
          {PATTERNED_PRESETS.map((preset) => {
            const selected = art.paletteFamily === preset.family && art.palettePattern === preset.pattern
            return (
              <button
                key={preset.name}
                type="button"
                aria-pressed={selected}
                onClick={() => update({ paletteFamily: preset.family, palettePattern: preset.pattern })}
                className={`flex items-center gap-2 rounded-lg border px-2.5 py-2 text-left text-xs transition-colors ${
                  selected
                    ? 'border-studio-500/60 bg-studio-950/40 text-slate-200'
                    : 'border-slate-800 bg-slate-900 text-slate-400 hover:border-slate-700'
                }`}
              >
                <span className="h-4 w-4 shrink-0 rounded-full" style={{ background: preset.swatch }} />
                {preset.name}
              </button>
            )
          })}
        </div>
      </div>

      <div className="mb-5">
        <label className="mb-2 block text-xs font-medium text-slate-400">Color Intensity</label>
        <div className="grid grid-cols-3 gap-2">
          {INTENSITIES.map((intensity) => {
            const selected = (art.colorIntensity ?? 'balanced') === intensity.value
            return (
              <button
                key={intensity.value}
                type="button"
                aria-pressed={selected}
                onClick={() => update({ colorIntensity: intensity.value })}
                className={`rounded-lg border px-2 py-2 text-center text-xs font-medium transition-colors ${
                  selected
                    ? 'border-studio-500/60 bg-studio-950/40 text-slate-200'
                    : 'border-slate-800 bg-slate-900 text-slate-400 hover:border-slate-700'
                }`}
              >
                {intensity.label}
              </button>
            )
          })}
        </div>
        <p className="mt-2 text-[10px] leading-relaxed text-slate-600">
          Mellow softens the palette; Punchy increases vibrance while Core keeps scan-safe contrast.
        </p>
      </div>

      <div className="mb-5">
        <div className="mb-2 flex items-center justify-between">
          <label className="text-xs font-medium text-slate-400">Artistic Strength</label>
          <span className="text-xs tabular-nums text-slate-500">
            {Math.round((art.artisticStrength ?? 0.5) * 100)}%
          </span>
        </div>
        <input
          aria-label="Artistic Strength"
          type="range"
          min={0}
          max={1}
          step={0.05}
          value={art.artisticStrength ?? 0.5}
          onChange={(event) => update({ artisticStrength: Number(event.target.value) })}
          className="h-2 w-full cursor-pointer appearance-none rounded-full bg-slate-800 accent-studio-500"
        />
        <div className="mt-1 flex justify-between text-[10px] text-slate-600">
          <span>Subtle</span>
          <span>Bold</span>
        </div>
      </div>

      <div className="mb-5">
        <label className="mb-2 block text-xs font-medium text-slate-400">QR Frame</label>
        <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
          {QR_FRAMES.map((frame) => {
            const selected = art.composition === frame.value
            return (
              <button
                key={frame.value}
                type="button"
                aria-pressed={selected}
                onClick={() => update({ composition: frame.value })}
                className={`rounded-lg border px-2 py-2 text-center text-xs font-medium transition-colors ${
                  selected
                    ? 'border-studio-500/60 bg-studio-950/40 text-slate-200'
                    : 'border-slate-800 bg-slate-900 text-slate-400 hover:border-slate-700'
                }`}
              >
                {frame.label}
              </button>
            )
          })}
        </div>
        <p className="mt-2 text-[10px] leading-relaxed text-slate-600">
          QR Frame changes the code’s eye treatment and space around it. It does not reposition surrounding artwork in deterministic mode.
        </p>
      </div>

      <div>
        <div className="mb-2 flex items-center justify-between">
          <label className="text-xs font-medium text-slate-400">QR Prominence</label>
          <span className="text-xs tabular-nums text-slate-500">
            {Math.round((art.protectedQrProminence ?? 0.7) * 100)}%
          </span>
        </div>
        <input
          aria-label="QR Prominence"
          type="range"
          min={0.1}
          max={1}
          step={0.05}
          value={art.protectedQrProminence ?? 0.7}
          onChange={(event) => update({ protectedQrProminence: Number(event.target.value) })}
          className="h-2 w-full cursor-pointer appearance-none rounded-full bg-slate-800 accent-studio-500"
        />
      </div>
    </section>
  )
}

export default ArtDirectionPanel
