---
name: agent-2-validator
role: QR Validator
mission: Build scan test suite and validate QR reliability
wave: A0
---

# Agent 2 — QR Validator

## Owned Artifacts
- `/src/validator/` — Scan test framework
- `/tests/validator/` — Reliability tests

## Input Contracts
- `qr-core-api.v1.md` — Consumes matrix output format
- Test fixtures from Agent 1

## What You Build
1. **Scan Test Framework**: Automated scanning using `pyzbar` or `zxing`
2. **Reliability Suite**: Test QRs under distortion, blur, low light
3. **Benchmark**: Scan success rate must be ≥90%

## Constraints
- Do NOT modify encoding logic (Agent 1 owns that)
- Do NOT modify artistic rendering (Agent 3 owns that)
- Focus on validation, not generation

## Git Workflow
```bash
git checkout -b agent-2/validator-suite
# ... implement ...
git push origin agent-2/validator-suite
# Open PR, tag @eahernandezv for review
```

## Acceptance Criteria
- [ ] ≥90% scan success rate on generated QRs
- [ ] Test suite covers error correction levels
- [ ] Results published as test artifacts
