# QR Studio — Q1 Level 2 evidence UX cleanup

**Status:** READY_FOR_PRODUCT_ARCHITECT_REVIEW
**Prepared:** 2026-08-14
**Branch:** `studio/q1-level2-evidence-ux-cleanup`
**Baseline:** `origin/main` at `1e33d7e63c613631e74f633c3d7ee9ea7130f807`

## Scope delivered

- Separates the selected candidate's controlled scan verdict from its image recognition/fit score and its visual-acceptance state.
- Labels visual acceptance as **Pending visual review** and **Not sponsor-approved**.
- Explains that a scan pass is controlled decoder evidence only and does not establish sponsor readiness.
- Applies the same three-part framing to compact candidate cards.
- Keeps image upload, generation, cancellation, candidate invalidation, and the existing export/checkout lock behavior.
- Does not add checkout, export authority, or browser-side eligibility.

## Frozen-contract boundary

The implementation consumes only existing `image-fit-qr-api.v1` candidate fields:

- `scan_evidence.verdict`, `checks_passed`, `checks_total`, and disclaimer;
- `image_fit_evidence.fit_label`, `recognition_score`, `score_version`, and `protected_zone_conflict_score`;
- existing producer `status` remains in technical evidence only.

No contract/schema/Core files changed. The frozen v1 response has no candidate variation or seed field, so **Generate another set** is intentionally absent. Add that affordance only after Product Architect freezes a compatible Core contract change.

## Verification

- `apps/web` lint: PASS.
- `apps/web` Vitest: PASS — 15 files, 134 tests.
- `apps/web` production build: PASS — TypeScript and Vite build.
- Focused Playwright: PASS — 1 Chromium mobile-viewport test.
- Browser proof: 390 px document width equals viewport width; no horizontal overflow; no page errors; export and checkout remain unbound.
- Final screenshot inspected: no clipping or overlap; scan, fit, and visual acceptance are distinct; sponsor-readiness disclaimer is visible.

Playwright prerequisites on this host required Node `v22.14.0` and `PLAYWRIGHT_LD_LIBRARY_PATH=$HOME/.cache/ms-playwright/local-libs/root/usr/lib/x86_64-linux-gnu`.

## Evidence

- `docs/program/evidence/level2-evidence-ux-cleanup/mobile-creator-response-bound.png`
- `docs/program/evidence/level2-evidence-ux-cleanup/mobile-ready-to-generate.png`
- `docs/program/evidence/level2-evidence-ux-cleanup/mobile-creator-unavailable-fail-closed.png`
- `docs/program/evidence/level2-evidence-ux-cleanup/browser-proof.json`

No PR, merge, deployment, checkout, or export implementation was performed.
