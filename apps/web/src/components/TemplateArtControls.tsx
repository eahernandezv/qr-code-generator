import type { KeyboardEvent } from 'react'
import { useStudioStore } from '../store'
import type { CreatorSignatureColor, CreatorSignatureFont, CreatorSignatureFontSize, CreatorSignaturePosition, CreatorSignatureTemplateFields } from '../types'
import {
  CREATOR_SIGNATURE_COLORS,
  CREATOR_SIGNATURE_FONTS,
  CREATOR_SIGNATURE_FONT_SIZES,
  CREATOR_SIGNATURE_OFFSETS,
  CREATOR_SIGNATURE_POSITIONS,
  DEFAULT_CREATOR_SIGNATURE,
} from '../lib/creatorSignature'

const inputClass = 'w-full rounded-lg border border-slate-700 bg-slate-950 px-3 py-2 text-sm text-slate-100 outline-none placeholder:text-slate-600 focus:border-studio-500 focus:ring-2 focus:ring-studio-500/30'
const compactInputClass = 'w-full rounded-lg border border-slate-700 bg-slate-950 px-2.5 py-1.5 text-xs text-slate-100 outline-none placeholder:text-slate-600 focus:border-studio-500 focus:ring-2 focus:ring-studio-500/30'
const compactSelectClass = 'min-w-0 rounded-md border border-slate-700 bg-slate-950 px-1.5 py-1 text-[11px] text-slate-100 outline-none focus:border-studio-500 focus:ring-2 focus:ring-studio-500/30'

const POSITION_ORDER: ReadonlyArray<CreatorSignaturePosition> = [
  'bottom-left-outside',
  'bottom-right-outside',
  'below-centered',
  'top-left-corner',
  'top-right-corner',
]

const POSITION_ICONS: Record<CreatorSignaturePosition, { x1: number; x2: number; y: number }> = {
  'bottom-left-outside': { x1: 3, x2: 10, y: 21 },
  'bottom-right-outside': { x1: 14, x2: 21, y: 21 },
  'below-centered': { x1: 8.5, x2: 15.5, y: 21 },
  'top-left-corner': { x1: 3, x2: 10, y: 3 },
  'top-right-corner': { x1: 14, x2: 21, y: 3 },
}

const POSITION_OPTIONS = POSITION_ORDER.map((value) => ({
  ...CREATOR_SIGNATURE_POSITIONS.find((option) => option.value === value)!,
  icon: POSITION_ICONS[value],
}))

function PositionIcon({ position }: { position: CreatorSignaturePosition }) {
  const line = POSITION_ICONS[position]
  return <svg aria-hidden="true" focusable="false" viewBox="0 0 24 24" className="h-6 w-6" fill="none">
    <rect x="5" y="5" width="14" height="14" rx="2" stroke="currentColor" strokeWidth="1.4" opacity=".75" />
    <rect x="7.5" y="7.5" width="3" height="3" rx=".5" fill="currentColor" />
    <rect x="13.5" y="7.5" width="3" height="3" rx=".5" fill="currentColor" />
    <rect x="7.5" y="13.5" width="3" height="3" rx=".5" fill="currentColor" />
    <path d="M13.5 13.5h3v3h-1.4v-1.4h-1.6z" fill="currentColor" opacity=".8" />
    <line x1={line.x1} y1={line.y} x2={line.x2} y2={line.y} stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
  </svg>
}

