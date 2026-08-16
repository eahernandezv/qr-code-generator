# Q9 Size-Candidate Output Integration

Status: **accepted for merge candidate**

## Product correction

Logo size is no longer a pre-generation customer setting. Q9 Image-Fit now outputs size candidates:

- Small = 40% of QR field width
- Medium = 50% of QR field width, selected by default when it qualifies
- Large = 60% of QR field width

Each size is generated as a deterministic Core candidate and must independently pass controlled decoder validation against the exact target payload. Failed size candidates are not surfaced in Studio. If no size candidate qualifies, Studio uses the existing Core-authorized Level 1 fallback path.

## UI rule

Studio does **not** show a logo-size picker. Customers choose among generated Small / Medium / Large candidates only after Core has produced and validated them.

## Evidence

Live proof:

- `docs/program/evidence/q9-size-candidates-live/proof.json`
- `docs/program/evidence/q9-size-candidates-live/size-candidates-live.png`

Observed:

- No pre-generation Logo size, Treatment, Detail, or Image-Fit strength control visible.
- Generated cards: Small, Medium, Large.
- All three live candidates passed controlled checks against the encoded target URL.
- Medium selected by default.
- Export blockers visible: `preview_export_parity_not_proven`, `preview_not_paid`, `short_link_not_committed`.
- Console/page errors: none.

## Validation

Passed:

- `npm exec --yes pnpm@9.0.0 -- --filter @qr/qr-core build`
- `npm exec --yes pnpm@9.0.0 -- --filter @qr/artistic-qr build`
- focused Core size-candidate test
- contract/http-service focused tests
- Python provider tests
- web tests: 139 passed
- web build
- Level 2 Playwright e2e: 2 passed
- live production-runtime proof
- `git diff --check`

## Deferred

QR Style / Creator Signature color layering for Image-Fit remains deferred. Future rule remains: preserve uploaded image/logo colours and recolor only non-image QR pixels/layers with Core-backed preview/export parity.
