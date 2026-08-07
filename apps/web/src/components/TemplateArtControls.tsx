import { useState, type KeyboardEvent, type ReactNode } from 'react'
import { useStudioStore } from '../store'
import type {
  CreatorSignatureBoundaryOffsetMm,
  CreatorSignatureColor,
  CreatorSignatureFont,
  CreatorSignatureFontSize,
  CreatorSignaturePosition,
  CreatorSignatureTemplateFields,
} from '../types'
import {
  CREATOR_SIGNATURE_COLORS,
  CREATOR_SIGNATURE_FONTS,
  CREATOR_SIGNATURE_FONT_SIZES,
  CREATOR_SIGNATURE_OFFSETS,
  DEFAULT_CREATOR_SIGNATURE,
} from '../lib/creatorSignature'

const POSITIONS: ReadonlyArray<{ value: CreatorSignaturePosition; label: string }> = [
  { value: 'bottom-left-outside', label: 'Bottom left' },
  { value: 'bottom-right-outside', label: 'Bottom right' },
  { value: 'below-centered', label: 'Below centered' },
  { value: 'top-left-corner', label: 'Top left corner' },
  { value: 'top-right-corner', label: 'Top right corner' },
]

const panelClass = 'rounded-xl border border-sky-500/30 bg-sky-950/20'
const iconButton = 'relative flex min-w-0 items-center justify-center rounded-xl border transition duration-150 focus:outline-none focus-visible:ring-2 focus-visible:ring-cyan-300'
const selectedButton = 'border-cyan-300/80 bg-cyan-300/15 text-cyan-100 shadow-[0_0_0_1px_rgba(103,232,249,.16),0_8px_22px_rgba(8,145,178,.16)]'
const idleButton = 'border-white/10 bg-white/[.035] text-slate-400 hover:border-white/25 hover:bg-white/[.07] hover:text-slate-200'

function SelectedDot() {
  return <span aria-hidden="true" className="absolute right-1.5 top-1.5 h-1.5 w-1.5 rounded-full bg-cyan-300 shadow-[0_0_8px_rgba(103,232,249,.9)]" />
}

function FontIcon({ value }: { value: CreatorSignatureFont }) {
  if (value === 'mono') return <svg aria-hidden="true" viewBox="0 0 24 24" className="h-5 w-5" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round"><path d="M7 6H4v12h3M17 6h3v12h-3M8.5 16V8l3.5 5 3.5-5v8" /></svg>
  if (value === 'cursive') return <svg aria-hidden="true" viewBox="0 0 24 24" className="h-5 w-5" fill="none" stroke="currentColor" strokeWidth="1.65" strokeLinecap="round"><path d="M5 16c2.5-7 6.2-9 7.1-5.6.8 3-4.5 7.7-5.8 4.3-1.1-2.8 4.7-2.7 6.2-.2 1.2 2 2.8.8 3.7-1.2.4 2.5 1.4 3.5 3.1 1.3M4 19c4.8-1.4 10.3-.7 15 .2" /></svg>
  if (value === 'handwritten') return <svg aria-hidden="true" viewBox="0 0 24 24" className="h-5 w-5" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round"><path d="m5 17 3.2-10 2.1 9 3-8 1.5 8.5L19 6M4.5 19c4-1 9.7-1 15 0" /></svg>
  if (value === 'display') return <svg aria-hidden="true" viewBox="0 0 24 24" className="h-5 w-5" fill="currentColor"><path d="M5 5h6v3H9v8h2v3H5v-3h1V8H5zm8 0h6v4h-2V8h-1v8h1v-3h2v6h-6v-3h1V8h-1z" /></svg>
  return <svg aria-hidden="true" viewBox="0 0 24 24" className="h-5 w-5" fill="none" stroke="currentColor" strokeWidth={value === 'serif' ? 1.65 : 2} strokeLinecap="round" strokeLinejoin="round">{value === 'serif' && <path d="M5.5 19h5M13.5 19h5M9 5h6" />}<path d="M7.5 18 12 6l4.5 12M9.5 13.5h5" /></svg>
}

