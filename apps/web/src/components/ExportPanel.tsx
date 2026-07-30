import React from 'react'
import { useStudioStore } from '../store'
import type { ValidationResult } from '../types'
import { guestCommerce } from '../lib/commerceClient'

import type { CoreExportArtifact, CoreExportRequest } from '../lib/coreExportClient'
import { coreExportClient } from '../lib/coreExportClient'

const FORMATS: { value: CoreExportRequest['formats'][number]; label: string; ext: string; desc: string }[] = [
  { value: 'png', label: 'PNG', ext: '.png', desc: 'Core-validated raster' },
  { value: 'svg', label: 'SVG', ext: '.svg', desc: 'Core-validated vector' },
]

const SIZES = [
  { label: 'Social (512×512)', width: 512, height: 512, dpi: 72 },
  { label: 'Small Print (1200×1200)', width: 1200, height: 1200, dpi: 300 },
  { label: 'Medium Print (2400×2400)', width: 2400, height: 2400, dpi: 300 },
  { label: 'Large Print (3600×3600)', width: 3600, height: 3600, dpi: 300 },
]

function triggerDownload(dataUrl: string, filename: string) {
  const a = document.createElement('a')
  a.href = dataUrl
  a.download = filename
  document.body.appendChild(a)
  a.click()
  a.remove()
}

function artifactDownloadHref(file: CoreExportArtifact['files'][number]): string {
  return file.format === 'svg'
    ? `data:image/svg+xml;charset=utf-8,${encodeURIComponent(file.data)}`
    : file.data
}

function ValidationSummary({
  result,
  verifiedSource,
}: {
  result: ValidationResult
  verifiedSource: boolean
}) {
  return (
    <div className="mt-3 rounded-lg border border-slate-800 bg-slate-950/50 p-3 space-y-2">
      <div className="flex items-center justify-between">
        <span className="text-xs font-semibold text-slate-400">Validation Summary</span>
        <span className={`rounded-full px-2 py-0.5 text-[10px] font-medium ${result.pass ? 'bg-emerald-950/40 text-emerald-400' : 'bg-red-950/40 text-red-400'}`}>
          {result.pass ? 'Pass' : 'Fail'}
        </span>
      </div>
      <p className={`text-[10px] ${verifiedSource ? 'text-emerald-500' : 'text-amber-400'}`}>
        {verifiedSource
          ? 'Core Engine evidence'
          : 'Evidence source not supplied — treat as fixture or unverified data'}
      </p>
      <div className="flex items-center justify-between text-xs text-slate-500">
        <span>Confidence</span>
        <span className="tabular-nums text-slate-300">{Math.round((result.confidence ?? 0) * 100)}%</span>
      </div>

      {result.decoderResults && result.decoderResults.length > 0 && (
        <div className="space-y-1">
          <p className="text-[10px] font-semibold uppercase tracking-wider text-slate-600">Decoders</p>
          {result.decoderResults.map((d) => (
            <div key={d.decoder} className="flex items-center justify-between rounded bg-slate-900/50 px-2 py-1">
              <span className="text-[10px] text-slate-400">{d.decoder}</span>
              <span className={`text-[10px] font-medium ${d.pass ? 'text-emerald-400' : 'text-red-400'}`}>
                {d.pass ? 'OK' : 'Fail'}{d.match === false ? ' (mismatch)' : ''}
              </span>
            </div>
          ))}
        </div>
      )}

      {result.perturbationSummary && result.perturbationSummary.length > 0 && (
        <div className="space-y-1">
          <p className="text-[10px] font-semibold uppercase tracking-wider text-slate-600">Perturbation Tests</p>
          {result.perturbationSummary.map((p) => (
            <div key={p.type} className="flex items-center justify-between rounded bg-slate-900/50 px-2 py-1">
              <span className="text-[10px] text-slate-400 capitalize">{p.type}</span>
              <span className={`text-[10px] font-medium ${(p.passRate ?? 0) >= 0.7 ? 'text-emerald-400' : (p.passRate ?? 0) >= 0.4 ? 'text-amber-400' : 'text-red-400'}`}>
                {Math.round((p.passRate ?? 0) * 100)}%
              </span>
            </div>
          ))}
        </div>
      )}

      {result.recommendations && result.recommendations.length > 0 && (
        <div className="space-y-1 pt-1 border-t border-slate-800/60">
          <p className="text-[10px] font-semibold uppercase tracking-wider text-slate-600">Recommendations</p>
          {result.recommendations.map((rec, i) => (
            <p key={i} className="text-[10px] text-slate-400 leading-relaxed">• {rec}</p>
          ))}
        </div>
      )}
    </div>
  )
}

