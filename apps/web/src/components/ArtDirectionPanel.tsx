import React from 'react'
import { useStudioStore } from '../store'
import type { ArtDirection, ColorIntensity, EyeStyle, ModuleStyle, PaletteFamily, PalettePattern } from '../types'
import QRPreview from './QRPreview'

const SOLID_PRESETS = [
  { name: 'Classic Black', label: 'Classic Black', primary: '#000000', secondary: '#000000', accent: '#ffffff', background: '#ffffff' },
  { name: 'Studio Blue', label: 'Studio Blue', primary: '#5b6ef5', secondary: '#323eaf', accent: '#a5bdff', background: '#f0f4ff' },
  { name: 'Warm Sunset', label: 'Warm Sunset', primary: '#ff7a5c', secondary: '#c44d3a', accent: '#ffd6a5', background: '#fff3e8' },
  { name: 'Forest', label: 'Forest Green', primary: '#2d6a4f', secondary: '#1b4332', accent: '#95d5b2', background: '#edf7f0' },
  { name: 'Monochrome', label: 'Midnight Monochrome', primary: '#2a336e', secondary: '#181b3a', accent: '#e0eaff', background: '#f4f5fa' },
  { name: 'Berry', label: 'Berry Pink', primary: '#c9184a', secondary: '#800f2f', accent: '#ff8fa3', background: '#f9e8ef' },
] as const

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

const STYLE_OPTIONS: Array<{
  name: string
  moduleStyle: Extract<ModuleStyle, 'square' | 'rounded' | 'dot'>
  radius: string
}> = [
  { name: 'Classic', moduleStyle: 'square', radius: 'rounded-none' },
  { name: 'Rounded', moduleStyle: 'rounded', radius: 'rounded-[2px]' },
  { name: 'Dots', moduleStyle: 'dot', radius: 'rounded-full' },
]

const CORNER_OPTIONS: Array<{
  name: string
  eyeStyle: Extract<EyeStyle, 'square' | 'rounded' | 'circle'>
  radius: string
}> = [
  { name: 'Classic', eyeStyle: 'square', radius: 'rounded-none' },
  { name: 'Soft', eyeStyle: 'rounded', radius: 'rounded-[5px]' },
  { name: 'Circle', eyeStyle: 'circle', radius: 'rounded-full' },
]

const INTENSITIES: Array<{ value: ColorIntensity; label: string }> = [
  { value: 'mellow', label: 'Mellow' },
  { value: 'balanced', label: 'Balanced' },
  { value: 'punchy', label: 'Punchy' },
]

function MiniQr({ radius }: { radius: string }) {
  const cells = [1, 1, 1, 0, 1, 1, 0, 1, 1, 0, 1, 1, 1, 0, 1, 0, 1, 0, 1, 1, 1, 0, 1, 1, 1]
  return (
    <span aria-hidden="true" className="grid h-9 w-9 grid-cols-5 place-content-center gap-[1px] rounded-md bg-white p-1">
      {cells.map((filled, index) => (
        <span key={index} className={`h-1 w-1 ${radius} bg-slate-950`} style={{ opacity: filled ? 1 : 0 }} />
      ))}
    </span>
  )
}

function MiniCorner({ radius }: { radius: string }) {
  return (
    <span aria-hidden="true" className={`relative h-9 w-9 border-[5px] border-slate-950 bg-white ${radius}`}>
      <span className={`absolute inset-[5px] bg-slate-950 ${radius}`} />
    </span>
  )
}

