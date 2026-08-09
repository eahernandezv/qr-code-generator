import React from 'react'

type Treatment = 'Logo' | 'Pixel blend' | 'Background image' | 'Cutout-perforated'
type Strength = 'Readable' | 'Balanced' | 'Image-first'
type Detail = 'Simple' | 'Detailed' | 'Maximum'
type LinkMode = 'optimized' | 'original'

type EvidenceCandidate = {
  mode: Strength
  treatment: string
  image: string
  sha256: string
  candidateId: string
  version: number
  moduleCount: number
  ecc: 'Q' | 'H'
  mask: number
  modifiedModules: number
  actualFraction: string
  recommendation: string
  experimental: boolean
}

const treatments: Treatment[] = ['Logo', 'Pixel blend', 'Background image', 'Cutout-perforated']
const strengths: Strength[] = ['Readable', 'Balanced', 'Image-first']
const details: Detail[] = ['Simple', 'Detailed', 'Maximum']
const evidenceBase = '/level2-image-fit-qr/creator-visual-pass'

const candidates: EvidenceCandidate[] = [
  {
    mode: 'Readable', treatment: 'Background silhouette',
    image: `${evidenceBase}/bold-diamond__background-silhouette__v10-Q-m3-b8.png`,
    sha256: '282dc4cc5dcd074f338c9fe264ca99f268c9a566ff8f173fbe448a9842d84fe0',
    candidateId: 'bold-diamond__background-silhouette__v10-Q-m3-b8',
    version: 10, moduleCount: 57, ecc: 'Q', mask: 3, modifiedModules: 149, actualFraction: '5.38%',
    recommendation: 'Recognizable silhouette with no matrix-bit flips.', experimental: false,
  },
  {
    mode: 'Balanced', treatment: 'Module recolor',
    image: `${evidenceBase}/bold-diamond__module-recolor__v10-Q-m1-b8.png`,
    sha256: '6f9b0ba69475d860d3e22ad4e030e59e44b170c9ec3cdee4658f909c03f08940',
    candidateId: 'bold-diamond__module-recolor__v10-Q-m1-b8',
    version: 10, moduleCount: 57, ecc: 'Q', mask: 1, modifiedModules: 156, actualFraction: '5.64%',
    recommendation: 'Recommended balance of visual recognition and module integrity.', experimental: false,
  },
  {
    mode: 'Image-first', treatment: 'Central binary mutation',
    image: `${evidenceBase}/bold-diamond__central-logo-pixel__v10-Q-m0-b8.png`,
    sha256: '71263c9f5d6d12dcfd3457c6197f151a72e20b5206e75dd143f67cf6cc49f448',
    candidateId: 'bold-diamond__central-logo-pixel__v10-Q-m0-b8',
    version: 10, moduleCount: 57, ecc: 'Q', mask: 0, modifiedModules: 134, actualFraction: '4.84%',
    recommendation: 'Experimental destructive treatment; not export-ready.', experimental: true,
  },
]

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

