# QR Creator — Level 2 Image-Fit Composition Q2

**Branch:** `creator/level2-image-fit-composition-q2`  
**Owner:** QR Creator / Core Engine  
**Verdict:** Verified controlled-composition improvement; complex-photo sponsor readiness not claimed.

## Scope

- Builds on Q1 branch `creator/level2-image-fit-quality-spike`.
- Core-only changes in `packages/artistic-qr/src/image-fit.ts` and tests.
- No Studio, checkout, commerce, export-authority, or frozen-contract change.

## Implementation

Q2 adds deterministic composition repair after Q1 luma/edge/dark-coherence preprocessing:

- single-module gap bridging;
- bounded morphological closing;
- small-component removal;
- dominant-component retention;
- coherence-aware budget trimming that protects shape interiors;
- evidence-only `_compositionPolicy: 'q1' | 'q2'` switch for exact A/B reproduction.

Protected regions remain immutable at render time.

## Tests and gates

- `@qr/qr-core` build: pass.
- `@qr/artistic-qr` build: pass.
- `@qr/artistic-qr` suite: 133/133 TypeScript tests plus 6/6 provider Python tests pass.
- New tests prove Q2 does not increase ring/spot fragmentation, preserves the ring center, respects Balanced module budget, and retains prior displayability/protected-region guarantees.

## Evidence

Root: `docs/program/evidence/level2-image-fit-composition-q2/`

- 6 controlled targets × 3 modes = 18 Q1/Q2 contact sheets.
- Every sheet shows source target, Q1, and Q2.
- `decoder-pass-proof.json`: 18/18 Q2 candidates pass the frozen automated threshold; Readable/Balanced are 8/8, experimental Image-first is 6/8.
- 6/6 deterministic fallbacks pass.
- 18/18 contact-sheet PNG files parse successfully.

## Honest quality decision

Balanced outputs make all six controlled compositions recognizable, including dual spots, open ring, heart, and house. Q2 closes narrow mask gaps and suppresses isolated fragments while retaining holes and multiple dominant objects.

This is not a claim of complex-photo or arbitrary-logo sponsor readiness. The evidence uses controlled silhouettes to prove composition mechanics. A subsequent gate must use real licensed targets and blinded human recognition before external sponsor presentation.
