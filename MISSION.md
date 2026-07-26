# MISSION — Agent 3b (qr-validator)
**Branch:** `ws/03-qr-core` (shared with qr-creator)
**Status:** STARTED — contracts frozen

## Your scope
- Validation harness: decoder matrix, perturbation tests, scan-confidence scoring
- `tests/contract/` — contract tests for qr-core-api.v1 and artistic-qr-api.v1
- Implement `validateCandidate` endpoint per `artistic-qr-api.v1.json`
- Perturbation suite: blur, compression, contrast, rotation

## Constraints
- scan_verdict must be "pass" before export_allowed = true
- Test suite version must be declared in validation output
- Repair attempted flag must be set when repair logic runs

## Start signal
Begin coding immediately. Coordinate with qr-creator on shared branch. Push commits to `ws/03-qr-core`.
