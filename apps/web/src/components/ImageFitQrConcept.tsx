import React from 'react'
import { IMAGE_FIT_CONTRACT, type ImageFitDetail, type ImageFitLinkMode, type ImageFitStrength, type ImageFitTreatment } from '../imageFitContract'
import { buildImageFitRequest, imageFitExportDecision, imageFitGenerationClient, type ImageFitAuthorizedFallbackV1, type ImageFitCandidateV1, type ImageFitRequestV1 } from '../lib/imageFitGenerationClient'

const labels: Record<string, string> = {
  logo: 'Logo', pixel_blend: 'Pixel blend', background_image: 'Background image', cutout_perforated: 'Cutout-perforated',
  readable: 'Mellow', balanced: 'Balanced', image_first: 'Punchy', experimental: 'Punchy', failed: 'Failed', simple: 'Simple', detailed: 'Detailed', maximum: 'Maximum',
  small: 'Small', medium: 'Medium', large: 'Large',
  optimized_short_link: 'Optimized short link', original_url: 'Original URL',
}

type RunState = 'idle' | 'loading' | 'success' | 'error'
type UploadState = 'idle' | 'uploading' | 'error'

function ChoiceRow<T extends string>({ label, value, values, onChange }: { label: string; value: T; values: readonly T[]; onChange: (value: T) => void }) {
  return <fieldset><legend className="mb-1.5 text-[10px] font-black uppercase tracking-[.16em] text-slate-400">{label}</legend>
    <div className={`grid gap-1 rounded-xl bg-slate-950 p-1 ${values.length === 4 ? 'grid-cols-4' : 'grid-cols-3'}`}>
      {values.map((option) => <button key={option} type="button" aria-pressed={option === value} onClick={() => onChange(option)} className={`min-h-11 rounded-lg border px-1.5 text-[10px] font-bold leading-tight focus-visible:ring-2 focus-visible:ring-indigo-300 ${option === value ? 'border-indigo-300 bg-indigo-500/25 text-white' : 'border-white/10 bg-white/[.035] text-slate-400'}`}>{labels[option] ?? option}</button>)}
    </div>
  </fieldset>
}

function artifactFor(candidate: ImageFitCandidateV1) {
  return candidate.artifacts.find((artifact) => artifact.kind === 'preview_png')
    ?? candidate.artifacts.find((artifact) => artifact.kind === 'export_svg')
}

function previewSource(uri: string) {
  const fileName = uri.split('/').pop()
  return uri.startsWith('docs/program/evidence/level2-image-fit-qr-spike/creator-visual-pass/selected/') && fileName
    ? `/level2-image-fit-qr/creator-visual-pass/${fileName}`
    : uri
}

function recognitionScore(candidate: ImageFitCandidateV1) {
  return `${Math.round(candidate.image_fit_evidence.recognition_score * 100)}%`
}

function scanVerdict(candidate: ImageFitCandidateV1) {
  if (candidate.scan_evidence.verdict === 'pass') return 'Pass'
  if (candidate.scan_evidence.verdict === 'fail') return 'Fail'
  return 'Not run'
}

function downloadAuthoritativeArtifact(candidate: ImageFitCandidateV1) {
  const decision = imageFitExportDecision(candidate)
  if (!decision.allowed || !decision.artifact) return
  const anchor = document.createElement('a')
  anchor.href = decision.artifact.uri
  anchor.download = `artistic-qr-${candidate.mode}.${decision.artifact.kind === 'export_png' ? 'png' : 'svg'}`
  document.body.appendChild(anchor)
  anchor.click()
  anchor.remove()
}

function downloadFallbackArtifact(fallback: ImageFitAuthorizedFallbackV1) {
  const anchor = document.createElement('a')
  anchor.href = fallback.artifact.uri
  anchor.download = 'artistic-qr-level1-safe-fallback.svg'
  document.body.appendChild(anchor)
  anchor.click()
  anchor.remove()
}

async function imageFileToPngDataUrl(file: File): Promise<string> {
  if (!file.type.startsWith('image/')) throw new Error('Choose a PNG, JPG, or WebP image.')
  const bitmap = await createImageBitmap(file).catch(() => undefined)
  if (!bitmap) throw new Error('The selected image could not be decoded.')
  try {
    const scale = Math.min(1, 1024 / Math.max(bitmap.width, bitmap.height))
    const width = Math.max(2, Math.round(bitmap.width * scale))
    const height = Math.max(2, Math.round(bitmap.height * scale))
    const canvas = document.createElement('canvas')
    canvas.width = width
    canvas.height = height
    const context = canvas.getContext('2d')
    if (!context) throw new Error('Browser image conversion is unavailable.')
    context.drawImage(bitmap, 0, 0, width, height)
    return canvas.toDataURL('image/png')
  } finally {
    bitmap.close()
  }
}

