# QR Studio SOW — Q7 fallback download/parity remediation

Owner: QR Studio / Studio-Commerce
Status: ACTIVE when dispatched
Baseline: `origin/main` at `aeaf3e086775c63b44425e175554c3091108a97d` (Q7 Studio integration merged)
Target branch: `studio/q7-fallback-download-parity`
Hard deadline: 2026-08-15T13:55:00Z
Report path: `docs/program/reports/qr-studio-q7-fallback-parity.md`
Evidence root: `docs/program/evidence/studio-q7-fallback-parity/`

## Why this exists
Product Architect merged the Q7 Studio integration after verification, but parity QA found a remaining release-gate gap: the Image-Fit failure path visibly offers the Level 1 Safe route, but it does not yet prove a downloadable deterministic fallback artifact under Core authority. Ernesto's parity gate requires deterministic fallback remains downloadable when Image-Fit fails.

## Objective
Implement or prove a Core-authorized deterministic Level 1 fallback download path for the Image-Fit failure/non-qualifying case without weakening Q7 export gates.

## Required behavior
- When Q7 Image-Fit generation fails or does not qualify, Studio must keep Q7 candidates removed/hidden.
- The UI must visibly explain the failure.
- The UI must expose a deterministic Level 1 Safe fallback download only if the bytes are Core-authorized and hash-bound.
- Fallback download must not unlock Q7 Image-Fit export.
- Checkout/payment/short-link/parity/scan gates for Q7 Image-Fit must remain fail-closed and visible.
- No provider-generative model may be exposed.
- Do not change frozen contracts unless Product Architect explicitly requests it.

## Acceptance evidence
For Level 1 fallback and each Q7 mode (Mellow/Balanced/Punchy), produce JSON proof that:
1. Studio preview references the authoritative Core artifact/hash.
2. Checkout does not alter QR bytes.
3. Final PNG/SVG exports either match authorized hashes or are explicitly absent because gates deny export.
4. Export denial remains visible when payment, short-link, scan, or parity gates fail.
5. Deterministic fallback is downloadable when Image-Fit fails/non-qualifies, with artifact hash and payload equality recorded.

## Gates
Run at minimum:
- `npm exec --yes pnpm@9.0.0 -- --filter @qr/web test`
- `npm exec --yes pnpm@9.0.0 -- --filter @qr/web lint`
- `npm exec --yes pnpm@9.0.0 -- --filter @qr/web build`
- Focused Playwright/browser proof for the failure → fallback download path.
- `sha256sum -c` for the evidence manifest.

## Branch/PR boundary
Push your branch if credentials work. Do not open or merge a PR. Product Architect owns PR creation, verification, merge, and release decision.
