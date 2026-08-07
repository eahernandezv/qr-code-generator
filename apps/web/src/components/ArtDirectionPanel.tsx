import React from 'react'
import { useStudioStore } from '../store'
import type { ArtDirection, ColorIntensity, EyeBallPrimitiveStyle, EyeFramePrimitiveStyle, EyePrimitiveStyle, ModuleStyle, PaletteFamily, PalettePattern } from '../types'
import QRPreview from './QRPreview'
import TemplateArtControls from './TemplateArtControls'
import PayloadInput from './PayloadInput'
import notchedIcon from '../assets/b17-icons/icon-body-module-notched.svg'
import shieldIcon from '../assets/b17-icons/icon-body-module-shield.svg'
import diamondFrameIcon from '../assets/b17-icons/icon-eye-frame-diamond.svg'
import hexFrameIcon from '../assets/b17-icons/icon-eye-frame-hex.svg'
import hexBallIcon from '../assets/b17-icons/icon-eye-ball-hex.svg'
import verticalCapsuleBallIcon from '../assets/b17-icons/icon-eye-ball-vertical-capsule.svg'
import horizontalCapsuleBallIcon from '../assets/b17-icons/icon-eye-ball-horizontal-capsule.svg'
import leafFrameIcon from '../assets/b26b-icons/icon-eye-frame-leaf-frame.svg'
import opposingLeafFrameIcon from '../assets/b26b-icons/icon-eye-frame-opposing-leaf-frame.svg'
import dFrameIcon from '../assets/b26b-icons/icon-eye-frame-d-frame.svg'
import insetLeafFrameIcon from '../assets/b26b-icons/icon-eye-frame-inset-leaf-frame.svg'
import starBallIcon from '../assets/b26b-icons/icon-eye-ball-star.svg'
import diamondBallIcon from '../assets/b26b-icons/icon-eye-ball-diamond.svg'

type SolidPalette = { primary: string; secondary: string; accent: string; background: string }
type SolidPreset = { name: string; variants: Record<ColorIntensity, SolidPalette> }

