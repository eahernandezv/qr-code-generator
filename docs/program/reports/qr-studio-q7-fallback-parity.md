# QR Studio Q7 fallback download/parity report

Status: `READY_FOR_PRODUCT_ARCHITECT_REVIEW`

## Contract and custody

- SOW: `docs/program/handoffs/qr-studio-q7-fallback-parity.md`
- SOW SHA-256: `6d8f797534251c89079c35761d250c92ef88b72c2fd58b5ac09ce75813271027`
- Exact baseline: `aeaf3e086775c63b44425e175554c3091108a97d`
- Branch: `studio/q7-fallback-download-parity`
- Frozen `image-fit-qr-api.v1` schema/contracts: unchanged
- Provider-generative models exposed: no
- PR opened/merged: no/no
- Team charter and mission prerequisite paths named in the operating contract (`/home/hermes/ARTISTIC-QR-TEAM-CHARTER.md`, `/home/hermes/NEXT-MISSION.md`) were absent on this isolated QR Studio host; the current user dispatch and authoritative SOW governed this bounded lane.

## Delivered behavior

1. Core's existing deterministic fallback artifact and scan evidence are now exposed as a sibling HTTP transport field, outside the frozen `result` contract, only when Core reports the Level 1 fallback available and scan-passing.
2. The transport binds exact inline SVG bytes to Core's artifact SHA-256 and binds the fallback to the exact encoded payload SHA-256.
3. Studio independently verifies the fallback data-URI bytes, artifact hash, payload-hash agreement, scan verdict, request binding, and frozen response before accepting it.
4. A response with no validated, scan-passing Image-Fit candidate removes/hides every Q7 candidate and shows a clear non-qualification state.
5. Only the verified deterministic Level 1 Safe fallback gets a download affordance. Its preview carries the authoritative artifact and payload hashes.
6. The fallback action does not change Q7 export authority. Payment, committed short-link, scan, parity, and Image-first experimental gates remain visibly fail-closed; no Q7 checkout/export/short-link action is rendered.
7. Missing, malformed, hash-mismatched, payload-mismatched, non-scan-passing, or network-unavailable fallback authority remains non-downloadable.

## Acceptance evidence

Evidence root: `docs/program/evidence/studio-q7-fallback-parity/`

- `fallback-download-proof.json`: Level 1 and Mellow/Balanced/Punchy JSON proof.
  - Fallback preview SHA-256 = downloaded SHA-256 = `f453ef42520daa427212ce61b4b697f2ba6177652ea7004aa1734a4a3f8a2e7b`.
  - Exact encoded payload `https://placeholder-online.com/r/bD7xQ2` hashes to `0b9d3c08679190dc700907affabb5257b049d4cf154027168e366bed74571d7d`; every non-qualifying candidate and the fallback transport carry that payload hash.
  - Checkout is absent and cannot rewrite bytes.
  - Q7 final PNG/SVG hashes are explicitly `null` because export is denied.
  - Mellow/Balanced denial: parity not proven, preview not paid, short link not committed.
  - Punchy additionally remains blocked as Image-first experimental.
- `fallback-level1-downloaded.svg`: actual Playwright download bytes.
- `browser/mobile-failure-fallback-download.png`: full mobile failure/fallback state; visual inspection confirmed the failure explanation, absent Q7 candidates, fallback preview/hash/download, visible fail-closed Q7 gate summary, and no clipping or horizontal overflow defect.
- `playwright-final.log`: focused failure → fallback download browser test, 1/1 passed.
- `sha256.txt`: manifest for all evidence artifacts and final gate logs; `sha256sum -c sha256.txt` passed 12/12.

## Final gates

All commands ran against the final working tree before handoff report creation:

- `npm exec --yes pnpm@9.0.0 -- --filter @qr/web test` — PASS, 15 files / 138 tests.
- `npm exec --yes pnpm@9.0.0 -- --filter @qr/web lint` — PASS, zero warnings/errors.
- `npm exec --yes pnpm@9.0.0 -- --filter @qr/web build` — PASS, TypeScript and Vite production build.
- `npm exec --yes pnpm@9.0.0 -- --filter @qr/web test:e2e --grep "non-qualifying Image-Fit"` — PASS, 1/1 Playwright test.
- `npm exec --yes pnpm@9.0.0 -- --filter @qr/artistic-qr test` — PASS, 11 files / 146 TypeScript tests plus 6/6 Python tests.
- `npm exec --yes pnpm@9.0.0 -- --filter @qr/artistic-qr lint` — PASS.
- `npm exec --yes pnpm@9.0.0 -- --filter @qr/artistic-qr build` — PASS.
- `(cd docs/program/evidence/studio-q7-fallback-parity && sha256sum -c sha256.txt)` — PASS, 12/12.
- `git diff --check` — PASS.

The first focused Playwright attempt was a harness-only failure before browser launch because the host defaulted to Node 18 and the configured local-library path omitted `local-libs/root`. The canonical retry used isolated Node `v20.19.5` and the existing local Playwright libraries, then passed and produced the cited evidence. No product assertion ran in the failed attempt.

## Changed implementation surfaces

- `packages/artistic-qr/src/http-service.ts`
- `packages/artistic-qr/src/http-service.test.ts`
- `apps/web/src/lib/imageFitGenerationClient.ts`
- `apps/web/src/lib/imageFitGenerationClient.test.ts`
- `apps/web/src/components/ImageFitQrConcept.tsx`
- `apps/web/e2e/level2-image-fit-spike.spec.ts`
- This SOW, this report, and the named evidence root.

## Residual boundary / next owner

Product Architect owns independent reproduction, PR creation, merge, and release acceptance. No frozen contract, PR, merge, deployment, checkout authority, or provider-generative exposure boundary was crossed.
