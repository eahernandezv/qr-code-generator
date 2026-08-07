import React from 'react'
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
import QRPreview from './QRPreview'

const POSITIONS: ReadonlyArray<{ value: CreatorSignaturePosition; label: string }> = [
  { value: 'bottom-left-outside', label: 'Bottom left' },
  { value: 'bottom-right-outside', label: 'Bottom right' },
  { value: 'below-centered', label: 'Below centered' },
  { value: 'top-left-corner', label: 'Top left corner' },
  { value: 'top-right-corner', label: 'Top right corner' },
]

const buttonBase = 'relative flex min-w-0 items-center justify-center rounded-lg border transition focus:outline-none focus-visible:ring-2 focus-visible:ring-cyan-300'
const selectedButton = 'border-cyan-300/80 bg-cyan-300/15 text-cyan-100 shadow-[inset_0_0_0_1px_rgba(103,232,249,.1)]'
const idleButton = 'border-white/10 bg-white/[.035] text-slate-400 hover:border-white/25 hover:bg-white/[.07] hover:text-slate-200'

function SelectedDot() {
  return <span aria-hidden="true" className="absolute right-1 top-1 h-1.5 w-1.5 rounded-full bg-cyan-300 shadow-[0_0_7px_rgba(103,232,249,.9)]" />
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
  return <svg aria-hidden="true" viewBox="0 0 24 24" className="h-5 w-5" fill="none"><rect x={(24 - size) / 2} y={(24 - size) / 2} width={size} height={size} rx="2" fill="currentColor" opacity=".2" /><path d={`M${12 - size / 4} ${12 - size / 3}h${size / 2}M12 ${12 - size / 3}v${size * .67}`} stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" /></svg>
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
  return <svg aria-hidden="true" viewBox="0 0 24 24" className="h-6 w-6" fill="none"><rect x="5" y="5" width="14" height="14" rx="2.2" stroke="currentColor" strokeWidth="1.25" opacity=".56" /><path d="M7.5 7.5h3v3h-3zm6 0h3v3h-3zm-6 6h3v3h-3zm6 0h3v3h-1.2v-1.2h-2.3z" fill="currentColor" opacity=".72" /><path d={`M${lineX} ${lineY}h${lineWidth}m-${Math.max(0, lineWidth - 5)} ${top ? 2 : -2}h5`} stroke="currentColor" strokeWidth="1.65" strokeLinecap="round" /></svg>
}

function OffsetIcon({ value }: { value: CreatorSignatureBoundaryOffsetMm }) {
  const textX = 9 + value * 2.15
  return <svg aria-hidden="true" viewBox="0 0 28 24" className="h-6 w-7" fill="none"><path d="M7 3v18M4.5 5.5H7M4.5 18.5H7" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" opacity=".7" /><path d={`M${textX} 9h9M${textX} 14h6`} stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" />{value > 0 && <path d={`M8.5 19h${value * 2.15}`} stroke="currentColor" strokeWidth="1" strokeDasharray="1.2 1.2" opacity=".8" />}</svg>
}

function ChoiceButton({ selected, label, onClick, children, className = '' }: { selected: boolean; label: string; onClick: () => void; children: React.ReactNode; className?: string }) {
  return <button type="button" aria-label={label} title={label} aria-pressed={selected} onClick={onClick} className={`${buttonBase} ${selected ? selectedButton : idleButton} ${className}`}>{children}{selected && <SelectedDot />}</button>
}

