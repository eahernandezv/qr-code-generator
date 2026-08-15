# Q7 / Level 1 Physical QA Worksheet

Status: `PENDING_PHYSICAL_EXECUTION`
Baseline: `origin/main` at `4cf17842b872f6a38df65f508492d775cd6c1608`

## Scope
Use representative Q7 Image-Fit and Level 1 fallback exports. Record observations only for the tested devices, surfaces, sizes, and conditions. Do **not** convert results into universal scan guarantees.

## Required test matrix

For each artifact tested, record:

| Field | Value |
|---|---|
| Artifact mode | Level 1 Safe / Q7 Mellow / Q7 Balanced / Q7 Punchy |
| Artifact format | PNG / SVG / printed output |
| Artifact SHA-256 |  |
| Payload expected |  |
| Device/scanner |  |
| Display/print medium | laptop screen / mobile screen / office printer |
| Physical/display size |  |
| Lighting/condition | normal / mild glare / rotation / distance / low light |
| Decode result | pass / fail |
| Payload equality | pass / fail |
| Notes |  |

## Required devices / scanners

- Recent iPhone native camera.
- Recent Android native camera.
- One third-party scanner app.

## Required media / perturbations

- Laptop screen.
- Mobile screen.
- Office-printer output.
- Reduced print sizes.
- Mild glare.
- Mild rotation.
- Increased distance.
- Low light.

## Acceptance rule

- If all representative Level 1 and Q7 accepted-mode artifacts decode with exact payload equality in the recorded matrix, Product Architect may freeze Q7 as MVP Image-Fit **for the tested scope only** and prepare the integrated release candidate.
- If any case fails, repair only the failing mode/settings/perturbation; re-run the complete automated suite; reproduce the affected physical case; do not lower the 6/8 + raw decode threshold; do not weaken protected-region or payload-equality controls.

## Current automated evidence references

- Q7 validator: `docs/program/evidence/level2-image-fit-ranking-q7/`
- Studio Q7 integration: `docs/program/evidence/studio-q7-integration/`
- Fallback download parity: `docs/program/evidence/studio-q7-fallback-parity/`
