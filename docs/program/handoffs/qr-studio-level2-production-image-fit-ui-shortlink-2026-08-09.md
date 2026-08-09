# QR Studio SOW — Level 2 Image-Fit QR Production UI + Short-Link Contract

Owner: QR Studio (`qr-studio`)  
Requested by: QR Product Architect  
Status: **ACTIVE when dispatched**  
Baseline: `origin/main` at `4fbed78d6efc9bdfbaab6328f80ad650126460d9` or newer containing Product Architect contract branch  
Target branch: `studio/level2-production-image-fit-ui-shortlink`  
Report path: `docs/program/reports/qr-studio-level2-production-image-fit-ui-shortlink.md`  
Evidence path: `docs/program/evidence/level2-production-image-fit-ui-shortlink/`  
Deadline: first report within 55 minutes of activation

## Mission

Implement the first production-shaped Studio/UI and short-link boundary for Level 2 Image-Fit QR against frozen `image-fit-qr-api.v1`, without promoting fixture evidence to public export authority.

## Required reads

1. `docs/architecture/contracts/image-fit-qr-api.v1.md`
2. `packages/contracts/schemas/image-fit-qr-api.v1.json`
3. `packages/contracts/fixtures/image-fit-qr/valid-balanced-response.v1.json`
4. `docs/product/prd-level2-image-fit-qr.md`
5. `docs/program/evidence/level2-image-fit-qr-spike/studio-evidence-integration/studio-report.md`

## Owned surfaces

Allowed:

- `apps/web/**`
- Studio short-link resolver/prototype code already under `apps/web/scripts/**` or an agreed Studio-owned path
- Studio tests/e2e for Level 2 path
- `docs/program/evidence/level2-production-image-fit-ui-shortlink/**`
- `docs/program/reports/qr-studio-level2-production-image-fit-ui-shortlink.md`

Forbidden without Product Architect approval:

- `packages/qr-core/**` and `packages/artistic-qr/**` internals
- changing frozen contract schemas except via proposal note
- accounts, analytics, campaigns, custom domains
- exposing generic public URL shortener UI
- exposing Generate/Export authority based only on browser fixture state

## Required implementation

1. Consume the contract fixture/schema instead of redefining candidate field names in UI-only constants where practical.
2. Preserve the isolated concept route until Product Architect promotes it.
3. Add/strengthen UI fail-closed behavior:
   - changing target image/destination/treatment/detail/original URL invalidates fixture evidence;
   - no stale evidence shown as generated;
   - no export payload is bound before entitlement and server-authoritative candidate selection.
4. Implement or harden short-link resolver lifecycle tests:
   - reserve/evaluate multiple slugs;
   - commit exactly one slug;
   - expire uncommitted slugs;
   - unknown/disabled/unsafe fail safely;
   - committed slug redirects one hop with safe status/cache behavior.
5. Preserve bounded wording: controlled decoder checks, physical/print not tested unless actually tested, no universal scan guarantee.
6. Add regression tests preventing `Awaiting Creator`, `Confidence: NN%`, and export-ready claims on uncommitted/unpaid candidates.

## Acceptance gates

Minimum commands:

```bash
npm exec --yes pnpm@9.0.0 -- install --frozen-lockfile
npm exec --yes pnpm@9.0.0 -- --filter @qr/qr-core build
npm exec --yes pnpm@9.0.0 -- --filter @qr/artistic-qr build
npm exec --yes pnpm@9.0.0 -- --filter @qr/web test
node --test apps/web/scripts/short-link-resolver.test.mjs
npm exec --yes pnpm@9.0.0 -- --filter @qr/web build
npm exec --yes pnpm@9.0.0 -- --filter @qr/web lint
npm exec --yes --package node@20 --package pnpm@9.0.0 -- pnpm --filter @qr/web test:e2e level2-image-fit-spike.spec.ts
```

Report must include:

- verdict: VALIDATED / PARTIAL / BLOCKED
- exact commit and branch
- files changed
- exact commands and outputs
- screenshots/browser proof if UI changed
- short-link resolver proof
- confirmation no public Level 1 regression and no export authority leak
- any requested contract change, if blocked

Do not open or merge a PR. Product Architect owns PR/merge.
