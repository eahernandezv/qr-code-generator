import React from 'react'
import { useStudioStore } from '../store'
import {
  COMMERCE_OFFERS,
  COMMERCE_TEST_MODE,
  guestCommerce,
  type CheckoutView,
  type CommerceOfferId,
} from '../lib/commerceClient'

const CheckoutPanel: React.FC = () => {
  const { project, featureFlags, setCheckoutStatus, syncCommerceEntitlement } = useStudioStore()
  const entitlement = project.entitlement
  const [checkout, setCheckout] = React.useState<CheckoutView | null>(null)
  const [busy, setBusy] = React.useState(false)
  const [error, setError] = React.useState<string | null>(null)
  const [recoveryCode, setRecoveryCode] = React.useState<string | null>(null)

  if (!featureFlags.artistic_checkout_enabled) return null

  const beginCheckout = async (offerId: CommerceOfferId) => {
    setBusy(true)
    setError(null)
    setCheckoutStatus('pending')
    try {
      const result = await guestCommerce.startCheckout({
        projectId: project.projectId,
        offerId,
        idempotencyKey: `${offerId}:${crypto.randomUUID()}`,
      })
      setCheckout(result)
      if (result.recoveryCode) setRecoveryCode(result.recoveryCode)
    } catch (checkoutError) {
      setCheckoutStatus('failed')
      setError(checkoutError instanceof Error ? checkoutError.message : 'Checkout could not start.')
    } finally {
      setBusy(false)
    }
  }

  const completePayment = async () => {
    if (!checkout) return
    setBusy(true)
    setError(null)
    setCheckoutStatus('pending')
    try {
      const authoritative = await guestCommerce.completeTestPayment(checkout.checkoutSessionId)
      syncCommerceEntitlement(authoritative)
      setCheckout(guestCommerce.checkout(checkout.checkoutSessionId))
    } catch (paymentError) {
      setCheckoutStatus('failed')
      setError(paymentError instanceof Error ? paymentError.message : 'Payment confirmation failed.')
    } finally {
      setBusy(false)
    }
  }

  const refreshPayment = async () => {
    if (!checkout) return
    setBusy(true); setError(null)
    try {
      const refreshed = await guestCommerce.refreshCheckout(checkout.checkoutSessionId)
      setCheckout(refreshed.checkout)
      if (refreshed.entitlement) syncCommerceEntitlement(refreshed.entitlement)
      else setCheckoutStatus(refreshed.checkout.status)
    } catch (paymentError) {
      setError(paymentError instanceof Error ? paymentError.message : 'Payment status is unavailable.')
    } finally { setBusy(false) }
  }

  const markTerminal = async (status: 'failed' | 'canceled') => {
    if (!checkout) return
    await guestCommerce.setTestPaymentStatus(checkout.checkoutSessionId, status)
    setCheckoutStatus(status)
    setCheckout(guestCommerce.checkout(checkout.checkoutSessionId))
  }

  const isPaid = entitlement.checkoutStatus === 'succeeded'
  const isPending = busy || entitlement.checkoutStatus === 'pending'
  const extraAvailable = isPaid && entitlement.extraExplorationAvailable
  const activeCheckoutPending = checkout?.status === 'pending'

  return (
    <section className="rounded-2xl border border-slate-800 bg-slate-900/60 p-4 md:p-6" aria-labelledby="purchase-heading">
      <div className="mb-4 flex items-start justify-between gap-3">
        <div>
          <h2 id="purchase-heading" className="text-sm font-semibold uppercase tracking-wider text-slate-400">Purchase</h2>
          <p className="mt-1 text-xs text-slate-500">Guest checkout · no account or subscription</p>
        </div>
        <span className={`rounded-full px-2 py-0.5 text-[10px] font-medium ${
          isPaid ? 'bg-emerald-950/40 text-emerald-300' : isPending ? 'bg-amber-950/40 text-amber-300' : 'bg-slate-800 text-slate-400'
        }`}>
          {isPaid ? 'Paid access active' : isPending ? 'Payment pending' : 'Free preview'}
        </span>
      </div>

      <div className="mb-4 grid grid-cols-2 gap-2 text-xs">
        <div className="rounded-lg bg-slate-950/50 p-3">
          <span className="block text-slate-500">Successful rounds</span>
          <strong className="text-slate-200">{entitlement.usedRounds} / {entitlement.maxRounds}</strong>
        </div>
        <div className="rounded-lg bg-slate-950/50 p-3">
          <span className="block text-slate-500">Candidates</span>
          <strong className="text-slate-200">{entitlement.candidatesConsumed ?? 0} / {entitlement.maxCandidates}</strong>
        </div>
      </div>

      {!isPaid && !activeCheckoutPending && (
        <div className="space-y-2">
          <button
            type="button"
            disabled={busy}
            onClick={() => void beginCheckout('artistic_project')}
            className="w-full rounded-lg bg-studio-600 px-3 py-2.5 text-sm font-semibold text-white hover:bg-studio-500 disabled:cursor-not-allowed disabled:bg-slate-800"
          >
            Start guest checkout — $12
          </button>
          <p className="text-center text-[10px] text-slate-500">12 candidates · 3 rounds · 1 finished artwork · all formats</p>
        </div>
      )}

      {activeCheckoutPending && (
        <div className="space-y-2 rounded-lg border border-amber-900/40 bg-amber-950/20 p-3">
          <p role="status" aria-live="polite" className="text-xs text-amber-200">
            {busy ? 'Waiting for payment confirmation…' : 'Checkout created. Confirmation may take a moment.'}
          </p>
          {COMMERCE_TEST_MODE ? (
            <>
              <button type="button" disabled={busy} onClick={() => void completePayment()} className="w-full rounded-lg bg-studio-600 px-3 py-2 text-xs font-semibold text-white hover:bg-studio-500 disabled:bg-slate-800">Complete test payment</button>
              <div className="grid grid-cols-2 gap-2">
                <button type="button" disabled={busy} onClick={() => void markTerminal('failed')} className="rounded-lg border border-red-900/50 px-2 py-2 text-xs text-red-300 disabled:opacity-50">Simulate failure</button>
                <button type="button" disabled={busy} onClick={() => void markTerminal('canceled')} className="rounded-lg border border-slate-700 px-2 py-2 text-xs text-slate-300 disabled:opacity-50">Cancel checkout</button>
              </div>
            </>
          ) : (
            <button type="button" disabled={busy} onClick={() => void refreshPayment()} className="w-full rounded-lg border border-studio-600/50 px-3 py-2 text-xs font-semibold text-studio-200 disabled:opacity-50">Check payment status</button>
          )}
        </div>
      )}

      {(entitlement.checkoutStatus === 'failed' || entitlement.checkoutStatus === 'canceled') && !activeCheckoutPending && (
        <div className="space-y-2 rounded-lg border border-red-900/40 bg-red-950/20 p-3">
          {!error && (
            <p role="alert" className="text-xs text-red-300">
              {entitlement.checkoutStatus === 'canceled' ? 'Checkout canceled. No allowance was granted.' : 'Payment failed. No allowance was granted.'}
            </p>
          )}
          <button type="button" onClick={() => void beginCheckout(checkout?.offerId ?? 'artistic_project')} className="w-full rounded-lg border border-red-800 px-3 py-2 text-xs font-semibold text-red-200">
            Retry checkout safely
          </button>
        </div>
      )}

      {extraAvailable && !activeCheckoutPending && (
        <button
          type="button"
          disabled={busy}
          onClick={() => void beginCheckout('extra_exploration')}
          className="w-full rounded-lg border border-studio-600/50 bg-studio-950/30 px-3 py-2.5 text-xs font-semibold text-studio-200 hover:bg-studio-950/50 disabled:opacity-50"
        >
          Extra Exploration — $5 · +8 candidates · +1 artwork
        </button>
      )}

      {isPaid && !entitlement.extraExplorationAvailable && (
        <p className="text-xs text-emerald-300">Extra Exploration active: 8 additional candidates and one additional finished artwork.</p>
      )}

      {recoveryCode && (
        <div className="mt-3 rounded-lg border border-sky-900/40 bg-sky-950/20 p-3">
          <p className="text-xs font-medium text-sky-200">Save this one-time recovery code</p>
          <code className="mt-1 block break-all rounded bg-slate-950 p-2 text-[10px] text-slate-300">{recoveryCode}</code>
          <button type="button" onClick={() => setRecoveryCode(null)} className="mt-2 text-[10px] text-sky-300 underline">I saved it — hide code</button>
        </div>
      )}

      {error && <p role="alert" className="mt-3 text-xs text-red-300">{error}</p>}
      <p className="mt-3 text-[10px] text-slate-600">
        {COMMERCE_TEST_MODE ? 'Local test-payment adapter. No charge is made.' : 'Payment and export access are verified by the commerce service.'} Purchase does not imply scan validation.
      </p>
      <span className="sr-only">Project price {COMMERCE_OFFERS.artistic_project.amountCents / 100} dollars</span>
    </section>
  )
}

export default CheckoutPanel