export default function TemplateArtControls({ compact = false }: { compact?: boolean }) {
  const { project, setTemplateArt } = useStudioStore()
  const spec = project.templateArt ?? DEFAULT_CREATOR_SIGNATURE
  const fields = spec.fields
  const line1Text = fields.line1Text ?? fields.signatureText ?? ''
  const line2Text = fields.line2Text ?? fields.handleText ?? ''
  const update = (patch: Partial<CreatorSignatureTemplateFields>) => setTemplateArt({
    templateId: 'creator-signature',
    outputIntent: 'square-card',
    fields: { ...fields, ...patch },
  })
  const movePositionFocus = (event: KeyboardEvent<HTMLButtonElement>, currentIndex: number) => {
    let nextIndex = currentIndex
    if (event.key === 'ArrowRight' || event.key === 'ArrowDown') nextIndex = (currentIndex + 1) % POSITION_OPTIONS.length
    else if (event.key === 'ArrowLeft' || event.key === 'ArrowUp') nextIndex = (currentIndex - 1 + POSITION_OPTIONS.length) % POSITION_OPTIONS.length
    else if (event.key === 'Home') nextIndex = 0
    else if (event.key === 'End') nextIndex = POSITION_OPTIONS.length - 1
    else return
    event.preventDefault()
    const next = POSITION_OPTIONS[nextIndex].value
    update({ signaturePosition: next })
    document.getElementById(`signature-position-${next}`)?.focus()
  }

  return <section aria-labelledby="creator-signature-title" className={`rounded-xl border border-sky-500/30 bg-sky-950/20 ${compact ? 'p-2' : 'p-3'}`} data-template-id="creator-signature" data-template-controls-tray="creator-signature">
    <div className={compact ? 'mb-2' : 'mb-3'}>
      <h3 id="creator-signature-title" className={`${compact ? 'text-sm' : 'text-base'} font-semibold text-white`}>Creator Signature</h3>
      {!compact && <p className="text-xs text-slate-400">Text stays outside the QR safe area.</p>}
    </div>
    <div className={`grid gap-2 ${compact ? 'grid-cols-1' : 'sm:grid-cols-2'}`}>
      {([
        { line: 1, text: line1Text, maxLength: 32, font: fields.line1Font ?? 'sans', size: fields.line1Size ?? 'medium', color: fields.line1Color ?? 'dark-ink' },
        { line: 2, text: line2Text, maxLength: 36, font: fields.line2Font ?? 'sans', size: fields.line2Size ?? 'medium', color: fields.line2Color ?? 'secondary' },
      ] as const).map(({ line, text, maxLength, font, size, color }) => <div key={line} className="grid gap-1">
        <label className="min-w-0 text-[11px] font-medium text-slate-400">Line {line}
          <input className={compact ? compactInputClass : inputClass} aria-label={`Line ${line}`} maxLength={maxLength} value={text}
            onChange={(event) => update(line === 1 ? { line1Text: event.target.value } : { line2Text: event.target.value })} placeholder={line === 1 ? 'Your signature' : '@handle'} />
        </label>
        <div className="grid grid-cols-3 gap-1.5">
          <label className="text-[10px] font-medium text-slate-500">Font
            <select className={compactSelectClass} aria-label={`Line ${line} font`} value={font}
              onChange={(event) => update(line === 1 ? { line1Font: event.target.value as CreatorSignatureFont } : { line2Font: event.target.value as CreatorSignatureFont })}>
              {CREATOR_SIGNATURE_FONTS.map((option) => <option key={option.value} value={option.value}>{option.label}</option>)}
            </select>
          </label>
          <label className="text-[10px] font-medium text-slate-500">Size
            <select className={compactSelectClass} aria-label={`Line ${line} size`} value={size}
              onChange={(event) => update(line === 1 ? { line1Size: event.target.value as CreatorSignatureFontSize } : { line2Size: event.target.value as CreatorSignatureFontSize })}>
              {CREATOR_SIGNATURE_FONT_SIZES.map((option) => <option key={option.value} value={option.value}>{option.label}</option>)}
            </select>
          </label>
          <label className="text-[10px] font-medium text-slate-500">Colour
            <select className={compactSelectClass} aria-label={`Line ${line} colour`} value={color}
              onChange={(event) => update(line === 1 ? { line1Color: event.target.value as CreatorSignatureColor } : { line2Color: event.target.value as CreatorSignatureColor })}>
              {CREATOR_SIGNATURE_COLORS.map((option) => <option key={option.value} value={option.value}>{option.label}</option>)}
            </select>
          </label>
        </div>
      </div>)}
    </div>
    <div className={`${compact ? 'mt-2' : 'mt-3'} grid grid-cols-[minmax(0,1fr)_auto] items-end gap-2`}>
      <fieldset>
        <legend className="sr-only">Fixed signature position</legend>
        <div className="grid h-9 grid-cols-5 gap-1" role="radiogroup" aria-label="Fixed signature position" data-signature-position-selector="icon-row">
          {POSITION_OPTIONS.map(({ value, label }, index) => {
            const selected = (fields.signaturePosition ?? 'bottom-right-outside') === value
            return <button key={value} id={`signature-position-${value}`} type="button" role="radio" aria-label={label} title={label} aria-checked={selected} tabIndex={selected ? 0 : -1}
              data-signature-position={value} data-icon-only="true" data-selected={selected ? 'true' : 'false'} onClick={() => update({ signaturePosition: value })} onKeyDown={(event) => movePositionFocus(event, index)}
              className={`relative flex h-8 min-w-0 items-center justify-center rounded-md border p-0 transition focus:outline-none focus-visible:ring-2 focus-visible:ring-white ${selected ? 'border-sky-400 bg-sky-500/25 text-sky-200 shadow-sm shadow-sky-500/20' : 'border-slate-700 bg-slate-950 text-slate-500 hover:border-slate-500 hover:text-slate-300'}`}>
              <PositionIcon position={value} />
              {selected && <span aria-hidden="true" className="absolute right-1 top-1 h-1.5 w-1.5 rounded-full bg-sky-300 ring-1 ring-slate-950" />}
            </button>
          })}
        </div>
      </fieldset>
      <label className="text-[10px] font-medium text-slate-500">Boundary offset
        <select className={compactSelectClass} aria-label="Signature boundary offset" value={fields.boundaryOffsetMm ?? 0}
          onChange={(event) => update({ boundaryOffsetMm: Number(event.target.value) as 0 | 1 | 2 | 3 })}>
          {CREATOR_SIGNATURE_OFFSETS.map((offset) => <option key={offset} value={offset}>{offset}mm</option>)}
        </select>
      </label>
    </div>
  </section>
}