export const SOLID_PRESETS: readonly SolidPreset[] = [
  { name: 'Classic Black', variants: {
    mellow: { primary: '#374151', secondary: '#1f2937', accent: '#9ca3af', background: '#ffffff' },
    balanced: { primary: '#000000', secondary: '#000000', accent: '#6b7280', background: '#ffffff' },
    punchy: { primary: '#030712', secondary: '#000000', accent: '#374151', background: '#ffffff' },
  } },
  { name: 'Studio Blue', variants: {
    mellow: { primary: '#405b91', secondary: '#293f70', accent: '#9fb4d8', background: '#f0f4ff' },
    balanced: { primary: '#5162da', secondary: '#323eaf', accent: '#a5bdff', background: '#f0f4ff' },
    punchy: { primary: '#2344d9', secondary: '#172c91', accent: '#7897ff', background: '#f0f4ff' },
  } },
  { name: 'Sunset Coral', variants: {
    mellow: { primary: '#8b4b42', secondary: '#67362f', accent: '#d9a39a', background: '#fff3e8' },
    balanced: { primary: '#b54432', secondary: '#7f2f25', accent: '#ef9a86', background: '#fff3e8' },
    punchy: { primary: '#d42f1a', secondary: '#8f1f12', accent: '#ff765b', background: '#fff3e8' },
  } },
  { name: 'Forest Green', variants: {
    mellow: { primary: '#3f6654', secondary: '#294638', accent: '#9bbbab', background: '#edf7f0' },
    balanced: { primary: '#2d6a4f', secondary: '#1b4332', accent: '#95d5b2', background: '#edf7f0' },
    punchy: { primary: '#087443', secondary: '#07502f', accent: '#52c788', background: '#edf7f0' },
  } },
  { name: 'Midnight Indigo', variants: {
    mellow: { primary: '#4b5278', secondary: '#303653', accent: '#aeb5d4', background: '#f4f5fa' },
    balanced: { primary: '#2a336e', secondary: '#181b3a', accent: '#aab7ee', background: '#f4f5fa' },
    punchy: { primary: '#182181', secondary: '#0d124d', accent: '#7185ff', background: '#f4f5fa' },
  } },
  { name: 'Berry Pink', variants: {
    mellow: { primary: '#7f4659', secondary: '#603241', accent: '#cf9baa', background: '#f9e8ef' },
    balanced: { primary: '#c9184a', secondary: '#800f2f', accent: '#ff8fa3', background: '#f9e8ef' },
    punchy: { primary: '#d30042', secondary: '#96002d', accent: '#ff5f82', background: '#f9e8ef' },
  } },
  { name: 'Electric Purple', variants: {
    mellow: { primary: '#684b82', secondary: '#49345d', accent: '#bca0d2', background: '#f8f1ff' },
    balanced: { primary: '#7134a8', secondary: '#4b1f78', accent: '#c78df0', background: '#f8f1ff' },
    punchy: { primary: '#7d00cc', secondary: '#4d0080', accent: '#c75cff', background: '#f8f1ff' },
  } },
  { name: 'Teal Mint', variants: {
    mellow: { primary: '#376d6b', secondary: '#24504e', accent: '#94c8c2', background: '#effbf8' },
    balanced: { primary: '#087a74', secondary: '#075955', accent: '#74d4c8', background: '#effbf8' },
    punchy: { primary: '#007f77', secondary: '#005e57', accent: '#35dbc9', background: '#effbf8' },
  } },
  { name: 'Amber Gold', variants: {
    mellow: { primary: '#725d32', secondary: '#514221', accent: '#cdb77f', background: '#fff9e8' },
    balanced: { primary: '#846000', secondary: '#5f4500', accent: '#d9ae39', background: '#fff9e8' },
    punchy: { primary: '#936300', secondary: '#694600', accent: '#f0ae00', background: '#fff9e8' },
  } },
  { name: 'Crimson Red', variants: {
    mellow: { primary: '#80464d', secondary: '#5d3036', accent: '#d3a0a5', background: '#fff1f2' },
    balanced: { primary: '#a51d31', secondary: '#721322', accent: '#e3818e', background: '#fff1f2' },
    punchy: { primary: '#c40025', secondary: '#820018', accent: '#ff5c73', background: '#fff1f2' },
  } },
  { name: 'Slate Navy', variants: {
    mellow: { primary: '#46586d', secondary: '#304052', accent: '#a2b1c2', background: '#f3f6f9' },
    balanced: { primary: '#263e5b', secondary: '#172a40', accent: '#88a8c8', background: '#f3f6f9' },
    punchy: { primary: '#0d365f', secondary: '#062542', accent: '#5e9bd2', background: '#f3f6f9' },
  } },
  { name: 'Espresso Brown', variants: {
    mellow: { primary: '#685348', secondary: '#493930', accent: '#bba79c', background: '#faf5f0' },
    balanced: { primary: '#55372a', secondary: '#392319', accent: '#b58b75', background: '#faf5f0' },
    punchy: { primary: '#492718', secondary: '#2e160d', accent: '#c27a57', background: '#faf5f0' },
  } },
]