function candidateTitle(candidate: ImageFitCandidateV1) {
  return candidate.image_treatment.logo_size ? labels[candidate.image_treatment.logo_size] : labels[candidate.mode]
}

function CandidateCard({ candidate, selected, onSelect }: { candidate: ImageFitCandidateV1; selected: boolean; onSelect: () => void }) {
  const artifact = artifactFor(candidate)!
  const title = candidateTitle(candidate)
  return <article aria-label={`${title} generated candidate`} className={`rounded-xl border p-2 ${selected ? 'border-indigo-300 bg-indigo-500/15' : 'border-white/10 bg-slate-950/55'}`}>
    <button type="button" onClick={onSelect} aria-pressed={selected} className="w-full rounded-lg text-left focus-visible:ring-2 focus-visible:ring-indigo-300">
      <img src={previewSource(artifact.uri)} data-artifact-sha256={artifact.sha256} alt={`${title} candidate thumbnail`} className="mx-auto aspect-square w-full max-w-40 rounded-lg bg-white object-contain" />
      <span className="mt-2 block text-xs font-bold">{title}</span>
      <span className="mt-1.5 grid gap-1 text-[9px] text-slate-300">
        <span className="flex justify-between gap-2"><span className="text-slate-500">Scan verdict</span><strong>{scanVerdict(candidate)} · {candidate.scan_evidence.checks_passed}/{candidate.scan_evidence.checks_total}</strong></span>
        <span className="flex justify-between gap-2"><span className="text-slate-500">Image fit</span><strong>{recognitionScore(candidate)} · {candidate.image_treatment.logo_size_fraction ? `${Math.round(candidate.image_treatment.logo_size_fraction * 100)}%` : labels[candidate.image_fit_evidence.fit_label]}</strong></span>
        <span className="flex justify-between gap-2"><span className="text-slate-500">Visual acceptance</span><strong className="text-amber-200">Pending</strong></span>
      </span>
    </button>
  </article>
}

