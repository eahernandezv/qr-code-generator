# Level 2 Image-Fit Real Targets Q3 Evidence

**Verdict:** real-target preprocessing improved; deterministic module recoloring remains **not sponsor-ready**.

## What Q3 adds

Policy `image-fit-real-target-foreground-q3` adds deterministic foreground-aware fitting before Q2 morphology:

1. border-derived background estimation;
2. foreground deviation mask;
3. connected-component extraction;
4. narrow-gap component clustering for faceted/outlined marks;
5. centrality/area ranking;
6. detached caption and edge-watermark rejection;
7. background normalization;
8. 30% breathing room before square fit;
9. protected-module exclusion before and after morphology.

No frozen contract, Studio, checkout, commerce, or export-authority behavior changed.

## Inputs and public-repository safety

Eight images were provided directly in the task. They include a trademarked brand reference and a visibly watermarked stock reference. Rights were not independently verified. Because this repository is public:

- source JPEGs are not committed;
- source-bearing contact sheets are not committed;
- generated SVG/PNG visual artifacts remain local review evidence;
- only source hashes, objective scan results, aggregate visual classification, code, and the reproducible evidence script are committed.

The generator accepts the same filenames under `docs/program/evidence/level2-image-fit-real-targets-q3/inputs/`. Expected hashes are recorded in `quality-evidence.json`.

## Objective evidence

- 8 targets × 3 modes = 24 Q3 candidates.
- 24/24 satisfy the existing automated decoder threshold.
- Readable and Balanced use the full controlled threshold; Image-first remains experimental and export-blocked.
- 8/8 deterministic Level 1 fallbacks pass.
- Protected-region violations: zero.
- Physical-device and print scans were not performed.

See `decoder-pass-proof.json`.

## Strict unlabeled visual inspection

An unlabeled 2×4 grid of Q3 Balanced outputs was inspected without source panels or filenames:

- clear: 3/8;
- partial: 4/8;
- unidentifiable: 1/8.

Clear targets were the high-contrast wolf face, large J, and ribbon M. The faceted geometric mark failed. The front wolf, calligraphic J/heart, profile wolf, and circular brand reference retained partial class-level cues but not sufficient exact identity/detail. Brand text was not legible.

This is machine-vision inspection, not a human blinded panel. See `visual-review.json`.

## Decision

Q3 closes the **real-target deterministic preprocessing loop** with an honest negative sponsor gate: foreground fitting materially removes captions/backgrounds and improves several marks, but per-module recoloring has reached a recognizability ceiling. The next quality loop should not keep tuning crop thresholds. It should evaluate a provider-generative/reference-conditioned candidate source or a different composition architecture, while preserving the same decoder, cancellation, repair, provenance, and deterministic fallback authority.
