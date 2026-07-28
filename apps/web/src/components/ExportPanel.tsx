import React from 'react'
import { useStudioStore } from '../store'
import type { ExportFormat, ValidationResult } from '../types'
import { toPng, toSvg } from 'html-to-image'
import { exportToPdf, exportToEps } from '../lib/exportFormats'

const FORMATS: { value: ExportFormat; label: string; ext: string; desc: string }[] = [
  { value: 'png', label: 'PNG', ext: '.png', desc: 'High-res raster' },
  { value: 'svg', label: 'SVG', ext: '.svg', desc: 'Scalable vector' },
  { value: 'pdf', label: 'PDF', ext: '.pdf', desc: 'Print-ready document' },
  { value: 'eps', label: 'EPS', ext: '.eps', desc: 'Vector for Illustrator' },
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

function ValidationSummary({ result }: { result: ValidationResult }) {
  return (
    <div className="mt-3 rounded-lg border border-slate-800 bg-slate-950/50 p-3 space-y-2">
      <div className="flex items-center justify-between">
        <span className="text-xs font-semibold text-slate-400">Validation Summary</span>
        <span className={`rounded-full px-2 py-0.5 text-[10px] font-medium ${result.pass ? 'bg-emerald-950/40 text-emerald-400' : 'bg-red-950/40 text-red-400'}`}>
          {result.pass ? 'Pass' : 'Fail'}
        </span>
      </div>
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
  const { project } = useStudioStore()
  const [rendered, setRendered] = React.useState<string>('')

  React.useEffect(() => {
    if (!open || !candidate?.previewUrl) { setRendered(''); return }
    const build = async () => {
      try {
        const node = document.createElement('div')
        node.style.width = `${size.width}px`
        node.style.height = `${size.height}px`
        node.style.background = project.style?.background || '#f0f4ff'
        node.style.display = 'flex'
        node.style.alignItems = 'center'
        node.style.justifyContent = 'center'
        node.style.position = 'absolute'
        node.style.left = '-9999px'
        node.style.top = '-9999px'
        const img = document.createElement('img')
        img.src = candidate.previewUrl || ''
        img.style.width = '100%'
        img.style.height = '100%'
        img.style.objectFit = 'contain'
        node.appendChild(img)
        document.body.appendChild(node)
        const dataUrl = await toPng(node, { pixelRatio: 1 })
        document.body.removeChild(node)
        setRendered(dataUrl)
      } catch {
        setRendered(candidate.previewUrl || '')
      }
    }
    build()
  }, [open, size, candidate?.previewUrl])

  if (!open) return null

  const mm = (px: number) => ((px / (size.dpi || 300)) * 25.4).toFixed(1)
  const physicalSize = `${mm(size.width)}×${mm(size.height)} mm`

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/80 p-4"
      onClick={(e) => { if (e.target === e.currentTarget) onClose() }}
    >
      <div className="relative max-h-[90vh] max-w-[90vw] overflow-auto rounded-2xl border border-slate-700 bg-slate-900 p-4">
        <div className="mb-3 flex items-center justify-between">
          <div>
            <h3 className="text-sm font-semibold text-slate-200">Print Preview</h3>
            <p className="text-xs text-slate-500">{size.label} · {physicalSize}</p>
          </div>
          <button onClick={onClose} className="rounded-lg px-3 py-1.5 text-xs font-medium text-slate-400 hover:bg-slate-800">
            Close
          </button>
        </div>
        <div className="flex items-center justify-center rounded-xl border border-slate-800 bg-slate-950 p-4">
          <img
            src={rendered || candidate.previewUrl || ''}
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
  const { project, featureFlags } = useStudioStore()
  const { selectedCandidateId, boards, entitlement } = project

  const [format, setFormat] = React.useState<ExportFormat>('png')
  const [sizeIndex, setSizeIndex] = React.useState(0)
  const [exporting, setExporting] = React.useState(false)
  const [lastExport, setLastExport] = React.useState<string | null>(null)
  const [exportType, setExportType] = React.useState<'single' | 'bundle'>('single')
  const [previewOpen, setPreviewOpen] = React.useState(false)

  const selectedCandidate = boards
    .flatMap((b) => b.candidates)
    .find((c) => c.candidateId === selectedCandidateId)

  const checkoutEnabled = featureFlags.artistic_checkout_enabled
  const currentSize = SIZES[sizeIndex]
  const canExport =
    checkoutEnabled &&
    (entitlement.exportAllowed || (format === 'png' && currentSize.width <= 512))

  async function renderExport(sizeOverride?: typeof SIZES[number]) {
    const s = sizeOverride || currentSize
    const f = format
    const baseName = `artistic-qr-${project.projectId.slice(0, 6)}-${s.label.toLowerCase().replace(/\s/g, '-')}`

    // Build a hidden render node for raster/vector capture
    const node = document.createElement('div')
    node.style.width = `${s.width}px`
    node.style.height = `${s.height}px`
    node.style.background = project.style?.background || '#f0f4ff'
    node.style.display = 'flex'
    node.style.alignItems = 'center'
    node.style.justifyContent = 'center'
    node.style.position = 'absolute'
    node.style.left = '-9999px'
    node.style.top = '-9999px'

    const img = document.createElement('img')
    img.src = selectedCandidate!.previewUrl || ''
    img.style.width = '100%'
    img.style.height = '100%'
    img.style.objectFit = 'contain'
    node.appendChild(img)
    document.body.appendChild(node)

    if (f === 'pdf') {
      const dataUrl = await toPng(node, { pixelRatio: 1 })
      document.body.removeChild(node)
      await exportToPdf(dataUrl, {
        filename: `${baseName}.pdf`,
        widthPx: s.width,
        heightPx: s.height,
        dpi: 300,
      })
      return `${baseName}.pdf`
    }

    if (f === 'eps') {
      const svgString = await toSvg(node, { pixelRatio: 1 })
      document.body.removeChild(node)
      const svgRaw = svgString.replace(/^data:image\/svg\+xml;base64,/, '')
      const decoded = typeof atob !== 'undefined'
        ? atob(svgRaw)
        : Buffer.from(svgRaw, 'base64').toString('utf-8')
      exportToEps(decoded, {
        filename: `${baseName}.eps`,
        widthPx: s.width,
        heightPx: s.height,
      })
      return `${baseName}.eps`
    }

    let dataUrl: string
    if (f === 'svg') {
      dataUrl = await toSvg(node, { pixelRatio: 1 })
    } else {
      dataUrl = await toPng(node, { pixelRatio: 1 })
    }
    document.body.removeChild(node)
    triggerDownload(dataUrl, `${baseName}.${f}`)
    return `${baseName}.${f}`
  }

  const handleExport = async () => {
    if (!selectedCandidate || !canExport) return
    setExporting(true)
    try {
      if (exportType === 'bundle') {
        const names: string[] = []
        for (const s of SIZES) {
          const name = await renderExport(s)
          names.push(name)
        }
        setLastExport(`Bundle: ${names.length} files`)
      } else {
        const name = await renderExport()
        setLastExport(name!)
      }
    } catch (err) {
      console.error('Export failed:', err)
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
        ) : !entitlement.exportAllowed && (
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
          <ValidationSummary result={selectedCandidate.validationResult} />
        )}
      </div>

      {/* Export type: single vs bundle */}
      {checkoutEnabled && (
        <div className="mb-4">
          <label className="mb-2 block text-xs font-medium text-slate-400">Export mode</label>
          <div className="grid grid-cols-2 gap-2">
            <button
              onClick={() => setExportType('single')}
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
              disabled={!entitlement.exportAllowed}
              className={`rounded-lg border px-3 py-2 text-center text-xs font-medium transition-colors ${
                !entitlement.exportAllowed
                  ? 'cursor-not-allowed border-slate-900 bg-slate-950/30 text-slate-700'
                  : exportType === 'bundle'
                  ? 'border-studio-500/60 bg-studio-950/40 text-slate-200'
                  : 'border-slate-800 bg-slate-900 text-slate-400 hover:border-slate-700'
              }`}
            >
              {!entitlement.exportAllowed ? 'Bundle requires purchase' : 'Bundle (all sizes)'}
            </button>
          </div>
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
              const restricted = !entitlement.exportAllowed && s.width > 512
              const checkoutBlocked = !checkoutEnabled && s.width > 512
              const sizeDisabled = restricted || checkoutBlocked
              return (
                <button
                  key={s.label}
                  onClick={() => !sizeDisabled && setSizeIndex(i)}
                  disabled={sizeDisabled}
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
                  {restricted && !checkoutBlocked && (
                    <span className="block text-[10px] text-amber-400">Purchase required</span>
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
          {exporting ? 'Exporting…' : canExport ? (exportType === 'bundle' ? 'Export Bundle' : `Export ${format.toUpperCase()}`) : 'Purchase to export'}
        </button>
      </div>

      {lastExport && (
        <p className="text-center text-xs text-emerald-400">
          Downloaded: {lastExport}
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