function SizeIcon({ value }: { value: CreatorSignatureFontSize }) {
  const size = value === 'small' ? 8 : value === 'medium' ? 13 : value === 'large' ? 18 : 22
  return <svg aria-hidden="true" viewBox="0 0 24 24" className="h-5 w-5" fill="none">
    <rect x={(24 - size) / 2} y={(24 - size) / 2} width={size} height={size} rx="2" fill="currentColor" opacity=".2" />
    <path d={`M${12 - size / 4} ${12 - size / 3}h${size / 2}M12 ${12 - size / 3}v${size * .67}`} stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" />
  </svg>
}

function ColourIcon({ colour }: { colour: string }) {
  return <svg aria-hidden="true" viewBox="0 0 24 24" className="h-5 w-5"><circle cx="12" cy="12" r="8" fill={colour} stroke="rgba(255,255,255,.65)" strokeWidth="1" /><circle cx="9.2" cy="9" r="2.3" fill="rgba(255,255,255,.3)" /></svg>
}

function PositionIcon({ value }: { value: CreatorSignaturePosition }) {
  const top = value.startsWith('top')
  const centered = value === 'below-centered'
  const right = value.includes('right')
  const lineX = centered ? 7 : right ? 13 : 3
  const lineWidth = centered ? 10 : 8
  const lineY = top ? 3 : 21
  return <svg aria-hidden="true" viewBox="0 0 24 24" className="h-6 w-6" fill="none">
    <rect x="5" y="5" width="14" height="14" rx="2.2" stroke="currentColor" strokeWidth="1.25" opacity=".56" />
    <path d="M7.5 7.5h3v3h-3zm6 0h3v3h-3zm-6 6h3v3h-3zm6 0h3v3h-1.2v-1.2h-2.3z" fill="currentColor" opacity=".72" />
    <path d={`M${lineX} ${lineY}h${lineWidth}m-${Math.max(0, lineWidth - 5)} ${top ? 2 : -2}h5`} stroke="currentColor" strokeWidth="1.65" strokeLinecap="round" />
  </svg>
}

function OffsetIcon({ value }: { value: CreatorSignatureBoundaryOffsetMm }) {
  const textX = 9 + value * 2.15
  return <svg aria-hidden="true" viewBox="0 0 28 24" className="h-6 w-7" fill="none">
    <path d="M7 3v18M4.5 5.5H7M4.5 18.5H7" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" opacity=".7" />
    <path d={`M${textX} 9h9M${textX} 14h6`} stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" />
    {value > 0 && <path d={`M8.5 19h${value * 2.15}`} stroke="currentColor" strokeWidth="1" strokeDasharray="1.2 1.2" opacity=".8" />}
  </svg>
}

function IconButton({ selected, label, onClick, children, role, checked, tabIndex, onKeyDown, id, className = '' }: {
  selected: boolean
  label: string
  onClick: () => void
  children: ReactNode
  role?: 'radio'
  checked?: boolean
  tabIndex?: number
  onKeyDown?: (event: KeyboardEvent<HTMLButtonElement>) => void
  id?: string
  className?: string
}) {
  return <button type="button" id={id} role={role} aria-label={label} title={label} aria-pressed={role ? undefined : selected} aria-checked={checked} tabIndex={tabIndex} onClick={onClick} onKeyDown={onKeyDown}
    className={`${iconButton} ${selected ? selectedButton : idleButton} ${className}`}>
    {children}
    {selected && <SelectedDot />}
  </button>
}

