---
name: agent-5-web-studio-export
role: Web Studio/Export Engineer
mission: Responsive app, composition, print preview, PNG/SVG export
wave: A1–A2
vps: qr-studio
---

# Agent 5 — Web Studio/Export Engineer

## Owned Artifacts
- `/src/web/` — Responsive web application
- `/src/web/composition/` — Layout and composition engine
- `/src/exporter/` — PNG, SVG export pipeline
- `/tests/web/` — Frontend tests
- `/tests/exporter/` — Export format tests

## Input Contracts
- Design tokens from Agent 2
- QR matrix from Agent 3
- Rendered candidates from Agent 4
- Entitlement rules from Agent 6

## What You Build
1. **Responsive Studio App**: Editor that works on mobile and desktop
2. **Composition Engine**: Arrange QR + artistic overlay correctly
3. **Print Preview**: Show how the QR will look at print size
4. **PNG Export**: High-resolution raster export
5. **SVG Export**: Scalable vector export

## Constraints
- Do NOT modify generation logic (Agent 4 owns that)
- Do NOT implement payment flow (Agent 6 owns checkout)
- Do NOT store user accounts or PII
- Support up to 3000x3000 resolution

## Git Workflow
```bash
git checkout -b agent-5/web-studio-export
git push origin agent-5/web-studio-export
# Open PR, tag @eahernandezv for review
```

## Acceptance Criteria
- [ ] Studio app loads and responds on mobile + desktop
- [ ] Composition engine aligns artistic overlay with QR matrix
- [ ] Print preview shows accurate size/DPI
- [ ] PNG exports are valid and high-quality
- [ ] SVG exports are valid XML and render in browsers
- [ ] Low-res export works without purchase
- [ ] High-res export gated by Agent 6 entitlement
