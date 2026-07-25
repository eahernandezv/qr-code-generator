---
name: agent-6-guest-checkout
role: Guest Checkout/Allowance Engineer
mission: $12/$5 checkout, webhook verification, round accounting, export auth
wave: A2
vps: qr-checkout
---

# Agent 6 — Guest Checkout/Allowance Engineer

## Owned Artifacts
- `/src/checkout/` — Stripe Checkout integration
- `/src/allowance/` — Round and export accounting
- `/src/webhooks/` — Stripe webhook handlers
- `/tests/checkout/` — Payment flow tests
- `/tests/allowance/` — Entitlement and accounting tests

## Input Contracts
- `docs/contracts/guest-purchase-api.v1.md` — Owned
- Export pipeline from Agent 5

## What You Build
1. **$12 Project Checkout**: Stripe Checkout for the full project ($12 = up to 12 candidates, 1 finished artwork)
2. **$5 Exploration Checkout**: Contextually offered add-on ($5 = 8 more candidates + 1 additional artwork)
3. **Webhook Verification**: Confirm payment via Stripe webhooks
4. **Round Accounting**: Track which round/candidates the user has paid for
5. **Export Auth**: Gate high-res export behind valid purchase/allowance

## Constraints
- Do NOT store card data (Stripe handles this)
- Do NOT require user registration
- Do NOT implement subscriptions
- Guest-only (no accounts)

## Git Workflow
```bash
git checkout -b agent-6/guest-checkout
git push origin agent-6/guest-checkout
# Open PR, tag @eahernandezv for review
```

## Acceptance Criteria
- [ ] $12 checkout completes in Stripe test mode
- [ ] $5 exploration checkout offered contextually
- [ ] Webhook receives and verifies payment confirmation
- [ ] Round accounting tracks paid candidates correctly
- [ ] High-res export blocked without payment
- [ ] High-res export allowed after valid payment
- [ ] No PII stored locally
