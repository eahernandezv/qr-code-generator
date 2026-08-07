import type { KeyboardEvent, ReactNode } from 'react'
import { useStudioStore } from '../store'
import type {
  CreatorSignatureColor,
  CreatorSignaturePosition,
  CreatorSignatureTemplateFields,
} from '../types'
import {
  CREATOR_SIGNATURE_COLORS,
  CREATOR_SIGNATURE_FONTS,
  CREATOR_SIGNATURE_FONT_SIZES,
  CREATOR_SIGNATURE_OFFSETS,
  CREATOR_SIGNATURE_POSITIONS,
  DEFAULT_CREATOR_SIGNATURE,
} from '../lib/creatorSignature'

const POSITION_ORDER: ReadonlyArray<CreatorSignaturePosition> = [
  'bottom-left-outside',
  'bottom-right-outside',
  'below-centered',
  'top-left-corner',
  'top-right-corner',
]

const POSITION_LINES: Record<CreatorSignaturePosition, { x1: number; x2: number; y: number }> = {
  'bottom-left-outside': { x1: 3, x2: 10, y: 21 },
  'bottom-right-outside': { x1: 14, x2: 21, y: 21 },
  'below-centered': { x1: 8.5, x2: 15.5, y: 21 },
  'top-left-corner': { x1: 3, x2: 10, y: 3 },
  'top-right-corner': { x1: 14, x2: 21, y: 3 },
}

const COLOR_SWATCHES: Record<CreatorSignatureColor, string> = {
  primary: '#5162da',
  secondary: '#a5bdff',
  accent: '#f59e0b',
  'dark-ink': '#18213a',
}

const FONT_VALUES = CREATOR_SIGNATURE_FONTS.map(({ value }) => value)
const SIZE_VALUES = CREATOR_SIGNATURE_FONT_SIZES.map(({ value }) => value)
const COLOR_VALUES = CREATOR_SIGNATURE_COLORS.map(({ value }) => value)

function PositionIcon({ position }: { position: CreatorSignaturePosition }) {
  const line = POSITION_LINES[position]
  return <svg aria-hidden="true" viewBox="0 0 24 24" className="h-7 w-7" fill="none">
    <rect x="5" y="5" width="14" height="14" rx="2" stroke="currentColor" strokeWidth="1.3" opacity=".7" />
    <path d="M8 8h3v3H8zm5 0h3v3h-3zm-5 5h3v3H8zm5 0h3v3h-1.5v-1.5H13z" fill="currentColor" opacity=".9" />
    <line x1={line.x1} y1={line.y} x2={line.x2} y2={line.y} stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" />
  </svg>
}

function Choice({
  selected,
  label,
  children,
  onClick,
  onKeyDown,
  testId,
  id,
}: {
  selected: boolean
  label: string
  children: ReactNode
  onClick: () => void
  onKeyDown?: (event: KeyboardEvent<HTMLButtonElement>) => void
  testId?: string
  id?: string
}) {
  return <button
    id={id}
    type="button"
    role="radio"
    aria-label={label}
    aria-checked={selected}
    tabIndex={selected ? 0 : -1}
    title={label}
    data-selected={selected ? 'true' : 'false'}
    data-testid={testId}
    onClick={onClick}
    onKeyDown={onKeyDown}
    className={`relative flex h-11 min-w-0 items-center justify-center rounded-xl border transition duration-150 focus:outline-none focus-visible:ring-2 focus-visible:ring-cyan-300 ${selected
      ? 'border-cyan-300 bg-cyan-400/15 text-cyan-100 shadow-[0_0_0_1px_rgba(103,232,249,.2),0_8px_22px_rgba(8,145,178,.18)]'
      : 'border-slate-700/80 bg-slate-950/80 text-slate-500 hover:border-slate-500 hover:text-slate-300'}`}
  >
    {children}
    {selected && <span aria-hidden="true" className="absolute right-1.5 top-1.5 h-1.5 w-1.5 rounded-full bg-cyan-300 shadow-[0_0_7px_rgba(103,232,249,.9)]" />}
  </button>
}

