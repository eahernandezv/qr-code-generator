# Q10 Raster Image-Layer Quality Loop

Status: **promote as deterministic Image-Fit quality improvement**

## User-observed defect

The live Image-Fit preview was scan-valid but visually below the premium bar. The central target image/logo looked reconstructed from QR dust: visible speckle, hard QR bleed-through, and a pasted/noisy island.

## Q10 change

Q10 changes the default RGB Image-Fit path from SVG micro-rectangle reconstruction to a Core-authoritative PNG raster composition:

1. Render deterministic QR modules to a PNG raster.
2. Add a bounded rounded white substrate behind the target image.
3. Draw the uploaded target as a continuous bilinear-sampled raster image layer.
4. Skip protected functional modules while painting the image/substrate.
5. Keep adaptive size gates unchanged: only candidates passing raw decode, payload equality, 6/8+ validation, and protected-region checks are returned.
6. Hash PNG artifacts by exact PNG bytes for browser preview/export parity checks.

SVG `<image>` was intentionally not introduced. The existing SVG validator remains strict; Q10 uses the already-supported `png-dataurl` validation path.

## Evidence

- Contact sheet: `docs/program/evidence/q10-raster-image-layer/contact-sheet.png`
- Objective evidence: `docs/program/evidence/q10-raster-image-layer/objective-evidence.json`
- Live Studio proof: `docs/program/evidence/q9-size-candidates-live/proof.json`

## Objective results on controlled medium-logo target

| Variant | Size | Artifact | Gates | Recognition | Verdict |
|---|---:|---|---:|---:|---|
| Q9 SVG | Small 40% | SVG | 8/8, raw decode, payload equal, 0 violations | 94.15% | baseline |
| Q9 SVG | Medium 50% | SVG | 8/8, raw decode, payload equal, 0 violations | 96.27% | baseline |
| Q10 raster | Small 40% | PNG | 8/8, raw decode, payload equal, 0 violations | 95.79% | improve |
| Q10 raster | Medium 50% | PNG | 8/8, raw decode, payload equal, 0 violations | 97.26% | promote |

Large remains hidden for this target because it does not qualify under the unchanged adaptive gates.

## Product visual scoring

- Q9 Medium 50%: **82/100** — scannable but logo is still visibly rect-reconstructed and speckled.
- Q10 Medium 50%: **90/100** — materially smoother continuous logo, less QR bleed-through, more premium default.

Remaining defect: the white substrate is still visible. It is softer and cleaner than Q9, but not yet a fully integrated artistic treatment. This is acceptable as an incremental deterministic improvement, not a final sponsor-ready freeze.

## Validation

- qr-core build: pass
- artistic-qr build: pass
- Image-Fit tests: 29 pass
- contracts/http-service tests: 15 pass
- Python provider tests: 6 pass
- Studio App/image-fit client tests: 29 pass
- web build: pass
- JSON evidence validation: pass
- git diff --check: pass
- branch live proof: pass

## Product decision

Promote Q10 as the active deterministic Image-Fit preview path. Keep export denied until payment, committed short-link, parity, and release gates are proven. Do **not** proceed to color/layer controls yet if the next goal is sponsor-grade Image-Fit polish; the next visual loop should reduce substrate visibility while preserving Medium 50% 8/8 gates.
