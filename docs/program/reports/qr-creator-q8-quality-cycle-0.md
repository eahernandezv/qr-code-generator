# QR Creator — Q8 Visual Quality Cycle 0

| Cycle | Candidate | Hard gates | Total /100 | Recognizability /25 | Composition /15 | Integration /15 | Scan margin /15 | Palette /10 | Protected elegance /10 | Polish /10 | Verdict |
|---|---|---:|---:|---:|---:|---:|---:|---:|---:|---:|---|
| 0 | Readable / Mellow | PASS | 51 | 8 | 8 | 5 | 15 | 2 | 9 | 4 | Below Q8 bar |
| 0 | Balanced | PASS | 64 | 15 | 10 | 7 | 15 | 4 | 8 | 5 | Below Q8 bar |
| 0 | Image-first / Punchy | PASS | 67 | 17 | 11 | 8 | 13 | 4 | 8 | 6 | Below Q8 bar |
| 0 | Level 1 fallback | PASS | 38 | 0 | 5 | 0 | 15 | 1 | 10 | 7 | Safe fallback; not visual candidate |

## Cycle scope and baseline

- Baseline: `origin/main` / `e150965c758ad8ba8b9b407a9e0fab5a100a11e9`.
- Branch: `creator/q8-visual-quality-scoring-loop`.
- Implementation changes in Cycle 0: **none**.
- Reference SHA-256: `cb3b4fecbd0547cd2dfb62daeecfc0116e4dd49fb653ac602025a77b00badaec`.
- Contact sheet: `docs/program/evidence/q8-quality-loop/cycle-0-baseline/contact-sheet.png`.
- Scores: `docs/program/evidence/q8-quality-loop/cycle-0-baseline/scores.json`.
- Objective scan/payload evidence: `docs/program/evidence/q8-quality-loop/cycle-0-baseline/objective-evidence.json`.

Producer scores are progress telemetry, not Product Architect acceptance.

## One-line visual verdicts

- **Readable / Mellow:** centered M hint is visible only after prompting; pale fragmented recolor is overwhelmed by QR modules.
- **Balanced:** recognizable M silhouette, but the crossing, rounded lobes, negative space, and ribbon character dissolve into a blue module field.
- **Image-first / Punchy:** strongest Q7 silhouette, but still chunky and perforated, with weak gradient fidelity and only 7/8 scan margin.
- **Fallback:** clean scan-safe QR with intentionally no target-art fidelity.

## Hard-gate evidence

All four artifacts independently returned the exact payload with raw decode. Readable, Balanced, and fallback passed 8/8 controlled checks; Image-first passed 7/8. Image-Fit candidates report zero protected violations. The exact specific response validates against `image-fit-qr-api.v1`. Two identical optimizer runs produced stable candidate IDs and hashes. No export artifact is claimed: preview export remains locked with parity `not_proven`.

Physical-device and print scans: **not_performed**.

## Top three visual wins

1. All three Image-Fit modes center the major M mass and leave functional anchors readable.
2. Image-first makes the two-lobe M silhouette materially easier to identify than Readable.
3. Q7 retains robust scan evidence while producing deterministic, hash-stable artifacts.

## Top three blockers

1. The identity-critical ribbon crossing and lower white negative space are broken by module holes.
2. Blue-only treatment loses the cyan-to-blue-to-purple reference palette.
3. One-module recolor transitions appear noisy and accidental rather than forming coherent bands.

## Exact Cycle 1 scoring target

Cycle 1 will implement a machine-readable scoring harness and one deterministic candidate family targeting:

- continuous symmetric M/ribbon structure;
- explicit lower negative-space preservation;
- coherent bounded visual regions rather than speckles;
- scan-safe cyan/blue/purple positional palette;
- preferred-candidate scan margin of 8/8.

No threshold, raw decode, protected-region, payload-equality, export-parity, or contract gate may regress.

## Regressions

- Scan regression: none relative to current Q7; this cycle is baseline-only.
- Protected-region regression: none.
- Payload regression: none.
- Contract drift: none.

## Repository state

- Reported commit: baseline `e150965c758ad8ba8b9b407a9e0fab5a100a11e9`.
- State at report creation: dirty only with Cycle 0 evidence/report/loop state plus Product Architect-provided untracked handoff inputs; no implementation files changed.

## Gates run

```bash
npm exec --yes pnpm@9.0.0 -- install --frozen-lockfile
npm exec --yes pnpm@9.0.0 -- --filter @qr/qr-core build
npm exec --yes pnpm@9.0.0 -- --filter @qr/artistic-qr build
npm exec --yes pnpm@9.0.0 -- --filter @qr/qr-core test       # 24/24
npm exec --yes pnpm@9.0.0 -- --filter @qr/artistic-qr test   # 146/146 + Python 6/6
node -e "JSON.parse(require('fs').readFileSync('packages/contracts/schemas/image-fit-qr-api.v1.json','utf8'))"
```

Specific response schema validation: PASS. PNG parse validation: PASS for contact sheet and four candidate/fallback previews.

## Cycle decision

**Proceed to Cycle 1.** No Q7 candidate reaches the minimum Q8 requirements of 75/100 total and 18/25 recognizability. No provider-generative path is authorized or used.
