import { beforeEach, describe, expect, it, vi } from 'vitest'
import { exportToEps } from './exportFormats'

describe('exportToEps', () => {
  let capturedBlob: Blob | undefined

  beforeEach(() => {
    capturedBlob = undefined
    Object.defineProperty(URL, 'createObjectURL', {
      configurable: true,
      value: vi.fn((value: Blob | MediaSource) => {
        if (!(value instanceof Blob)) throw new Error('Expected Blob')
        capturedBlob = value
        return 'blob:eps-test'
      }),
    })
    Object.defineProperty(URL, 'revokeObjectURL', {
      configurable: true,
      value: vi.fn(),
    })
    vi.spyOn(HTMLAnchorElement.prototype, 'click').mockImplementation(() => undefined)
  })

  it('embeds the exact RGB artwork bytes in a binary EPS', async () => {
    const rgb = new Uint8Array([255, 0, 0, 0, 255, 0])

    exportToEps(rgb, {
      filename: 'two-pixels.eps',
      widthPx: 2,
      heightPx: 1,
    })

    expect(capturedBlob).toBeDefined()
    const bytes = await new Promise<Uint8Array>((resolve, reject) => {
      const reader = new FileReader()
      reader.onerror = () => reject(reader.error)
      reader.onload = () => resolve(new Uint8Array(reader.result as ArrayBuffer))
      reader.readAsArrayBuffer(capturedBlob!)
    })
    const headerText = new TextDecoder('latin1').decode(bytes.subarray(0, 512))
    const marker = '%%BeginBinary: 6\n'
    const markerOffset = headerText.indexOf(marker)
    expect(markerOffset).toBeGreaterThan(0)
    const binaryOffset = markerOffset + marker.length
    expect(Array.from(bytes.subarray(binaryOffset, binaryOffset + rgb.length))).toEqual(Array.from(rgb))
    expect(headerText).toContain('%%BoundingBox: 0 0 2 1')
  })

  it('rejects RGB buffers whose size does not match the canvas', () => {
    expect(() => exportToEps(new Uint8Array(5), {
      filename: 'invalid.eps',
      widthPx: 2,
      heightPx: 1,
    })).toThrow('does not match 6')
  })
})
