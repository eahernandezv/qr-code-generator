import React from 'react'

type Treatment = 'Logo' | 'Pixel blend' | 'Background image' | 'Cutout-perforated'
type Strength = 'Readable' | 'Balanced' | 'Image-first'
type Detail = 'Simple' | 'Detailed' | 'Maximum'
type LinkMode = 'optimized' | 'original'

const treatments: Treatment[] = ['Logo', 'Pixel blend', 'Background image', 'Cutout-perforated']
const strengths: Strength[] = ['Readable', 'Balanced', 'Image-first']
const details: Detail[] = ['Simple', 'Detailed', 'Maximum']

function ChoiceRow<T extends string>({ label, value, values, onChange }: { label: string; value: T; values: readonly T[]; onChange: (value: T) => void }) {
  return <fieldset>
    <legend className="mb-1.5 text-[10px] font-black uppercase tracking-[.16em] text-slate-400">{label}</legend>
    <div className={`grid gap-1 rounded-xl bg-slate-950 p-1 ${values.length === 4 ? 'grid-cols-4' : 'grid-cols-3'}`}>
      {values.map((option) => {
        const selected = option === value
        return <button key={option} type="button" aria-pressed={selected} onClick={() => onChange(option)}
          className={`min-h-10 rounded-lg border px-1.5 text-[10px] font-bold leading-tight transition focus:outline-none focus-visible:ring-2 focus-visible:ring-indigo-300 ${selected ? 'border-indigo-300 bg-indigo-500/25 text-white shadow-[0_0_0_1px_rgba(165,180,252,.25)]' : 'border-white/10 bg-white/[.035] text-slate-400 hover:text-slate-100'}`}>{option}</button>
      })}
    </div>
  </fieldset>
}

const candidateModes: Strength[] = ['Readable', 'Balanced', 'Image-first']

