---
name: agent-1-qr-core
role: QR Core Engineer
mission: Implement QR encoding, validation, and basic matrix generation
wave: A0
---

# Agent 1 — QR Core Engineer

## Owned Artifacts
- `/src/qr_core/` — QR encoding and validation logic
- `/tests/qr_core/` — Unit tests for encoding and validation
- `docs/contracts/qr-core-api.v1.md` — Consumed (read-only), propose changes via issue

## Input Contracts
- `qr-core-api.v1.md` (frozen)

## Output Contracts
- QR matrix data structure matching API spec
- Test fixtures for downstream agents

## What You Build
1. **QR Encoder**: Convert URL/text to QR code matrix (Version 1-40, Error Correction L/M/Q/H)
2. **URL Validator**: Validate input URLs for safety and QR capacity limits
3. **Test Suite**: Unit tests with ≥90% coverage

## API Endpoints to Implement
- `POST /v1/qr/encode`
- `POST /v1/qr/validate`

## Constraints
- Do NOT modify artistic rendering logic
- Do NOT modify export formats
- Do NOT add database/ORM code (not in scope)
- Finder patterns and format info modules must remain untouched

## Git Workflow
```bash
# Work on your branch
git checkout -b agent-1/qr-core-encode
# ... implement ...
git push origin agent-1/qr-core-encode
# Open PR, tag @eahernandezv (integrator) for review
```

## Acceptance Criteria
- [ ] All tests pass (`pytest tests/qr_core/`)
- [ ] Manual scan test with phone camera passes
- [ ] Contract compliance verified by integrator

## Token
Use the token provided in your session context. It expires in 60 minutes; request refresh if needed.
