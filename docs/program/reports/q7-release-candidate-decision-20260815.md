# Q7 MVP Release Candidate Decision Packet — 2026-08-15

Status: `RELEASE_CANDIDATE_READY_WITH_LIMITED_PHYSICAL_SMOKE`
Decision owner: QR Product Architect
Current main after physical-smoke evidence merge: `ed348575f905396b41c30714198a59a773b3e982`

## Decision

Freeze Q7 as the MVP deterministic Image-Fit implementation for the integrated release candidate.

Stop additional Q7 quality experiments unless a narrowly scoped defect appears in release-candidate verification or physical testing. Keep deterministic Level 1 Safe fallback mandatory. Keep `image_first` / Punchy experimental and export-blocked under the current frozen contract.

## What is accepted

- Q7 deterministic scan-first Image-Fit ranking is accepted as the MVP Image-Fit path.
- Studio exposes:
  - Level 1 Safe fallback path;
  - Q7 Image-Fit Premium;
  - Mellow → `readable`;
  - Balanced → `balanced`;
  - Punchy → `image_first` experimental.
- Studio verifies Core artifact bytes/hashes before accepting inline artifacts.
- Q7 export remains fail-closed when parity, payment, short-link, scan, or Image-first gates block.
- Level 1 fallback download is Core-authorized, artifact-hash-bound, payload-hash-bound, and scan-pass-gated.
- No provider-generative model is exposed.
- Frozen contracts remain unchanged.

## Automated evidence

- Q7 Core validator: `docs/program/evidence/level2-image-fit-ranking-q7/`
  - 24/24 Q7 candidate pass;
  - 183/192 automated perturbation checks;
  - 8/8 fallback pass;
  - no per-candidate scan-check regression;
  - sponsor-quality count remains 0.
- Studio Q7 integration: `docs/program/evidence/studio-q7-integration/`
  - Q7 modes hash-bound;
  - Q7 export denied under current preview/parity/payment/short-link gates;
  - Mellow/Balanced/Punchy visible and mapped to Core modes.
- Studio fallback parity: `docs/program/evidence/studio-q7-fallback-parity/`
  - deterministic Level 1 fallback downloadable;
  - fallback preview/download SHA-256 parity proven;
  - encoded payload SHA-256 verified;
  - Q7 export remains locked.

## Physical smoke evidence

- Report: `docs/program/reports/q7-physical-smoke-report-20260815.md`
- Evidence: `docs/program/evidence/q7-physical-smoke-20260815/`
- Result: Ernesto reported all four contact-sheet artifacts passed on Google Android screen QR detection and decoded to the expected payload.
- Screenshot visually shows all four QR cards and four Google URL chips. The URL chips are truncated, so exact payload equality is recorded from Ernesto's explicit report.

## Scope limitation

This release decision does **not** claim universal scan reliability. It is based on automated decoder/perturbation evidence plus a limited Android/Google screen physical smoke pass. It does not yet cover iPhone native camera, third-party scanner apps, printed output, reduced print sizes, low light, glare, distance, or rotation.

Customer/sponsor wording must remain bounded: decoder/perturbation checks and limited smoke testing are evidence, not a guarantee across every phone, print material, lighting condition, size, or camera.

## Exclusions / still frozen

- Provider-generative QR work remains frozen.
- No hosted-model credit purchases are authorized.
- No QR-specific ControlNet/IP-Adapter/diffusion work is reopened without an approved GPU/model budget and bounded acceptance gate.
- Campaigns, analytics, domains, bulk generation, accounts, subscriptions, generic wallets, and ads remain out of MVP scope.

## Release-candidate next step

Prepare and verify the integrated release candidate from `origin/main`. If release-candidate verification finds a material failure:

- fix only the failing mode/settings/condition;
- rerun the complete automated suite;
- reproduce the affected physical/smoke case where applicable;
- do not lower the 6/8 + raw decode threshold;
- do not weaken protected-region or payload-equality controls.
