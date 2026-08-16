# Q9 Visual Cleanup Cycle

Status: **promote as narrow quality improvement**

## User-observed defect

The live Q9 preview was scan-valid but visually weak: QR modules/speckle bled through the uploaded logo/image area, making the subject look noisy and not premium. This blocks moving on to colour/layer controls.

## Change tested

Core Q9 renderer now uses two targeted visual-cleanup levers for Q9 only:

1. **Silhouette-local white substrate**: clean background-like samples only within/near the detected foreground row extents, instead of filling the whole target crop. This reduces QR bleed-through without a full rectangular plate.
2. **Higher-resolution Q9 sampling**: Q9 logo/image samples render at 2px sampling instead of 4px, reducing blockiness/pixel stair-step artifacts.

Protected QR modules are still skipped. Candidate qualification remains scan/payload/protected-region gated.

## Evidence

- Contact sheet: `docs/program/evidence/q9-visual-cleanup/contact-sheet.png`
- Objective evidence: `docs/program/evidence/q9-visual-cleanup/objective-evidence.json`

## Product visual scoring

| Variant | Size | Gates | Visual score | Verdict |
|---|---:|---:|---:|---|
| Baseline | Medium 50% | 8/8, payload equal, raw decode, 0 violations | 76 | HOLD: logo area visibly noisy |
| Cleanup | Medium 50% | 8/8, payload equal, raw decode, 0 violations | 84 | PROMOTE: cleaner subject, less QR bleed-through |
| Baseline | Large 60% | 8/8, payload equal, raw decode, 0 violations | 80 | HOLD: bold but noisy |
| Cleanup | Large category | hidden for this target | n/a | Correctly dropped by gates |

## Interpretation

The cleanup is not the final premium-quality bar, but it directly addresses the screenshot defect and improves the default Medium output without weakening decode gates. The fact that Large disappears for this evidence target is acceptable under the adaptive size contract: a larger category should not be shown if the cleaner renderer cannot preserve scan gates.

## Next quality target

Continue with one more visual loop before colour/layer controls:

- reduce pasted-white-substrate feel around logo edges;
- test on the actual red fox/wolf uploaded target if available as a source file rather than screenshot-only;
- evaluate whether a soft silhouette mask or vector-like source scaling can improve premium polish while retaining Medium 8/8.
