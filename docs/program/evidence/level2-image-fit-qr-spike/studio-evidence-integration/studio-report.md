# QR Studio report — Level 2 Image-Fit evidence integration

- **Status:** READY_FOR_PRODUCT_ARCHITECT_REVIEW
- **Branch:** `studio/level2-image-fit-evidence-integration`
- **Accepted Studio base:** `d5dba39214f680590ae3765b08e25c792549a29b`
- **Creator source commit:** `252580570086e21fd0bf3e1dfcab730f9c64c24b`
- **Creator import/cherry-pick commit:** `a28221a532b17fc63b9319a0643a2433a30b7839`
- **Studio implementation/evidence commit:** `7f0bec9aea1996d2dfd38a0a86f900ca5cf937b5`
- **Completed:** 2026-08-09T00:34:15Z
- **Concept route:** `/concepts/level2-image-fit-qr`

## Outcome

The isolated concept route now renders three exact-byte copies of Creator's accepted selected PNG artifacts instead of the illustrative `IF` matrix and placeholder candidate cards. The UI consumes only the supplied visual-pass facts and keeps the verdict bounded:

> VALIDATED FOR SPIKE / NOT PRODUCTION EXPORT

No Level 2 route was added to the public default. `apps/web/src/App.tsx` is byte-unchanged from the accepted Studio base, and all existing Level 1 App integration tests passed.

## Product mapping

| Product mode | Creator treatment/artifact | Compact evidence | Studio status |
|---|---|---|---|
| Readable | `bold-diamond__background-silhouette__v10-Q-m3-b8.png` | v10 · 57 modules · ECC Q · mask 3 · 149 treated (5.38%) | 8/8 controlled decoder checks; no matrix-bit flips |
| Balanced | `bold-diamond__module-recolor__v10-Q-m1-b8.png` | v10 · 57 modules · ECC Q · mask 1 · 156 recolored (5.64%) | 8/8 controlled decoder checks; recommended balance |
| Image-first | `bold-diamond__central-logo-pixel__v10-Q-m0-b8.png` | v10 · 57 modules · ECC Q · mask 0 · 134 mutated (4.84%) | 8/8 controlled decoder checks; **experimental, not export-ready** |

All three were validated by Creator with jsQR 1.4.0 under `scan-v1-real-75pct`. Studio does not reinterpret this as a universal guarantee: the visible copy states that no physical-device or printed scan was performed and that controlled checks do not authorize production export.

## Evidence provenance

Creator's full `sha256.txt` was checked successfully before every final gate. The three browser-served files under `apps/web/public/level2-image-fit-qr/creator-visual-pass/` were then compared byte-for-byte with the selected source artifacts.

- Readable SHA-256: `282dc4cc5dcd074f338c9fe264ca99f268c9a566ff8f173fbe448a9842d84fe0`
- Balanced SHA-256: `6f9b0ba69475d860d3e22ad4e030e59e44b170c9ec3cdee4658f909c03f08940`
- Image-first SHA-256: `71263c9f5d6d12dcfd3457c6197f151a72e20b5206e75dd143f67cf6cc49f448`

`evidence-map.json` records the exact source commit, candidate IDs, settings, hashes, and bounded verdict.

## UX behavior

- The large preview and three compact candidate thumbnails use real selected artifacts.
- Selecting Readable, Balanced, or Image-first changes the authoritative visible artifact, evidence summary, treatment alignment, and selected state.
- The compact native disclosure shows version, module count, ECC, mask, treatment, changed modules/fraction, decoder/version, threshold, and physical-scan status.
- Readable maps to Background image/background silhouette.
- Balanced maps to Pixel blend/module recolor.
- Image-first maps to Cutout-perforated/central binary mutation and shows an amber experimental/not-export-ready warning.
- Changing the target image, destination, treatment, detail, or switching to Original URL invalidates the fixture preview and displays `Not generated yet` / `Awaiting optimizer`; stale evidence is not carried onto untested inputs.
- Reselecting one of the three accepted fixture candidates restores only that candidate's supplied evidence.
- `Awaiting Creator` is absent from the customer-facing component.
- No Generate, Export, or Create-short-link action was exposed on the concept route.

## Required gates

Final fail-fast log: `final-gates.log` (terminal marker: `ALL_FINAL_GATES_OK`).

```text
(cd creator-visual-pass && sha256sum -c sha256.txt)
PASS — all 15 Creator evidence entries

public selected-artifact SHA equality checks
PASS — 3/3 exact-byte copies

node --test apps/web/scripts/short-link-resolver.test.mjs
PASS — 4/4

pnpm --filter @qr/web test
PASS — 14 files, 122 tests

pnpm --filter @qr/web build
PASS — 129 modules transformed

pnpm --filter @qr/web lint
PASS — zero warnings

pnpm --filter @qr/web test:e2e level2-image-fit-spike.spec.ts
PASS — 1/1
```

The complete web test initially discovered the Node short-link test inside Vitest's jsdom environment and failed with `ReferenceError: self is not defined` plus `No test suite found`. This was a harness collision, not a product assertion failure. `apps/web/vitest.config.ts` now excludes `scripts/**/*.test.mjs`; the Node suite runs explicitly under `node --test`, and the complete fail-fast sequence was rerun from the start into the final log.

## Browser proof

Viewport: 390×844.

- three real candidate thumbnails loaded (`naturalWidth > 0`);
- Readable, Balanced, and Image-first each captured as a distinct selected state;
- technical disclosure updated to masks 3, 1, and 0 respectively;
- document width exactly 390px;
- horizontal overflow: false;
- page errors: 0;
- console errors: 0;
- route remained `/concepts/level2-image-fit-qr`.

Screenshots:

- `balanced-real-evidence-mobile.png`
- `readable-real-evidence-mobile.png`
- `image-first-experimental-mobile.png`

The candidate strip was compacted to three mobile-scale thumbnails after visual inspection; this reduced full-page height while preserving recognizable treatment differences and selected-state cues.

## Changed Studio files

- `apps/web/src/components/ImageFitQrConcept.tsx`
- `apps/web/src/App.test.tsx`
- `apps/web/e2e/level2-image-fit-spike.spec.ts`
- `apps/web/vitest.config.ts`
- `apps/web/public/level2-image-fit-qr/creator-visual-pass/*.png`
- `docs/program/evidence/level2-image-fit-qr-spike/studio-evidence-integration/*`

Creator's visual-pass evidence directory was imported unmodified through its own commit boundary.

## Preserved boundaries

- Level 1 public Studio unchanged.
- Level 2 remains isolated and non-default.
- No production export authorization.
- No analytics, accounts, campaigns, custom domains, generic shortener UI, or destination editing.
- No Core/optimizer/decoder algorithm changes.
- No PR, merge, or deployment.

## Residual production blockers

This integration presents accepted spike evidence; it does not make the artifacts production-exportable. Product Architect and Creator still need to freeze and implement:

1. alignment-pattern regions in the Core functional-region contract;
2. production luminance/contrast and color-profile limits;
3. second-decoder and physical-device/print validation requirements;
4. live optimizer response schema and artifact transport rather than fixture constants;
5. server-authoritative candidate/commit/export parity;
6. deterministic fallback and customer-safe error taxonomy for no eligible result.

Product Architect owns independent reproduction, acceptance, integration, PR, merge, and any route promotion.
