import { describe, it, expect, beforeEach, vi } from 'vitest'
import { render, screen } from '@testing-library/react'
import App from './App'
import { useStudioStore } from './store'
import { FEATURE_FLAGS } from './config/flags'

vi.mock('html-to-image', async () => ({
  toPng: vi.fn(() => Promise.resolve('data:image/png;base64,mocked')),
  toSvg: vi.fn(() => Promise.resolve('data:image/svg+xml;base64,mocked')),
}))

vi.mock('./lib/exportFormats', async () => ({
  exportToPdf: vi.fn(() => Promise.resolve()),
  exportToEps: vi.fn(() => Promise.resolve()),
}))

function resetStore() {
  useStudioStore.getState().resetProject()
  useStudioStore.setState({ featureFlags: { ...FEATURE_FLAGS } })
}

describe('App integration', () => {
  beforeEach(() => {
    resetStore()
  })

  it('renders main studio sections', () => {
    render(<App />)
    expect(screen.getByRole('heading', { name: /Artistic QR Studio/i })).toBeInTheDocument()
    expect(screen.getByRole('heading', { name: /Payload/i })).toBeInTheDocument()
    expect(screen.getByRole('heading', { name: /Art Direction/i })).toBeInTheDocument()
    expect(screen.getByRole('heading', { name: /Candidates/i })).toBeInTheDocument()
    expect(screen.getByRole('heading', { name: /Export/i })).toBeInTheDocument()
    expect(screen.getByRole('heading', { name: /Recover Project/i })).toBeInTheDocument()
  })
})
