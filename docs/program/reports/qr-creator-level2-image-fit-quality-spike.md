# QR Creator — Level 2 Image-Fit Quality Spike Report

**Branch:** `creator/level2-image-fit-quality-spike`  
**Date:** 2026-08-14  
**Author:** QR Creator (Core Engine)  
**Status:** Completed, awaiting Product Architect review

## Scope

- File: `packages/artistic-qr/src/image-fit.ts`
- Evidence: `docs/program/evidence/level2-image-fit-quality/`
- Replaced naive per-module luminance threshold with preprocessing + coherent rendering
- No changes to checkout/export or Studio UI

## What Changed

### `packages/artistic-qr/src/image-fit.ts`

1. **`preprocessTarget()`** — new public function exposing the pipeline:
   - Square crop/resize with white center-padding
   - Edge magnitude (Sobel-like) + local contrast saliency
   - Adaptive percentile threshold per mode (12% / 22% / 38%)
   - 8-connected component filtering (remove specks < 4 px)
   - Module-level cap enforcement to stay within mode fraction
   - Returns `{ mask, edgeScore, componentCount }`

2. **`renderImageFitSvg()`** — rewritten:
   - Uses preprocessed `mask[][]` instead of naïve luma threshold
   - `modeAwareFill()` — color adapts by mode + local coherence (dark/light neighbor ratio)
   - Horizontal-run SVG grouping — contiguous same-color modules merged into single `<rect>` runs
   - Legacy path preserved behind `_legacyNaiveRender` flag

3. **`optimizeImageFitQr()`** — updated:
   - Uses `preprocessTarget()` for every candidate
   - Bumps `luminance_policy_version` to `image-fit-luma-v2-preprocess-edge-saliency`
   - Bumps `score_version` to `image-fit-target-coverage-v2`
   - No contract-breaking field removals

### `packages/artistic-qr/src/image-fit.test.ts`

Added 10 new tests:
- preprocessing square-crop/rectangular source
- edge-enhanced mask fraction bounds per mode
- mode-driven fraction ordering (readable < balanced < image_first)
- protected-region zero-violation proof on realistic targets
- displayable SVG artifacts with valid XML
- coherent grouped runs (fewer elements)
- legacy vs improved artifact difference on realistic target
- recognition score non-NaN validation

### Evidence

Generated with `packages/artistic-qr/scripts/generate-quality-evidence.mjs`:
- 4 synthetic test targets × 3 modes = 12 candidate pairs (legacy vs improved)
- 12 contact-sheet side-by-side PNGs
- `decoder-pass-proof.json`: all 12/12 passed jsQR 8-check suite
- `quality-evidence.json`: SHA-256s, modified_fractions, recognition scores, protected_conflict scores
- `README.md`: full qualitative description of visual differences

## Gate Results

```
Build: ✅
@qr/qr-core build: ✅
@qr/artistic-qr build: ✅
@qr/artistic-qr test: 130/130 passed ✅
Decoder evidence: 12/12 candidates pass, 4/4 fallbacks pass ✅
Protected-region violations: 0/12 candidates ✅
```

## Contract Compliance

- Response schema conforms to `image-fit-qr-api.v1.json` ✅
- `ImageFitCandidateV1` fields populated (no removals) ✅
- `export_allowed: false` with correct blockers ✅
- `image_first` remains experimental ✅
- Fallback always available as `level1_styled_qr` ✅

## Files Modified

```
packages/artistic-qr/src/image-fit.ts         (rewrite: preprocessing + coherent rendering)
packages/artistic-qr/src/image-fit.test.ts    (+10 tests)
packages/artistic-qr/scripts/generate-quality-evidence.mjs (new: evidence generator)
docs/program/evidence/level2-image-fit-quality/*          (new: 50+ evidence files)
```

## Handoff

This branch is ready for Product Architect independent verification. No PR should be opened by QR Creator. Deliverables:
- Branch `creator/level2-image-fit-quality-spike` with clean history from `origin/main`
- All evidence under `docs/program/evidence/level2-image-fit-quality/`
- Source changes localized to Core Engine (`packages/artistic-qr/src/image-fit.ts` + tests)
- Studio UI and checkout/export untouched (except schema-conforming fixture metadata)
