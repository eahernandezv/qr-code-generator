import { beforeEach, describe, expect, it } from 'vitest'
import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import CheckoutPanel from './CheckoutPanel'
import { useStudioStore } from '../store'
import { FEATURE_FLAGS } from '../config/flags'
import { guestCommerce } from '../lib/commerceClient'

beforeEach(() => {
  guestCommerce.reset()
  useStudioStore.getState().resetProject()
  useStudioStore.setState({
    featureFlags: { ...FEATURE_FLAGS, artistic_checkout_enabled: true },
  })
})

describe('CheckoutPanel', () => {
  it('preserves the provider redirect URL in the checkout view', async () => {
    const checkout = await guestCommerce.startCheckout({
      projectId: useStudioStore.getState().project.projectId,
      offerId: 'artistic_project',
      idempotencyKey: crypto.randomUUID(),
    })

    expect(checkout.redirectUrl).toBe(`mock-checkout:${checkout.checkoutSessionId}`)
    expect(guestCommerce.checkout(checkout.checkoutSessionId).redirectUrl).toBe(checkout.redirectUrl)
  })

  it('is completely hidden when artistic checkout is disabled', () => {
    useStudioStore.setState({ featureFlags: { ...FEATURE_FLAGS, artistic_checkout_enabled: false } })
    const { container } = render(<CheckoutPanel />)
    expect(container).toBeEmptyDOMElement()
  })

  it('runs $12 test checkout through pending to authoritative paid unlock', async () => {
    const user = userEvent.setup()
    render(<CheckoutPanel />)
    expect(screen.getByText(/12 candidates · 3 rounds · 1 finished artwork/i)).toBeInTheDocument()
    await user.click(screen.getByRole('button', { name: /Start guest checkout — \$12/i }))
    expect(await screen.findByText(/Checkout created/i)).toBeInTheDocument()
    expect(screen.getByRole('link', { name: 'Continue to secure checkout' })).toHaveAttribute(
      'href',
      expect.stringMatching(/^mock-checkout:checkout_/),
    )
    expect(screen.getByRole('link', { name: 'Continue to secure checkout' })).toHaveAttribute('target', '_blank')
    const recoveryCode = screen.getByText((_, element) => element?.tagName === 'CODE').textContent!
    expect(JSON.stringify(localStorage)).not.toContain(recoveryCode)

    await user.click(screen.getByRole('button', { name: /Complete test payment/i }))
    expect(await screen.findByText('Paid access active')).toBeInTheDocument()
    expect(useStudioStore.getState().project.entitlement).toMatchObject({
      maxRounds: 3,
      maxCandidates: 12,
      exportsAllowed: 1,
      checkoutStatus: 'succeeded',
      extraExplorationAvailable: true,
    })
  })

  it('supports failed and canceled checkout without granting allowance, then safe retry', async () => {
    const user = userEvent.setup()
    render(<CheckoutPanel />)
    await user.click(screen.getByRole('button', { name: /Start guest checkout/i }))
    await user.click(screen.getByRole('button', { name: /Simulate failure/i }))
    expect(await screen.findByRole('alert')).toHaveTextContent('No allowance was granted')
    expect(useStudioStore.getState().project.entitlement.usedRounds).toBe(0)

    await user.click(screen.getByRole('button', { name: /Retry checkout safely/i }))
    await user.click(screen.getByRole('button', { name: /Cancel checkout/i }))
    expect(await screen.findByRole('alert')).toHaveTextContent('Checkout canceled')
    expect(useStudioStore.getState().project.entitlement.exportAllowed).toBe(false)
  })

  it('surfaces provider errors and allows a clean retry', async () => {
    guestCommerce.failProviderOnce()
    const user = userEvent.setup()
    render(<CheckoutPanel />)
    await user.click(screen.getByRole('button', { name: /Start guest checkout/i }))
    expect(await screen.findByRole('alert')).toHaveTextContent('temporarily unavailable')
    await user.click(screen.getByRole('button', { name: /Retry checkout safely/i }))
    expect(await screen.findByText(/Checkout created/i)).toBeInTheDocument()
  })

  it('grants exactly +8 candidates and +1 artwork for the $5 add-on', async () => {
    const user = userEvent.setup()
    render(<CheckoutPanel />)
    await user.click(screen.getByRole('button', { name: /Start guest checkout/i }))
    await user.click(screen.getByRole('button', { name: /Complete test payment/i }))
    await screen.findByText('Paid access active')

    await user.click(screen.getByRole('button', { name: /Extra Exploration — \$5/i }))
    await user.click(screen.getByRole('button', { name: /Complete test payment/i }))
    expect(await screen.findByText(/Extra Exploration active/i)).toBeInTheDocument()
    expect(useStudioStore.getState().project.entitlement).toMatchObject({
      maxRounds: 5,
      maxCandidates: 20,
      exportsAllowed: 2,
      extraExplorationAvailable: false,
    })
  })
})