const ArtDirectionPanel: React.FC = () => {
  const { project, setArtDirection } = useStudioStore()
  const art = project.artDirection
  const update = (patch: Partial<ArtDirection>) => setArtDirection({ ...art, ...patch })
  const selectedSolid = SOLID_PRESETS.find((preset) => !art.paletteFamily && art.palette?.primary === preset.primary)
  const selectedPatterned = PATTERNED_PRESETS.find((preset) => art.paletteFamily === preset.family && art.palettePattern === preset.pattern)
  const selectedStyle = STYLE_OPTIONS.find((style) => style.moduleStyle === (art.moduleStyle ?? 'rounded')) ?? STYLE_OPTIONS[1]
  const selectedCorner = CORNER_OPTIONS.find((corner) => corner.eyeStyle === (art.eyeStyle ?? 'rounded')) ?? CORNER_OPTIONS[1]

  return (
    <section aria-labelledby="live-editor-title" className="rounded-2xl border border-slate-800 bg-slate-900/70 p-3 shadow-2xl shadow-black/20 sm:p-4">
      <div className="mb-2 flex items-center justify-between">
        <h2 id="live-editor-title" className="text-sm font-semibold text-slate-100">Design your QR</h2>
        <span className="inline-flex items-center gap-1 rounded-full bg-emerald-950/50 px-2 py-1 text-[10px] font-medium text-emerald-300">
          <span className="h-1.5 w-1.5 rounded-full bg-emerald-400" /> Live
        </span>
      </div>

      <div className="grid items-start gap-3 lg:grid-cols-[minmax(0,1fr)_292px]">
        <div className="order-2 min-w-0 space-y-2.5 lg:order-1">
          <div role="group" aria-label="Color">
            <div className="flex items-center gap-2">
              {SOLID_PRESETS.map((preset) => {
                const selected = selectedSolid?.name === preset.name
                return (
                  <button
                    key={preset.name}
                    type="button"
                    aria-label={`${preset.label}${selected ? ' selected' : ''}`}
                    aria-pressed={selected}
                    onClick={() => update({
                      paletteFamily: undefined,
                      palettePattern: 'solid',
                      palette: { primary: preset.primary, secondary: preset.secondary, accent: preset.accent, background: preset.background },
                    })}
                    className={`relative h-11 w-11 shrink-0 rounded-full border-2 transition focus:outline-none focus-visible:ring-2 focus-visible:ring-white ${selected ? 'scale-105 border-white ring-2 ring-studio-500 ring-offset-2 ring-offset-slate-900' : 'border-slate-700 hover:scale-105 hover:border-slate-400'}`}
                    style={{ background: `linear-gradient(135deg, ${preset.primary} 0 58%, ${preset.accent} 58%)` }}
                  >
                    {selected && <span aria-hidden="true" className="absolute inset-0 flex items-center justify-center text-sm font-black text-white drop-shadow">✓</span>}
                  </button>
                )
              })}
            </div>
          </div>

          <div>
            <div className="flex snap-x gap-2 overflow-x-auto pb-1" role="listbox" aria-label="Palette">
              {PATTERNED_PRESETS.map((preset) => {
                const selected = selectedPatterned?.name === preset.name
                return (
                  <button
                    key={preset.name}
                    type="button"
                    role="option"
                    aria-label={`${preset.name}${selected ? ' selected' : ''}`}
                    aria-selected={selected}
                    onClick={() => update({ paletteFamily: preset.family, palettePattern: preset.pattern })}
                    className={`relative h-12 w-14 shrink-0 snap-start overflow-hidden rounded-xl border-2 transition focus:outline-none focus-visible:ring-2 focus-visible:ring-white ${selected ? 'border-white ring-2 ring-studio-500' : 'border-slate-700 hover:border-slate-400'}`}
                    style={{ background: preset.swatch }}
                  >
                    <span aria-hidden="true" className="absolute inset-x-1 bottom-1 h-1 rounded-full bg-black/25" />
                    {selected && <span aria-hidden="true" className="absolute right-1 top-1 flex h-4 w-4 items-center justify-center rounded-full bg-white text-[10px] font-black text-slate-950">✓</span>}
                  </button>
                )
              })}
            </div>
          </div>

          <div>
            <div className="flex snap-x gap-2 overflow-x-auto pb-1" role="listbox" aria-label="Style">
              {STYLE_OPTIONS.map((style) => {
                const selected = selectedStyle.name === style.name
                return (
                  <button
                    key={style.name}
                    type="button"
                    role="option"
                    aria-label={`${style.name} QR style${selected ? ' selected' : ''}`}
                    aria-selected={selected}
                    onClick={() => update({ moduleStyle: style.moduleStyle })}
                    className={`flex h-14 min-w-[76px] shrink-0 snap-start items-center gap-2 rounded-xl border-2 px-2 text-left transition focus:outline-none focus-visible:ring-2 focus-visible:ring-white ${selected ? 'border-white bg-studio-950/70 ring-2 ring-studio-500' : 'border-slate-700 bg-slate-950/60 hover:border-slate-400'}`}
                  >
                    <MiniQr radius={style.radius} />
                    <span className="text-[10px] font-semibold text-slate-300">{style.name}</span>
                  </button>
                )
              })}
            </div>
          </div>

          <div>
            <div className="flex snap-x gap-2 overflow-x-auto pb-1" role="listbox" aria-label="Corners">
              {CORNER_OPTIONS.map((corner) => {
                const selected = selectedCorner.name === corner.name
                return (
                  <button
                    key={corner.name}
                    type="button"
                    role="option"
                    aria-label={`${corner.name} corner style${selected ? ' selected' : ''}`}
                    aria-selected={selected}
                    onClick={() => update({ eyeStyle: corner.eyeStyle })}
                    className={`relative flex h-14 min-w-[76px] shrink-0 snap-start items-center gap-2 rounded-xl border-2 px-2 text-left transition focus:outline-none focus-visible:ring-2 focus-visible:ring-white ${selected ? 'border-white bg-studio-950/70 ring-2 ring-studio-500' : 'border-slate-700 bg-slate-950/60 hover:border-slate-400'}`}
                  >
                    <MiniCorner radius={corner.radius} />
                    <span className="text-[10px] font-semibold text-slate-300">{corner.name}</span>
                    {selected && <span aria-hidden="true" className="absolute right-1 top-1 flex h-4 w-4 items-center justify-center rounded-full bg-white text-[10px] font-black text-slate-950">✓</span>}
                  </button>
                )
              })}
            </div>
          </div>

          <div role="group" aria-label="Intensity">
            <div className="grid grid-cols-3 rounded-xl bg-slate-950 p-1">
              {INTENSITIES.map((intensity) => {
                const selected = (art.colorIntensity ?? 'balanced') === intensity.value
                return (
                  <button
                    key={intensity.value}
                    type="button"
                    aria-pressed={selected}
                    onClick={() => update({ colorIntensity: intensity.value })}
                    className={`rounded-lg px-2 py-2 text-[10px] font-semibold transition focus:outline-none focus-visible:ring-2 focus-visible:ring-white ${selected ? 'bg-studio-600 text-white shadow' : 'text-slate-500 hover:text-slate-300'}`}
                  >
                    {intensity.label}
                  </button>
                )
              })}
            </div>
          </div>
        </div>

        <div className="order-1 flex justify-center lg:order-2">
          <QRPreview size={216} useDemoWhenEmpty />
        </div>
      </div>
    </section>
  )
}

export default ArtDirectionPanel
