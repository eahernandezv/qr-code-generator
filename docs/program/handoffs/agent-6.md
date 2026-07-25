---
name: agent-6-entitlement
role: Entitlement Engineer
mission: Gate high-resolution exports behind purchase or allowance
wave: A2
---

# Agent 6 — Entitlement Engineer

## Owned Artifacts
- `/src/entitlement/` — Resolution gating logic
- `/tests/entitlement/` — Gate tests

## Input Contracts
- `guest-purchase-api.v1.md` — Consumes payment status
- `artistic-qr-api.v1.md` — Knows resolution tiers

## What You Build
1. **Resolution Gate**: Low-res free, high-res requires purchase
2. **Allowance Check**: Verify valid purchase before high-res export
3. **Quota Tracking**: Count allowances per session/purchase

## Constraints
- Do NOT modify payment flow (Agent 5 owns that)
- Do NOT modify export logic (Agent 4 owns that)
- Guest-only (no user accounts)

## Git Workflow
```bash
git checkout -b agent-6/entitlement-gate
# ... implement ...
git push origin agent-6/entitlement-gate
# Open PR, tag @eahernandezv for review
```

## Acceptance Criteria
- [ ] Low-res export allowed without purchase
- [ ] High-res export blocked without valid allowance
- [ ] High-res export allowed after successful purchase
- [ ] Quota limits enforced correctly
