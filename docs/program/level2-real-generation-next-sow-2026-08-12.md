# Level 2 Image-Fit QR — Next SOW: Real Testable Generation

Owner: QR Product Architect  
Date: 2026-08-12  
Status: Draft for next QR fleet wave after fixture-clarity patch  
Priority: Level 2 main focus

## Product problem

The current `/concepts/level2-image-fit-qr` route is useful only as a static fixture proof. It does not let Ernesto or a prospective customer press a button and produce a new Image-Fit QR output. The next wave must make Level 2 testable as a controlled generation workflow without pretending checkout/export is ready.

## One-sentence outcome

A tester can open the Level 2 route, keep or edit the destination/image controls, press **Generate candidates**, and receive fresh server-authoritative Readable/Balanced/Image-first candidates with scan evidence, while export remains locked until a later entitlement/export wave.

## Non-goals / forbidden scope

- No checkout/payment work.
- No accounts.
- No analytics/campaigns/custom domains.
- No public generic URL shortener.
- No export unlock or downloadable Level 2 artifact unless Product Architect separately promotes the export-parity wave.
- No claims of universal scan guarantee or physical/print success unless real physical/print scans are performed.

## Acceptance criteria

### AC-01: Button-driven generation

- The Level 2 route has one visible button labeled **Generate candidates**.
- Button is disabled only when required input is missing/invalid or a run is in progress.
- Pressing it runs a real generation path, not a fixture state toggle.

### AC-02: Fresh candidate evidence

For a valid simple-logo input, generation returns at least:

- Readable candidate
- Balanced candidate
- Image-first candidate, allowed to be marked experimental if scan confidence is lower

Each candidate records:

- payload mode and payload length
- reserved/evaluated slug when optimized short-link mode is selected
- QR version, module count, ECC, mask
- scan verdict and decoder suite version
- image-fit score/components
- warnings
- artifact reference/hash

### AC-03: Fail-closed invalidation still works

- Editing destination, image, treatment, strength, detail, or link mode invalidates previous evidence.
- Stale previews remain hidden or clearly marked stale.
- No stale candidate can become export-selected.

### AC-04: Short-link lifecycle is bounded

- Optimized short-link mode may reserve/evaluate slugs for generation.
- Exactly one slug can be committed later, but this wave may stop at reservation/evaluation.
- Unknown, expired, disabled, or unsafe slug targets fail safely.
- No analytics or campaign tracking is added.

### AC-05: Export remains locked

- `data-export-payload-bound="false"` remains true until a later export-parity wave.
- No visible Export/Checkout/Create short-link CTA is introduced by this wave.
- UI copy says generation evidence is controlled and export is locked.

### AC-06: Public testing instructions are obvious

The page itself explains:

1. choose/keep target image;
2. choose/keep destination;
3. press **Generate candidates**;
4. review Readable/Balanced/Image-first candidates;
5. export is not available yet.

## QR Creator assignment

Target branch: `creator/level2-real-generation-core`  
Report path: `docs/program/reports/qr-creator-level2-real-generation-core.md`  
Evidence path: `docs/program/evidence/level2-real-generation-core/`

### Owns

- Real Image-Fit optimizer/generation entry point.
- QR version/ECC/mask/payload search.
- Image-fit scoring.
- Automated decoder validation.
- Candidate artifact/hash generation.
- Deterministic fallback when no scan-safe image-fit candidate passes.

### Required reads

- `docs/architecture/contracts/image-fit-qr-api.v1.md`
- `packages/contracts/schemas/image-fit-qr-api.v1.json`
- `packages/contracts/fixtures/image-fit-qr/valid-balanced-response.v1.json`
- `docs/product/prd-level2-image-fit-qr.md`
- `docs/program/level2-image-fit-qr-plan.md`

### Gates

```bash
npm exec --yes pnpm@9.0.0 -- install --frozen-lockfile
npm exec --yes pnpm@9.0.0 -- --filter @qr/qr-core build
npm exec --yes pnpm@9.0.0 -- --filter @qr/artistic-qr build
npm exec --yes pnpm@9.0.0 -- --filter @qr/qr-core test
npm exec --yes pnpm@9.0.0 -- --filter @qr/artistic-qr test
node -e "JSON.parse(require('fs').readFileSync('packages/contracts/schemas/image-fit-qr-api.v1.json','utf8'))"
```

## QR Studio assignment

Target branch: `studio/level2-real-generation-ui`  
Report path: `docs/program/reports/qr-studio-level2-real-generation-ui.md`  
Evidence path: `docs/program/evidence/level2-real-generation-ui/`

### Owns

- `Generate candidates` Level 2 UI flow.
- Contract-shaped request creation from controls.
- Candidate board consuming Creator candidate metadata.
- Short-link lifecycle UI/prototype integration if in web-owned path.
- Fail-closed stale-evidence behavior.
- Clear public copy and mobile QA.

### Required reads

- `docs/architecture/contracts/image-fit-qr-api.v1.md`
- `packages/contracts/schemas/image-fit-qr-api.v1.json`
- `packages/contracts/fixtures/image-fit-qr/valid-balanced-response.v1.json`
- `docs/product/prd-level2-image-fit-qr.md`
- `docs/program/level2-image-fit-qr-plan.md`

### Gates

```bash
npm exec --yes pnpm@9.0.0 -- install --frozen-lockfile
npm exec --yes pnpm@9.0.0 -- --filter @qr/web test
node --test apps/web/scripts/short-link-resolver.test.mjs
npm exec --yes pnpm@9.0.0 -- --filter @qr/web build
npm exec --yes pnpm@9.0.0 -- --filter @qr/web lint
npm exec --yes --package node@20 --package pnpm@9.0.0 -- pnpm --filter @qr/web test:e2e level2-image-fit-spike.spec.ts
```

## Product Architect integration gate

Before merge:

- independently reproduce Creator candidate generation;
- independently inspect Studio request/response binding;
- browser-test the exact public user path;
- verify no checkout/export authority leak;
- verify old fixture reset path remains understandable or is removed if generation supersedes it;
- publish a decision packet: **controlled-generation demo-ready** or **hold**.

## Suggested dispatch order

1. Creator first for the narrow generation API/proof.
2. Studio starts in parallel only on UI copy/request shell and short-link lifecycle tests that do not depend on final Creator internals.
3. Product Architect merges only after the UI consumes a real generated candidate source, not a fake local toggle.