export default function ImageFitQrConcept() {
  const [treatment, setTreatment] = React.useState<Treatment>('Pixel blend')
  const [strength, setStrength] = React.useState<Strength>('Balanced')
  const [detail, setDetail] = React.useState<Detail>('Detailed')
  const [linkMode, setLinkMode] = React.useState<LinkMode>('optimized')
  const [destination, setDestination] = React.useState('https://example.com/products/summer-collection?source=printed-menu')
  const [imageName, setImageName] = React.useState('No image selected')

  return <main data-testid="image-fit-qr-concept" className="min-h-[100dvh] bg-[#070b16] text-white">
    <header className="border-b border-white/10 bg-slate-950/90 px-4 py-3">
      <div className="mx-auto flex max-w-6xl items-center justify-between gap-3">
        <div><p className="text-[10px] font-black uppercase tracking-[.2em] text-indigo-300">Level 2 concept</p><h1 className="text-base font-bold">Image-Fit QR</h1></div>
        <span className="rounded-full border border-amber-300/30 bg-amber-300/10 px-2.5 py-1 text-[10px] font-bold text-amber-200">Spike · not exportable</span>
      </div>
    </header>

    <div className="mx-auto grid max-w-6xl gap-3 p-3 lg:grid-cols-[minmax(0,.9fr)_minmax(360px,1.1fr)]">
      <section aria-label="Image-Fit QR preview" className="rounded-2xl border border-white/10 bg-slate-900/60 p-3 shadow-2xl shadow-black/30">
        <div className="relative mx-auto aspect-square max-w-[430px] overflow-hidden rounded-2xl border border-indigo-400/20 bg-[radial-gradient(circle_at_center,rgba(99,102,241,.26),transparent_42%),linear-gradient(135deg,#f8fafc,#dbeafe)] p-8">
          <div aria-hidden="true" className="grid h-full w-full grid-cols-9 gap-[3px] rounded-xl bg-white/80 p-5 shadow-xl">
            {Array.from({ length: 81 }, (_, index) => <span key={index} className={`rounded-[2px] ${index % 7 === 0 || index % 11 < 4 ? 'bg-slate-950' : index % 3 === 0 ? 'bg-indigo-600/80' : 'bg-transparent'}`} />)}
          </div>
          <div className="absolute inset-0 flex items-center justify-center"><div className="flex h-24 w-24 items-center justify-center rounded-3xl border-4 border-white/80 bg-indigo-600/90 text-4xl font-black shadow-2xl">IF</div></div>
          <span className="absolute bottom-3 left-3 rounded-full bg-slate-950/80 px-2 py-1 text-[9px] font-bold text-slate-200">Illustrative matrix only</span>
        </div>
        <div className="mt-3 grid grid-cols-3 gap-2 text-center text-[10px]">
          <div className="rounded-xl border border-white/10 bg-black/20 p-2"><span className="block text-slate-500">Scan</span><strong className="text-amber-200">Not run</strong></div>
          <div className="rounded-xl border border-white/10 bg-black/20 p-2"><span className="block text-slate-500">Density</span><strong>— modules</strong></div>
          <div className="rounded-xl border border-white/10 bg-black/20 p-2"><span className="block text-slate-500">Image fit</span><strong className="text-indigo-200">Awaiting optimizer</strong></div>
        </div>
      </section>

      <section aria-label="Image-Fit QR controls" className="grid content-start gap-2.5 rounded-2xl border border-white/10 bg-slate-900/65 p-3 shadow-2xl shadow-black/25">
        <div className="grid grid-cols-[1fr_auto] items-end gap-2 rounded-xl border border-white/10 bg-slate-950/60 p-2.5">
          <label className="min-w-0"><span className="mb-1 block text-[10px] font-black uppercase tracking-[.16em] text-slate-400">Target image</span><span className="block truncate text-xs text-slate-200">{imageName}</span></label>
          <label className="cursor-pointer rounded-lg border border-indigo-300/50 bg-indigo-500/20 px-3 py-2 text-[10px] font-bold text-indigo-100 focus-within:ring-2 focus-within:ring-indigo-300">Choose image<input aria-label="Choose target image" type="file" accept="image/png,image/jpeg,image/webp,image/svg+xml" className="sr-only" onChange={(event) => setImageName(event.target.files?.[0]?.name ?? 'No image selected')} /></label>
        </div>

        <label><span className="mb-1 block text-[10px] font-black uppercase tracking-[.16em] text-slate-400">Destination</span><input aria-label="Level 2 destination URL" value={destination} onChange={(event) => setDestination(event.target.value)} className="h-10 w-full rounded-xl border border-white/10 bg-slate-950 px-3 text-xs text-slate-100 outline-none focus:border-indigo-300 focus:ring-2 focus:ring-indigo-300/20" /></label>

        <ChoiceRow label="Treatment" value={treatment} values={treatments} onChange={setTreatment} />
        <ChoiceRow label="Strength" value={strength} values={strengths} onChange={setStrength} />
        <ChoiceRow label="Detail" value={detail} values={details} onChange={setDetail} />

        <fieldset>
          <legend className="mb-1.5 text-[10px] font-black uppercase tracking-[.16em] text-slate-400">Link mode</legend>
          <div className="grid grid-cols-2 gap-1 rounded-xl bg-slate-950 p-1">
            <button type="button" aria-pressed={linkMode === 'optimized'} onClick={() => setLinkMode('optimized')} className={`min-h-11 rounded-lg border px-2 text-left text-[10px] font-bold ${linkMode === 'optimized' ? 'border-indigo-300 bg-indigo-500/25 text-white' : 'border-white/10 text-slate-400'}`}><span className="block">Optimized short link</span><span className="font-medium text-indigo-200">Recommended</span></button>
            <button type="button" aria-pressed={linkMode === 'original'} onClick={() => setLinkMode('original')} className={`min-h-11 rounded-lg border px-2 text-left text-[10px] font-bold ${linkMode === 'original' ? 'border-indigo-300 bg-indigo-500/25 text-white' : 'border-white/10 text-slate-400'}`}><span className="block">Original URL</span><span className="font-medium text-slate-500">Advanced</span></button>
          </div>
        </fieldset>
        {linkMode === 'optimized'
          ? <p className="rounded-xl border border-indigo-300/20 bg-indigo-500/10 px-3 py-2 text-[10px] leading-relaxed text-indigo-100">A shorter owned payload gives the optimizer more freedom to find a cleaner image-fit matrix. One committed project slug redirects directly to your validated destination.</p>
          : <p role="alert" className="rounded-xl border border-amber-300/30 bg-amber-300/10 px-3 py-2 text-[10px] leading-relaxed text-amber-100">Original URLs can increase QR density and reduce image clarity. Candidate evidence must compare both payloads before export.</p>}

        <section aria-label="Candidate evidence preview" className="grid gap-1.5 sm:grid-cols-3">
          {candidateModes.map((mode) => <article key={mode} className={`rounded-xl border p-2 ${mode === strength ? 'border-indigo-300/70 bg-indigo-500/15' : 'border-white/10 bg-slate-950/55'}`}>
            <div className="flex items-center justify-between gap-1"><h2 className="text-[11px] font-bold">{mode}</h2>{mode === 'Balanced' && <span className="rounded-full bg-indigo-400/20 px-1.5 py-0.5 text-[8px] font-black text-indigo-200">RECOMMENDED</span>}</div>
            <dl className="mt-2 space-y-1 text-[9px]"><div className="flex justify-between gap-2"><dt className="text-slate-500">Scan</dt><dd className="text-amber-200">Not run</dd></div><div className="flex justify-between gap-2"><dt className="text-slate-500">Density</dt><dd>— modules</dd></div><div className="flex justify-between gap-2"><dt className="text-slate-500">Fit</dt><dd>Awaiting Creator</dd></div></dl>
          </article>)}
        </section>
        <p className="text-[9px] leading-relaxed text-slate-500">Controlled decoder evidence is required before any candidate can be called scan-safe. This spike does not claim universal device or print reliability.</p>
      </section>
    </div>
  </main>
}
