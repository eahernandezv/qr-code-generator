# QR Product Architect — Q9 Direct Visual Quality Loop Cycles 1–2

Status: **OPEN — quality improving; Studio remains paused**
Baseline main: `234d759d978de159f105dcdfce0aeb3b1e275f9c`
Branch/worktree: `product/q9-direct-visual-quality-loop` / `/home/hermes/worktrees/qr-q9-direct-quality`
Scorer: QR Product Architect direct visual review

## Cycle summaries

| Cycle | Candidate | Hard gates | Total /100 | Recognizability /25 | Composition /15 | Integration /15 | Scan margin /15 | Palette /10 | Protected elegance /10 | Polish /10 | Verdict |
|---|---|---:|---:|---:|---:|---:|---:|---:|---:|---:|---|
| Q8 baseline | Balanced | pass | 90 | 23 | 13 | 12 | 15 | 10 | 9 | 8 | Prior accepted baseline |
| Q8 baseline | Image-first | pass | 94 | 24 | 14 | 13 | 15 | 10 | 9 | 9 | Prior high-water mark |
| Q9 cycle 1 | Readable | pass | 80 | 20 | 11 | 10 | 15 | 9 | 8 | 7 | Too small / not flagship |
| Q9 cycle 1 | Balanced | pass | 94 | 24 | 14 | 13 | 15 | 10 | 9 | 9 | New safe visual winner |
| Q9 cycle 1 | Image-first | fail | null | 24 | 14 | 13 | 0 | 10 | 8 | 8 | Reject: 0/8 decode |
| Q9 cycle 2 | Readable | pass | 80 | 20 | 11 | 10 | 15 | 9 | 8 | 7 | Stable safe lower tier |
| Q9 cycle 2 | Balanced | pass | 94 | 24 | 14 | 13 | 15 | 10 | 9 | 9 | Current winner |
| Q9 cycle 2 | Image-first | pass | 92 | 24 | 14 | 13 | 15 | 10 | 8 | 8 | Scan recovered; less polished than Balanced |

## Evidence

- Cycle 1 contact sheet: `docs/program/evidence/q9-quality-loop/cycle-1-showcase-island/contact-sheet.png`
- Cycle 1 scores: `docs/program/evidence/q9-quality-loop/cycle-1-showcase-island/scores.json`
- Cycle 1 objective evidence: `docs/program/evidence/q9-quality-loop/cycle-1-showcase-island/objective-evidence.json`
- Cycle 2 contact sheet: `docs/program/evidence/q9-quality-loop/cycle-2-balanced-safe-showcase/contact-sheet.png`
- Cycle 2 scores: `docs/program/evidence/q9-quality-loop/cycle-2-balanced-safe-showcase/scores.json`
- Cycle 2 objective evidence: `docs/program/evidence/q9-quality-loop/cycle-2-balanced-safe-showcase/objective-evidence.json`

## Direct visual read

Cycle 1 deliberately enlarged the negative-space island. The Balanced candidate became visibly more substantial and premium than Q8 Balanced while retaining 8/8 decode. However Image-first went too far and failed all decoder checks, so it is rejected.

Cycle 2 reduced the Image-first aggressiveness while keeping the larger Balanced presentation. Image-first recovered 8/8 decode and remains visually strong, but the QR field is more disrupted and less calm. Balanced is the current Product winner because it offers the best tradeoff: clear logo identity, premium negative-space island, 8/8 controlled decoder margin, and cleaner visual balance.

## Gate results

- Cycle 1 Balanced: exact payload, raw decode, 8/8 checks, zero protected-region violations, deterministic hash.
- Cycle 1 Image-first: rejected; raw decode false and 0/8 checks.
- Cycle 2 Balanced: exact payload, raw decode, 8/8 checks, zero protected-region violations, deterministic hash.
- Cycle 2 Image-first: exact payload, raw decode, 8/8 checks, zero protected-region violations, deterministic hash.

## Current winner

`Q9 cycle 2 Balanced`

- artifact SHA-256: `76346ed8d4070bc649528fe31b414b9610acfbb5b15037195f8a5ef7973b4ce6`
- score: 94/100
- controlled decoder checks: 8/8
- Product verdict: current best candidate, but continue improving before Studio.

## Next target

Cycle 3 should generalize the Cycle 2 policy across the same three target classes used by Q8:

1. medium-logo / M-ribbon reference;
2. simple silhouette;
3. textured subject.

Acceptance for Cycle 3:

- Balanced must remain >= 90 and 8/8 for medium-logo.
- At least two target classes must score >= 85 with 8/8.
- Any Image-first failure must be excluded, not patched around by weakening gates.
- No public contract fields may change.
