import React, { useRef, useEffect } from 'react'
import QRCode from 'qrcode'
import { useStudioStore } from '../store'
import type { StyleSpec, ArtDirection } from '../types'

interface QRPreviewProps {
  size?: number
  className?: string
}

function buildDataUrl(
  canvas: HTMLCanvasElement,
  payload: string,
  style: StyleSpec,
  art: ArtDirection,
  size: number
): Promise<string> {
  return new Promise((resolve, reject) => {
    QRCode.toDataURL(payload, {
      width: size,
      margin: style.margin ?? 4,
      color: {
        dark: style.foreground ?? '#181b3a',
        light: style.background ?? '#f0f4ff',
      },
      errorCorrectionLevel: 'H',
    })
      .then((url) => {
        // Apply artistic overlay on a secondary canvas
        const ctx = canvas.getContext('2d')
        if (!ctx) { resolve(url); return }

        const img = new Image()
        img.onload = () => {
          canvas.width = size
          canvas.height = size
          // Base QR
          ctx.drawImage(img, 0, 0, size, size)

          // Apply subtle artistic tint based on palette
          if (art.palette?.primary) {
            ctx.globalCompositeOperation = 'source-atop'
            ctx.fillStyle = art.palette.primary + '18' // 10% opacity hex
            ctx.fillRect(0, 0, size, size)
            ctx.globalCompositeOperation = 'source-over'
          }

          // Add soft corner rounding for eye style
          if (art.templateId === 'rounded' || style.eyeStyle === 'rounded') {
            // Visual hint only — real eye rounding comes from generation
          }

          resolve(canvas.toDataURL('image/png'))
        }
        img.onerror = () => resolve(url)
        img.src = url
      })
      .catch(reject)
  })
}

const QRPreview: React.FC<QRPreviewProps> = ({ size = 320, className = '' }) => {
  const { project } = useStudioStore()
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const [dataUrl, setDataUrl] = React.useState<string>('')
  const [error, setError] = React.useState<string | null>(null)
  const [loading, setLoading] = React.useState(false)

  const { payload, style, artDirection } = project

  useEffect(() => {
    if (!payload.raw.trim()) {
      setDataUrl('')
      setError(null)
      return
    }
    setLoading(true)
    setError(null)
    const canvas = canvasRef.current
    if (!canvas) { setLoading(false); return }

    buildDataUrl(canvas, payload.normalized || payload.raw, style || {}, artDirection, size)
      .then((url) => {
        setDataUrl(url)
        setLoading(false)
      })
      .catch((err) => {
        setError(err?.message || 'Render failed')
        setLoading(false)
      })
  }, [payload.raw, payload.normalized, style, artDirection, size])

  return (
    <div className={`relative flex flex-col items-center ${className}`}>
      <canvas ref={canvasRef} className="hidden" />

      <div
        className="relative flex items-center justify-center rounded-2xl border border-slate-800 bg-slate-900/60"
        style={{ width: size + 32, height: size + 32 }}
      >
        {loading && (
          <div className="absolute inset-0 flex items-center justify-center">
            <div className="h-8 w-8 animate-spin rounded-full border-2 border-slate-700 border-t-studio-500" />
          </div>
        )}

        {!payload.raw.trim() ? (
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
        {payload.raw.trim() ? `Preview · ${size}×${size} px` : ''}
      </p>
    </div>
  )
}

export default QRPreview
