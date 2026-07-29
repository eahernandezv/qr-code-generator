import { describe, it, expect, beforeEach } from 'vitest'
import { render, screen, act } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { useStudioStore } from './store'
import { FEATURE_FLAGS } from './config/flags'

function resetStore() {
  useStudioStore.getState().resetProject()
  useStudioStore.setState({ featureFlags: { ...FEATURE_FLAGS } })
}

/**
 * Focus-trap and escape-close accessibility tests for the Print Preview modal.
 * These validate that the overlay meets WCAG 2.1 dialog pattern expectations.
 */
describe('Accessibility — Print Preview Modal', () => {
  let ExportPanel: typeof import('./components/ExportPanel').default

  beforeEach(async () => {
    resetStore()
    // Lazy import so mocks that depend on store state are fresh
    const mod = await import('./components/ExportPanel')
    ExportPanel = mod.default
  })


  it('sets focus on the Close button when opened', async () => {
    // Seed a candidate so preview button is enabled
    const s = useStudioStore.getState()
    s.setPayload({ raw: 'https://example.com', normalized: 'https://example.com', mode: 'url' })
    s.addBoard({
      boardId: 'b1',
      projectId: s.project.projectId,
      roundNumber: 1,
      candidates: [{
        candidateId: 'c1',
        projectId: s.project.projectId,
        status: 'ready',
        previewUrl: 'data:image/png;base64,abc',
        createdAt: new Date().toISOString(),
      }],
      status: 'complete',
      createdAt: new Date().toISOString(),
      completedAt: new Date().toISOString(),
    })
    s.selectCandidate('c1')

    render(<ExportPanel />)
    const previewBtn = screen.getByRole('button', { name: /Preview at size/i })
    await act(async () => {
      await userEvent.click(previewBtn)
    })

    const closeBtn = screen.getByRole('button', { name: /Close/i })
    expect(document.activeElement).toBe(closeBtn)
  })

  it('closes the modal on Escape key press and restores focus', async () => {
    const s = useStudioStore.getState()
    s.setPayload({ raw: 'https://example.com', normalized: 'https://example.com', mode: 'url' })
    s.addBoard({
      boardId: 'b1',
      projectId: s.project.projectId,
      roundNumber: 1,
      candidates: [{
        candidateId: 'c1',
        projectId: s.project.projectId,
        status: 'ready',
        previewUrl: 'data:image/png;base64,abc',
        createdAt: new Date().toISOString(),
      }],
      status: 'complete',
      createdAt: new Date().toISOString(),
      completedAt: new Date().toISOString(),
    })
    s.selectCandidate('c1')

    render(<ExportPanel />)
    const previewBtn = screen.getByRole('button', { name: /Preview at size/i })
    await act(async () => {
      await userEvent.click(previewBtn)
    })

    expect(screen.getByRole('dialog')).toBeInTheDocument()

    await act(async () => {
      await userEvent.keyboard('{Escape}')
    })

    expect(screen.queryByRole('dialog')).not.toBeInTheDocument()
    expect(document.activeElement).toBe(previewBtn)
  })

  it('marks the modal with role=dialog and aria-modal=true', async () => {
    const s = useStudioStore.getState()
    s.setPayload({ raw: 'https://example.com', normalized: 'https://example.com', mode: 'url' })
    s.addBoard({
      boardId: 'b1',
      projectId: s.project.projectId,
      roundNumber: 1,
      candidates: [{
        candidateId: 'c1',
        projectId: s.project.projectId,
        status: 'ready',
        previewUrl: 'data:image/png;base64,abc',
        createdAt: new Date().toISOString(),
      }],
      status: 'complete',
      createdAt: new Date().toISOString(),
      completedAt: new Date().toISOString(),
    })
    s.selectCandidate('c1')

    render(<ExportPanel />)
    await act(async () => {
      await userEvent.click(screen.getByRole('button', { name: /Preview at size/i }))
    })

    const dialog = screen.getByRole('dialog')
    expect(dialog).toHaveAttribute('aria-modal', 'true')
    expect(dialog).toHaveAttribute('aria-labelledby', 'print-preview-title')
  })
})

describe('Accessibility — CandidateBoard', () => {
  let CandidateBoard: typeof import('./components/CandidateBoard').default

  beforeEach(async () => {
    resetStore()
    const mod = await import('./components/CandidateBoard')
    CandidateBoard = mod.default
  })

  it('disables Generate button and exposes accessible disabled state', () => {
    render(<CandidateBoard />)
    const btn = screen.getByRole('button', { name: /Generation offline/i })
    expect(btn).toBeDisabled()
  })
})
