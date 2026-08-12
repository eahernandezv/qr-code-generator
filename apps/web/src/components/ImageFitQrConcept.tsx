import React from 'react'
import {
  IMAGE_FIT_CONTRACT,
  type ImageFitDetail,
  type ImageFitLinkMode,
  type ImageFitStrength,
  type ImageFitTreatment,
} from '../imageFitContract'

type EvidenceCandidate = {
  mode: ImageFitStrength
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

const labels: Record<string, string> = {
  logo: 'Logo', pixel_blend: 'Pixel blend', background_image: 'Background image', cutout_perforated: 'Cutout-perforated',
  readable: 'Readable', balanced: 'Balanced', image_first: 'Image-first',
  simple: 'Simple', detailed: 'Detailed', maximum: 'Maximum',
}
const evidenceBase = '/level2-image-fit-qr/creator-visual-pass'
const fixture = IMAGE_FIT_CONTRACT
const fixtureCandidate = fixture.balancedCandidate

const candidates: EvidenceCandidate[] = [
  {
    mode: fixtureCandidate.mode, treatment: 'Module recolor',
    image: `${evidenceBase}/bold-diamond__module-recolor__v10-Q-m1-b8.png`,
    sha256: fixtureCandidate.artifacts[0].sha256,
    candidateId: fixtureCandidate.candidate_id,
    version: fixtureCandidate.qr_settings.version,
    moduleCount: fixtureCandidate.qr_settings.module_count,
    ecc: fixtureCandidate.qr_settings.ecc as 'Q' | 'H',
    mask: fixtureCandidate.qr_settings.mask,
    modifiedModules: fixtureCandidate.image_treatment.modified_modules,
    actualFraction: `${(fixtureCandidate.image_treatment.modified_fraction * 100).toFixed(2)}%`,
    recommendation: 'Fixture-backed Balanced preview. Export remains blocked.', experimental: false,
  },
]

function ChoiceRow<T extends string>({ label, value, values, onChange }: { label: string; value: T; values: readonly T[]; onChange: (value: T) => void }) {
  return <fieldset>
    <legend className="mb-1.5 text-[10px] font-black uppercase tracking-[.16em] text-slate-400">{label}</legend>
    <div className={`grid gap-1 rounded-xl bg-slate-950 p-1 ${values.length === 4 ? 'grid-cols-4' : 'grid-cols-3'}`}>
      {values.map((option) => {
        const selected = option === value
        return <button key={option} type="button" aria-pressed={selected} onClick={() => onChange(option)}
          className={`min-h-10 rounded-lg border px-1.5 text-[10px] font-bold leading-tight transition focus:outline-none focus-visible:ring-2 focus-visible:ring-indigo-300 ${selected ? 'border-indigo-300 bg-indigo-500/25 text-white shadow-[0_0_0_1px_rgba(165,180,252,.25)]' : 'border-white/10 bg-white/[.035] text-slate-400 hover:text-slate-100'}`}>{labels[option] ?? option}</button>
      })}
    </div>
  </fieldset>
}

export default function ImageFitQrConcept() {
  const request = fixture.request
  const [treatment, setTreatment] = React.useState<ImageFitTreatment>(request.user_controls.treatment)
  const [strength, setStrength] = React.useState<ImageFitStrength>(request.user_controls.strength)
  const [detail, setDetail] = React.useState<ImageFitDetail>(request.user_controls.detail)
  const [linkMode, setLinkMode] = React.useState<ImageFitLinkMode>(request.user_controls.link_mode)
  const [destination, setDestination] = React.useState(request.destination.normalized_url)
  const [imageName, setImageName] = React.useState(request.target_image.image_ref)
  const [evidenceCurrent, setEvidenceCurrent] = React.useState(true)
  const selected = candidates[0]
  const invalidateEvidence = () => setEvidenceCurrent(false)
  const resetFixture = () => {
    setTreatment(request.user_controls.treatment)
    setStrength(request.user_controls.strength)
    setDetail(request.user_controls.detail)
    setLinkMode(request.user_controls.link_mode)
    setDestination(request.destination.normalized_url)
    setImageName(request.target_image.image_ref)
    setEvidenceCurrent(true)
  }
  const checksPassed = fixtureCandidate.scan_evidence.checks_passed
  const checksTotal = fixtureCandidate.scan_evidence.checks_total

  return <main data-testid="image-fit-qr-concept" data-schema-version={fixture.schemaVersion} data-export-payload-bound="false" className="min-h-[100dvh] bg-[#070b16] text-white">
    <header className="border-b border-white/10 bg-slate-950/90 px-4 py-3">
      <div className="mx-auto flex max-w-6xl items-center justify-between gap-3">
        <div><p className="text-[10px] font-black uppercase tracking-[.2em] text-indigo-300">Level 2 isolated concept</p><h1 className="text-base font-bold">Image-Fit QR</h1></div>
        <span className="rounded-full border border-amber-300/30 bg-amber-300/10 px-2.5 py-1 text-[10px] font-bold text-amber-200">One validated fixture · generation locked</span>
      </div>
    </header>

    <div className="mx-auto grid max-w-6xl gap-3 p-3 lg:grid-cols-[minmax(0,.9fr)_minmax(360px,1.1fr)]">
      <section aria-label="Level 2 test boundary" className="lg:col-span-2 rounded-2xl border border-indigo-300/20 bg-indigo-500/10 px-3 py-2 text-[10px] leading-relaxed text-indigo-100">
        <strong className="text-white">What you can test now:</strong> this page shows one server-validated fixture only. Editing controls hides that fixture because live Level 2 generation is not enabled yet. Use <span className="font-bold text-white">Reset to validated fixture</span> to restore the proven output.
      </section>
      <section aria-label="Image-Fit QR preview" className="rounded-2xl border border-white/10 bg-slate-900/60 p-3 shadow-2xl shadow-black/30">
        <div className="relative mx-auto aspect-square max-w-[430px] overflow-hidden rounded-2xl border border-indigo-400/20 bg-slate-100 p-3">
          {evidenceCurrent
            ? <img data-testid="selected-image-fit-candidate" data-artifact-sha256={selected.sha256} data-candidate-id={selected.candidateId} src={selected.image} alt={`${labels[selected.mode]} ${selected.treatment} candidate`} className="h-full w-full rounded-xl object-contain" />
            : <div className="flex h-full items-center justify-center rounded-xl border border-dashed border-slate-400 bg-slate-200 px-8 text-center text-sm font-bold text-slate-600">Generation locked · reset to view fixture</div>}
          <span className="absolute bottom-4 left-4 rounded-full bg-slate-950/85 px-2 py-1 text-[9px] font-bold text-slate-100">{evidenceCurrent ? `${labels[selected.mode]} · fixture evidence` : 'Evidence invalidated'}</span>
        </div>
        <div className="mt-3 grid grid-cols-3 gap-2 text-center text-[10px]">
          <div className="rounded-xl border border-white/10 bg-black/20 p-2"><span className="block text-slate-500">Scan status</span><strong className={evidenceCurrent ? 'text-emerald-300' : 'text-slate-300'}>{evidenceCurrent ? `Passed ${checksPassed}/${checksTotal}` : 'Fixture hidden'}</strong></div>
          <div className="rounded-xl border border-white/10 bg-black/20 p-2"><span className="block text-slate-500">Density</span><strong>{evidenceCurrent ? `${selected.moduleCount} modules` : '—'}</strong></div>
          <div className="rounded-xl border border-white/10 bg-black/20 p-2"><span className="block text-slate-500">Image fit</span><strong className={selected.experimental ? 'text-amber-200' : 'text-indigo-200'}>{evidenceCurrent ? (selected.experimental ? 'Experimental' : labels[selected.mode]) : 'Not evaluated'}</strong></div>
        </div>
        {evidenceCurrent && <details className="mt-2 rounded-xl border border-white/10 bg-slate-950/70 text-[10px] text-slate-300">
          <summary className="cursor-pointer px-3 py-2 font-bold text-slate-100 focus:outline-none focus-visible:ring-2 focus-visible:ring-indigo-300">Technical evidence · v{selected.version} · {selected.moduleCount} modules · ECC {selected.ecc} · mask {selected.mask}</summary>
          <dl className="grid grid-cols-2 gap-x-3 gap-y-1 border-t border-white/10 px-3 py-2"><dt className="text-slate-500">Treatment</dt><dd>{selected.treatment}</dd><dt className="text-slate-500">Changed modules</dt><dd>{selected.modifiedModules} ({selected.actualFraction})</dd><dt className="text-slate-500">Decoder</dt><dd>{fixtureCandidate.scan_evidence.decoders[0].name} {fixtureCandidate.scan_evidence.decoders[0].version}</dd><dt className="text-slate-500">Threshold</dt><dd>{fixtureCandidate.scan_evidence.decoder_suite_version}</dd><dt className="text-slate-500">Physical / print</dt><dd>Not tested</dd></dl>
        </details>}
        <p className="mt-2 text-[9px] leading-relaxed text-slate-500">{evidenceCurrent ? `Passed ${checksPassed}/${checksTotal} controlled decoder checks. Physical-device and print scans were not performed. ${fixtureCandidate.scan_evidence.disclaimer}` : 'Inputs changed. Previous fixture evidence is hidden; live generation is not enabled on this concept route. Reset to the validated fixture to view the proven output again.'}</p>
        <div role="status" className="mt-2 rounded-xl border border-amber-300/25 bg-amber-300/10 px-3 py-2 text-[10px] leading-relaxed text-amber-100">
          Export unavailable. This preview is unpaid, its short link is reserved—not committed—and no export payload is bound. Server-authoritative selection, entitlement, committed short link, and preview/export parity are required.
        </div>
      </section>

      <section aria-label="Image-Fit QR controls" className="grid content-start gap-2.5 rounded-2xl border border-white/10 bg-slate-900/65 p-3 shadow-2xl shadow-black/25">
        <div className="grid grid-cols-[1fr_auto] items-end gap-2 rounded-xl border border-white/10 bg-slate-950/60 p-2.5">
          <label className="min-w-0"><span className="mb-1 block text-[10px] font-black uppercase tracking-[.16em] text-slate-400">Target image</span><span className="block truncate text-xs text-slate-200">{imageName}</span></label>
          <label className="cursor-pointer rounded-lg border border-indigo-300/50 bg-indigo-500/20 px-3 py-2 text-[10px] font-bold text-indigo-100 focus-within:ring-2 focus-within:ring-indigo-300">Choose image<input aria-label="Choose target image" type="file" accept="image/png,image/jpeg,image/webp,image/svg+xml" className="sr-only" onChange={(event) => { setImageName(event.target.files?.[0]?.name ?? 'No image selected'); invalidateEvidence() }} /></label>
        </div>
        <label><span className="mb-1 block text-[10px] font-black uppercase tracking-[.16em] text-slate-400">Destination</span><input aria-label="Level 2 destination URL" value={destination} onChange={(event) => { setDestination(event.target.value); invalidateEvidence() }} className="h-10 w-full rounded-xl border border-white/10 bg-slate-950 px-3 text-xs text-slate-100 outline-none focus:border-indigo-300 focus:ring-2 focus:ring-indigo-300/20" /></label>
        <ChoiceRow label="Treatment" value={treatment} values={fixture.controls.treatments} onChange={(value) => { setTreatment(value); invalidateEvidence() }} />
        <ChoiceRow label="Strength" value={strength} values={fixture.controls.strengths} onChange={(value) => { setStrength(value); invalidateEvidence() }} />
        <ChoiceRow label="Detail" value={detail} values={fixture.controls.details} onChange={(value) => { setDetail(value); invalidateEvidence() }} />

        <fieldset><legend className="mb-1.5 text-[10px] font-black uppercase tracking-[.16em] text-slate-400">Link mode</legend><div className="grid grid-cols-2 gap-1 rounded-xl bg-slate-950 p-1">
          <button type="button" aria-pressed={linkMode === 'optimized_short_link'} onClick={() => { setLinkMode('optimized_short_link'); invalidateEvidence() }} className={`min-h-11 rounded-lg border px-2 text-left text-[10px] font-bold ${linkMode === 'optimized_short_link' ? 'border-indigo-300 bg-indigo-500/25 text-white' : 'border-white/10 text-slate-400'}`}><span className="block">Optimized short link</span><span className="font-medium text-indigo-200">Recommended</span></button>
          <button type="button" aria-pressed={linkMode === 'original_url'} onClick={() => { setLinkMode('original_url'); invalidateEvidence() }} className={`min-h-11 rounded-lg border px-2 text-left text-[10px] font-bold ${linkMode === 'original_url' ? 'border-indigo-300 bg-indigo-500/25 text-white' : 'border-white/10 text-slate-400'}`}><span className="block">Original URL</span><span className="font-medium text-slate-500">Advanced</span></button>
        </div></fieldset>
        {linkMode === 'optimized_short_link'
          ? <p className="rounded-xl border border-indigo-300/20 bg-indigo-500/10 px-3 py-2 text-[10px] leading-relaxed text-indigo-100">Optimized short links can help the QR matrix fit the image more cleanly. Only one entitled, server-selected project slug may be committed.</p>
          : <p role="alert" className="rounded-xl border border-amber-300/30 bg-amber-300/10 px-3 py-2 text-[10px] leading-relaxed text-amber-100">Original URLs can increase QR density and reduce image clarity. New candidate evidence is required before selection.</p>}

        {!evidenceCurrent && <button type="button" onClick={resetFixture} className="rounded-xl border border-emerald-300/40 bg-emerald-400/15 px-3 py-2 text-[10px] font-black uppercase tracking-[.12em] text-emerald-100 transition hover:bg-emerald-400/25 focus:outline-none focus-visible:ring-2 focus-visible:ring-emerald-200">Reset to validated fixture</button>}

        <section aria-label="Candidate evidence" className="grid grid-cols-1 gap-1.5">
          {candidates.map((candidate) => <article key={candidate.mode} aria-label={`${labels[candidate.mode]} contract candidate`} className={`min-w-0 rounded-xl border p-1.5 text-left ${evidenceCurrent ? 'border-indigo-300/70 bg-indigo-500/15' : 'border-white/10 bg-slate-950/55 opacity-60'}`}>
            {evidenceCurrent ? <div className="mb-1.5 mx-auto max-w-32 overflow-hidden rounded-lg bg-white p-0.5"><img src={candidate.image} alt={`${labels[candidate.mode]} candidate thumbnail`} className="aspect-square w-full object-contain" /></div> : <div className="mb-1.5 mx-auto flex aspect-square max-w-32 items-center justify-center rounded-lg border border-dashed border-slate-600 px-2 text-center text-[8px] text-slate-500">Generation locked</div>}
            <span className="block text-center text-[9px] font-bold">{labels[candidate.mode]}</span>
            <span className="block text-center text-[8px] text-slate-400">{evidenceCurrent ? candidate.treatment : 'Evidence invalidated'}</span>
            <span className="mt-1 block text-center text-[8px] font-bold text-slate-300">{evidenceCurrent ? `${checksPassed}/${checksTotal} checks · fixture response` : 'Reset to view fixture'}</span>
          </article>)}
        </section>
        {evidenceCurrent && <p className={`rounded-lg border px-2.5 py-2 text-[9px] leading-snug ${selected.experimental ? 'border-amber-300/20 bg-amber-300/10 text-amber-100' : 'border-white/10 bg-slate-950/55 text-slate-300'}`}>{selected.recommendation}</p>}
      </section>
    </div>
  </main>
}