/** Full-screen print preview overlay */
function PrintPreview({
  open,
  onClose,
  size,
  candidate,
}: {
  open: boolean
  onClose: () => void
  size: typeof SIZES[number]
  candidate: import('../types').Candidate
}) {
  const closeBtnRef = React.useRef<HTMLButtonElement>(null)
  const previousFocusRef = React.useRef<HTMLElement | null>(null)

  // Handle focus lifecycle, Escape, and the single-control focus trap.
  React.useEffect(() => {
    if (!open) return
    previousFocusRef.current = document.activeElement as HTMLElement | null
    closeBtnRef.current?.focus()
    const handleKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        e.preventDefault()
        onClose()
      } else if (e.key === 'Tab') {
        e.preventDefault()
        closeBtnRef.current?.focus()
      }
    }
    window.addEventListener('keydown', handleKey)
    return () => {
      window.removeEventListener('keydown', handleKey)
      previousFocusRef.current?.focus()
    }
  }, [open, onClose])

  if (!open) return null

  const mm = (px: number) => ((px / (size.dpi || 300)) * 25.4).toFixed(1)
  const physicalSize = `${mm(size.width)}×${mm(size.height)} mm`

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-labelledby="print-preview-title"
      className="fixed inset-0 z-[100] flex items-center justify-center bg-black/80 p-4"
      onClick={(e) => { if (e.target === e.currentTarget) onClose() }}
    >
      <div className="relative max-h-[90vh] max-w-[90vw] overflow-auto rounded-2xl border border-slate-700 bg-slate-900 p-4">
        <div className="mb-3 flex items-center justify-between">
          <div>
            <h3 id="print-preview-title" className="text-sm font-semibold text-slate-200">Print Preview</h3>
            <p className="text-xs text-slate-500">{size.label} · {physicalSize}</p>
          </div>
          <button ref={closeBtnRef} onClick={onClose} className="rounded-lg px-3 py-1.5 text-xs font-medium text-slate-400 hover:bg-slate-800">
            Close
          </button>
        </div>
        <div className="flex items-center justify-center rounded-xl border border-slate-800 bg-slate-950 p-4">
          <img
            src={candidate.previewUrl || ''}
            alt="Print preview"
            className="rounded-lg"
            style={{ maxWidth: 'min(60vw, 800px)', maxHeight: '70vh' }}
          />
        </div>
        <p className="mt-2 text-center text-[10px] text-slate-600">
          Actual output: {size.width}×{size.height}px at {size.dpi || 300} DPI
        </p>
      </div>
    </div>
  )
}

