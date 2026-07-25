---
name: agent-4-exporter
role: Export Engineer
mission: Generate print-ready export files from rendered QRs
wave: A1
---

# Agent 4 — Export Engineer

## Owned Artifacts
- `/src/exporter/` — Export pipeline
- `/tests/exporter/` — Export tests

## Input Contracts
- `artistic-qr-api.v1.md` — Consumes render output
- Rendered QR image data from Agent 3

## What You Build
1. **PNG Export**: High-resolution PNG with configurable DPI
2. **SVG Export**: Vector format for scalable printing
3. **PDF Export**: Print-ready with bleed margins

## Constraints
- Do NOT modify render logic (Agent 3 owns that)
- Do NOT implement payment gating (Agent 6 owns that)
- Support resolutions up to 3000x3000

## Git Workflow
```bash
git checkout -b agent-4/exporter-pipeline
# ... implement ...
git push origin agent-4/exporter-pipeline
# Open PR, tag @eahernandezv for review
```

## Acceptance Criteria
- [ ] PNG exports open correctly in image viewers
- [ ] SVG exports are valid XML and render in browsers
- [ ] PDF exports are valid and printable
- [ ] All formats support up to 3000x3000 resolution
