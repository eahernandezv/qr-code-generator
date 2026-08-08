# QR Studio Handoff — Level 2 Image-Fit QR Standby / Evidence Integration

Owner: QR Studio (`qr-studio`)  
Requested by: QR Product Architect  
Date: 2026-08-08  
Status: STANDBY unless Product Architect explicitly activates implementation  
Current branch delivered: `studio/level2-image-fit-short-link-ux-spike` at `d5dba39214f680590ae3765b08e25c792549a29b`

## Context

Your Studio short-link and UX spike is accepted as a bounded PARTIAL spike, not production/product default. The concept route and resolver semantics are useful. Product Architect is waiting for Creator's next visual recognition pass before asking for UI integration beyond concept evidence.

## Mission while standby

Do not start a new implementation branch unless activated. Prepare to integrate real Creator optimizer evidence into the concept UI once Product Architect accepts Creator's next pass.

## Current accepted Studio decisions

- MVP route proposal: `https://placeholder-online.com/r/<slug>`.
- Redirect: 302 for GET/HEAD only; no 301 by default.
- Cache: `private, no-store, max-age=0`.
- Unknown/malformed: uniform 404 without `Location`.
- Expired/disabled/unsafe: 410 without `Location`.
- Lifecycle: reserve many project-bound candidates → Creator evaluates → commit exactly one → expire unused.
- No analytics, campaigns, accounts, custom domains, generic shortener, or destination-editing UI.

## Next likely activation task

When Product Architect activates you, expect the task to be:

1. Replace the illustrative `IF` placeholder/candidate cards with Creator-provided real candidate artifacts and evidence fixtures.
2. Keep the concept route isolated unless Product Architect explicitly promotes it.
3. Remove internal labels such as `Awaiting Creator` from anything that could become customer-facing; use `Awaiting optimizer` / `Not generated yet` instead.
4. Keep evidence truthful: no scan-safe/export-ready claim without Creator decoder proof.
5. Preserve Level 1 public path unchanged.

## Do not do yet

- Do not polish the placeholder further without real optimizer evidence.
- Do not merge the concept into default public Studio.
- Do not add a customer account, analytics, campaign, custom-domain, or generic shortener surface.
- Do not implement destination editing after export.

## Evidence to keep ready

Your existing evidence lives on branch:

`studio/level2-image-fit-short-link-ux-spike`

Report path:

`docs/program/evidence/level2-image-fit-qr-spike/studio/studio-report.md`

Product Architect owns review, merge, and any next activation.
