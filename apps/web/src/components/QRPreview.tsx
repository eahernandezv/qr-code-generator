import React from 'react'
import { useStudioStore } from '../store'
import { buildStudioGenerationRequest, renderStudioPreview } from '../lib/studioGenerationRequest'

interface QRPreviewProps {
  size?: number
  className?: string
  useDemoWhenEmpty?: boolean
}

const DEMO_PAYLOAD = {
  raw: 'https://example.com/your-design',
  normalized: 'https://example.com/your-design',
  mode: 'url' as const,
}

const QRPreview: React.FC<QRPreviewProps> = ({ size = 320, className = '', useDemoWhenEmpty = false }) => {
  const { project } = useStudioStore()
  const [dataUrl, setDataUrl] = React.useState<string>('')
  const [error, setError] = React.useState<string | null>(null)
  const { payload, artDirection } = project
  const isDemo = useDemoWhenEmpty && !payload.raw.trim()
  const previewPayload = isDemo ? DEMO_PAYLOAD : payload

  React.useEffect(() => {
    if (!previewPayload.raw.trim()) {
      setDataUrl('')
      setError(null)
      return
    }

    try {
      const request = buildStudioGenerationRequest({ payload: previewPayload, artDirection })
      const artifact = renderStudioPreview(request)
      // Core B12 squircle/chamfered SVG rows currently repeat an identical `fill`
      // attribute. Browsers reject duplicate XML attributes, so remove only the
      // byte-for-byte duplicate for preview transport without changing geometry,
      // colors, validation, or the authoritative generation/export artifact.
      const browserSvg = artifact.format === 'svg'
        ? artifact.data.replace(/(fill="[^"]+")([^>]*?)\s\1/g, '$1$2')
        : artifact.data
      const url = artifact.format === 'svg'
        ? `data:image/svg+xml;charset=utf-8,${encodeURIComponent(browserSvg)}`
        : artifact.data
      setDataUrl(url)
      setError(null)
    } catch (caught) {
      setDataUrl('')
      setError(caught instanceof Error ? caught.message : 'Render failed')
    }
  }, [previewPayload, artDirection])

  return (
    <div className={`relative flex flex-col items-center ${className}`}>
      <div
        className="relative flex items-center justify-center rounded-2xl border border-slate-800 bg-slate-900/60"
        style={{ width: size + 32, height: size + 32 }}
      >
        {!previewPayload.raw.trim() ? (
          <div className="text-center">
            <p className="text-sm text-slate-500">Enter a payload to preview</p>
          </div>
        ) : dataUrl ? (
          <img
            src={dataUrl}
            alt="QR Preview"
            className="rounded-xl"
            style={{ width: size, height: size, imageRendering: 'pixelated' }}
          />
        ) : null}

        {error && (
          <div className="absolute bottom-3 left-3 right-3 rounded-lg bg-red-950/60 px-3 py-2 text-xs text-red-300">
            {error}
          </div>
        )}
      </div>

      <p className="mt-2 text-xs text-slate-500">
        {previewPayload.raw.trim() ? `${isDemo ? 'Demo destination' : 'Predictive Core preview'} · ${size}×${size} px` : ''}
      </p>
    </div>
  )
}

export default QRPreview
