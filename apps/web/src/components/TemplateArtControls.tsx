import { useStudioStore } from '../store'
import type { CreatorSignatureTemplateFields } from '../types'
import { CREATOR_SIGNATURE_POSITIONS, DEFAULT_CREATOR_SIGNATURE } from '../lib/creatorSignature'

const inputClass = 'w-full rounded-lg border border-slate-700 bg-slate-950 px-3 py-2 text-sm text-slate-100 outline-none placeholder:text-slate-600 focus:border-studio-500 focus:ring-2 focus:ring-studio-500/30'

export default function TemplateArtControls() {
  const { project, setTemplateArt } = useStudioStore()
  const spec = project.templateArt ?? DEFAULT_CREATOR_SIGNATURE
  const fields = spec.fields
  const update = (patch: Partial<CreatorSignatureTemplateFields>) => setTemplateArt({
    templateId: 'creator-signature',
    outputIntent: 'square-card',
    fields: { ...fields, ...patch },
  })

  return <section aria-labelledby="creator-signature-title" className="rounded-xl border border-sky-500/30 bg-sky-950/20 p-3" data-template-id="creator-signature">
    <div className="mb-3 flex items-start justify-between gap-3">
      <div>
        <p className="text-[10px] font-bold uppercase tracking-[.18em] text-sky-400">Level 2 · Template Art</p>
        <h3 id="creator-signature-title" className="text-base font-semibold text-white">Creator Signature</h3>
        <p className="text-xs text-slate-400">One designed layout system. Text stays outside the QR safe area.</p>
      </div>
      <span className="shrink-0 rounded-full bg-emerald-950 px-2 py-1 text-[10px] font-bold text-emerald-300">ONLY TEMPLATE</span>
    </div>
    <div className="grid gap-2 sm:grid-cols-3">
      <label className="text-[11px] font-medium text-slate-400">Signature text
        <input className={inputClass} aria-label="Signature text" maxLength={32} value={fields.signatureText ?? ''} onChange={(event) => update({ signatureText: event.target.value })} placeholder="Your signature" />
      </label>
      <label className="text-[11px] font-medium text-slate-400">Handle / subtitle
        <input className={inputClass} aria-label="Handle or subtitle" maxLength={36} value={fields.handleText ?? ''} onChange={(event) => update({ handleText: event.target.value })} placeholder="@handle" />
      </label>
      <label className="text-[11px] font-medium text-slate-400">CTA text
        <input className={inputClass} aria-label="CTA text" maxLength={28} value={fields.ctaText ?? ''} onChange={(event) => update({ ctaText: event.target.value })} placeholder="Scan to connect" />
      </label>
    </div>
    <fieldset className="mt-3">
      <legend className="mb-1 text-[11px] font-medium text-slate-400">Fixed signature position</legend>
      <div className="grid grid-cols-2 gap-1.5 sm:grid-cols-5" role="radiogroup" aria-label="Fixed signature position">
        {CREATOR_SIGNATURE_POSITIONS.map(({ value, label }) => {
          const selected = (fields.signaturePosition ?? 'bottom-right-outside') === value
          return <button key={value} type="button" role="radio" aria-checked={selected} data-signature-position={value} onClick={() => update({ signaturePosition: value })}
            className={`min-h-10 rounded-lg border px-2 py-1.5 text-[11px] font-semibold focus:outline-none focus-visible:ring-2 focus-visible:ring-white ${selected ? 'border-sky-400 bg-sky-500/20 text-sky-100' : 'border-slate-700 bg-slate-950 text-slate-400 hover:border-slate-500'}`}>
            {label}
          </button>
        })}
      </div>
    </fieldset>
  </section>
}
