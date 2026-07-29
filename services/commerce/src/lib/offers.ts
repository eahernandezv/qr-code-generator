import type { Offer, OfferId } from '../types.js'

/** Frozen MVP catalog: $12 project and one $5 Extra Exploration add-on. */
export const OFFER_CATALOG: Readonly<Record<OfferId, Offer>> = Object.freeze({
  artistic_project: Object.freeze({
    offer_id: 'artistic_project',
    amount_cents: 1200,
    currency: 'USD',
    total_rounds_allowed: 3,
    total_candidates_allowed: 12,
    exports_allowed: 1,
  }),
  extra_exploration: Object.freeze({
    offer_id: 'extra_exploration',
    amount_cents: 500,
    currency: 'USD',
    total_rounds_allowed: 2,
    total_candidates_allowed: 8,
    exports_allowed: 1,
  }),
})

export function getOffer(offerId: OfferId): Offer {
  return OFFER_CATALOG[offerId]
}
