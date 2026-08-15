# QR Creator — Q8 Visual Quality Cycle 1

| Cycle | Candidate | Hard gates | Total /100 | Δ vs C0 | Recognizability /25 | Composition /15 | Integration /15 | Scan /15 | Palette /10 | Protected /10 | Polish /10 | Verdict |
|---|---|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---|
| 1 | Readable | PASS | 79 | +28 | 20 | 11 | 9 | 15 | 9 | 8 | 7 | Producer threshold met |
| 1 | Balanced | PASS | 88 | +24 | 23 | 13 | 11 | 15 | 10 | 8 | 8 | Producer threshold met |
| 1 | Image-first | PASS | 92 | +25 | 24 | 14 | 12 | 15 | 10 | 8 | 9 | Producer threshold met |

## One-line visual verdicts

- **Readable:** small but crisp and unmistakable reference mark; QR remains dominant.
- **Balanced:** strong identity and exact palette with a balanced centered footprint; the alignment square reads as a QR-native detail in the lower opening.
- **Image-first:** reference-faithful ribbon silhouette and gradient dominate cleanly while all controlled scans retain full margin.

Producer scores are telemetry. Product Architect visual acceptance remains independent and is not claimed here.

## Exact change

Cycle 1 adds two private Core capabilities without changing the frozen public response schema:

1. A machine-readable 100-point scorer (`scoreQ8VisualQuality`) that computes scan-margin points, rejects hard-gate failures from the leaderboard, verifies category bounds, and evaluates the Q8 producer threshold.
2. An evidence-gated deterministic `q8_protected_island` renderer that:
   - accepts a source-hash-bound internal RGB plane alongside luma;
   - estimates border background and foreground deterministically;
   - crops the foreground mark and preserves its RGB palette;
   - samples it into bounded 32% / 42% / 52% visual islands;
   - excludes every protected functional module;
   - shifts versions with central alignment patterns so the immutable pattern lands in lower negative space;
   - ranks only scan-passing QR settings, preferring ECC H.

The default production visual policy remains Q7 during this evidence cycle. The new family is activated only by a private optimizer option.

## Selected settings and evidence

- Readable: version 8 / ECC H / mask 3 / 8 of 8 checks.
- Balanced: version 8 / ECC H / mask 1 / 8 of 8 checks.
- Image-first: version 8 / ECC H / mask 5 / 8 of 8 checks.
- All: exact payload equality, raw decode pass, zero protected violations, deterministic candidate IDs and artifact hashes.
- Export: not claimed; preview remains export-locked and parity remains `not_proven`.
- Physical/print scan: not performed.

## Top three wins

1. The exact cyan-blue-purple palette and smooth crossed-ribbon silhouette are preserved instead of approximated with blue modules.
2. Cycle 0's 67-point best moves to a 92-point producer score with the scan margin improving from 7/8 to 8/8.
3. The immutable center alignment pattern is retained and positioned in the mark's lower opening rather than overwritten.

## Top three blockers

1. The central alignment square remains visually prominent, although it now reads as an intentional QR-native detail.
2. Dense QR modules touch the silhouette boundary; image/QR harmony is the weakest category on the 92-point candidate.
3. No physical-device or print evidence exists, so sponsor acceptance and universal scanning claims remain prohibited.

## Exact Cycle 2 target

Strengthen the two weakest visual dimensions—image/QR harmony and protected negative-space elegance—using a deterministic internal-negative-space treatment. Any candidate that loses raw decode, falls below 6/8, modifies protected modules, changes payload, or claims unproven export parity is rejected.

## Regressions

- Scan: none; all three Q8 candidates are 8/8, versus Q7 Image-first at 7/8.
- Payload: none.
- Protected regions: none.
- Frozen public contracts: unchanged.
- Default runtime policy: unchanged (Q7 remains default).

## Evidence

- Contact sheet: `docs/program/evidence/q8-quality-loop/cycle-1-protected-island/contact-sheet.png`
- Scores: `docs/program/evidence/q8-quality-loop/cycle-1-protected-island/scores.json`
- Objective evidence: `docs/program/evidence/q8-quality-loop/cycle-1-protected-island/objective-evidence.json`

## Gates run

```bash
npm exec --yes pnpm@9.0.0 -- --filter @qr/artistic-qr build
npm exec --yes pnpm@9.0.0 -- --filter @qr/artistic-qr exec vitest run src/image-fit.test.ts src/visual-quality.test.ts
# 32 targeted tests passed
node packages/artistic-qr/scripts/validate-q8-quality-cycle.mjs cycle-1-protected-island
```

## Cycle decision

**Proceed to Cycle 2.** The producer threshold is met, but the SOW requires a second deterministic refinement targeting the weakest categories before three-target generalization. No provider-generative model was used or exposed.