export const PATTERNED_PRESETS: Array<{
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

export const CORNER_COLOR_OPTIONS: ReadonlyArray<{ name: string; value: string }> = SOLID_PRESETS.map((preset) => ({
  name: preset.name,
  value: preset.variants.balanced.primary,
}))

const STYLE_OPTIONS: Array<{
  name: string
  moduleStyle: Extract<ModuleStyle, 'square' | 'rounded' | 'circle' | 'vertical-bars' | 'horizontal-bars' | 'notched' | 'shield'>
  icon?: string
}> = [
  { name: 'Classic', moduleStyle: 'square' },
  { name: 'Rounded', moduleStyle: 'rounded' },
  { name: 'Dots', moduleStyle: 'circle' },
  { name: 'Vertical', moduleStyle: 'vertical-bars' },
  { name: 'Horizontal', moduleStyle: 'horizontal-bars' },
  { name: 'Notched', moduleStyle: 'notched', icon: notchedIcon },
  { name: 'Shield', moduleStyle: 'shield', icon: shieldIcon },
]

const EYE_FRAME_OPTIONS: Array<{
  name: string
  style: EyeFramePrimitiveStyle
  icon?: string
}> = [
  { name: 'Classic', style: 'square' },
  { name: 'Soft', style: 'rounded' },
  { name: 'Circle', style: 'circle' },
  { name: 'Squircle', style: 'squircle' },
  { name: 'Chamfered', style: 'chamfered' },
  { name: 'Diamond', style: 'diamond', icon: diamondFrameIcon },
  { name: 'Hex', style: 'hex', icon: hexFrameIcon },
  { name: 'Leaf frame', style: 'leaf-frame', icon: leafFrameIcon },
  { name: 'Opposing leaf frame', style: 'opposing-leaf-frame', icon: opposingLeafFrameIcon },
  { name: 'D frame', style: 'd-frame', icon: dFrameIcon },
  { name: 'Inset leaf frame', style: 'inset-leaf-frame', icon: insetLeafFrameIcon },
]

const EYE_BALL_OPTIONS: Array<{
  name: string
  style: EyeBallPrimitiveStyle
  icon?: string
}> = [
  { name: 'Classic', style: 'square' },
  { name: 'Soft', style: 'rounded' },
  { name: 'Circle', style: 'circle' },
  { name: 'Squircle', style: 'squircle' },
  { name: 'Chamfered', style: 'chamfered' },
  { name: 'Hex', style: 'hex', icon: hexBallIcon },
  { name: 'Vertical capsule', style: 'vertical-capsule', icon: verticalCapsuleBallIcon },
  { name: 'Horizontal capsule', style: 'horizontal-capsule', icon: horizontalCapsuleBallIcon },
  { name: 'Star', style: 'star', icon: starBallIcon },
  { name: 'Diamond', style: 'diamond', icon: diamondBallIcon },
]

const INTENSITIES: Array<{ value: ColorIntensity; label: string }> = [
  { value: 'mellow', label: 'Mellow' },
  { value: 'balanced', label: 'Balanced' },
  { value: 'punchy', label: 'Punchy' },
]

const QR_SIZES = [
  { value: 0.25, iconSize: 10, label: 'Smaller QR size' },
  { value: 0.7, iconSize: 16, label: 'Balanced QR size' },
  { value: 0.85, iconSize: 22, label: 'Larger QR size' },
] as const

const SELECTOR_TILE_BASE = 'relative flex h-14 w-14 shrink-0 snap-start items-center justify-center overflow-hidden rounded-xl border-2 p-0 transition focus:outline-none focus-visible:ring-2 focus-visible:ring-white'
const SELECTOR_TILE_SELECTED = 'border-white bg-studio-950/70 ring-2 ring-studio-500 ring-offset-2 ring-offset-slate-900'
const SELECTOR_TILE_IDLE = 'border-slate-700 bg-slate-950/60 hover:border-slate-400'
const SELECTOR_CHECK = 'absolute right-1 top-1 flex h-4 w-4 items-center justify-center rounded-full bg-white text-[10px] font-black text-slate-950'
const SELECTOR_SCROLL_ROW = 'selector-scroll-row flex snap-x gap-2 overflow-x-auto pb-3'

type ControlFamily = 'body-color' | 'corner-color' | 'style' | 'corners' | 'eyes'
type SettingsPanel = 'basic' | 'creator-signature' | 'destination'
const CONTROL_FAMILIES: ReadonlyArray<{ family: ControlFamily; label: string; glyph: string }> = [
  { family: 'body-color', label: 'Body Color', glyph: '●' },
  { family: 'corner-color', label: 'Corner Color', glyph: '◉' },
  { family: 'style', label: 'Style', glyph: '⌗' },
  { family: 'corners', label: 'Corners', glyph: '◇' },
  { family: 'eyes', label: 'Eyes', glyph: '⊙' },
]

function primitiveStyle(shape: ModuleStyle | EyePrimitiveStyle): React.CSSProperties {
  if (shape === 'circle') return { borderRadius: '9999px' }
  if (shape === 'rounded') return { borderRadius: '2px' }
  if (shape === 'squircle') return { borderRadius: '35%' }
  if (shape === 'chamfered') return { clipPath: 'polygon(22% 0,78% 0,100% 22%,100% 78%,78% 100%,22% 100%,0 78%,0 22%)' }
  return {}
}

function MiniQr({ shape }: { shape: ModuleStyle }) {
  const cells = [1, 1, 1, 0, 1, 1, 0, 1, 1, 0, 1, 1, 1, 0, 1, 0, 1, 0, 1, 1, 1, 0, 1, 1, 1]
  return (
    <span aria-hidden="true" className="grid h-9 w-9 grid-cols-5 place-content-center gap-[1px] rounded-md bg-white p-1">
      {cells.map((filled, index) => (
        <span
          key={index}
          className="bg-slate-950"
          style={{
            opacity: filled ? 1 : 0,
            width: shape === 'vertical-bars' ? 3 : 4,
            height: shape === 'horizontal-bars' ? 3 : 4,
            ...primitiveStyle(shape),
          }}
        />
      ))}
    </span>
  )
}

function MiniCorner({ frame, ball = frame }: { frame: EyePrimitiveStyle; ball?: EyePrimitiveStyle }) {
  return (
    <span aria-hidden="true" className="relative h-9 w-9 border-[5px] border-slate-950 bg-white" style={primitiveStyle(frame)}>
      <span className="absolute inset-[5px] bg-slate-950" style={primitiveStyle(ball)} />
    </span>
  )
}

function SizeIcon({ size }: { size: number }) {
  return (
    <span aria-hidden="true" className="flex h-6 w-6 items-center justify-center rounded-sm border border-slate-500/80">
      <span className="border-2 border-current bg-current/20" style={{ width: size, height: size }} />
    </span>
  )
}

function IntensityIcon({ intensity }: { intensity: ColorIntensity }) {
  const bars = intensity === 'mellow' ? 1 : intensity === 'balanced' ? 2 : 3
  return (
    <span aria-hidden="true" className="flex h-6 w-6 items-end justify-center gap-[2px]">
      {[0, 1, 2].map((index) => (
        <span
          key={index}
          className={`w-1 rounded-full ${index < bars ? 'bg-current' : 'bg-slate-700'}`}
          style={{ height: 7 + index * 5 }}
        />
      ))}
    </span>
  )
}

interface ArtDirectionPanelProps {
  noScrollVariant?: boolean
  livePreviewPayloadUpdates?: boolean
  signatureInspectorVariant?: 'per-line' | 'shared-active-line'
}

const ArtDirectionPanel: React.FC<ArtDirectionPanelProps> = ({ noScrollVariant = false, livePreviewPayloadUpdates = false, signatureInspectorVariant = 'per-line' }) => {
  const { project, setArtDirection, setTemplateArtLevel } = useStudioStore()
  const [activeFamily, setActiveFamily] = React.useState<ControlFamily>('body-color')
  const [activeSettingsPanel, setActiveSettingsPanel] = React.useState<SettingsPanel>(signatureInspectorVariant === 'shared-active-line' ? 'creator-signature' : 'basic')
  const art = project.artDirection
  const update = (patch: Partial<ArtDirection>) => setArtDirection({ ...art, ...patch })
  const intensity = art.colorIntensity ?? 'balanced'
  const selectedSolid = SOLID_PRESETS.find((preset) => !art.paletteFamily
    && Object.values(preset.variants).some((variant) => variant.primary === art.palette?.primary))
  const selectedPatterned = PATTERNED_PRESETS.find((preset) => art.paletteFamily === preset.family && art.palettePattern === preset.pattern)
  const selectedStyle = STYLE_OPTIONS.find((style) => style.moduleStyle === (art.moduleStyle ?? 'rounded')) ?? STYLE_OPTIONS[1]
  const selectedCorner = EYE_FRAME_OPTIONS.find((option) => option.style === (art.eyeFrameStyle ?? art.eyeStyle ?? 'rounded')) ?? EYE_FRAME_OPTIONS[1]
  const selectedEye = EYE_BALL_OPTIONS.find((option) => option.style === (art.eyeBallStyle ?? art.eyeStyle ?? 'rounded')) ?? EYE_BALL_OPTIONS[1]

  React.useEffect(() => {
    if (signatureInspectorVariant === 'shared-active-line') setTemplateArtLevel('template-art')
  }, [setTemplateArtLevel, signatureInspectorVariant])

  const moveFamilyFocus = (event: React.KeyboardEvent<HTMLButtonElement>, current: ControlFamily) => {
    const currentIndex = CONTROL_FAMILIES.findIndex(({ family }) => family === current)
    let nextIndex = currentIndex
    if (event.key === 'ArrowRight') nextIndex = (currentIndex + 1) % CONTROL_FAMILIES.length
    else if (event.key === 'ArrowLeft') nextIndex = (currentIndex - 1 + CONTROL_FAMILIES.length) % CONTROL_FAMILIES.length
    else if (event.key === 'Home') nextIndex = 0
    else if (event.key === 'End') nextIndex = CONTROL_FAMILIES.length - 1
    else return
    event.preventDefault()
    const next = CONTROL_FAMILIES[nextIndex].family
    setActiveFamily(next)
    document.getElementById(`control-tab-${next}`)?.focus()
  }

  return (
    <section aria-label="Live QR design editor" className={`rounded-2xl border border-slate-800 bg-slate-900/70 shadow-2xl shadow-black/20 ${noScrollVariant ? 'p-2' : 'p-3 sm:p-4'}`}>
      <div className={`${noScrollVariant ? 'mb-1' : 'mb-2'} flex items-center justify-between gap-2`}>
        <div role="group" aria-label="Settings panel" className="grid min-w-0 flex-1 grid-cols-3 rounded-lg bg-slate-950 p-1">
          <button type="button" aria-pressed={activeSettingsPanel === 'basic'} onClick={() => setActiveSettingsPanel('basic')}
            className={`rounded-md px-1 py-1 text-[9px] font-bold whitespace-nowrap ${activeSettingsPanel === 'basic' ? 'bg-slate-700 text-white' : 'text-slate-500'}`}>QR Style</button>
          <button type="button" aria-pressed={activeSettingsPanel === 'creator-signature'} onClick={() => { setTemplateArtLevel('template-art'); setActiveSettingsPanel('creator-signature') }}
            className={`rounded-md px-1 py-1 text-[9px] font-bold whitespace-nowrap ${activeSettingsPanel === 'creator-signature' ? 'bg-sky-600 text-white' : 'text-slate-400'}`}>Creator Signature</button>
          <button type="button" aria-pressed={activeSettingsPanel === 'destination'} onClick={() => setActiveSettingsPanel('destination')}
            className={`rounded-md px-1 py-1 text-[9px] font-bold whitespace-nowrap ${activeSettingsPanel === 'destination' ? 'bg-studio-600 text-white' : 'text-slate-400'}`}>Destination</button>
        </div>
      </div>

      <div className={`grid items-start lg:grid-cols-[minmax(0,1fr)_344px] ${noScrollVariant ? 'gap-1' : 'gap-3'}`}>
        <div className={`order-2 min-w-0 lg:order-1 ${noScrollVariant ? 'space-y-1' : 'space-y-2.5'}`} data-testid="lower-design-controls">
          {activeSettingsPanel === 'destination' ? <PayloadInput key={project.projectId} livePreviewPayloadUpdates={livePreviewPayloadUpdates} compact={noScrollVariant} /> : activeSettingsPanel === 'creator-signature' ? <TemplateArtControls compact={noScrollVariant} inspectorVariant={signatureInspectorVariant} /> : <section aria-labelledby="qr-style-title" className={`rounded-xl border border-slate-700/70 bg-slate-950/35 ${noScrollVariant ? 'p-1.5' : 'p-3'}`} data-basic-controls-tray="true">
            <h3 id="qr-style-title" className={`${noScrollVariant ? 'mb-1 text-sm' : 'mb-2 text-base'} font-semibold text-white`}>QR Style</h3>
          {noScrollVariant && <div role="tablist" aria-label="Design control families" className="grid grid-cols-5 gap-1 rounded-xl bg-slate-950 p-1">
            {CONTROL_FAMILIES.map(({ family, label, glyph }) => {
              const selected = activeFamily === family
              return <button
                key={family}
                id={`control-tab-${family}`}
                type="button"
                role="tab"
                aria-label={`Show ${label} controls`}
                aria-selected={selected}
                aria-controls={`control-panel-${family}`}
                title={label}
                tabIndex={selected ? 0 : -1}
                onClick={() => setActiveFamily(family)}
                onKeyDown={(event) => moveFamilyFocus(event, family)}
                className={`flex h-8 items-center justify-center rounded-lg text-base transition focus:outline-none focus-visible:ring-2 focus-visible:ring-white ${selected ? 'bg-studio-600 text-white' : 'text-slate-400 hover:bg-slate-800 hover:text-white'}`}
              ><span aria-hidden="true">{glyph}</span></button>
            })}
          </div>}
          <div id="control-panel-body-color" role={noScrollVariant ? 'tabpanel' : undefined} aria-label={noScrollVariant ? 'Body Color controls' : undefined} className={noScrollVariant && activeFamily !== 'body-color' ? 'hidden' : undefined}>
            <div className={`${SELECTOR_SCROLL_ROW} items-center`} data-selector-scroll-row="body-color" role="listbox" aria-label="Body Color">
              {SOLID_PRESETS.map((preset) => {
                const selected = selectedSolid?.name === preset.name
                const palette = preset.variants[intensity]
                return (
                  <button
                    key={preset.name}
                    type="button"
                    role="option"
                    aria-label={`${preset.name}${selected ? ' selected' : ''}`}
                    aria-selected={selected}
                    onClick={() => update({
                      paletteFamily: undefined,
                      palettePattern: 'solid',
                      palette,
                    })}
                    data-setting={`solid:${preset.name}`}
                    data-selector-family="body-color"
                    className={`${SELECTOR_TILE_BASE} ${selected ? SELECTOR_TILE_SELECTED : SELECTOR_TILE_IDLE}`}
                    style={{ background: `linear-gradient(135deg, ${palette.primary} 0 58%, ${palette.accent} 58%)` }}
                  >
                    {selected && <span aria-hidden="true" className={SELECTOR_CHECK}>✓</span>}
                  </button>
                )
              })}
              <span aria-hidden="true" className="h-9 w-px shrink-0 bg-slate-600" data-body-color-separator="true" />
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
                    data-setting={`pattern:${preset.family}:${preset.pattern}`}
                    data-selector-family="body-color"
                    className={`${SELECTOR_TILE_BASE} ${selected ? SELECTOR_TILE_SELECTED : SELECTOR_TILE_IDLE}`}
                    style={{ background: preset.swatch }}
                  >
                    <span aria-hidden="true" className="absolute inset-x-1 bottom-1 h-1 rounded-full bg-black/25" />
                    {selected && <span aria-hidden="true" className={SELECTOR_CHECK}>✓</span>}
                  </button>
                )
              })}
            </div>
          </div>

          <div id="control-panel-corner-color" role={noScrollVariant ? 'tabpanel' : undefined} aria-label={noScrollVariant ? 'Corner Color controls' : undefined} className={noScrollVariant && activeFamily !== 'corner-color' ? 'hidden' : undefined}>
            <div className={SELECTOR_SCROLL_ROW} data-selector-scroll-row="corner-color" role="listbox" aria-label="Corner Color">
              <button
                type="button"
                role="option"
                aria-label={`Match body${art.cornerColor ? '' : ' selected'}`}
                aria-selected={!art.cornerColor}
                onClick={() => update({ cornerColor: undefined })}
                title="Match body"
                data-setting="match-body"
                data-selector-family="corner-color"
                className={`${SELECTOR_TILE_BASE} ${!art.cornerColor ? SELECTOR_TILE_SELECTED : SELECTOR_TILE_IDLE}`}
                style={{ background: 'linear-gradient(135deg, #5162da 0 50%, #c9184a 50%)' }}
              >
                <span aria-hidden="true" className="rounded bg-slate-950/75 px-1 text-[9px] font-bold text-white">MATCH</span>
                {!art.cornerColor && <span aria-hidden="true" className={SELECTOR_CHECK}>✓</span>}
              </button>
              {CORNER_COLOR_OPTIONS.map((option) => {
                const selected = art.cornerColor === option.value
                return <button
                  key={option.value}
                  type="button"
                  role="option"
                  aria-label={`${option.name} corner color${selected ? ' selected' : ''}`}
                  aria-selected={selected}
                  onClick={() => update({ cornerColor: option.value })}
                  title={`${option.name} corner color`}
                  data-setting={option.value}
                  data-selector-family="corner-color"
                  className={`${SELECTOR_TILE_BASE} ${selected ? SELECTOR_TILE_SELECTED : SELECTOR_TILE_IDLE}`}
                  style={{ background: option.value }}
                >
                  {selected && <span aria-hidden="true" className={SELECTOR_CHECK}>✓</span>}
                </button>
              })}
            </div>
          </div>

          <div id="control-panel-style" role={noScrollVariant ? 'tabpanel' : undefined} aria-label={noScrollVariant ? 'Style controls' : undefined} className={noScrollVariant && activeFamily !== 'style' ? 'hidden' : undefined}>
            <div className={SELECTOR_SCROLL_ROW} data-selector-scroll-row="style" role="listbox" aria-label="Style">
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
                    title={`${style.name} QR style`}
                    data-setting={style.moduleStyle}
                    data-selector-family="style"
                    className={`${SELECTOR_TILE_BASE} ${selected ? SELECTOR_TILE_SELECTED : SELECTOR_TILE_IDLE}`}
                  >
                    {style.icon
                      ? <img aria-hidden="true" src={style.icon} alt="" className="h-9 w-9 rounded-md" data-icon-recipe={style.moduleStyle} />
                      : <MiniQr shape={style.moduleStyle} />}
                    {selected && <span aria-hidden="true" className={SELECTOR_CHECK}>✓</span>}
                  </button>
                )
              })}
            </div>
          </div>

          <div id="control-panel-corners" role={noScrollVariant ? 'tabpanel' : undefined} aria-label={noScrollVariant ? 'Corners controls' : undefined} className={noScrollVariant && activeFamily !== 'corners' ? 'hidden' : undefined}>
            <div className={SELECTOR_SCROLL_ROW} data-selector-scroll-row="corners" role="listbox" aria-label="Corners">
              {EYE_FRAME_OPTIONS.map((corner) => {
                const selected = selectedCorner.name === corner.name
                return (
                  <button
                    key={corner.name}
                    type="button"
                    role="option"
                    aria-label={`${corner.name} corner style${selected ? ' selected' : ''}`}
                    aria-selected={selected}
                    onClick={() => update({ eyeFrameStyle: corner.style })}
                    title={`${corner.name} corner style`}
                    data-setting={corner.style}
                    data-selector-family="corners"
                    className={`${SELECTOR_TILE_BASE} ${selected ? SELECTOR_TILE_SELECTED : SELECTOR_TILE_IDLE}`}
                  >
                    {corner.icon
                      ? <img aria-hidden="true" src={corner.icon} alt="" className="h-9 w-9" data-icon-recipe={`eye-frame-${corner.style}`} />
                      : <MiniCorner frame={corner.style} ball={art.eyeBallStyle ?? art.eyeStyle ?? 'rounded'} />}
                    {selected && <span aria-hidden="true" className={SELECTOR_CHECK}>✓</span>}
                  </button>
                )
              })}
            </div>
          </div>

          <div id="control-panel-eyes" role={noScrollVariant ? 'tabpanel' : undefined} aria-label={noScrollVariant ? 'Eyes controls' : undefined} className={noScrollVariant && activeFamily !== 'eyes' ? 'hidden' : undefined}>
            <div className={SELECTOR_SCROLL_ROW} data-selector-scroll-row="eyes" role="listbox" aria-label="Eyes">
              {EYE_BALL_OPTIONS.map((eye) => {
                const selected = selectedEye.name === eye.name
                return (
                  <button
                    key={eye.name}
                    type="button"
                    role="option"
                    aria-label={`${eye.name} eye style${selected ? ' selected' : ''}`}
                    aria-selected={selected}
                    onClick={() => update({ eyeBallStyle: eye.style })}
                    title={`${eye.name} eye style`}
                    data-setting={eye.style}
                    data-selector-family="eyes"
                    className={`${SELECTOR_TILE_BASE} ${selected ? SELECTOR_TILE_SELECTED : SELECTOR_TILE_IDLE}`}
                  >
                    {eye.icon
                      ? <img aria-hidden="true" src={eye.icon} alt="" className="h-9 w-9" data-icon-recipe={`eye-ball-${eye.style}`} />
                      : <MiniCorner frame={art.eyeFrameStyle ?? art.eyeStyle ?? 'rounded'} ball={eye.style} />}
                    {selected && <span aria-hidden="true" className={SELECTOR_CHECK}>✓</span>}
                  </button>
                )
              })}
            </div>
          </div>
          </section>}

        </div>

        <div className="order-1 flex items-center justify-center gap-1.5 lg:order-2" data-testid="qr-side-controls">
          <div role="group" aria-label="QR size" className="grid gap-1 rounded-xl bg-slate-950 p-1">
            {QR_SIZES.map((size) => {
              const selected = (art.protectedQrProminence ?? 0.7) === size.value
              return <button
                key={size.value}
                type="button"
                aria-label={size.label}
                aria-pressed={selected}
                title={size.label}
                onClick={() => update({ protectedQrProminence: size.value })}
                data-selector-family="qr-size"
                className={`relative flex h-9 w-8 items-center justify-center rounded-lg p-0 text-[10px] font-bold transition focus:outline-none focus-visible:ring-2 focus-visible:ring-white ${selected ? 'bg-studio-600 text-white shadow' : 'text-slate-400 hover:bg-slate-800 hover:text-white'}`}
              ><SizeIcon size={size.iconSize} /></button>
            })}
          </div>

          <QRPreview size={232} useDemoWhenEmpty />

          <div role="group" aria-label="Intensity" className="grid gap-1 rounded-xl bg-slate-950 p-1">
            {INTENSITIES.map((option) => {
              const selected = intensity === option.value
              return <button
                key={option.value}
                type="button"
                aria-label={`${option.label} color intensity`}
                aria-pressed={selected}
                title={`${option.label} color intensity`}
                onClick={() => update({
                  colorIntensity: option.value,
                  ...(selectedSolid ? { palette: selectedSolid.variants[option.value] } : {}),
                })}
                className={`h-9 w-8 rounded-lg text-[10px] font-bold transition focus:outline-none focus-visible:ring-2 focus-visible:ring-white ${selected ? 'bg-studio-600 text-white shadow' : 'text-slate-400 hover:bg-slate-800 hover:text-white'}`}
              ><IntensityIcon intensity={option.value} /></button>
            })}
          </div>
        </div>
      </div>
    </section>
  )
}

export default ArtDirectionPanel
