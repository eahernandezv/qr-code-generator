# QR Product Architect — Q9 Studio Integration

Status: **ACCEPTED FOR MERGE; STUDIO Q9 PREVIEW/EXPORT GATES PROVEN, PHYSICAL QA STILL FUTURE**
Verified UTC: 2026-08-16T09:51:40Z
Baseline: `4c537fbdc50b98248d50f673b74de49214d5e3e4`
Branch: `product/q9-studio-integration`

## Integration decisions

- Core default RGB Image-Fit path now uses `q9_negative_space_showcase`.
- Q9 score/policy metadata is exposed as `image-fit-negative-space-showcase-q9-target-aware-centering`.
- Studio route displays Q9 Image-Fit, not Q7.
- Studio default controlled target is a medium-logo PNG under an MVP-safe evidence path.
- Studio default selection chooses a qualifying Balanced candidate; if Balanced fails, it chooses the first qualifying candidate instead of selecting a failed Balanced artifact.
- Punchy/Image-first experimental fit labels display as Punchy instead of collapsing adjacent evidence text.
- Export remains denied unless Core export authority, payment, committed short-link, scan, and preview/export parity all pass.
- Level 1 Safe fallback remains downloadable when no Image-Fit candidate qualifies.

## Live proof

Production-style local stack:

- Core HTTP service: `http://127.0.0.1:8789`
- Studio production runtime: `http://127.0.0.1:8091`
- No browser request interception for live proof.

Evidence:

- `docs/program/evidence/studio-q9-live-proof/proof.json`
- `docs/program/evidence/studio-q9-live-proof/q9-live-generation.png`

Observed selected candidate:

- Selected: Balanced generated candidate
- Selected artifact SHA-256: `a15736559cb6ab6ef3b3116b7366536266815772ef38dc32ead918e571091ba5`
- Q9 text visible: true
- Q9 policy metadata visible: true
- Export payload bound: false
- Checkout bound: false
- Export blockers visible: `preview_export_parity_not_proven, preview_not_paid, short_link_not_committed`
- Console errors: none
- Page errors: none

Visible candidates in live proof:

| Mode | Scan | Image fit |
|---|---:|---:|
| Mellow | 8/8 | 93% |
| Balanced | 8/8 | 97% |
| Punchy | 8/8 | 97% |

## Gates

- `@qr/artistic-qr` deterministic split test suite: passed after known aggregate Vitest `onTaskUpdate` transport timeout.
- `@qr/artistic-qr` provider Python tests: passed.
- `@qr/artistic-qr` lint: passed.
- `@qr/web` unit/integration tests: passed, 139 tests.
- `@qr/web` build: passed.
- Level 2 Playwright route-bound mobile proof: passed, 2 tests.
- Production-style live proof without request interception: passed.
- `git diff --check`: passed.

## Remaining release gates

- Payment/checkout final export parity against a real paid entitlement.
- Physical phone/print QA.
- Public `placeholder-online.com` redeploy after merge if we choose to refresh the live demo.
