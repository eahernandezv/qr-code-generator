import React from 'react'
import { useStudioStore } from '../store'
import type { ExportFormat } from '../types'
import { toPng, toSvg } from 'html-to-image'

const FORMATS: { value: ExportFormat; label: string; ext: string; desc: string }[] = [
  { value: 'png', label: 'PNG', ext: '.png', desc: 'High-res raster' },
  { value: 'svg', label: 'SVG', ext: '.svg', desc: 'Scalable vector' },
]

const SIZES = [
  { label: 'Social (512×512)', width: 512, height: 512 },
  { label: 'Small Print (1200×1200)', width: 1200, height: 1200 },
  { label: 'Medium Print (2400×2400)', width: 2400, height: 2400 },
  { label: 'Large Print (3600×3600)', width: 3600, height: 3600 },
]

function triggerDownload(dataUrl: string, filename: string) {
  const a = document.createElement('a')
  a.href = dataUrl
  a.download = filename
  document.body.appendChild(a)
  a.click()
  a.remove()
}

const ExportPanel: React.FC = () => {
  const { project, featureFlags } = useStudioStore()
  const { selectedCandidateId, boards, entitlement } = project

  const [format, setFormat] = React.useState<ExportFormat>('png')
  const [sizeIndex, setSizeIndex] = React.useState(0)
  const [exporting, setExporting] = React.useState(false)
  const [lastExport, setLastExport] = React.useState<string | null>(null)

  const selectedCandidate = boards
    .flatMap((b) => b.candidates)
    .find((c) => c.candidateId === selectedCandidateId)

  const checkoutEnabled = featureFlags.artistic_checkout_enabled
  const canExport =
    checkoutEnabled &&
    (entitlement.exportAllowed || (format === 'png' && SIZES[sizeIndex].width <= 512))

  const handleExport = async () => {
    if (!selectedCandidate || !canExport) return
    setExporting(true)

    try {
      // Build a hidden render node
      const node = document.createElement('div')
      node.style.width = `${SIZES[sizeIndex].width}px`
      node.style.height = `${SIZES[sizeIndex].height}px`
      node.style.background = project.style?.background || '#f0f4ff'
      node.style.display = 'flex'
      node.style.alignItems = 'center'
      node.style.justifyContent = 'center'
      node.style.position = 'absolute'
      node.style.left = '-9999px'
      node.style.top = '-9999px'

      const img = document.createElement('img')
      img.src = selectedCandidate.previewUrl || ''
      img.style.width = '100%'
      img.style.height = '100%'
      img.style.objectFit = 'contain'
      node.appendChild(img)
      document.body.appendChild(node)

      let dataUrl: string
      if (format === 'svg') {
        dataUrl = await toSvg(node, { pixelRatio: 1 })
      } else {
        dataUrl = await toPng(node, { pixelRatio: 1 })
      }
      document.body.removeChild(node)

      const filename = `artistic-qr-${project.projectId.slice(0, 6)}-${SIZES[sizeIndex].label.toLowerCase().replace(/\s/g, '-')}.${format}`
      triggerDownload(dataUrl, filename)
      setLastExport(filename)
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
          <p className="mt-1 text-xs text-slate-500">
            Validation: {selectedCandidate.validationResult.pass ? 'Pass' : 'Fail'} ·
            Confidence {Math.round((selectedCandidate.validationResult.confidence ?? 0) * 100)}%
          </p>
        )}
      </div>

      {/* Format */}
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

      {/* Size */}
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

      {/* Action */}
      <button
        onClick={handleExport}
        disabled={!selectedCandidate || exporting || !canExport}
        className={`w-full rounded-lg py-2.5 text-sm font-semibold transition-colors ${
          !selectedCandidate || exporting || !canExport
            ? 'cursor-not-allowed bg-slate-800 text-slate-500'
            : 'bg-studio-600 text-white hover:bg-studio-500'
        }`}
      >
        {exporting ? 'Exporting…' : canExport ? `Export ${format.toUpperCase()}` : 'Purchase to export'}
      </button>

      {lastExport && (
        <p className="mt-3 text-center text-xs text-emerald-400">
          Downloaded: {lastExport}
        </p>
      )}
    </section>
  )
}

export default ExportPanel
