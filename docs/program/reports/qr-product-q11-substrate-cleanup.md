# Q11 Image-Fit Substrate Cleanup

Status: **Product-validated merge candidate**

## Goal

Improve the Q10 raster Image-Fit path by removing the visibly pasted white substrate/canvas, keeping logo foreground centered, and preserving scan-valid Small/Medium/Large size candidates.

## Product correction

Q10 made the uploaded image continuous and smoother, but still left a visible rounded white substrate behind the image layer. Q11 removes that exterior substrate and paints only target foreground plus internal negative-space details, so the logo reads as a cleaner image layer over the QR body rather than a pasted badge.

Tall/tightly cleaned logos also receive a more conservative size-attempt ladder inside the same public Small/Medium/Large categories. The UI still shows generated validated size outputs; it does not expose a pre-generation logo-size picker.

## Evidence

- Contact sheet: `docs/program/evidence/q11-substrate-cleanup/contact-sheet-current-q11.png`
- Objective evidence: `docs/program/evidence/q11-substrate-cleanup/objective-evidence.json`
- Hashes: `docs/program/evidence/q11-substrate-cleanup/sha256.txt`

## Objective results on controlled RGB logo target

- Small 40%: scan pass, 8/8 checks, 0 protected violations, recognition `0.808731`
- Medium 50%: scan pass, 8/8 checks, 0 protected violations, recognition `0.859408`
- Large 60%: scan pass, 8/8 checks, 0 protected violations, recognition `0.895685`

All surfaced Q11 candidates are PNG artifacts from the Core-authoritative raster path.

## Product visual review

Contact-sheet review shows the uploaded colored motif is centered, continuous, and recognizable across Small/Medium/Large. The visible pasted white substrate from Q10 is absent. The Large candidate has the strongest logo presence while still passing controlled decoder gates.

Remaining caveat: this is still deterministic logo-layer Image-Fit, not fully blended sponsor art. The motif is clean and commercially usable as a Logo-Fit/Image-Fit step, but future quality loops should improve deeper matrix integration and physical scan evidence before export enablement.

## Validation

Passed with alternate Vitest pool to avoid the known aggregate `vitest-worker onTaskUpdate` runner timeout:

- `@qr/qr-core build`
- `@qr/artistic-qr build`
- `vitest run src/image-fit.test.ts --pool=threads --testTimeout=45000`: 30 tests pass
- Python provider tests: 6 tests pass
- `@qr/web` `imageFitGenerationClient.test.ts`: 14 tests pass
- `git diff --check`: pass

The earlier default Vitest-pool runs were process failures due to runner RPC timeout, while all test assertions passed. The successful `--pool=threads` rerun is the accepted technical gate for this long Image-Fit file.

## Product decision

Promote Q11 as the next deterministic Image-Fit quality improvement after Q10. Keep export locked until payment/short-link commitment, preview/export parity, and release gates are proven. Next product-owned step after merge is readiness-upload industrialization against `image-readiness-agent-api.v1`.
