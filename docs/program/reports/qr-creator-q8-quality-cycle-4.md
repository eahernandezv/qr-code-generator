# QR Creator — Q8 Visual Quality Cycle 4 Freeze Proposal

## Proposal

**FREEZE the Q8 deterministic negative-space visual-island implementation for Product Architect independent verification.** This is not a release acceptance claim.

Recommended runtime policy:

- RGB target available: use `q8_negative_space_island`.
- Luma-only caller: preserve Q7 module-recolor compatibility.
- Default candidate mode: Balanced.
- Image-first: experimental, independently scan-gated, export-blocked by the frozen contract.
- Any failed visual candidate: exclude from leaderboard/export.
- Deterministic Level 1 fallback: always independent of Image-Fit evidence.

## Score progression

| Cycle | Best candidate | Score | Scan | Delta | Decision |
|---|---|---:|---:|---:|---|
| 0 | Q7 Image-first | 67 | 7/8 | — | Continue |
| 1 | Protected RGB island Image-first | 92 | 8/8 | +25 | Continue |
| 2 | Negative-space island Image-first | 94 | 8/8 | +2 | Generalize |
| 3 | M Image-first / silhouette Image-first / textured Balanced | 94 / 87 / 84 | 8/8 each | — | Freeze proposal |
| 4 | Package | — | all retained evidence validated | — | Product Architect verify |

Producer scores are progress telemetry. Product Architect visual acceptance remains independent.

## Generalization boundary

- Three target types exercised.
- Eight of nine candidates passed exact payload, raw decode, and 8/8 checks.
- Textured Image-first failed raw decode and 0/8 checks; it has no leaderboard score and remains export-blocked.
- Textured Balanced passed 8/8 and is the recommended safe target-specific mode.

This establishes a useful fail-closed boundary rather than a universal Image-first claim.

## Implementation summary

- Added source-hash-bound internal RGB target planes without changing frozen request/response contracts.
- Added deterministic foreground/background estimation and bounded RGB visual islands.
- Added protected-module exclusion for finder, separator, timing, alignment, format, and version regions.
- Added version-aware vertical placement for central alignment patterns.
- Added internal negative-space preservation.
- Added scan-first ECC-H settings preference for Q8 islands.
- Added machine-readable Q8 rubric scoring and hard-gate leaderboard exclusion.
- Promoted the Cycle 2 family as the default only when RGB is available; luma-only callers retain Q7 behavior.
- Preserved export locking, payload equality, raw decode, the 6/8 threshold, and deterministic Level 1 fallback.

## Verification

- QR Core: build pass; **24/24** tests pass.
- Artistic QR: build pass; **157/157 TypeScript assertions** pass in isolated file/describe execution.
- Provider adapter: **6/6 Python tests** pass.
- Cycle 1/2/3 evidence validators: pass.
- Cycle 0/1/2/3 SHA-256 manifests: pass.
- Frozen contract diff: none.
- `git diff --check`: pass.

Two aggregate Vitest runs completed all 157 assertions but exited nonzero after a `vitest-worker` `onTaskUpdate` RPC timeout on long-running suites. Running every file independently and splitting the 27-test Image-Fit file by its five describe blocks produced 157/157 passes with no unhandled errors. This runner transport issue is disclosed rather than hidden.

## Physical and export limitations

- Physical-device scan: not performed.
- Print scan: not performed.
- Studio preview/export parity for Q8 integration: not performed.
- No universal scanning guarantee is made.
- No sponsor-ready or release-ready acceptance is claimed.

## Evidence

- Final contact sheet: `docs/program/evidence/q8-quality-loop/cycle-4-freeze-proposal/contact-sheet.png`
- Freeze scores/proposal: `docs/program/evidence/q8-quality-loop/cycle-4-freeze-proposal/scores.json`
- Verification record: `docs/program/evidence/q8-quality-loop/cycle-4-freeze-proposal/verification.json`
- Cycle reports: `docs/program/reports/qr-creator-q8-quality-cycle-{0,1,2,3,4}.md`
- Loop state: `docs/program/evidence/q8-quality-loop/loop-state.json`

## Required Product Architect actions

1. Reproduce hashes, raw decode, perturbation counts, payload equality, determinism, and contract diff.
2. Independently score the contact sheets; do not accept producer scores as acceptance.
3. Verify Studio preview bytes use authoritative Core artifacts and exports remain hash-bound/locked.
4. Run physical-device and print QA.
5. Decide whether to open a PR, merge, and release.

## Repository state at report creation

- Branch: `creator/q8-visual-quality-scoring-loop`.
- Reported pre-package commit: `1d3ef134e142b22f7e13b10dda6b728671ce054a`.
- State: dirty with Cycle 4 runtime-default promotion, tests, evidence, report, and Product Architect-provided untracked handoff inputs.

## Final decision

**Freeze for independent verification.** Do not continue speculative quality loops. Narrow remediation only if Product Architect identifies a material Core/Image-Fit defect.
