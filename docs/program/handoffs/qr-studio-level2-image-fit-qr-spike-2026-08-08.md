# QR Studio Handoff — Level 2 Image-Fit QR Short-Link and UX Spike

Owner: QR Studio (`qr-studio`)  
Requested by: QR Product Architect  
Date: 2026-08-08  
Branch: `studio/level2-image-fit-short-link-ux-spike`  
Repo: `~/QR-Code-Generator` or `~/qr-workspace/workspace` depending on your clone  
Primary docs:
- `docs/product/prd-level2-image-fit-qr.md`
- `docs/program/level2-image-fit-qr-plan.md`

## Mission

Design/prototype the minimum Studio + short-link resolver capability needed for Level 2 Image-Fit QR, without expanding into dynamic campaigns, analytics, accounts, or custom domains.

## Scope

Own:
- Minimum short-link route/control design for image-fit QR.
- UX concept for Image-Fit QR controls and candidate evidence.
- Contract proposal for slug reservation/evaluation/commit from Studio perspective.
- Prototype only where safe and fast.

Do not own:
- QR matrix/image-fit optimizer internals.
- Decoder/scan validation implementation.
- Customer accounts.
- Analytics dashboard.
- Custom domains.
- Generic public URL shortener product.

## Required inputs

Read:
1. `/home/hermes/ARTISTIC-QR-TEAM-CHARTER.md` if locally available, otherwise use repo docs.
2. `docs/product/prd-level2-image-fit-qr.md`
3. `docs/program/level2-image-fit-qr-plan.md`

## Required deliverables

Create evidence under:

`docs/program/evidence/level2-image-fit-qr-spike/studio/`

Must include:
- `studio-report.md`
- `short-link-resolver-design.md` or ADR draft
- `ux-flow.md`
- optional screenshot/mockup/contact sheet if prototyped
- `sha256.txt`

## Required design decisions to answer

1. Route shape for MVP:
   - current apex path such as `https://placeholder-online.com/r/<slug>`; or
   - separate short domain later.
2. Redirect status and cache policy:
   - likely 302/307, not 301 by default.
3. Slug lifecycle:
   - generate/evaluate many candidates;
   - reserve candidates during optimization;
   - commit one chosen slug;
   - expire unchosen slugs.
4. Destination validation:
   - allowed schemes;
   - blocked unsafe/reserved/internal targets;
   - unknown slug behavior.
5. UI controls:
   - treatment: Logo / Pixel blend / Background image / Cutout-perforated;
   - strength: Readable / Balanced / Image-first;
   - detail: Simple / Detailed / Maximum;
   - link mode: Optimized short link recommended / Original URL advanced.
6. Evidence UI:
   - compact scan status;
   - density/module count;
   - image-fit recommendation;
   - warning when original URL hurts fit.

## Acceptance criteria

- Produce a minimal architecture decision for short links that stays inside MVP scope.
- Do not add analytics, custom domains, accounts, or dynamic campaign UI.
- If prototyping, prove one committed slug redirects to a safe final URL and unknown/unsafe targets fail safely.
- Provide exact paths/files touched and commands run.
- Identify what contract fields Studio needs from QR Creator optimizer.

## Report format

`studio-report.md` must contain:
- Summary verdict: VALIDATED / PARTIAL / INVALIDATED.
- Recommended MVP short-link approach.
- UX recommendation with user-facing labels.
- Contract needs from Creator and Product Architect.
- Exact commands run and outputs.
- Evidence paths and hashes.
- Risks and recommended next Studio tasks.

## Deadline

First spike report due within 55 minutes of activation. If blocked, report blocker with exact command/error and smallest requested contract/API change.
