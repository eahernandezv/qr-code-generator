# QR Creator SOW — Level 2 Image-Fit QR Production Core Contract

Owner: QR Creator (`qr-creator`)  
Requested by: QR Product Architect  
Status: **ACTIVE when dispatched**  
Baseline: `origin/main` at `4fbed78d6efc9bdfbaab6328f80ad650126460d9` or newer containing Product Architect contract branch  
Target branch: `creator/level2-production-image-fit-core`  
Report path: `docs/program/reports/qr-creator-level2-production-image-fit-core.md`  
Evidence path: `docs/program/evidence/level2-production-image-fit-core/`  
Deadline: first report within 55 minutes of activation

## Mission

Implement the first production-shaped Core/optimizer boundary for Level 2 Image-Fit QR against the frozen `image-fit-qr-api.v1` contract. This must move from fixture spike evidence toward export-safe candidate generation without claiming universal scanning.

## Required reads

1. `docs/architecture/contracts/image-fit-qr-api.v1.md`
2. `packages/contracts/schemas/image-fit-qr-api.v1.json`
3. `packages/contracts/fixtures/image-fit-qr/valid-balanced-response.v1.json`
4. `docs/product/prd-level2-image-fit-qr.md`
5. `docs/program/evidence/level2-image-fit-qr-spike/studio-evidence-integration/studio-report.md`

## Owned surfaces

Allowed:

- `packages/qr-core/**`
- `packages/artistic-qr/**`
- Creator-owned tests and fixtures
- `docs/program/evidence/level2-production-image-fit-core/**`
- `docs/program/reports/qr-creator-level2-production-image-fit-core.md`

Forbidden without Product Architect approval:

- `apps/web/**` customer UI
- commerce/payment code
- public routing/deployment config
- accounts, analytics, campaigns, custom domains
- editing frozen contract schemas except via a separate proposal note

## Required implementation

1. Add/export a QR functional-region contract that includes alignment patterns for selected QR versions.
2. Add an Image-Fit optimizer entry point that accepts a contract-shaped request or a narrow typed equivalent.
3. Generate production-shaped candidates for at least the simple bold-diamond fixture:
   - Readable
   - Balanced
   - Image-first as experimental unless stricter gates pass
4. Preserve protected regions before any image treatment.
5. Produce scan evidence using the available automated decoder suite.
6. Produce a deterministic Level 1 styled fallback when no image-fit candidate passes.
7. Emit candidate metadata that can map to `ImageFitQrCandidateV1` without Studio inventing fields.
8. Add tests proving payload/QR settings/validation metadata are stable enough for Studio consumption.

## Acceptance gates

Minimum commands:

```bash
npm exec --yes pnpm@9.0.0 -- install --frozen-lockfile
npm exec --yes pnpm@9.0.0 -- --filter @qr/qr-core build
npm exec --yes pnpm@9.0.0 -- --filter @qr/artistic-qr build
npm exec --yes pnpm@9.0.0 -- --filter @qr/qr-core test
npm exec --yes pnpm@9.0.0 -- --filter @qr/artistic-qr test
node -e "JSON.parse(require('fs').readFileSync('packages/contracts/schemas/image-fit-qr-api.v1.json','utf8')); JSON.parse(require('fs').readFileSync('packages/contracts/fixtures/image-fit-qr/valid-balanced-response.v1.json','utf8'))"
```

Report must include:

- verdict: VALIDATED / PARTIAL / BLOCKED
- exact commit and branch
- files changed
- exact commands and outputs
- candidate metadata and artifact hashes
- scan evidence and explicit physical/print status
- any requested contract change, if blocked

Do not open or merge a PR. Product Architect owns PR/merge.