export default function TemplateArtControls({ compact = false, inspectorVariant = 'shared-active-line' }: {
  compact?: boolean
  inspectorVariant?: 'per-line' | 'shared-active-line'
}) {
  const { project, setTemplateArt } = useStudioStore()
  const spec = project.templateArt ?? DEFAULT_CREATOR_SIGNATURE
  const fields = spec.fields
  const update = (patch: Partial<CreatorSignatureTemplateFields>) => setTemplateArt({
    templateId: 'creator-signature',
    outputIntent: 'square-card',
    fields: { ...fields, ...patch },
  })
  const colours: Record<CreatorSignatureColor, string> = {
    primary: project.artDirection.palette?.primary ?? '#5162da',
    secondary: project.artDirection.palette?.secondary ?? '#323eaf',
    accent: project.artDirection.palette?.accent ?? '#a5bdff',
    'dark-ink': project.style?.foreground ?? '#18213a',
  }
  const moveRadio = <T,>(event: KeyboardEvent<HTMLButtonElement>, options: ReadonlyArray<T>, index: number, apply: (value: T) => void, id: (value: T) => string) => {
    let next = index
    if (event.key === 'ArrowRight' || event.key === 'ArrowDown') next = (index + 1) % options.length
    else if (event.key === 'ArrowLeft' || event.key === 'ArrowUp') next = (index - 1 + options.length) % options.length
    else if (event.key === 'Home') next = 0
    else if (event.key === 'End') next = options.length - 1
    else return
    event.preventDefault()
    apply(options[next])
    document.getElementById(id(options[next]))?.focus()
  }
  const linePatch = <T,>(line: 1 | 2, key1: keyof CreatorSignatureTemplateFields, key2: keyof CreatorSignatureTemplateFields, value: T) => ({ [line === 1 ? key1 : key2]: value }) as Partial<CreatorSignatureTemplateFields>
  const selectedPosition = fields.signaturePosition ?? 'bottom-right-outside'
  const selectedOffset = fields.boundaryOffsetMm ?? 0
  const [activeLine, setActiveLine] = useState<1 | 2>(1)
  const activeFont = (activeLine === 1 ? fields.line1Font : fields.line2Font) ?? 'sans'
  const activeSize = (activeLine === 1 ? fields.line1Size : fields.line2Size) ?? 'medium'
  const activeColour = (activeLine === 1 ? fields.line1Color : fields.line2Color) ?? (activeLine === 1 ? 'dark-ink' : 'secondary')

  if (inspectorVariant === 'shared-active-line') return <section aria-labelledby="creator-signature-title" className={`${panelClass} ${compact ? 'p-2' : 'p-3'}`} data-template-id="creator-signature" data-template-controls-tray="creator-signature" data-signature-inspector="shared-active-line">
    <h3 id="creator-signature-title" className="sr-only">Creator Signature</h3>
    <div className={`grid ${compact ? 'gap-2' : 'gap-3'}`}>
      <div role="group" aria-label="Signature lines" className="grid grid-cols-2 gap-1.5">
        {([1, 2] as const).map((line) => {
          const selected = activeLine === line
          const text = line === 1 ? fields.line1Text ?? fields.signatureText ?? '' : fields.line2Text ?? fields.handleText ?? ''
          const font = (line === 1 ? fields.line1Font : fields.line2Font) ?? 'sans'
          const size = (line === 1 ? fields.line1Size : fields.line2Size) ?? 'medium'
          const colour = (line === 1 ? fields.line1Color : fields.line2Color) ?? (line === 1 ? 'dark-ink' : 'secondary')
          return <section key={line} aria-label={`Signature line ${line} settings`} data-active-line={selected ? 'true' : 'false'}
            className={`min-w-0 rounded-xl border p-1.5 transition ${selected ? 'border-cyan-300/80 bg-cyan-300/10 shadow-[0_0_0_1px_rgba(103,232,249,.14)]' : 'border-white/10 bg-slate-950/55'}`}>
            <div className="mb-1 flex items-center gap-1">
              <button type="button" aria-label={`Style line ${line}`} aria-pressed={selected} title={`Style line ${line}`} onClick={() => setActiveLine(line)}
                className={`relative flex h-7 w-7 shrink-0 items-center justify-center rounded-lg border text-[10px] font-black focus:outline-none focus-visible:ring-2 focus-visible:ring-cyan-300 ${selected ? selectedButton : idleButton}`}>
                {line}{selected && <SelectedDot />}
              </button>
              <span aria-hidden="true" className="flex min-w-0 flex-1 items-center justify-end gap-1 text-slate-300">
                <span className="flex h-6 w-6 items-center justify-center rounded-md bg-black/25"><FontIcon value={font} /></span>
                <span className="flex h-6 w-6 items-center justify-center rounded-md bg-black/25"><SizeIcon value={size} /></span>
                <span className="flex h-6 w-6 items-center justify-center rounded-md bg-black/25"><ColourIcon colour={colours[colour]} /></span>
              </span>
            </div>
            <input aria-label={`Line ${line}`} value={text} maxLength={line === 1 ? 32 : 36}
              onFocus={() => setActiveLine(line)}
              onChange={(event) => update(line === 1 ? { line1Text: event.target.value } : { line2Text: event.target.value })}
              placeholder={line === 1 ? 'Signature line 1' : '@handle · line 2'}
              className="h-9 w-full rounded-lg border border-white/10 bg-white/[.045] px-2 text-xs text-slate-100 outline-none placeholder:text-slate-500 focus:border-cyan-300/70 focus:ring-2 focus:ring-cyan-300/15" />
          </section>
        })}
      </div>

      <section aria-label={`Line ${activeLine} shared style inspector`} className="rounded-xl border border-cyan-300/25 bg-slate-950/55 p-2 shadow-xl shadow-black/20">
        <div className="mb-1.5 flex items-center gap-2 text-[10px] font-bold uppercase tracking-[.16em] text-cyan-200">
          <span className="flex h-5 w-5 items-center justify-center rounded-md bg-cyan-300/15 text-[9px]">{activeLine}</span>
          <span>Style</span>
        </div>
        <div className="grid gap-1.5">
          <div role="group" aria-label={`Line ${activeLine} font`} className="grid grid-cols-6 gap-1 rounded-xl bg-black/20 p-1">
            {CREATOR_SIGNATURE_FONTS.map((option) => <IconButton key={option.value} selected={activeFont === option.value} label={`Line ${activeLine} ${option.label.toLowerCase()} font`} onClick={() => update(linePatch(activeLine, 'line1Font', 'line2Font', option.value))} className="h-8"><FontIcon value={option.value} /></IconButton>)}
          </div>
          <div className="grid grid-cols-2 gap-1.5">
            <div role="group" aria-label={`Line ${activeLine} size`} className="grid grid-cols-4 gap-1 rounded-xl bg-black/20 p-1">
              {CREATOR_SIGNATURE_FONT_SIZES.map((option) => <IconButton key={option.value} selected={activeSize === option.value} label={`Line ${activeLine} ${option.label.toLowerCase()} size`} onClick={() => update(linePatch(activeLine, 'line1Size', 'line2Size', option.value))} className="h-8"><SizeIcon value={option.value} /></IconButton>)}
            </div>
            <div role="group" aria-label={`Line ${activeLine} colour`} className="grid grid-cols-4 gap-1 rounded-xl bg-black/20 p-1">
              {CREATOR_SIGNATURE_COLORS.map((option) => <IconButton key={option.value} selected={activeColour === option.value} label={`Line ${activeLine} ${option.label.toLowerCase()}`} onClick={() => update(linePatch(activeLine, 'line1Color', 'line2Color', option.value))} className="h-8"><ColourIcon colour={colours[option.value]} /></IconButton>)}
            </div>
          </div>
        </div>
      </section>

      <section className={`grid ${compact ? 'gap-2' : 'gap-3'} rounded-xl border border-white/10 bg-slate-950/55 ${compact ? 'p-2' : 'p-3'} shadow-xl shadow-black/20 sm:grid-cols-[1.3fr_1fr]`}>
        <fieldset>
          <legend className="sr-only">Fixed signature position</legend>
          <div role="radiogroup" aria-label="Fixed signature position" className="grid grid-cols-5 gap-1 rounded-xl bg-black/20 p-1" data-signature-position-selector="icon-row">
            {POSITIONS.map((option, index) => {
              const selected = selectedPosition === option.value
              return <IconButton key={option.value} id={`signature-position-${option.value}`} role="radio" selected={selected} checked={selected} tabIndex={selected ? 0 : -1} label={option.label}
                onClick={() => update({ signaturePosition: option.value })}
                onKeyDown={(event) => moveRadio(event, POSITIONS, index, (next) => update({ signaturePosition: next.value }), (next) => `signature-position-${next.value}`)}
                className={compact ? 'h-8' : 'h-10'}><PositionIcon value={option.value} /></IconButton>
            })}
          </div>
        </fieldset>
        <fieldset>
          <legend className="sr-only">Signature boundary offset</legend>
          <div role="radiogroup" aria-label="Signature boundary offset" className="grid grid-cols-4 gap-1 rounded-xl bg-black/20 p-1">
            {CREATOR_SIGNATURE_OFFSETS.map((offset, index) => {
              const selected = selectedOffset === offset
              return <IconButton key={offset} id={`signature-offset-${offset}`} role="radio" selected={selected} checked={selected} tabIndex={selected ? 0 : -1} label={`${offset}mm boundary offset`}
                onClick={() => update({ boundaryOffsetMm: offset })}
                onKeyDown={(event) => moveRadio(event, CREATOR_SIGNATURE_OFFSETS, index, (next) => update({ boundaryOffsetMm: next }), (next) => `signature-offset-${next}`)}
                className={compact ? 'h-8' : 'h-10'}>
                <OffsetIcon value={offset} />
                <span aria-hidden="true" className="absolute bottom-0.5 right-1 text-[7px] font-semibold tabular-nums text-current/80">{offset}<span className="text-[5px]">mm</span></span>
              </IconButton>
            })}
          </div>
        </fieldset>
      </section>
    </div>
  </section>

  return <section aria-labelledby="creator-signature-title" className={`${panelClass} ${compact ? 'p-2' : 'p-3'}`} data-template-id="creator-signature" data-template-controls-tray="creator-signature">
    <h3 id="creator-signature-title" className="sr-only">Creator Signature</h3>
    <div className={`grid ${compact ? 'gap-2' : 'gap-3'}`}>
      {([1, 2] as const).map((line) => {
        const text = line === 1 ? fields.line1Text ?? fields.signatureText ?? '' : fields.line2Text ?? fields.handleText ?? ''
        const font = (line === 1 ? fields.line1Font : fields.line2Font) ?? 'sans'
        const size = (line === 1 ? fields.line1Size : fields.line2Size) ?? 'medium'
        const colour = (line === 1 ? fields.line1Color : fields.line2Color) ?? (line === 1 ? 'dark-ink' : 'secondary')
        return <section key={line} aria-label={`Signature line ${line} settings`} className={`rounded-xl border border-white/10 bg-slate-950/55 ${compact ? 'p-2' : 'p-3'} shadow-xl shadow-black/20`}>
          <label className="relative block">
            <span className="pointer-events-none absolute left-2.5 top-1/2 -translate-y-1/2 text-slate-500" aria-hidden="true">
              {line === 1
                ? <svg viewBox="0 0 24 24" className="h-4 w-4" fill="none" stroke="currentColor" strokeWidth="1.7"><path d="m5 16-1 4 4-1L18.5 8.5a2.1 2.1 0 0 0-3-3zM13.8 7.2l3 3" /></svg>
                : <svg viewBox="0 0 24 24" className="h-4 w-4" fill="none" stroke="currentColor" strokeWidth="1.65"><circle cx="12" cy="12" r="8" /><path d="M15.5 9v5.2c0 2 3 2 3-.7V12a6.5 6.5 0 1 0-2.2 4.9" /></svg>}
            </span>
            <span className="sr-only">Signature line {line}</span>
            <input aria-label={`Line ${line}`} value={text} maxLength={line === 1 ? 32 : 36}
              onChange={(event) => update(line === 1 ? { line1Text: event.target.value } : { line2Text: event.target.value })}
              placeholder={line === 1 ? 'Signature line 1' : '@handle · line 2'}
              className={`w-full rounded-xl border border-white/10 bg-white/[.045] pl-8 pr-2 text-slate-100 outline-none placeholder:text-slate-500 focus:border-cyan-300/70 focus:ring-2 focus:ring-cyan-300/15 ${compact ? 'h-9 text-xs' : 'h-11 text-sm'}`} />
          </label>
          <div className={`${compact ? 'mt-2 gap-1.5' : 'mt-3 gap-2'} grid`}>
            <div role="group" aria-label={`Line ${line} font`} className="grid grid-cols-6 gap-1 rounded-xl bg-black/20 p-1">
              {CREATOR_SIGNATURE_FONTS.map((option) => <IconButton key={option.value} selected={font === option.value} label={`Line ${line} ${option.label.toLowerCase()} font`} onClick={() => update(linePatch(line, 'line1Font', 'line2Font', option.value))} className={compact ? 'h-8' : 'h-10'}><FontIcon value={option.value} /></IconButton>)}
            </div>
            <div className="grid grid-cols-2 gap-1.5">
              <div role="group" aria-label={`Line ${line} size`} className="grid grid-cols-4 gap-1 rounded-xl bg-black/20 p-1">
                {CREATOR_SIGNATURE_FONT_SIZES.map((option) => <IconButton key={option.value} selected={size === option.value} label={`Line ${line} ${option.label.toLowerCase()} size`} onClick={() => update(linePatch(line, 'line1Size', 'line2Size', option.value))} className={compact ? 'h-8' : 'h-10'}><SizeIcon value={option.value} /></IconButton>)}
              </div>
              <div role="group" aria-label={`Line ${line} colour`} className="grid grid-cols-4 gap-1 rounded-xl bg-black/20 p-1">
                {CREATOR_SIGNATURE_COLORS.map((option) => <IconButton key={option.value} selected={colour === option.value} label={`Line ${line} ${option.label.toLowerCase()}`} onClick={() => update(linePatch(line, 'line1Color', 'line2Color', option.value))} className={compact ? 'h-8' : 'h-10'}><ColourIcon colour={colours[option.value]} /></IconButton>)}
              </div>
            </div>
          </div>
        </section>
      })}

      <section className={`grid ${compact ? 'gap-2' : 'gap-3'} rounded-xl border border-white/10 bg-slate-950/55 ${compact ? 'p-2' : 'p-3'} shadow-xl shadow-black/20 sm:grid-cols-[1.3fr_1fr]`}>
        <fieldset>
          <legend className="sr-only">Fixed signature position</legend>
          <div role="radiogroup" aria-label="Fixed signature position" className="grid grid-cols-5 gap-1 rounded-xl bg-black/20 p-1" data-signature-position-selector="icon-row">
            {POSITIONS.map((option, index) => {
              const selected = selectedPosition === option.value
              return <IconButton key={option.value} id={`signature-position-${option.value}`} role="radio" selected={selected} checked={selected} tabIndex={selected ? 0 : -1} label={option.label}
                onClick={() => update({ signaturePosition: option.value })}
                onKeyDown={(event) => moveRadio(event, POSITIONS, index, (next) => update({ signaturePosition: next.value }), (next) => `signature-position-${next.value}`)}
                className={compact ? 'h-8' : 'h-10'}><PositionIcon value={option.value} /></IconButton>
            })}
          </div>
        </fieldset>
        <fieldset>
          <legend className="sr-only">Signature boundary offset</legend>
          <div role="radiogroup" aria-label="Signature boundary offset" className="grid grid-cols-4 gap-1 rounded-xl bg-black/20 p-1">
            {CREATOR_SIGNATURE_OFFSETS.map((offset, index) => {
              const selected = selectedOffset === offset
              return <IconButton key={offset} id={`signature-offset-${offset}`} role="radio" selected={selected} checked={selected} tabIndex={selected ? 0 : -1} label={`${offset}mm boundary offset`}
                onClick={() => update({ boundaryOffsetMm: offset })}
                onKeyDown={(event) => moveRadio(event, CREATOR_SIGNATURE_OFFSETS, index, (next) => update({ boundaryOffsetMm: next }), (next) => `signature-offset-${next}`)}
                className={compact ? 'h-8' : 'h-10'}>
                <OffsetIcon value={offset} />
                <span aria-hidden="true" className="absolute bottom-0.5 right-1 text-[7px] font-semibold tabular-nums text-current/80">{offset}<span className="text-[5px]">mm</span></span>
              </IconButton>
            })}
          </div>
        </fieldset>
      </section>
    </div>
  </section>
}
