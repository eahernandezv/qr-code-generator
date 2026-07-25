---
name: agent-3-qr-core-validation
role: QR Core/Validation Engineer
mission: Functional masks, decoder matrix, closed-loop repair, safe fallback
wave: A0
vps: qr-creator (core) + qr-validator (testing)
---

# Agent 3 — QR Core/Validation Engineer

## Owned Artifacts
- `/src/qr_core/` — QR encoding, masking, format info
- `/src/validator/` — Scan test framework, closed-loop repair
- `/tests/qr_core/` — Unit tests for encoding/masking
- `/tests/validator/` — Reliability and scan tests

## Input Contracts
- `docs/contracts/qr-core-api.v1.md` — Frozen
- Test fixtures consumed by Agent 4, Agent 5

## What You Build
1. **QR Encoder**: Version 1-40, all error correction levels (L/M/Q/H)
2. **Functional Masks**: Mask pattern application per QR spec
3. **Decoder Matrix**: Export matrix data in standard format for downstream agents
4. **Closed-Loop Repair**: Detect unreadable artistic QRs and suggest corrections
5. **Safe Fallback**: If artistic rendering breaks scannability, fall back to standard QR
6. **Scan Validator**: Automated scan testing with pyzbar/zxing

## Two Work Surfaces
You span **two VPSes**:
- **qr-creator**: Core encoding and matrix generation
- **qr-validator**: Scan testing, reliability benchmarking, closed-loop feedback

Keep both workspaces in sync via the same feature branch.

## Constraints
- Do NOT modify artistic styles (Agent 2 owns design)
- Do NOT implement model inference (Agent 4 owns generation)
- Do NOT build the web UI (Agent 5 owns Studio)
- Finder patterns and format info modules must remain correct per ISO/IEC 18004

## Git Workflow
```bash
git checkout -b agent-3/qr-core-validation
git push origin agent-3/qr-core-validation
# Open PR, tag @eahernandezv for review
```

## Acceptance Criteria
- [ ] All QR versions 1-40 encode correctly
- [ ] All 8 mask patterns apply correctly
- [ ] Scan success rate ≥90% on standard QRs
- [ ] Closed-loop repair detects and fixes ≥80% of scan failures
- [ ] Safe fallback produces valid standard QR on demand
