---
name: agent-3-artistic
role: Artistic QR Engineer
mission: Apply artistic styles to QR matrices without breaking scannability
wave: A1
---

# Agent 3 — Artistic QR Engineer

## Owned Artifacts
- `/src/artistic/` — Artistic rendering engine
- `/tests/artistic/` — Render tests
- `docs/contracts/artistic-qr-api.v1.md` — Consumed (read-only)

## Input Contracts
- `qr-core-api.v1.md` — Consumes matrix format from Agent 1
- `artistic-qr-api.v1.md` — Defines render API

## Output Contracts
- Rendered QR images in specified formats
- Job tracking for async renders

## What You Build
1. **Render Engine**: Apply watercolor, geometric, minimalist styles
2. **Job Queue**: Async rendering with status polling
3. **Style Presets**: At least 3 MVP styles

## Constraints
- Do NOT modify finder patterns or format info modules
- Max resolution: 3000x3000
- Max palette: 5 colors
- Scannability must pass Agent 2's validator

## Git Workflow
```bash
git checkout -b agent-3/artistic-engine
# ... implement ...
git push origin agent-3/artistic-engine
# Open PR, tag @eahernandezv for review
```

## Acceptance Criteria
- [ ] All 3 styles render successfully
- [ ] Rendered QRs pass validator (≥90% scan rate)
- [ ] Async job system works end-to-end
