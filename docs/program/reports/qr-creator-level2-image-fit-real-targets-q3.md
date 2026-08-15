# QR Creator — Level 2 Image-Fit Real Targets Q3

**Branch:** `creator/level2-image-fit-real-targets-q3`  
**Owner:** QR Creator / Core Engine  
**Decision:** implementation/evidence complete; sponsor gate failed; no Q4 loop opened.

## Scope

Q3 evaluates the Q2 composition pipeline against eight user-provided real-world-style targets: letter marks, faceted logos, ribbon geometry, detailed animal marks, a text-heavy circular brand reference, a watermarked profile illustration, and a thin calligraphic mark with a detached heart.

## Core change

`foregroundAwareCrop()` now performs deterministic border-background estimation, component extraction and narrow-gap clustering, dominant-mark selection, caption/watermark suppression, background normalization, and padded square fitting. The actual optimizer passes the QR matrix into preprocessing so protected functional regions are unavailable to morphology and budget selection.

Default runtime policy advances from Q2 to `image-fit-real-target-foreground-q3`; exact Q1/Q2/Q3 reproduction remains available through the internal evidence switch.

## Verification

- Core build: pass.
- Artistic QR build: pass.
- Full Artistic QR test suite: pass.
- New Q3 tests: caption rejection, full-width watermark rejection, detached-heart retention, and deterministic output.
- Automated Q3 decoder candidates: 24/24 pass.
- Deterministic fallbacks: 8/8 pass.
- Protected-region violations: zero.
- Local PNG/SVG displayability: verified by parsing generated evidence.

## Visual result

Unlabeled Q3 Balanced review:

- clear 3/8;
- partial 4/8;
- unidentifiable 1/8.

The large J, ribbon M, and high-contrast wolf face are recognizable. The faceted geometric mark is not. Detailed animals and text-heavy/very-thin marks retain some silhouette but lose identity-critical interior detail. Image-first increases area but often becomes a flat shape and remains experimental at the 75% decoder gate.

## Rights handling

The public repository does not receive the supplied JPEGs or source-bearing visual outputs. One reference contains a trademark; another contains an explicit stock watermark. Rights were not verified. The branch carries hashes, non-image evidence, implementation, and the generator; local contact sheets can be delivered directly to the requester for review.

## Closure and next gate

**Q3 is closed. It is not sponsor-ready.** More crop/morphology tuning is not the recommended next step. A separate Q4 must test reference-conditioned/provider-generative composition under Core validation and deterministic fallback. QR Creator will not claim or open that loop without an explicit continuation after this evidence is reviewed.
