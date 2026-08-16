# Q9 Size-Candidate Output Integration

Status: **accepted for merge candidate**

## Product correction

Logo size is no longer a pre-generation customer setting. Q9 Image-Fit now outputs size candidates:

- Small = 30–40% of QR field width; Core tries 40%, then 38%, then 36%.
- Medium = 41–50% of QR field width; Core tries 50%, then 48%, then 46%.
- Large = 51–60% of QR field width; Core tries 60%, then 58%, then 56%.

Each size is generated as a deterministic Core candidate and must independently pass controlled decoder validation against the exact target payload. Failed size candidates are not surfaced in Studio. If no size candidate qualifies, Studio uses the existing Core-authorized Level 1 fallback path.

## UI rule

Studio does **not** show a pre-generation logo-size picker. After Core produces and validates the available Small / Medium / Large category outputs, Studio shows one main preview and a compact size toggle. Customers switch the same preview between validated size outputs; the old three-card grid is hidden.

## Evidence

Live proof:

- `docs/program/evidence/q9-size-candidates-live/proof.json`
- `docs/program/evidence/q9-size-candidates-live/size-toggle-live.png`

Observed:

- No pre-generation Logo size, Treatment, Detail, or Image-Fit strength control visible.
- One main preview only; no extra candidate card grid (`extraCandidateCards = 0`).
- Validated size toggle shown: Small 40%, Medium 50%, Large 60%.
- Medium selected by default; toggling Large changes the selected Core artifact hash and candidate ID.
- All surfaced options are Core-validated against the encoded target URL before display.
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