const ExportPanel: React.FC = () => {
  const { project, featureFlags, syncCommerceEntitlement } = useStudioStore()
  const { selectedCandidateId, boards, entitlement } = project

  const [format, setFormat] = React.useState<CoreExportRequest['formats'][number]>('png')
  const [sizeIndex, setSizeIndex] = React.useState(0)
  const [exporting, setExporting] = React.useState(false)
  const [lastExport, setLastExport] = React.useState<string | null>(null)
  const [exportType, setExportType] = React.useState<'single' | 'bundle'>('single')
  const [previewOpen, setPreviewOpen] = React.useState(false)
  const [exportError, setExportError] = React.useState<string | null>(null)
  const [authorizedCandidateId, setAuthorizedCandidateId] = React.useState<string | null>(null)
  const pendingAuthorization = React.useRef<{ candidateId: string; requestId: string } | null>(null)

  const selectedCandidate = boards
    .flatMap((b) => b.candidates)
    .find((c) => c.candidateId === selectedCandidateId)

  const checkoutEnabled = featureFlags.artistic_checkout_enabled
  const currentSize = SIZES[sizeIndex]
  const canExport = checkoutEnabled && (
    entitlement.exportAllowed || authorizedCandidateId === selectedCandidate?.candidateId
  )

  function downloadArtifact(artifact: CoreExportArtifact, requestedSizes: typeof SIZES) {
    return artifact.files.map((file) => {
      const size = requestedSizes.find((item) => item.width === file.width && item.height === file.height)
      if (!size) throw new Error('Core export returned an unexpected artifact size.')
      const baseName = `artistic-qr-${project.projectId.slice(0, 6)}-${size.label.toLowerCase().replace(/\s/g, '-')}`
      const filename = `${baseName}.${file.format}`
      triggerDownload(artifactDownloadHref(file), filename)
      return filename
    })
  }

  const handleExport = async () => {
    if (!selectedCandidate || !canExport) return
    setExporting(true)
    setExportError(null)
    setLastExport(null)
    try {
      const pending = pendingAuthorization.current?.candidateId === selectedCandidate.candidateId
        ? pendingAuthorization.current
        : { candidateId: selectedCandidate.candidateId, requestId: crypto.randomUUID() }
      pendingAuthorization.current = pending
      const authorized = await guestCommerce.authorizeExport({
        exportRequestId: pending.requestId,
        candidateId: selectedCandidate.candidateId,
      })
      setAuthorizedCandidateId(selectedCandidate.candidateId)
      syncCommerceEntitlement(authorized)

      const requestedSizes = exportType === 'bundle' ? SIZES : [currentSize]
      const artifact = await coreExportClient.exportArtifact({
        candidateId: selectedCandidate.candidateId,
        formats: [format],
        sizes: requestedSizes.map((size) => ({
          label: size.label,
          widthPx: size.width,
          heightPx: size.height,
          dpi: size.dpi,
        })),
      })
      const names = downloadArtifact(artifact, requestedSizes)
      setLastExport(exportType === 'bundle' ? `Bundle: ${names.length} files` : names[0])
      pendingAuthorization.current = null
    } catch (err) {
      console.error('Export failed:', err)
      setExportError(err instanceof Error ? err.message : 'Export failed. Please try again.')
    } finally {
      setExporting(false)
    }
  }

  return (
    <section className="rounded-2xl border border-slate-800 bg-slate-900/60 p-4 md:p-6">
      <div className="mb-4 flex items-center justify-between">
        <h2 className="text-sm font-semibold uppercase tracking-wider text-slate-400">Export</h2>
        {!checkoutEnabled ? (
          <span className="rounded-full bg-slate-800 px-2 py-0.5 text-[10px] font-medium uppercase tracking-wide text-slate-400">
            Checkout offline
          </span>
        ) : !canExport && (
          <span className="rounded-full bg-amber-950/40 px-2 py-0.5 text-[10px] font-medium uppercase tracking-wide text-amber-300">
            Preview mode
          </span>
        )}
      </div>

      {/* Selected candidate */}
      <div className="mb-4 rounded-lg border border-slate-800 bg-slate-950/50 p-3">
        <p className="text-xs text-slate-500">Selected candidate</p>
        <p className="mt-1 text-sm font-medium text-slate-200">
          {selectedCandidate ? selectedCandidate.candidateId.slice(0, 12) : 'None'}
        </p>
        {selectedCandidate?.validationResult && (
          <ValidationSummary
            result={selectedCandidate.validationResult}
            verifiedSource={Boolean(selectedCandidate.renderResult?.provenance?.engine)}
          />
        )}
      </div>

      {/* Export type: single vs bundle */}
      {checkoutEnabled && (
        <div className="mb-4">
          <label className="mb-2 block text-xs font-medium text-slate-400">Export mode</label>
          <div className="grid grid-cols-2 gap-2">
            <button
              onClick={() => setExportType('single')}
              aria-pressed={exportType === 'single'}
              className={`rounded-lg border px-3 py-2 text-center text-xs font-medium transition-colors ${
                exportType === 'single'
                  ? 'border-studio-500/60 bg-studio-950/40 text-slate-200'
                  : 'border-slate-800 bg-slate-900 text-slate-400 hover:border-slate-700'
              }`}
            >
              Single size
            </button>
            <button
              onClick={() => setExportType('bundle')}
              aria-pressed={exportType === 'bundle'}
              className={`rounded-lg border px-3 py-2 text-center text-xs font-medium transition-colors ${
                exportType === 'bundle'
                  ? 'border-studio-500/60 bg-studio-950/40 text-slate-200'
                  : 'border-slate-800 bg-slate-900 text-slate-400 hover:border-slate-700'
              }`}
            >
              Bundle (all sizes)
            </button>
          </div>
          {!canExport && (
            <p className="mt-2 text-[10px] text-amber-400">
              Choose your export mode now; downloading the selected bundle requires purchase.
            </p>
          )}
        </div>
      )}

      {/* Format */}
      {exportType === 'single' && (
        <div className="mb-4">
          <label className="mb-2 block text-xs font-medium text-slate-400">Format</label>
          <div className="grid grid-cols-2 gap-2">
            {FORMATS.map((f) => (
              <button
                key={f.value}
                onClick={() => setFormat(f.value)}
                aria-pressed={format === f.value}
                className={`rounded-lg border px-3 py-2 text-left transition-colors ${
                  format === f.value
                    ? 'border-studio-500/60 bg-studio-950/40 text-slate-200'
                    : 'border-slate-800 bg-slate-900 text-slate-400 hover:border-slate-700'
                }`}
              >
                <span className="block text-xs font-semibold">{f.label}</span>
                <span className="block text-[10px] text-slate-500">{f.desc}</span>
              </button>
            ))}
          </div>
        </div>
      )}

      {/* Size */}
      {exportType === 'single' && (
        <div className="mb-4">
          <label className="mb-2 block text-xs font-medium text-slate-400">Size</label>
          <div className="grid grid-cols-2 gap-2">
            {SIZES.map((s, i) => {
              const checkoutBlocked = !checkoutEnabled
              const sizeDisabled = checkoutBlocked
              return (
                <button
                  key={s.label}
                  onClick={() => !sizeDisabled && setSizeIndex(i)}
                  disabled={sizeDisabled}
                  aria-pressed={sizeIndex === i}
                  className={`rounded-lg border px-3 py-2 text-left transition-colors ${
                    sizeDisabled
                      ? 'cursor-not-allowed border-slate-900 bg-slate-950/30 text-slate-700'
                      : sizeIndex === i
                      ? 'border-studio-500/60 bg-studio-950/40 text-slate-200'
                      : 'border-slate-800 bg-slate-900 text-slate-400 hover:border-slate-700'
                  }`}
                >
                  <span className="block text-xs font-semibold">{s.label}</span>
                  <span className="block text-[10px] text-slate-500">{s.width}×{s.height} px</span>
                  {checkoutBlocked && (
                    <span className="block text-[10px] text-slate-500">Checkout unavailable</span>
                  )}
                </button>
              )
            })}
          </div>
        </div>
      )}

      {/* Preview + Export actions */}
      <div className="mb-4 flex gap-2">
        {exportType === 'single' && (
          <button
            onClick={() => setPreviewOpen(true)}
            disabled={!selectedCandidate}
            className={`flex-1 rounded-lg border border-slate-700 py-2 text-xs font-semibold transition-colors ${
              !selectedCandidate
                ? 'cursor-not-allowed text-slate-600'
                : 'text-slate-300 hover:border-slate-600 hover:bg-slate-800'
            }`}
          >
            Preview at size
          </button>
        )}
        <button
          onClick={handleExport}
          disabled={!selectedCandidate || exporting || !canExport}
          className={`flex-1 rounded-lg py-2.5 text-sm font-semibold transition-colors ${
            !selectedCandidate || exporting || !canExport
              ? 'cursor-not-allowed bg-slate-800 text-slate-500'
              : 'bg-studio-600 text-white hover:bg-studio-500'
          }`}
        >
          {exporting
            ? 'Exporting…'
            : canExport
              ? (exportType === 'bundle' ? 'Export Bundle' : `Export ${format.toUpperCase()}`)
              : exportType === 'bundle'
                ? 'Purchase to export selected bundle'
                : `Purchase to export selected ${format.toUpperCase()}`}
        </button>
      </div>

      {lastExport && (
        <p role="status" aria-live="polite" className="text-center text-xs text-emerald-400">
          Downloaded: {lastExport}
        </p>
      )}
      {exportError && (
        <p role="alert" className="text-center text-xs text-red-400">
          Export failed: {exportError}
        </p>
      )}

      {/* Print Preview Overlay */}
      <PrintPreview
        open={previewOpen}
        onClose={() => setPreviewOpen(false)}
        size={currentSize}
        candidate={selectedCandidate!}
      />
    </section>
  )
}

export default ExportPanel