export default function ImageFitQrConcept() {
  const [treatment, setTreatment] = React.useState<Treatment>('Pixel blend')
  const [strength, setStrength] = React.useState<Strength>('Balanced')
  const [detail, setDetail] = React.useState<Detail>('Detailed')
  const [linkMode, setLinkMode] = React.useState<LinkMode>('optimized')
  const [destination, setDestination] = React.useState('https://example.com/products/summer-collection?source=printed-menu')
  const [imageName, setImageName] = React.useState('Bold diamond evidence fixture')
  const [evidenceCurrent, setEvidenceCurrent] = React.useState(true)
  const hasFixtureEvidence = evidenceCurrent && imageName === 'Bold diamond evidence fixture'
  const selected = candidates.find((candidate) => candidate.mode === strength) ?? candidates[1]
  const selectEvidenceCandidate = (mode: Strength) => {
    setStrength(mode)
    setTreatment(mode === 'Readable' ? 'Background image' : mode === 'Balanced' ? 'Pixel blend' : 'Cutout-perforated')
    setLinkMode('optimized')
    setImageName('Bold diamond evidence fixture')
    setEvidenceCurrent(true)
  }

  return <main data-testid="image-fit-qr-concept" className="min-h-[100dvh] bg-[#070b16] text-white">
    <header className="border-b border-white/10 bg-slate-950/90 px-4 py-3">
      <div className="mx-auto flex max-w-6xl items-center justify-between gap-3">
        <div><p className="text-[10px] font-black uppercase tracking-[.2em] text-indigo-300">Level 2 concept</p><h1 className="text-base font-bold">Image-Fit QR</h1></div>
        <span className="rounded-full border border-amber-300/30 bg-amber-300/10 px-2.5 py-1 text-[10px] font-bold text-amber-200">Validated spike · not exportable</span>
      </div>
    </header>

    <div className="mx-auto grid max-w-6xl gap-3 p-3 lg:grid-cols-[minmax(0,.9fr)_minmax(360px,1.1fr)]">
      <section aria-label="Image-Fit QR preview" className="rounded-2xl border border-white/10 bg-slate-900/60 p-3 shadow-2xl shadow-black/30">
        <div className="relative mx-auto aspect-square max-w-[430px] overflow-hidden rounded-2xl border border-indigo-400/20 bg-slate-100 p-3">
          {hasFixtureEvidence
            ? <img data-testid="selected-image-fit-candidate" data-artifact-sha256={selected.sha256} src={selected.image} alt={`${selected.mode} ${selected.treatment} candidate`} className="h-full w-full rounded-xl object-contain" />
            : <div className="flex h-full items-center justify-center rounded-xl border border-dashed border-slate-400 bg-slate-200 px-8 text-center text-sm font-bold text-slate-600">Not generated yet</div>}
          <span className="absolute bottom-4 left-4 rounded-full bg-slate-950/85 px-2 py-1 text-[9px] font-bold text-slate-100">{hasFixtureEvidence ? `${selected.mode} · real spike artifact` : 'Awaiting optimizer'}</span>
        </div>
        <div className="mt-3 grid grid-cols-3 gap-2 text-center text-[10px]">
          <div className="rounded-xl border border-white/10 bg-black/20 p-2"><span className="block text-slate-500">Scan status</span><strong className="text-emerald-300">{hasFixtureEvidence ? 'Passed 8/8' : 'Not generated yet'}</strong></div>
          <div className="rounded-xl border border-white/10 bg-black/20 p-2"><span className="block text-slate-500">Density</span><strong>{hasFixtureEvidence ? `${selected.moduleCount} modules` : '—'}</strong></div>
          <div className="rounded-xl border border-white/10 bg-black/20 p-2"><span className="block text-slate-500">Image fit</span><strong className={selected.experimental ? 'text-amber-200' : 'text-indigo-200'}>{hasFixtureEvidence ? (selected.experimental ? 'Experimental' : selected.mode) : 'Awaiting optimizer'}</strong></div>
        </div>
        {hasFixtureEvidence && <details className="mt-2 rounded-xl border border-white/10 bg-slate-950/70 text-[10px] text-slate-300">
          <summary className="cursor-pointer px-3 py-2 font-bold text-slate-100 focus:outline-none focus-visible:ring-2 focus-visible:ring-indigo-300">Technical evidence · v{selected.version} · {selected.moduleCount} modules · ECC {selected.ecc} · mask {selected.mask}</summary>
          <dl className="grid grid-cols-2 gap-x-3 gap-y-1 border-t border-white/10 px-3 py-2"><dt className="text-slate-500">Treatment</dt><dd>{selected.treatment}</dd><dt className="text-slate-500">Changed modules</dt><dd>{selected.modifiedModules} ({selected.actualFraction})</dd><dt className="text-slate-500">Decoder</dt><dd>jsQR 1.4.0</dd><dt className="text-slate-500">Threshold</dt><dd>scan-v1-real-75pct</dd><dt className="text-slate-500">Physical scan</dt><dd>Not tested</dd></dl>
        </details>}
        <p className="mt-2 text-[9px] leading-relaxed text-slate-500">{hasFixtureEvidence ? 'Passed 8/8 controlled decoder checks. No physical-device or printed scan was performed. This is not a universal scan guarantee or production export approval.' : 'Not generated yet. Run the optimizer and controlled decoder checks before reviewing or exporting a candidate.'}</p>
      </section>

      <section aria-label="Image-Fit QR controls" className="grid content-start gap-2.5 rounded-2xl border border-white/10 bg-slate-900/65 p-3 shadow-2xl shadow-black/25">
        <div className="grid grid-cols-[1fr_auto] items-end gap-2 rounded-xl border border-white/10 bg-slate-950/60 p-2.5">
          <label className="min-w-0"><span className="mb-1 block text-[10px] font-black uppercase tracking-[.16em] text-slate-400">Target image</span><span className="block truncate text-xs text-slate-200">{imageName}</span></label>
          <label className="cursor-pointer rounded-lg border border-indigo-300/50 bg-indigo-500/20 px-3 py-2 text-[10px] font-bold text-indigo-100 focus-within:ring-2 focus-within:ring-indigo-300">Choose image<input aria-label="Choose target image" type="file" accept="image/png,image/jpeg,image/webp,image/svg+xml" className="sr-only" onChange={(event) => { setImageName(event.target.files?.[0]?.name ?? 'Bold diamond evidence fixture'); setEvidenceCurrent(false) }} /></label>
        </div>
        <label><span className="mb-1 block text-[10px] font-black uppercase tracking-[.16em] text-slate-400">Destination</span><input aria-label="Level 2 destination URL" value={destination} onChange={(event) => { setDestination(event.target.value); setEvidenceCurrent(false) }} className="h-10 w-full rounded-xl border border-white/10 bg-slate-950 px-3 text-xs text-slate-100 outline-none focus:border-indigo-300 focus:ring-2 focus:ring-indigo-300/20" /></label>
        <ChoiceRow label="Treatment" value={treatment} values={treatments} onChange={(value) => { setTreatment(value); setEvidenceCurrent(false) }} />
        <ChoiceRow label="Strength" value={strength} values={strengths} onChange={selectEvidenceCandidate} />
        <ChoiceRow label="Detail" value={detail} values={details} onChange={(value) => { setDetail(value); setEvidenceCurrent(false) }} />

        <fieldset><legend className="mb-1.5 text-[10px] font-black uppercase tracking-[.16em] text-slate-400">Link mode</legend><div className="grid grid-cols-2 gap-1 rounded-xl bg-slate-950 p-1">
          <button type="button" aria-pressed={linkMode === 'optimized'} onClick={() => setLinkMode('optimized')} className={`min-h-11 rounded-lg border px-2 text-left text-[10px] font-bold ${linkMode === 'optimized' ? 'border-indigo-300 bg-indigo-500/25 text-white' : 'border-white/10 text-slate-400'}`}><span className="block">Optimized short link</span><span className="font-medium text-indigo-200">Recommended</span></button>
          <button type="button" aria-pressed={linkMode === 'original'} onClick={() => { setLinkMode('original'); setEvidenceCurrent(false) }} className={`min-h-11 rounded-lg border px-2 text-left text-[10px] font-bold ${linkMode === 'original' ? 'border-indigo-300 bg-indigo-500/25 text-white' : 'border-white/10 text-slate-400'}`}><span className="block">Original URL</span><span className="font-medium text-slate-500">Advanced</span></button>
        </div></fieldset>
        {linkMode === 'optimized'
          ? <p className="rounded-xl border border-indigo-300/20 bg-indigo-500/10 px-3 py-2 text-[10px] leading-relaxed text-indigo-100">A shorter owned payload gives the optimizer more freedom to find a cleaner image-fit matrix. One committed project slug redirects directly to your validated destination.</p>
          : <p role="alert" className="rounded-xl border border-amber-300/30 bg-amber-300/10 px-3 py-2 text-[10px] leading-relaxed text-amber-100">Original URLs can increase QR density and reduce image clarity. Candidate evidence must compare both payloads before export.</p>}

        <section aria-label="Candidate evidence" className="grid grid-cols-3 gap-1.5">
          {candidates.map((candidate) => <button key={candidate.mode} type="button" aria-pressed={candidate.mode === strength} onClick={() => selectEvidenceCandidate(candidate.mode)} className={`min-w-0 rounded-xl border p-1.5 text-left focus:outline-none focus-visible:ring-2 focus-visible:ring-indigo-300 ${candidate.mode === strength ? 'border-indigo-300/70 bg-indigo-500/15' : 'border-white/10 bg-slate-950/55'}`}>
            <div className="mb-1.5 overflow-hidden rounded-lg bg-white p-0.5"><img src={candidate.image} alt={`${candidate.mode} candidate thumbnail`} className="aspect-square w-full object-contain" /></div>
            <span className="block truncate text-[9px] font-bold">{candidate.mode}</span>
            <span className="block truncate text-[8px] text-slate-400">{candidate.treatment}</span>
            <span className="mt-1 block text-[8px] font-bold text-emerald-300">8/8 checks</span>
          </button>)}
        </section>
        <p className={`rounded-lg border px-2.5 py-2 text-[9px] leading-snug ${selected.experimental ? 'border-amber-300/20 bg-amber-300/10 text-amber-100' : 'border-white/10 bg-slate-950/55 text-slate-300'}`}>{selected.recommendation}</p>
      </section>
    </div>
  </main>
}
