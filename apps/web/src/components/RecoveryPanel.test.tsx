import { beforeEach, describe, expect, it } from 'vitest'
import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import RecoveryPanel from './RecoveryPanel'
import { useStudioStore } from '../store'
import { FEATURE_FLAGS } from '../config/flags'
import { guestCommerce } from '../lib/commerceClient'

beforeEach(() => {
  useStudioStore.getState().resetProject()
  useStudioStore.setState({ featureFlags: { ...FEATURE_FLAGS } })
})

async function purchasedRecoveryCode(): Promise<string> {
  const projectId = useStudioStore.getState().project.projectId
  const checkout = await guestCommerce.startCheckout({
    projectId,
    offerId: 'artistic_project',
    idempotencyKey: crypto.randomUUID(),
  })
  await guestCommerce.completeTestPayment(checkout.checkoutSessionId)
  guestCommerce.clearAccess()
  return checkout.recoveryCode!
}

describe('RecoveryPanel', () => {
  it('renders an opaque, non-autofill recovery form', () => {
    render(<RecoveryPanel />)
    const input = screen.getByLabelText('Recovery code')
    expect(input).toHaveAttribute('type', 'password')
    expect(input).toHaveAttribute('autocomplete', 'off')
    expect(screen.getByRole('button', { name: /Recover guest project/i })).toBeDisabled()
  })

  it('recovers paid guest access and rotates the one-time code', async () => {
    const recoveryCode = await purchasedRecoveryCode()
    render(<RecoveryPanel />)
    await userEvent.type(screen.getByLabelText('Recovery code'), recoveryCode)
    await userEvent.click(screen.getByRole('button', { name: /Recover guest project/i }))

    expect(await screen.findByRole('status')).toHaveTextContent('Paid capabilities are active again')
    expect(screen.getByText(/replacement recovery code/i)).toBeInTheDocument()
    expect(useStudioStore.getState().project.entitlement.checkoutStatus).toBe('succeeded')
    expect(localStorage.getItem(recoveryCode)).toBeNull()
  })

  it('rejects invalid, expired, and replayed recovery capabilities', async () => {
    const user = userEvent.setup()
    const recoveryCode = await purchasedRecoveryCode()
    render(<RecoveryPanel />)
    const input = screen.getByLabelText('Recovery code')

    await user.type(input, 'invalid-recovery-code')
    await user.click(screen.getByRole('button', { name: /Recover guest project/i }))
    expect(await screen.findByRole('alert')).toHaveTextContent('invalid')

    await user.clear(input)
    await user.type(input, recoveryCode)
    await user.click(screen.getByRole('button', { name: /Recover guest project/i }))
    expect(await screen.findByRole('status')).toHaveTextContent('active again')

    await user.type(input, recoveryCode)
    await user.click(screen.getByRole('button', { name: /Recover guest project/i }))
    expect(await screen.findByRole('alert')).toHaveTextContent('already used')

    const expiredCode = await purchasedRecoveryCode()
    // Re-establish access only to target the current mock project, then expire its code.
    const currentId = useStudioStore.getState().project.projectId
    guestCommerce.grantPaidTestAccess(currentId)
    // The expiry helper targets active project; start a dedicated checkout so code maps to it.
    const expiredCheckout = await guestCommerce.startCheckout({
      projectId: `${currentId}-expired`,
      offerId: 'artistic_project',
      idempotencyKey: crypto.randomUUID(),
    })
    await guestCommerce.completeTestPayment(expiredCheckout.checkoutSessionId)
    guestCommerce.expireRecoveryForTest()
    guestCommerce.clearAccess()
    await user.clear(input)
    await user.type(input, expiredCheckout.recoveryCode ?? expiredCode)
    await user.click(screen.getByRole('button', { name: /Recover guest project/i }))
    expect(await screen.findByRole('alert')).toHaveTextContent('expired')
  })
})