export default function CreatorSignatureSpaceConcept() {
  const { project, setTemplateArt, setTemplateArtLevel } = useStudioStore()
  const [activeLine, setActiveLine] = React.useState<1 | 2>(1)
  const spec = project.templateArt ?? DEFAULT_CREATOR_SIGNATURE
  const fields = spec.fields
  const update = React.useCallback((patch: Partial<CreatorSignatureTemplateFields>) => setTemplateArt({
    templateId: 'creator-signature', outputIntent: 'square-card', fields: { ...fields, ...patch },
  }), [fields, setTemplateArt])
  const initialTemplateArtLevel = React.useRef(project.templateArtLevel ?? 'basic')

  React.useEffect(() => {
    const restoreTemplateArtLevel = initialTemplateArtLevel.current
    setTemplateArtLevel('template-art')
    return () => setTemplateArtLevel(restoreTemplateArtLevel)
  }, [setTemplateArtLevel])

  const colours: Record<CreatorSignatureColor, string> = {
    primary: project.artDirection.palette?.primary ?? '#5162da',
    secondary: project.artDirection.palette?.secondary ?? '#323eaf',
    accent: project.artDirection.palette?.accent ?? '#a5bdff',
    'dark-ink': project.style?.foreground ?? '#18213a',
  }
  const activeFont = (activeLine === 1 ? fields.line1Font : fields.line2Font) ?? 'sans'
  const activeSize = (activeLine === 1 ? fields.line1Size : fields.line2Size) ?? 'medium'
  const activeColour = (activeLine === 1 ? fields.line1Color : fields.line2Color) ?? (activeLine === 1 ? 'dark-ink' : 'secondary')
  const patchLine = <T,>(key1: keyof CreatorSignatureTemplateFields, key2: keyof CreatorSignatureTemplateFields, value: T) => ({ [activeLine === 1 ? key1 : key2]: value }) as Partial<CreatorSignatureTemplateFields>
  const selectedPosition = fields.signaturePosition ?? 'bottom-right-outside'
  const selectedOffset = fields.boundaryOffsetMm ?? 0

  const moveRadio = <T,>(event: React.KeyboardEvent<HTMLButtonElement>, options: ReadonlyArray<T>, index: number, apply: (value: T) => void, id: (value: T) => string) => {
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

  return <main data-testid="creator-signature-space-concept" className="min-h-[100dvh] overflow-x-hidden bg-[#07101d] text-white">
    <div aria-hidden="true" className="pointer-events-none fixed inset-0 bg-[radial-gradient(circle_at_72%_18%,rgba(34,211,238,.13),transparent_28%),radial-gradient(circle_at_8%_82%,rgba(99,102,241,.16),transparent_32%),linear-gradient(145deg,#07101d_0%,#0a1221_58%,#07101d_100%)]" />
    <div className="relative mx-auto grid min-h-[100dvh] max-w-7xl gap-3 px-3 py-3 lg:grid-cols-[minmax(0,1fr)_minmax(430px,.8fr)] lg:items-center lg:gap-6 lg:px-8 lg:py-7">
      <section aria-label="Creator Signature preview" className="flex min-h-0 items-center justify-center rounded-[1.5rem] border border-white/10 bg-white/[.025] p-2 shadow-2xl shadow-black/30 backdrop-blur-sm lg:h-[calc(100dvh-3.5rem)] lg:p-7">
        <div className="w-full max-w-[540px]"><QRPreview size={480} useDemoWhenEmpty className="w-full [&>p]:hidden [&>div]:!h-auto [&>div]:!w-full [&>div]:max-w-[512px] [&>div]:aspect-square [&_img]:!h-[calc(100%_-_32px)] [&_img]:!w-[calc(100%_-_32px)]" /></div>
      </section>

      <section aria-label="Creator Signature settings" className="grid min-w-0 content-center gap-2 lg:max-h-[calc(100dvh-3.5rem)] lg:overflow-y-auto lg:pr-1">
        <section aria-label="Signature lines" className="grid gap-1.5 rounded-[1.2rem] border border-white/10 bg-slate-950/55 p-2.5 shadow-xl shadow-black/20 backdrop-blur-xl">
          {([1, 2] as const).map((line) => {
            const selected = activeLine === line
            const text = line === 1 ? fields.line1Text ?? fields.signatureText ?? '' : fields.line2Text ?? fields.handleText ?? ''
            const font = (line === 1 ? fields.line1Font : fields.line2Font) ?? 'sans'
            const size = (line === 1 ? fields.line1Size : fields.line2Size) ?? 'medium'
            const colour = (line === 1 ? fields.line1Color : fields.line2Color) ?? (line === 1 ? 'dark-ink' : 'secondary')
            return <div key={line} className={`grid grid-cols-[2rem_minmax(0,1fr)_5.25rem] items-center gap-1.5 rounded-xl border p-1.5 transition ${selected ? 'border-cyan-300/55 bg-cyan-300/[.06]' : 'border-white/[.07] bg-white/[.025]'}`}>
              <button type="button" aria-label={`Edit line ${line} style`} title={`Edit line ${line} style`} aria-pressed={selected} onClick={() => setActiveLine(line)} className={`${buttonBase} h-9 text-[10px] font-bold tracking-wide ${selected ? selectedButton : idleButton}`}>L{line}</button>
              <input aria-label={`Signature line ${line}`} value={text} maxLength={line === 1 ? 32 : 36} onFocus={() => setActiveLine(line)} onChange={(event) => update(line === 1 ? { line1Text: event.target.value } : { line2Text: event.target.value })} placeholder={line === 1 ? 'Signature line 1' : '@handle · line 2'} className="h-9 min-w-0 rounded-lg border border-white/10 bg-white/[.045] px-2.5 text-xs text-white outline-none placeholder:text-slate-500 focus:border-cyan-300/70 focus:ring-2 focus:ring-cyan-300/15" />
              <button type="button" aria-label={`Edit line ${line} style: ${font}, ${size}, ${CREATOR_SIGNATURE_COLORS.find((item) => item.value === colour)?.label}`} title={`Line ${line}: ${font}, ${size}`} onClick={() => setActiveLine(line)} className={`flex h-9 items-center justify-center gap-1 rounded-lg border ${selected ? 'border-cyan-300/40 bg-cyan-300/[.08] text-cyan-100' : 'border-white/10 bg-black/20 text-slate-400'} focus:outline-none focus-visible:ring-2 focus-visible:ring-cyan-300`}><FontIcon value={font} /><SizeIcon value={size} /><ColourIcon colour={colours[colour]} /></button>
            </div>
          })}
        </section>

        <section aria-label={`Line ${activeLine} shared style toolbar`} className="rounded-[1.2rem] border border-white/10 bg-slate-950/55 p-2.5 shadow-xl shadow-black/20 backdrop-blur-xl">
          <div className="grid gap-1.5">
            <div role="group" aria-label={`Line ${activeLine} font`} className="grid grid-cols-6 gap-1 rounded-lg bg-black/20 p-1">{CREATOR_SIGNATURE_FONTS.map((option) => <ChoiceButton key={option.value} selected={activeFont === option.value} label={`Line ${activeLine} ${option.label.toLowerCase()} font`} onClick={() => update(patchLine('line1Font', 'line2Font', option.value))} className="h-9"><FontIcon value={option.value} /></ChoiceButton>)}</div>
            <div className="grid grid-cols-2 gap-1.5">
              <div role="group" aria-label={`Line ${activeLine} size`} className="grid grid-cols-4 gap-1 rounded-lg bg-black/20 p-1">{CREATOR_SIGNATURE_FONT_SIZES.map((option) => <ChoiceButton key={option.value} selected={activeSize === option.value} label={`Line ${activeLine} ${option.label.toLowerCase()} size`} onClick={() => update(patchLine('line1Size', 'line2Size', option.value))} className="h-9"><SizeIcon value={option.value} /></ChoiceButton>)}</div>
              <div role="group" aria-label={`Line ${activeLine} colour`} className="grid grid-cols-4 gap-1 rounded-lg bg-black/20 p-1">{CREATOR_SIGNATURE_COLORS.map((option) => <ChoiceButton key={option.value} selected={activeColour === option.value} label={`Line ${activeLine} ${option.label.toLowerCase()}`} onClick={() => update(patchLine('line1Color', 'line2Color', option.value))} className="h-9"><ColourIcon colour={colours[option.value]} /></ChoiceButton>)}</div>
            </div>
          </div>
        </section>

        <section className="grid gap-1.5 rounded-[1.2rem] border border-white/10 bg-slate-950/55 p-2.5 shadow-xl shadow-black/20 backdrop-blur-xl sm:grid-cols-[1.3fr_1fr]">
          <fieldset><legend className="sr-only">Signature placement</legend><div role="radiogroup" aria-label="Signature placement" className="grid grid-cols-5 gap-1 rounded-lg bg-black/20 p-1">{POSITIONS.map((option, index) => {
            const selected = selectedPosition === option.value
            return <button key={option.value} id={`space-position-${option.value}`} type="button" role="radio" aria-label={option.label} title={option.label} aria-checked={selected} tabIndex={selected ? 0 : -1} onClick={() => update({ signaturePosition: option.value })} onKeyDown={(event) => moveRadio(event, POSITIONS, index, (next) => update({ signaturePosition: next.value }), (next) => `space-position-${next.value}`)} className={`${buttonBase} h-9 ${selected ? selectedButton : idleButton}`}><PositionIcon value={option.value} />{selected && <SelectedDot />}</button>
          })}</div></fieldset>
          <fieldset><legend className="sr-only">Boundary offset</legend><div role="radiogroup" aria-label="Boundary offset" className="grid grid-cols-4 gap-1 rounded-lg bg-black/20 p-1">{CREATOR_SIGNATURE_OFFSETS.map((offset, index) => {
            const selected = selectedOffset === offset
            return <button key={offset} id={`space-offset-${offset}`} type="button" role="radio" aria-label={`${offset}mm boundary offset`} title={`${offset}mm boundary offset`} aria-checked={selected} tabIndex={selected ? 0 : -1} onClick={() => update({ boundaryOffsetMm: offset })} onKeyDown={(event) => moveRadio(event, CREATOR_SIGNATURE_OFFSETS, index, (next) => update({ boundaryOffsetMm: next }), (next) => `space-offset-${next}`)} className={`${buttonBase} h-9 ${selected ? selectedButton : idleButton}`}><OffsetIcon value={offset} /><span aria-hidden="true" className="absolute bottom-0 right-1 text-[7px] font-semibold tabular-nums">{offset}<span className="text-[5px]">mm</span></span>{selected && <SelectedDot />}</button>
          })}</div></fieldset>
        </section>
      </section>
    </div>
  </main>
}
