import { describe, it, expect, beforeEach } from 'vitest'
import { render, screen, act, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import RecoveryPanel from './RecoveryPanel'
import { useStudioStore } from '../store'
import { FEATURE_FLAGS } from '../config/flags'

function resetStore() {
  const { resetProject } = useStudioStore.getState()
  resetProject()
  useStudioStore.setState({ featureFlags: { ...FEATURE_FLAGS } })
}

describe('RecoveryPanel', () => {
  beforeEach(() => {
    resetStore()
    localStorage.clear()
  })

  it('renders recovery form', () => {
    render(<RecoveryPanel />)
    expect(screen.getByPlaceholderText(/project-id or recovery-token/i)).toBeInTheDocument()
    expect(screen.getByRole('button', { name: /Recover Project/i })).toBeInTheDocument()
  })

  it('shows invalid status for empty input when form submitted directly', async () => {
    render(<RecoveryPanel />)
    const form = screen.getByRole('button', { name: /Recover Project/i }).closest('form')!
    await act(async () => {
      // Submit form bypassing disabled button (accessibility edge-case)
      form.dispatchEvent(new Event('submit', { bubbles: true, cancelable: true }))
    })
    expect(screen.getByText(/Invalid project ID or token/i)).toBeInTheDocument()
  })

  it('recovers project from localStorage', async () => {
    const recovered = {
      projectId: 'recovered-123',
      payload: { raw: 'https://example.com', normalized: 'https://example.com', mode: 'url' },
      artDirection: {
        templateId: 'geometric',
        artisticStrength: 0.7,
        composition: 'centered',
        protectedQrProminence: 0.8,
        palette: { primary: '#ff0000', secondary: '#00ff00', accent: '#0000ff' },
      },
      style: { foreground: '#000000', background: '#ffffff', margin: 2, eyeStyle: 'circle', moduleStyle: 'dot' },
      boards: [],
      entitlement: { type: 'project', maxRounds: 3, usedRounds: 1, maxCandidates: 4, exportAllowed: true },
      createdAt: '2024-01-01T00:00:00Z',
      updatedAt: '2024-01-01T00:00:00Z',
    }
    localStorage.setItem('qr-studio-recovery-recovered-123', JSON.stringify(recovered))

    render(<RecoveryPanel />)
    const input = screen.getByPlaceholderText(/project-id or recovery-token/i)
    await act(async () => {
      await userEvent.type(input, 'recovered-123')
    })
    await act(async () => {
      await userEvent.click(screen.getByRole('button', { name: /Recover Project/i }))
    })

    // "Recovered project " + projectId.slice(0,8) = "Recovered project recovered" ... slice(0,8) => "recovere"
    expect(screen.getByText(/Recovered project recovere/i)).toBeInTheDocument()
    const state = useStudioStore.getState()
    expect(state.project.projectId).toBe('recovered-123')
    expect(state.project.entitlement.exportAllowed).toBe(true)
  })

  it('shows not found for missing localStorage entry', async () => {
    render(<RecoveryPanel />)
    const input = screen.getByPlaceholderText(/project-id or recovery-token/i)
    await act(async () => {
      await userEvent.type(input, 'missing-id')
    })
    await act(async () => {
      await userEvent.click(screen.getByRole('button', { name: /Recover Project/i }))
    })

    await waitFor(() => {
      expect(screen.getByText(/Project not found/i)).toBeInTheDocument()
    }, { timeout: 2000 })
  })
})
