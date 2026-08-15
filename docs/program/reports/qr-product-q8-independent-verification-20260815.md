# QR Product Architect — Q8 Independent Verification

Status: **ACCEPT Q8 AS THE NEXT QUALITY BASELINE; NOT RELEASE-COMPLETE**
Verified UTC: 2026-08-15T20:44:44Z
Baseline: `e150965c758ad8ba8b9b407a9e0fab5a100a11e9`
Verified Q8 commit: `a68142968f18b55d22934519b5cea8c0c2ab4655`
Bundle: `/home/hermes/qr-creator-q8-visual-quality-scoring-loop.bundle`
Bundle SHA-256: `03476919794c1b0810c015c9139cfdecc7854c334234f1fd7fc894581067518e`
Controller verification log: `/home/hermes/workloops/qr-q8-direct-quality/q8-verify-command.log`
Controller report: `/home/hermes/workloops/qr-q8-direct-quality/q8-independent-verification-report.md`

## Decision

Q8 is accepted as a deterministic Core/Image-Fit quality baseline for integration planning.

This is not a final MVP release approval because Studio preview/export parity and physical/print QA are still outstanding.

## Independent visual review

Producer scores were treated as telemetry, not acceptance. Product Architect visual review of the contact sheets finds a material quality jump versus Q7:

- Q7 baseline remains visibly noisy: the target mark is fragmented into scattered blue QR strokes and needs explanation.
- Q8 negative-space island is recognizably more intentional: the central mark/subject reads as a clear visual island instead of random recolor noise.
- The medium-logo Q8 family preserves the reference M/ribbon silhouette and blue/cyan/purple identity substantially better than Q7.
- The QR still dominates, as required for scan safety, but the subject is now readable enough for a controlled demo candidate.
- Generalization is credible but not universal: simple silhouette and medium-logo targets improve strongly; textured image-first correctly fails closed, while textured balanced remains the safe choice.

Independent Product scoring posture:

| Candidate family | Producer score | Product visual verdict |
|---|---:|---|
| Q7 best baseline | 67 | Reject for visual quality; scan-safe but too noisy |
| Q8 medium-logo Balanced | 90 | Accept as default integration target |
| Q8 medium-logo Image-first | 94 | Accept as experimental, scan-gated, export-blocked until parity/physical proof |
| Q8 simple-silhouette Image-first | 87 | Accept as evidence of generalization |
| Q8 textured Balanced | 84 | Accept as safe fallback for complex/texture targets |
| Q8 textured Image-first | null / gate fail | Correctly rejected/excluded |

## Reproduced automated evidence

The controller independently reproduced:

- bundle SHA-256 and `git bundle verify`;
- required baseline/merge-base;
- `@qr/qr-core` build;
- `@qr/qr-core` tests: **24/24**;
- `@qr/artistic-qr` build;
- `@qr/artistic-qr` TypeScript assertions: **157/157** using file/describe-block split after Vitest aggregate RPC timeout;
- Python provider tests: **6/6**;
- `@qr/artistic-qr` lint/typecheck;
- Q8 top-level evidence manifest;
- Q8 cycle 0/1/2/3/4 manifests;
- Q8 cycle validators;
- Q8 freeze validator;
- frozen contract diff: **none**;
- `git diff --check`: pass.

## Decoder and integrity observations

Representative evidence confirms:

- exact decoded payload for passing candidates: `https://placeholder-online.com/r/bD7xQ2`;
- raw decode: true for all eligible Q8 candidates;
- controlled decoder/perturbation counts: 8/8 for eligible Q8 candidates;
- protected-region violations: zero for all listed Q8 candidates, including the rejected textured image-first candidate;
- deterministic candidate IDs and artifact hashes are recorded;
- failed textured image-first candidate is excluded from the leaderboard because raw decode is false and checks are 0/8.

## Accepted policy for Studio integration

When Studio integration resumes, Product Architect accepts this policy:

- RGB targets -> Q8 negative-space family;
- luma-only targets -> Q7 compatibility;
- Balanced -> default;
- Image-first -> experimental and scan-gated;
- failed candidates -> excluded and not selectable/exportable;
- Level 1 -> mandatory independent fallback;
- RGB planes/internal scoring fields must not leak into frozen public contracts.

## Remaining gates before release

Q8 still requires:

1. Studio preview/export parity against authoritative Core bytes.
2. Checkout byte-preservation proof.
3. Failed-candidate selection/export denial proof.
4. Fallback availability proof when Image-first fails.
5. Physical-device and print QA with exact payload comparison.

## Final Product Architect decision

**Accept Q8 as the new deterministic visual-quality baseline.**

Do not continue speculative provider or quality loops. Reactivate implementation only for narrow, reproduced defects or for Product-owned Studio integration/parity work.
