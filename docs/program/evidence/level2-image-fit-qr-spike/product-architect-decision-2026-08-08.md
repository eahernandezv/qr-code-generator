# Product Architect Decision — Level 2 Image-Fit QR Spike

Date: 2026-08-08  
Owner: QR Product Architect  
Verdict: ACCEPTED AS SPIKE / NOT PRODUCTION EXPORT

## Inputs reviewed

### Studio spike

- Branch: `studio/level2-image-fit-short-link-ux-spike`
- Remote HEAD verified: `d5dba39214f680590ae3765b08e25c792549a29b`
- Scope: short-link resolver semantics and isolated UX concept route.
- Decision: accepted as a bounded PARTIAL Studio spike.

### Creator prior spike bundle

- Bundle path: `/home/hermes/.hermes/cache/documents/doc_1b7d41af25db_level2-image-fit-qr-spike.bundle`
- SHA-256 verified: `243f37f2b3ab149b847d3c5221b7eb9442e2f76e8ff63b2b0da9e98ee3ec8912`
- `git bundle verify`: passed; complete history.
- Ref: `creator/level2-image-fit-qr-spike`
- Commit: `0d2dd05ba27b14e78fe7b95c43dfeddf664fd122`

### Creator visual-recognition pass bundle

- Bundle path: `/home/hermes/.hermes/cache/documents/doc_2a7836aecf99_level2-image-fit-visual-recognition-pass.bundle`
- SHA-256 verified: `2f34c487cd23b368f79ddd4a5f1ffc278180163b1f5e41cf79629897279b4b38`
- `git bundle verify`: passed; complete history.
- Ref: `creator/level2-image-fit-visual-recognition-pass`
- Commit: `252580570086e21fd0bf3e1dfcab730f9c64c24b`

## Independent verification performed

In isolated worktree `/tmp/qr-creator-visual-review`:

- `sha256sum -c docs/program/evidence/level2-image-fit-qr-spike/creator-visual-pass/sha256.txt`: passed for all visual-pass files.
- `npm exec --yes pnpm@9.0.0 -- install --frozen-lockfile`: passed.
- `npm exec --yes pnpm@9.0.0 -- --filter @qr/qr-core build`: passed.
- `npm exec --yes pnpm@9.0.0 -- --filter @qr/artistic-qr build`: passed.
- `npm exec --yes pnpm@9.0.0 -- --filter @qr/qr-core test`: 21/21 passed.
- `npm exec --yes pnpm@9.0.0 -- --filter @qr/artistic-qr test`: 115/115 TS tests and 6/6 Python tests passed.
- `node --check docs/program/evidence/level2-image-fit-qr-spike/creator-visual-pass/run-visual-pass.mjs`: passed.
- Re-ran the visual pass script: 768 total candidates, 760 scan-passed, 8 scan-failed, 6 selected.

## Visual read

The latest contact sheet is materially closer to the intended Level 2 direction than the first technical contact sheet.

What improved:

- The image is now embedded inside the QR body, not merely shown as a separate badge.
- The simple diamond is recognizable at mobile/contact-sheet scale in color-based treatments.
- The fox is also legible enough as a medium-complexity stress fixture in the color treatments.
- Background silhouette and module recolor preserve scan evidence without flipping matrix bits.

What remains not product-ready:

- The central binary/logo-pixel mutation still looks blocky and has demonstrated failures at higher budgets for the fox v7/Q cases.
- The visual quality is promising but still a spike aesthetic, not final premium art direction.
- Evidence is automated jsQR-only; no physical phone/print scan or second-decoder validation was performed.
- Production Core still needs alignment-pattern regions exposed/protected before image mutation becomes a supported API.

## Decision

This is what we want as the next Level 2 foundation:

1. Continue with Image-Fit / Logo-Pixel QR as Level 2.
2. Use color-based treatments as the default near-term product path:
   - `background-silhouette` for Readable / conservative mode;
   - `module-recolor` for Balanced / recommended mode.
3. Keep destructive central binary/logo-pixel mutation experimental and not default until codeword-aware damage accounting, broader decoder validation, and physical scan evidence exist.
4. Freeze a narrow Core contract addition for functional alignment pattern regions.
5. Have Studio integrate real Creator evidence into the isolated concept route next; do not promote Level 2 into default public Studio yet.

## Production blockers before export

- Durable short-link mapping storage and commit authority.
- Threat/reputation validation for destinations.
- Resolver availability/runbook/backup posture.
- Core `alignmentPatterns` functional-region contract and tests.
- Second decoder or broader validation approach.
- Physical-device and print-condition scan evidence.
- Final customer-facing wording avoiding universal scan guarantees.

## Next accepted stage

Stage: Level 2 integrated evidence prototype.

- Creator: provide/apply the minimum Core alignment-region patch proposal and package selected visual candidates as stable evidence fixtures.
- Studio: consume Creator evidence on `/concepts/level2-image-fit-qr`, replacing illustrative placeholders with real candidate thumbnails/evidence while keeping the route isolated.
- Product Architect: freeze `image-fit-qr-api.v1` draft and review integration before any merge/promotion.
