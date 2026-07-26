# MISSION — Agent 7 (qr-guardian)
**Branch:** `ws/07-platform-ops`
**Status:** STARTED — contracts frozen

## Your scope
1. `packages/telemetry/` — Observability conventions, minimal event transport
2. `infra/` — Deployment interfaces, environment configs, runbooks
3. `.github/workflows/` — CI/CD pipeline (lint, test, build, contract validation)
4. Content safety controls, rate limits, cost telemetry
5. Provider credential rotation mechanism

## Constraints
- No product lifecycle rules (Product Architect owns those)
- Least-privilege deploy identities
- Secret scan in CI
- Alert and rollback paths

## Start signal
Begin coding immediately. Push commits to `ws/07-platform-ops`.
