# MISSION — Agent 3 (qr-creator / qr-validator)
**Branch:** `ws/03-qr-core`
**Status:** STARTED — contracts frozen, begin implementation

## Your scope
1. `packages/qr-core/` — QR matrix generation, functional masks, deterministic rendering
2. `packages/artistic-qr/` — Artistic generation adapter (provider-neutral job submission)
3. `apps/web/src/features/static-studio/` — Static QR studio module
4. `apps/web/src/features/artistic-studio/` — Artistic studio module

## Frozen contracts you must implement
- `packages/contracts/schemas/qr-core-api.v1.json` — normalizePayload, generateMatrix, renderDeterministic
- `packages/contracts/schemas/artistic-qr-api.v1.json` — generateCandidates, validateCandidate, exportArtifact

## Constraints
- Use deterministic template as baseline; provider_generative is optional for Wave 0
- All candidates must pass scan validation before export_allowed = true
- Prompts/reference images NEVER stored in public provenance
- Safe fallback must always produce a valid standard QR on demand

## Start signal
Begin coding immediately. Push commits to `ws/03-qr-core`. Tag commit messages with `[needs-review]` when ready for integrator merge.
