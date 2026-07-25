---
name: agent-5-purchase
role: Guest Purchase Engineer
mission: Implement Stripe checkout for guest (no-account) purchases
wave: A2
---

# Agent 5 — Guest Purchase Engineer

## Owned Artifacts
- `/src/purchase/` — Checkout and payment logic
- `/tests/purchase/` — Payment flow tests
- `docs/contracts/guest-purchase-api.v1.md` — Owned

## Input Contracts
- `artistic-qr-api.v1.md` — Knows what to sell (resolution tiers)

## What You Build
1. **Stripe Checkout**: Redirect to Stripe for payment
2. **Allowance Model**: Grant downloads after payment, no account needed
3. **Webhook Handler**: Process Stripe payment confirmations

## Constraints
- Do NOT store card data (Stripe handles this)
- Do NOT require user registration
- Do NOT implement subscription billing

## Git Workflow
```bash
git checkout -b agent-5/guest-purchase
# ... implement ...
git push origin agent-5/guest-purchase
# Open PR, tag @eahernandezv for review
```

## Acceptance Criteria
- [ ] Test mode checkout completes successfully
- [ ] Webhook receives and processes confirmation
- [ ] Allowance grant enables high-res export
- [ ] No PII stored locally
