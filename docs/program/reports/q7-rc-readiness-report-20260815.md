# QR MVP Release Candidate Readiness Report — 2026-08-15

Status: `RC_READY`
Recorded UTC: `2026-08-15T14:41:03Z`
Verified main: `4f77917561d44f7ee53e9ac276ec2d014dbf1714`
Public URL: `https://placeholder-online.com/`

## Decision

The focused Artistic QR MVP is release-candidate ready for the current agreed scope.

Q7 is frozen as the deterministic MVP Image-Fit implementation. Level 1 Safe fallback remains mandatory. Punchy / `image_first` remains experimental and export-blocked. Provider-generative QR remains frozen and is not exposed.

## Evidence summary

### Automated RC gates

Report: `docs/program/evidence/q7-rc-live-runtime-20260815/rc-verify-report.md`

Passed:
- frozen install with `pnpm@9.0.0`
- `@qr/qr-core` build/test
- `@qr/artistic-qr` build/TypeScript tests/Python tests/lint
- Q7 evidence manifests and validator
- Studio Q7 integration manifest
- Studio Q7 fallback parity manifest
- `@qr/web` tests/lint/build
- release-candidate decision report present
- physical-smoke evidence present

### Live deploy/build

Report: `docs/program/evidence/q7-rc-live-runtime-20260815/live-deploy-build-report.md`

Passed:
- live demo worktree reset to current `origin/main`
- Core, Artistic QR, and Web rebuilt
- web build used intended demo feature flags
- current public assets: `assets/index-Bit2gMpX.js`, `assets/index-CCbA-zcL.css`
- Core supervisor restart requested

### Public runtime/browser smoke

Report: `docs/program/evidence/q7-rc-live-runtime-20260815/live-runtime-report.md`
JSON: `docs/program/evidence/q7-rc-live-runtime-20260815/live-runtime-smoke.json`
Screenshots:
- `docs/program/evidence/q7-rc-live-runtime-20260815/public-root-mobile.png`
- `docs/program/evidence/q7-rc-live-runtime-20260815/public-level2-after-generate-mobile.png`

Passed checks from public HTTPS:
- public root HTTP 200
- public HTML references current assets
- browser loaded public apex and Level 2 Image-Fit route
- Image-Fit schema version: `image-fit-qr-api.v1`
- selected artifact hash-bound: `58951e9836a85d84e0b5d642b1045cdb92c9a41d8232ffc5ac126ec1a938a478`
- Q7 export fail-closed: `Blocked: preview_export_parity_not_proven, preview_not_paid, short_link_not_committed`
- browser console/page errors: none

Visual inspection:
- root screenshot shows Artistic QR Studio with visible Level 2 Image-Fit QR entry point.
- Level 2 screenshot shows Q7 Image-Fit route after generation with visible QR candidate, scan evidence, image-fit score, pending visual acceptance warning, export denied by Core gates, and Mellow/Balanced/Punchy controls.

### Physical smoke

Report: `docs/program/reports/q7-physical-smoke-report-20260815.md`

Passed with limited scope:
- Ernesto reported all four contact-sheet artifacts passed on Google Android screen detection.
- Screenshot shows all four QR cards and four Google URL chips.

## Scope limitations

Do not claim universal scan reliability. Evidence covers automated decoder/perturbation validation, public runtime/browser proof, and limited Android/Google screen physical smoke. It does not cover all iPhones, all Android OEM camera apps, every third-party scanner, every print material, reduced sizes, glare, low light, distance, or rotation.

## Release boundaries retained

- No provider-generative model exposed.
- No hosted-model credit purchase authorized.
- Level 1 Safe fallback mandatory.
- Q7 Image-Fit export locked unless Core/payment/short-link/scan/parity gates pass.
- `image_first` remains experimental/export-blocked.
- Deferred scope remains deferred: campaigns, analytics, custom domains, bulk generation, accounts, subscriptions, ads.

## Next operational action

Treat `https://placeholder-online.com/` as the RC demo URL for sponsor/internal review under the limitations above. If a material defect appears, repair only the failing mode/settings/condition and rerun the automated suite plus the affected smoke/physical case.
