# QR Creator — Q8 Visual Quality Cycle 2

| Candidate | Hard gates | Total /100 | Δ C1 | Δ C0 | Recog. /25 | Composition /15 | Harmony /15 | Scan /15 | Palette /10 | Protected /10 | Polish /10 | Verdict |
|---|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---|
| Readable | PASS | 80 | +1 | +29 | 20 | 11 | 10 | 15 | 9 | 8 | 7 | Producer threshold met |
| Balanced | PASS | 90 | +2 | +26 | 23 | 13 | 12 | 15 | 10 | 9 | 8 | Producer threshold met |
| Image-first | PASS | 94 | +2 | +27 | 24 | 14 | 13 | 15 | 10 | 9 | 9 | Producer threshold met |

## One-line verdicts

- **Readable:** crisp compact mark with cleaner white openings; QR remains intentionally dominant.
- **Balanced:** internal white geometry separates the ribbon and makes the immutable alignment square read as intentional.
- **Image-first:** strongest identity-preserving candidate—smooth palette and explicit M openings with full controlled scan margin.

Producer scoring is telemetry; Product Architect acceptance remains separate.

## Exact change

Cycle 2 adds a second evidence-gated private policy, `q8_negative_space_island`. It retains the Cycle 1 source-hash-bound RGB foreground and additionally detects only row-enclosed background samples inside the foreground bounds. Those samples render white to retain target internal openings. Every protected module is excluded before either color or white treatment is emitted.

No public schema, threshold, payload, fallback, or export-authority behavior changed. Q7 remains the runtime default.

## Why this is a bounded improvement

- The M's upper separation and lower central opening are no longer filled with unrelated QR data noise.
- The protected center alignment square remains untouched but now sits in explicit white negative space.
- The improvement is modest (+1/+2/+2), not a fabricated breakthrough.
- Because the best producer score improved and the two weakest target categories improved without gate regression, the stagnation stop does not trigger.

## Evidence and gates

All modes use version 8 / ECC H with Readable mask 3, Balanced mask 1, and Image-first mask 5.

- raw decode: pass for all;
- perturbations: 8/8 for all;
- exact payload equality: pass;
- protected violations: zero;
- determinism: stable candidate IDs and artifact hashes across two runs;
- contract: frozen response schema unchanged and output valid;
- export parity: no export claimed; preview remains locked;
- physical/print: not performed.

## Rejected evidence

The bounded probe showed 58% visual-island candidates dropping below the scan gate (best rejected candidate only 4/8 despite raw decode). They were excluded from formal leaderboards. Cycle 2 retains the 52% cap and 8/8 margin.

## Remaining blockers

1. The center alignment square remains visible because protected modules are immutable.
2. White cutout transitions are intentionally pixel-bounded rather than vector-smoothed.
3. The strongest result is proven only on the supplied logo so far; generalization remains unknown.
4. Physical-device and print behavior remains untested.

## Next transition

Cycle 3 runs the frozen Cycle 2 policy on at least three distinct target types: simple silhouette, medium logo/brand mark, and photo-like or textured subject. Failed candidates remain recorded with reasons and are excluded from the leaderboard.

## Evidence

- Contact sheet: `docs/program/evidence/q8-quality-loop/cycle-2-negative-space/contact-sheet.png`
- Scores: `docs/program/evidence/q8-quality-loop/cycle-2-negative-space/scores.json`
- Objective evidence: `docs/program/evidence/q8-quality-loop/cycle-2-negative-space/objective-evidence.json`

## Cycle decision

**Proceed to Cycle 3 generalization.** No provider-generative model was used or exposed.