function moveRadioFocus<T extends string | number>(
  event: KeyboardEvent<HTMLButtonElement>,
  values: readonly T[],
  current: T,
  select: (value: T) => void,
  idPrefix: string,
) {
  const currentIndex = values.indexOf(current)
  let nextIndex = currentIndex
  if (event.key === 'ArrowRight' || event.key === 'ArrowDown') nextIndex = (currentIndex + 1) % values.length
  else if (event.key === 'ArrowLeft' || event.key === 'ArrowUp') nextIndex = (currentIndex - 1 + values.length) % values.length
  else if (event.key === 'Home') nextIndex = 0
  else if (event.key === 'End') nextIndex = values.length - 1
  else return
  event.preventDefault()
  const next = values[nextIndex]
  select(next)
  document.getElementById(`${idPrefix}-${next}`)?.focus()
}

export default function CreatorSignatureConceptControls() {
  const { project, setTemplateArt } = useStudioStore()
  const fields = (project.templateArt ?? DEFAULT_CREATOR_SIGNATURE).fields
  const update = (patch: Partial<CreatorSignatureTemplateFields>) => setTemplateArt({
    templateId: 'creator-signature',
    outputIntent: 'square-card',
    fields: { ...fields, ...patch },
  })
  const position = fields.signaturePosition ?? 'bottom-right-outside'
  const offset = fields.boundaryOffsetMm ?? 0

  const lineRows = [
    {
      line: 1 as const,
      text: fields.line1Text ?? fields.signatureText ?? '',
      placeholder: 'Your signature',
      maxLength: 32,
      font: fields.line1Font ?? 'sans',
      size: fields.line1Size ?? 'medium',
      color: fields.line1Color ?? 'dark-ink',
    },
    {
      line: 2 as const,
      text: fields.line2Text ?? fields.handleText ?? '',
      placeholder: '@handle',
      maxLength: 36,
      font: fields.line2Font ?? 'sans',
      size: fields.line2Size ?? 'medium',
      color: fields.line2Color ?? 'secondary',
    },
  ]

  return <section
    aria-labelledby="creator-signature-concept-title"
    data-creator-signature-concept="studio"
    className="overflow-hidden rounded-2xl border border-slate-700/70 bg-[radial-gradient(circle_at_top_right,rgba(8,145,178,.13),transparent_38%),linear-gradient(145deg,rgba(15,23,42,.98),rgba(2,6,23,.98))] p-2.5 shadow-2xl shadow-black/30"
  >
    <h3 id="creator-signature-concept-title" className="sr-only">Creator Signature</h3>

    <div className="grid grid-cols-2 gap-1.5 sm:gap-2">
      {lineRows.map(({ line, text, placeholder, maxLength, font, size, color }) => {
        const setLine = (patch: Partial<CreatorSignatureTemplateFields>) => update(patch)
        return <fieldset key={line} aria-label={`Signature line ${line}`} className="rounded-2xl border border-slate-800 bg-slate-950/55 p-2">
          <legend className="sr-only">Signature line {line}</legend>
          <input
            aria-label={`Line ${line}`}
            maxLength={maxLength}
            value={text}
            placeholder={placeholder}
            onChange={(event) => setLine(line === 1 ? { line1Text: event.target.value } : { line2Text: event.target.value })}
            className="mb-2 h-11 w-full rounded-xl border border-slate-700 bg-slate-900/90 px-3 text-sm font-semibold text-white outline-none placeholder:text-slate-600 focus:border-cyan-300 focus:ring-2 focus:ring-cyan-300/20"
          />

          <div className="grid gap-1">
            <div role="radiogroup" aria-label={`Line ${line} font`} className="grid grid-cols-3 gap-1">
              {CREATOR_SIGNATURE_FONTS.map((option) => {
                const selected = font === option.value
                const glyph = option.value === 'sans' ? 'A' : option.value === 'serif' ? 'A' : 'M'
                return <span key={option.value} className="contents">
                  <Choice
                    id={`concept-line-${line}-font-${option.value}`}
                    selected={selected}
                    label={option.label}
                    onClick={() => setLine(line === 1 ? { line1Font: option.value } : { line2Font: option.value })}
                    onKeyDown={(event) => moveRadioFocus(event, FONT_VALUES, font, (next) => setLine(line === 1 ? { line1Font: next } : { line2Font: next }), `concept-line-${line}-font`)}
                  >
                    <span aria-hidden="true" className={`text-sm ${option.value === 'serif' ? 'font-serif' : option.value === 'mono' ? 'font-mono' : 'font-sans'}`}>{glyph}</span>
                  </Choice>
                </span>
              })}
            </div>
            <div role="radiogroup" aria-label={`Line ${line} size`} className="grid grid-cols-3 gap-1">
              {CREATOR_SIGNATURE_FONT_SIZES.map((option, index) => <Choice
                key={option.value}
                id={`concept-line-${line}-size-${option.value}`}
                selected={size === option.value}
                label={option.label}
                onClick={() => setLine(line === 1 ? { line1Size: option.value } : { line2Size: option.value })}
                onKeyDown={(event) => moveRadioFocus(event, SIZE_VALUES, size, (next) => setLine(line === 1 ? { line1Size: next } : { line2Size: next }), `concept-line-${line}-size`)}
              >
                <span aria-hidden="true" className="rounded-full bg-current" style={{ width: 5 + index * 3, height: 5 + index * 3 }} />
              </Choice>)}
            </div>
            <div role="radiogroup" aria-label={`Line ${line} colour`} className="grid grid-cols-4 gap-1">
              {CREATOR_SIGNATURE_COLORS.map((option) => <Choice
                key={option.value}
                id={`concept-line-${line}-colour-${option.value}`}
                selected={color === option.value}
                label={option.label}
                onClick={() => setLine(line === 1 ? { line1Color: option.value } : { line2Color: option.value })}
                onKeyDown={(event) => moveRadioFocus(event, COLOR_VALUES, color, (next) => setLine(line === 1 ? { line1Color: next } : { line2Color: next }), `concept-line-${line}-colour`)}
              >
                <span aria-hidden="true" className="h-4 w-4 rounded-full ring-1 ring-white/25" style={{ background: COLOR_SWATCHES[option.value] }} />
              </Choice>)}
            </div>
          </div>
        </fieldset>
      })}
    </div>

    <div className="mt-2 grid grid-cols-1 gap-1.5 sm:grid-cols-[minmax(0,1fr)_auto] sm:gap-2">
      <div role="radiogroup" aria-label="Fixed signature position" className="grid grid-cols-5 gap-1.5 rounded-2xl border border-slate-800 bg-slate-950/55 p-1.5">
        {POSITION_ORDER.map((value) => {
          const label = CREATOR_SIGNATURE_POSITIONS.find((option) => option.value === value)!.label
          return <span key={value} className="contents">
            <Choice
              id={`concept-position-${value}`}
              selected={position === value}
              label={label}
              onClick={() => update({ signaturePosition: value })}
              onKeyDown={(event) => moveRadioFocus(event, POSITION_ORDER, position, (next) => update({ signaturePosition: next }), 'concept-position')}
            ><PositionIcon position={value} /></Choice>
          </span>
        })}
      </div>
      <div role="radiogroup" aria-label="Signature boundary offset" className="grid grid-cols-4 gap-1 rounded-2xl border border-slate-800 bg-slate-950/55 p-1.5 sm:w-56">
        {CREATOR_SIGNATURE_OFFSETS.map((value) => <span key={value} className="contents">
          <Choice
            id={`concept-offset-${value}`}
            selected={offset === value}
            label={`${value}mm`}
            onClick={() => update({ boundaryOffsetMm: value })}
            onKeyDown={(event) => moveRadioFocus(event, CREATOR_SIGNATURE_OFFSETS, offset, (next) => update({ boundaryOffsetMm: next }), 'concept-offset')}
          ><span aria-hidden="true" className="text-[10px] font-black tracking-tight">{value}<span className="text-[7px] text-slate-500">mm</span></span></Choice>
        </span>)}
      </div>
    </div>
  </section>
}
