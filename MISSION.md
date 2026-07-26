# MISSION — Agent 6 (qr-checkout)
**Branch:** `ws/06-guest-commerce`
**Status:** STARTED — contracts frozen

## Your scope
1. `services/commerce/` — Guest-only checkout (no accounts)
2. $12 project purchase flow: up to 12 candidates / 3 rounds / 1 artwork / all formats
3. $5 contextual upsell: 8 more candidates + 1 additional artwork
4. Stripe test-mode integration with signed webhook verification
5. Opaque guest project-access recovery (no identity required)

## Constraints
- Guest-only. No customer accounts.
- Browser return alone never unlocks paid features — only verified webhooks
- Idempotency keys on all checkout creation
- Free preview: 4 candidates, no export

## Start signal
Begin coding immediately. Push commits to `ws/06-guest-commerce`.