export default function ImageFitQrConcept() {
  const fixtureRequest = IMAGE_FIT_CONTRACT.request
  const treatment = fixtureRequest.user_controls.treatment as ImageFitTreatment
  const strength = fixtureRequest.user_controls.strength as ImageFitStrength
  const detail = fixtureRequest.user_controls.detail as ImageFitDetail
  const [linkMode, setLinkMode] = React.useState<ImageFitLinkMode>(fixtureRequest.user_controls.link_mode)
  const [destination, setDestination] = React.useState(fixtureRequest.destination.normalized_url)
  const [targetImage, setTargetImage] = React.useState<ImageFitRequestV1['target_image']>(fixtureRequest.target_image as ImageFitRequestV1['target_image'])
  const [runState, setRunState] = React.useState<RunState>('idle')
  const [uploadState, setUploadState] = React.useState<UploadState>('idle')
  const [error, setError] = React.useState('')
  const [uploadError, setUploadError] = React.useState('')
  const [candidates, setCandidates] = React.useState<ImageFitCandidateV1[]>([])
  const [fallback, setFallback] = React.useState<ImageFitAuthorizedFallbackV1>()
  const [selectedId, setSelectedId] = React.useState<string>()
  const abortRef = React.useRef<AbortController>()
  const uploadAbortRef = React.useRef<AbortController>()

  const selected = candidates.find((candidate) => candidate.candidate_id === selectedId) ?? candidates[0]
  const exportDecision = selected ? imageFitExportDecision(selected) : undefined
  const destinationValid = /^https:\/\/.+\..+/i.test(destination)
  const canGenerate = destinationValid && Boolean(targetImage.image_ref) && runState !== 'loading' && uploadState !== 'uploading'
  const invalidate = () => { abortRef.current?.abort(); setCandidates([]); setFallback(undefined); setSelectedId(undefined); setError(''); setRunState('idle') }
  const change = <T,>(setter: React.Dispatch<React.SetStateAction<T>>, value: T) => { setter(value); invalidate() }

  const uploadTarget = async (file: File) => {
    uploadAbortRef.current?.abort()
    const controller = new AbortController()
    uploadAbortRef.current = controller
    setUploadState('uploading')
    setUploadError('')
    invalidate()
    try {
      const dataUrl = await imageFileToPngDataUrl(file)
      const uploadedTarget = await imageFitGenerationClient.uploadTargetImage(dataUrl, controller.signal)
      setTargetImage(uploadedTarget)
      setUploadState('idle')
    } catch (caught) {
      if (caught instanceof DOMException && caught.name === 'AbortError') return
      setUploadError(caught instanceof Error ? caught.message : 'Image upload failed.')
      setUploadState('error')
    }
  }

  const generate = async () => {
    invalidate()
    const controller = new AbortController()
    abortRef.current = controller
    setRunState('loading')
    try {
      const request = buildImageFitRequest({ destination, treatment, strength, detail, linkMode, targetImage })
      const response = await imageFitGenerationClient.generate(request, controller.signal)
      const qualifying = response.candidates.filter((candidate) => candidate.status === 'validated' && candidate.scan_evidence.verdict === 'pass')
      if (qualifying.length === 0) {
        setCandidates([])
        setSelectedId(undefined)
        setFallback(response.authorized_fallback)
        setError(response.authorized_fallback
          ? 'Core returned no qualifying Image-Fit candidate. Its scan-passing deterministic fallback is available below.'
          : 'Core returned no qualifying Image-Fit candidate and no authorized fallback bytes.')
        setRunState('error')
        return
      }
      setCandidates(response.candidates)
      setFallback(undefined)
      const defaultQualifying = qualifying.find((candidate) => candidate.image_treatment.logo_size === 'medium') ?? qualifying[0]
      setSelectedId(defaultQualifying?.candidate_id)
      setRunState('success')
    } catch (caught) {
      if (caught instanceof DOMException && caught.name === 'AbortError') return
      setCandidates([])
      setFallback(undefined)
      setSelectedId(undefined)
      setError(caught instanceof Error ? caught.message : 'Generation failed closed.')
      setRunState('error')
    }
  }

  React.useEffect(() => () => { abortRef.current?.abort(); uploadAbortRef.current?.abort() }, [])

  return <main data-testid="image-fit-qr-concept" data-schema-version="image-fit-qr-api.v1" data-export-payload-bound={exportDecision?.allowed ? 'true' : 'false'} data-checkout-bound="false" className="min-h-[100dvh] bg-[#070b16] text-white">
    <header className="border-b border-white/10 bg-slate-950/90 px-4 py-3"><div className="mx-auto flex max-w-6xl items-center justify-between gap-3"><div><p className="text-[10px] font-black uppercase tracking-[.2em] text-indigo-300">Deterministic Studio</p><h1 className="text-base font-bold">Q9 Image-Fit</h1><nav aria-label="QR integration mode" className="mt-2 flex gap-2 text-[10px] font-bold"><a href="/" className="rounded-lg border border-emerald-300/40 px-2 py-1 text-emerald-200">Level 1 Safe</a><span aria-current="page" className="rounded-lg border border-indigo-300/50 bg-indigo-500/20 px-2 py-1 text-indigo-100">Q9 Image-Fit Premium</span></nav></div><span className="rounded-full border border-amber-300/30 bg-amber-300/10 px-2.5 py-1 text-[10px] font-bold text-amber-200">Core authority required</span></div></header>
    <div className="mx-auto grid max-w-6xl gap-3 p-3 lg:grid-cols-[minmax(0,.9fr)_minmax(360px,1.1fr)]">
      <section aria-label="How to test" className="lg:col-span-2 rounded-2xl border border-indigo-300/20 bg-indigo-500/10 px-3 py-2 text-[11px] leading-relaxed text-indigo-100"><strong className="text-white">Test in four steps:</strong> 1. keep or upload a target image; 2. choose or keep the destination; 3. press <strong>Generate candidates</strong>; 4. review Small, Medium, and Large size candidates returned by Core. Export is not available yet.</section>

      <section aria-label="Image-Fit QR preview" className="rounded-2xl border border-white/10 bg-slate-900/60 p-3">
        <div className="relative mx-auto aspect-square max-w-[430px] overflow-hidden rounded-2xl border border-indigo-400/20 bg-slate-100 p-3">
          {selected ? <img data-testid="selected-image-fit-candidate" src={previewSource(artifactFor(selected)!.uri)} data-artifact-sha256={artifactFor(selected)?.sha256} data-candidate-id={selected.candidate_id} alt={`${labels[selected.mode]} generated candidate`} className="h-full w-full rounded-xl object-contain" /> : <div className="flex h-full items-center justify-center rounded-xl border border-dashed border-slate-400 bg-slate-200 px-8 text-center text-sm font-bold text-slate-600">{runState === 'loading' ? 'Creator is generating fresh candidates…' : runState === 'error' ? 'No candidate evidence accepted' : 'Ready for real generation'}</div>}
        </div>
        {selected && <><section aria-label="Selected candidate evidence" className="mt-3 rounded-xl border border-white/10 bg-black/20 p-2.5"><div className="grid gap-2 sm:grid-cols-3"><div><span className="block text-[9px] font-black uppercase tracking-[.12em] text-slate-500">Scan verdict</span><strong className="text-sm">{scanVerdict(selected)}</strong><span className="block text-[9px] text-slate-400">{selected.scan_evidence.checks_passed}/{selected.scan_evidence.checks_total} controlled checks</span></div><div><span className="block text-[9px] font-black uppercase tracking-[.12em] text-slate-500">Image recognition / fit</span><strong className="text-sm">{recognitionScore(selected)}</strong><span className="block text-[9px] text-slate-400">{labels[selected.image_fit_evidence.fit_label]} · {selected.image_fit_evidence.score_version}</span></div><div><span className="block text-[9px] font-black uppercase tracking-[.12em] text-slate-500">Visual acceptance</span><strong className="text-sm text-amber-200">Pending visual review</strong><span className="block text-[9px] text-slate-400">Not sponsor-approved</span></div></div><p className="mt-2 border-t border-white/10 pt-2 text-[10px] leading-relaxed text-slate-300"><strong className="text-white">Evidence is separate:</strong> a scan pass reports controlled decoder results only. Image-fit scoring and visual acceptance are independent; this candidate is not presented as sponsor-ready.</p></section><details className="mt-2 rounded-xl border border-white/10 bg-slate-950/70 text-[10px]"><summary className="cursor-pointer px-3 py-2 font-bold">Technical evidence · v{selected.qr_settings.version} · ECC {selected.qr_settings.ecc} · mask {selected.qr_settings.mask}</summary><div className="border-t border-white/10 px-3 py-2 text-slate-300">Producer status: {selected.status}<br />Payload: {selected.qr_settings.payload_mode} · {selected.qr_settings.encoded_payload_display}<br />Decoder suite: {selected.scan_evidence.decoder_suite_version}<br />Protected-zone conflict score: {selected.image_fit_evidence.protected_zone_conflict_score}<br />Artifact hash: {artifactFor(selected)?.sha256}<br />Warnings: {selected.warnings.length ? selected.warnings.map((warning) => warning.message).join('; ') : 'None'}</div></details><p className="mt-2 text-[9px] text-slate-500">{selected.scan_evidence.disclaimer} Physical-device: {selected.scan_evidence.physical_scan}; print: {selected.scan_evidence.print_scan}.</p></>}
        {selected && <><button type="button" disabled={!exportDecision?.allowed} onClick={() => downloadAuthoritativeArtifact(selected)} className="mt-2 min-h-11 w-full rounded-xl bg-indigo-500 px-4 text-xs font-black text-white disabled:cursor-not-allowed disabled:bg-slate-800 disabled:text-slate-400">{exportDecision?.allowed ? 'Download Core-authorized artifact' : 'Export denied by Core gates'}</button>{!exportDecision?.allowed && <p data-testid="image-fit-export-blockers" className="mt-1 text-[10px] text-amber-200">Blocked: {exportDecision?.blockers.join(', ') || 'Core export authority unavailable'}</p>}</>}
        {error && <div role="alert" className="mt-3 rounded-xl border border-rose-300/30 bg-rose-400/10 px-3 py-2 text-xs text-rose-100"><strong>Image-Fit did not qualify.</strong> {error} Previous candidates remain hidden. {!fallback && <a href="/" className="font-bold underline">Continue with deterministic Level 1 Safe</a>}.</div>}
        {fallback && <section aria-label="Core-authorized Level 1 fallback" className="mt-3 rounded-xl border border-emerald-300/30 bg-emerald-400/10 p-3 text-xs text-emerald-50">
          <div className="grid grid-cols-[72px_1fr] items-center gap-3"><img src={fallback.artifact.uri} data-testid="level1-fallback-preview" data-artifact-sha256={fallback.artifact.sha256} data-payload-sha256={fallback.payload_sha256} alt="Deterministic Level 1 Safe fallback preview" className="aspect-square w-[72px] rounded-lg bg-white object-contain" /><div><strong className="block">Deterministic Level 1 Safe</strong><span className="mt-1 block text-[10px]">Core scan {fallback.scan_evidence.verdict} · {fallback.scan_evidence.checks_passed}/{fallback.scan_evidence.checks_total}</span><code className="mt-1 block break-all text-[9px] text-emerald-200">SHA-256 {fallback.artifact.sha256}</code></div></div>
          <button type="button" onClick={() => downloadFallbackArtifact(fallback)} className="mt-3 min-h-11 w-full rounded-xl bg-emerald-500 px-4 text-xs font-black text-slate-950">Download Core-authorized Level 1 fallback</button>
          <p className="mt-2 text-[10px]">This downloads only the hash-bound fallback bytes. Q9 Image-Fit export remains denied.</p>
        </section>}
        <div role="status" className="mt-3 rounded-xl border border-amber-300/25 bg-amber-300/10 px-3 py-2 text-[10px] text-amber-100">Only Core-authorized exact bytes can download. Payment, committed short-link, scan, parity, and Image-first experimental blockers remain visible and fail closed. <a href="/" className="font-bold underline">Level 1 Safe remains available</a>.</div>
      </section>

      <section aria-label="Image-Fit QR controls" className="grid content-start gap-2.5 rounded-2xl border border-white/10 bg-slate-900/65 p-3">
        <div className="grid grid-cols-[1fr_auto] items-end gap-2 rounded-xl border border-white/10 bg-slate-950/60 p-2.5"><label className="min-w-0"><span className="mb-1 block text-[10px] font-black uppercase tracking-[.16em] text-slate-400">Target image</span><span className="block truncate text-xs">{targetImage.image_ref}</span><span className="mt-1 block text-[9px] text-slate-500">Upload a PNG, JPG, or WebP; Studio converts it to a bounded PNG target for Creator generation.</span></label><label className={`rounded-lg border px-3 py-2 text-center text-[10px] font-bold focus-within:ring-2 focus-within:ring-indigo-300 ${uploadState === 'uploading' ? 'cursor-wait border-white/10 bg-slate-800 text-slate-400' : 'cursor-pointer border-indigo-300/40 bg-indigo-500/20 text-indigo-100'}`}><span>{uploadState === 'uploading' ? 'Uploading…' : 'Choose image'}</span><input aria-label="Choose target image" type="file" accept="image/png,image/jpeg,image/webp" disabled={uploadState === 'uploading'} onChange={(event) => { const file = event.currentTarget.files?.[0]; if (file) void uploadTarget(file); event.currentTarget.value = '' }} className="sr-only" /></label></div>
        {uploadError && <div role="alert" className="rounded-xl border border-rose-300/30 bg-rose-400/10 px-3 py-2 text-xs text-rose-100"><strong>Upload failed.</strong> {uploadError}</div>}
        <label><span className="mb-1 block text-[10px] font-black uppercase tracking-[.16em] text-slate-400">Destination</span><input aria-label="Level 2 destination URL" value={destination} aria-invalid={!destinationValid} onChange={(event) => change(setDestination, event.target.value)} className="h-11 w-full rounded-xl border border-white/10 bg-slate-950 px-3 text-xs outline-none focus:ring-2 focus:ring-indigo-300" /></label>
        <p className="rounded-xl border border-indigo-300/20 bg-indigo-500/10 px-3 py-2 text-[10px] text-indigo-100">Core generates Small (40%), Medium (50%), and Large (60%) candidates, validates each against the target URL, and shows only qualifying size outputs.</p>
        <ChoiceRow label="Link mode" value={linkMode} values={IMAGE_FIT_CONTRACT.controls.linkModes} onChange={(value) => change(setLinkMode, value)} />
        <p className={`rounded-xl border px-3 py-2 text-[10px] ${linkMode === 'optimized_short_link' ? 'border-indigo-300/20 bg-indigo-500/10 text-indigo-100' : 'border-amber-300/30 bg-amber-300/10 text-amber-100'}`}>{linkMode === 'optimized_short_link' ? 'Optimized short links can help the QR matrix fit the image more cleanly. Generation may reserve/evaluate slugs; this page cannot commit one.' : 'Original URLs can increase QR density and reduce image clarity.'}</p>
        <button type="button" onClick={generate} disabled={!canGenerate} className="min-h-11 rounded-xl bg-indigo-500 px-4 text-sm font-black text-white disabled:cursor-not-allowed disabled:bg-slate-700 disabled:text-slate-400">{runState === 'loading' ? 'Generating candidates…' : 'Generate candidates'}</button>
        {runState === 'loading' && <button type="button" onClick={() => { abortRef.current?.abort(); setRunState('idle') }} className="min-h-11 rounded-xl border border-white/20 text-xs font-bold">Cancel generation</button>}
        <section aria-label="Candidate evidence" className="grid grid-cols-1 gap-2 sm:grid-cols-3">{candidates.map((candidate) => <CandidateCard key={candidate.candidate_id} candidate={candidate} selected={candidate.candidate_id === selected?.candidate_id} onSelect={() => setSelectedId(candidate.candidate_id)} />)}</section>
      </section>
    </div>
  </main>
}
