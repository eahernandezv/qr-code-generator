# QR Creator — Q8 Visual Quality Cycle 3 Generalization

| Target type | Mode | Hard gates | Total /100 | Recognizability /25 | Scan /15 | Verdict |
|---|---|---:|---:|---:|---:|---|
| Simple silhouette | Readable | PASS 8/8 | 71 | 16 | 15 | Below Q8 visual bar |
| Simple silhouette | Balanced | PASS 8/8 | 82 | 21 | 15 | Producer threshold met |
| Simple silhouette | Image-first | PASS 8/8 | 87 | 23 | 15 | Producer threshold met; target best |
| Medium logo | Readable | PASS 8/8 | 80 | 20 | 15 | Producer threshold met |
| Medium logo | Balanced | PASS 8/8 | 90 | 23 | 15 | Producer threshold met |
| Medium logo | Image-first | PASS 8/8 | 94 | 24 | 15 | Producer threshold met; target best |
| Textured subject | Readable | PASS 8/8 | 74 | 18 | 15 | Below Q8 total bar |
| Textured subject | Balanced | PASS 8/8 | 84 | 22 | 15 | Producer threshold met; target best |
| Textured subject | Image-first | **FAIL 0/8** | — | telemetry only | 0 | Excluded from leaderboard |

Producer scores remain telemetry. Product Architect acceptance is separate.

## Target coverage

1. **Simple silhouette:** black/white wolf mark with thin white cuts and small red eyes.
2. **Medium logo / brand mark:** supplied cyan-blue-purple crossed-ribbon M.
3. **Photo-like or textured subject:** high-detail red/black/white wolf artwork with multiple enclosed cuts and a tall profile.

## Results

- Eligible candidates: **8 of 9**.
- Every eligible candidate: exact payload, raw decode, 8/8 controlled checks, zero protected violations, deterministic hash, contract-valid metadata, and no export claim.
- Rejected candidate: textured Image-first. Raw decode failed and all eight perturbation checks failed.
- All three target-specific Level 1 fallbacks passed exact payload and raw decode.

## Best eligible mode by target

- Simple silhouette: **Image-first / 87**.
- Medium logo: **Image-first / 94**.
- Textured subject: **Balanced / 84**.

The target-dependent result is intentional: Image-first is not generalized as universally safe. The scan validator remains authoritative.

## Failure reason — textured Image-first

The 52% island retains too much dense red/black subject detail over data modules. Its foreground footprint exceeds the decoder correction margin at version 8 / ECC H / mask 5. Because raw decode and 0/8 checks failed, the candidate receives no leaderboard score and remains export-blocked. The renderer does not silently shrink the target, lower a threshold, or substitute provider evidence.

## Visual observations

- Simple silhouette generalizes well in Balanced and Image-first, retaining ears, eye accents, muzzle, and outer profile.
- The M remains the strongest target due to its clean background, smooth broad bands, and bounded internal openings.
- Textured Readable and Balanced retain the red wolf identity; Balanced is the strongest safe compromise.
- The center alignment pattern remains visible on all higher-detail visual islands because protected modules are immutable.

## Regressions

- No regression among eligible candidates.
- One honest fail-closed boundary is recorded for textured Image-first.
- Fallback behavior remains deterministic and independent.
- No frozen public contract changed.
- No hosted provider was invoked or exposed.

## Evidence

- Contact sheet: `docs/program/evidence/q8-quality-loop/cycle-3-generalization/contact-sheet.png`
- Scores: `docs/program/evidence/q8-quality-loop/cycle-3-generalization/scores.json`
- Objective evidence: `docs/program/evidence/q8-quality-loop/cycle-3-generalization/objective-evidence.json`

## Cycle decision

**Proceed to Cycle 4 freeze proposal.** The generalization gate is satisfied with three distinct target types and explicit failed-candidate exclusion. Proposed runtime policy must remain mode-aware: Balanced is the default candidate; Image-first remains experimental and scan-gated.
