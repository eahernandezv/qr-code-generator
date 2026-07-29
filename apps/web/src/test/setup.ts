import { cleanup } from '@testing-library/react'
import '@testing-library/jest-dom/vitest'
import { afterEach, beforeEach, vi } from 'vitest'
import { guestCommerce } from '../lib/commerceClient'

Object.defineProperty(globalThis, 'IS_REACT_ACT_ENVIRONMENT', {
  configurable: true,
  writable: true,
  value: true,
})

// Mock window.matchMedia
Object.defineProperty(window, 'matchMedia', {
  writable: true,
  value: vi.fn().mockImplementation((query: string) => ({
    matches: false,
    media: query,
    onchange: null,
    addListener: vi.fn(),
    removeListener: vi.fn(),
    addEventListener: vi.fn(),
    removeEventListener: vi.fn(),
    dispatchEvent: vi.fn(),
  })),
})

Object.defineProperties(HTMLImageElement.prototype, {
  complete: { configurable: true, get: () => true },
  naturalWidth: { configurable: true, get: () => 512 },
  decode: { configurable: true, value: vi.fn(() => Promise.resolve()) },
})

// Minimal HTMLCanvasElement 2D context mock for happy-dom
const mockCanvasContext = {
  createLinearGradient: vi.fn(() => ({
    addColorStop: vi.fn(),
  })),
  fillRect: vi.fn(),
  clearRect: vi.fn(),
  drawImage: vi.fn(),
  fillStyle: '',
  globalCompositeOperation: 'source-over',
} as unknown as CanvasRenderingContext2D

beforeEach(() => {
  localStorage.clear()
  guestCommerce.reset()
  const globalCtx = globalThis as any
  if (globalCtx.HTMLCanvasElement) {
    globalCtx.HTMLCanvasElement.prototype.getContext = function (contextId: string) {
      if (contextId === '2d') return mockCanvasContext
      return null
    }
    globalCtx.HTMLCanvasElement.prototype.toDataURL = vi.fn(() => 'data:image/png;base64,mocked')
  }
  // Ensure Image triggers onload immediately for data URLs in tests
  if (globalCtx.Image) {
    const OriginalImage = globalCtx.Image
    globalCtx.Image = class extends OriginalImage {
      constructor(width?: number, height?: number) {
        super(width, height)
        const origSrcDescriptor = Object.getOwnPropertyDescriptor(this, 'src') || Object.getOwnPropertyDescriptor(OriginalImage.prototype, 'src')
        Object.defineProperty(this, 'src', {
          configurable: true,
          set(value: string) {
            origSrcDescriptor?.set?.call(this, value)
            if (typeof value === 'string' && value.startsWith('data:')) {
              queueMicrotask(() => {
                if (typeof this.onload === 'function') this.onload(new Event('load'))
              })
            }
          },
          get() {
            return origSrcDescriptor?.get?.call(this) || ''
          },
        })
      }
    }
  }
})

// Clean up DOM after each test
afterEach(() => {
  cleanup()
  localStorage.clear()
})
