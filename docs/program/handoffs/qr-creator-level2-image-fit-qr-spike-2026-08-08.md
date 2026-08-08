# QR Creator Handoff — Level 2 Image-Fit QR Density/Slug/Mask Spike

Owner: QR Creator (`qr-creator`)  
Requested by: QR Product Architect  
Date: 2026-08-08  
Branch: `creator/level2-image-fit-qr-spike`  
Repo: `~/QR-Code-Generator` or `~/qr-workspace/workspace` depending on your clone  
Primary docs:
- `docs/product/prd-level2-image-fit-qr.md`
- `docs/program/level2-image-fit-qr-plan.md`

## Mission

Prove whether QR payload/slug/version/ECC/mask search can improve image-embedded/logo-pixel QR quality while preserving scan safety.

## Scope

Build a bounded spike, not final product UI.

Own:
- QR matrix/density search harness.
- Target image preprocessing/pixel-grid scoring prototype.
- Candidate JSON evidence.
- Contact sheet evidence.
- Scan/decoder validation where current tooling supports it.

Do not own:
- short-link redirect runtime implementation.
- customer UI.
- checkout/commerce.
- analytics, dynamic campaigns, custom domains.

## Required inputs

Read:
1. `/home/hermes/ARTISTIC-QR-TEAM-CHARTER.md` if locally available, otherwise use repo docs.
2. `docs/product/prd-level2-image-fit-qr.md`
3. `docs/program/level2-image-fit-qr-plan.md`

Use target fixtures from user screenshots only conceptually unless actual image files are available in your environment. If not, create deterministic local fixtures: one simple bold logo, one medium logo, one complex/high-risk image.

## Required deliverables

Create evidence under:

`docs/program/evidence/level2-image-fit-qr-spike/creator/`

Must include:
- `creator-report.md`
- `candidates.json`
- `contact-sheet.png` or SVG/HTML equivalent if PNG tooling is blocked
- any fixture images used
- `sha256.txt`

`candidates.json` must record for each candidate:
- payload text or payload class
- payload length
- QR version/module count
- ECC level
- mask pattern
- slug candidate if applicable
- image treatment/strength
- protected-zone conflict score
- image-fit score
- scan/decoder verdict and method
- warnings/failure reason if any

## Acceptance criteria

- Generate candidates for at least two image fixtures.
- Include a long original URL and multiple short payload/slug candidates.
- Test at least two QR versions, Q/H ECC if supported, and all 8 masks if library support permits.
- Show at least one concrete example where payload/slug/mask/version changes image fit or scan viability.
- Do not claim physical scan success unless actually tested and evidenced.
- If a library cannot force version/mask/ECC, document the blocker and nearest feasible workaround.

## Report format

`creator-report.md` must contain:
- Summary verdict: VALIDATED / PARTIAL / INVALIDATED.
- What knobs are controllable in current QR Core.
- Which missing QR Core capabilities block the product.
- Best first product defaults for Readable / Balanced / Image-first.
- Exact commands run and outputs.
- Evidence paths and hashes.
- Risks and recommended next Creator tasks.

## Deadline

First spike report due within 55 minutes of activation. If blocked, report blocker with exact command/error and smallest requested contract/API change.
