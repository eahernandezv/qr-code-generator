# QR Creator Handoff — Level 2 Image-Fit QR Visual Recognition Pass

Owner: QR Creator (`qr-creator`)  
Requested by: QR Product Architect  
Date: 2026-08-08  
Target branch: `creator/level2-image-fit-visual-recognition-pass`  
Baseline: `origin/main` at `063c094338735648d9b08479e0e13ce998f43022` unless Product Architect provides a newer merged baseline before activation.

## Context

Your first Level 2 Image-Fit QR spike was reported as PARTIAL. The reported technical findings are promising:

- QR Core can force version, ECC, and mask.
- 768 combinations attempted; 640 matrices generated.
- 316 automated decoder passes.
- 2% image-directed modification mostly passed; 12% image-first stress failed.
- Mask-only choice can change scan result materially.
- Short payloads unlock lower versions compared with the long URL.

The current product gap is visual: the contact sheet proves search/validation, but the uploaded/target image is not yet recognizable enough inside the QR. The small logo badge reads as a fixture label, not as the QR becoming the image.

## Mission

Improve the image-fit rendering/search approach so a simple target mark is visibly recognizable inside the QR matrix while preserving automated scan safety. This is still a spike, not production export.

## Scope

Own:
- Image treatment/rendering experiments under the current QR search harness.
- Scan-safe image-recognition tradeoff evidence.
- Recommended Core contract change for alignment-pattern protection.

Do not own:
- Studio UI polish.
- Short-link resolver runtime.
- Accounts, analytics, campaigns, custom domains.
- Physical scan claims unless actually tested.

## Required tasks

1. Re-read:
   - `docs/product/prd-level2-image-fit-qr.md`
   - `docs/program/level2-image-fit-qr-plan.md`
2. If your prior spike branch is not visible on GitHub, push or re-push it first, or provide a bundle/patch. Product Architect could not fetch `origin/creator/level2-image-fit-qr-spike` from GitHub.
3. Create a new branch from the approved baseline: `creator/level2-image-fit-visual-recognition-pass`.
4. Implement/experiment with at least three image treatments for the simple fixture:
   - central protected/logo-pixel mark;
   - background/silhouette modulation;
   - perforated/cutout or module recolor treatment.
5. Keep mutation budgets bounded. Include at least 2%, 4%, 6%, 8% if feasible. Do not jump straight to 12% if it is known to fail.
6. Protect all functional modules, including alignment patterns. If production Core lacks alignment pattern regions, keep the local protection table in spike code but produce the exact proposed Core API patch shape.
7. Generate a contact sheet where the target image is visible at mobile screenshot scale without relying on a separate corner badge.
8. Validate every selected candidate with the automated decoder matrix available to you.

## Deliverables

Create evidence under:

`docs/program/evidence/level2-image-fit-qr-spike/creator-visual-pass/`

Required files:
- `creator-visual-report.md`
- `visual-candidates.json`
- `visual-contact-sheet.png`
- selected candidate PNGs
- fixture images
- `run-output.log`
- `sha256.txt`

## Acceptance criteria

- At least one simple-logo candidate is visibly recognizable inside the QR at contact-sheet/mobile scale.
- At least one recognizable candidate passes automated decoder validation.
- Evidence distinguishes visual recognition from scan safety; do not overclaim universal scanning.
- Report explains the best current product default: Readable / Balanced / Image-first.
- Report names exact QR settings for selected candidates: payload, version, module count, ECC, mask, mutation budget, image treatment, decoder result.
- If no recognizable scan-safe candidate exists, state that clearly and identify the limiting factor.

## Report verdict

Use one of:
- VALIDATED: recognizable image-fit candidate passes scan checks.
- PARTIAL: technical progress but visual recognition or scan safety remains insufficient.
- INVALIDATED: approach cannot produce recognizable scan-safe outputs under tested constraints.

## Deadline

First report due within 55 minutes of activation. Product Architect owns PR/merge/deploy decisions; do not open or merge a PR.
