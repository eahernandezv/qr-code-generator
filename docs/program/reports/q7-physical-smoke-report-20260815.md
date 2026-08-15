# Q7 / Level 1 Physical Smoke Report — Android Google screen scan

Status: `PASS_LIMITED_SCOPE`
Recorded UTC: `2026-08-15T14:16:13Z`
Repo baseline: `origin/main` at `c596b700a979b6a947cb5e8882f52b35e9ab6a81`

## Result

Ernesto tested the Telegram contact-sheet image on a Google Android phone/screen QR detector and reported: **“All passed.”**

Expected payload for every QR:

`https://placeholder-online.com/r/bD7xQ2`

## Artifacts tested

| Artifact | SHA-256 | Result |
|---|---|---|
| Level 1 Safe fallback | `f453ef42520daa427212ce61b4b697f2ba6177652ea7004aa1734a4a3f8a2e7b` | pass — user reported exact expected payload |
| Q7 Mellow / readable | `ba9517638245d6f0b7c478c8b758a87c669c8f9accc840476ee87fe54628ecd2` | pass — user reported exact expected payload |
| Q7 Balanced | `2e1aebf8e03466b5391f5b45a28d4259901ed964cc1cf3d9c5953c8fb822165c` | pass — user reported exact expected payload |
| Q7 Punchy / image_first experimental | `350bd24a526b474eddb545bface00b709098f7fbbc39e4e4c29404c22be38c58` | pass — user reported exact expected payload |

## Evidence

- Source contact sheet: `docs/program/evidence/q7-physical-smoke-20260815/source-contact-sheet.png`
- Android Google detection screenshot: `docs/program/evidence/q7-physical-smoke-20260815/android-google-all-four-detected.jpg`
- Observation JSON: `docs/program/evidence/q7-physical-smoke-20260815/physical-smoke-observations.json`

Screenshot SHA-256: `69a85d4832731cf649206843d71fbfbd0f415f80855581d5e1d7bd7410fe483a`

Visual inspection: the screenshot shows the QR MVP Physical Smoke Test sheet with all four cards visible and four Google URL chips over the QR cards, consistent with all four QR artifacts being detected. The URL chips are visually truncated, so exact payload equality is recorded from Ernesto's explicit user report rather than from reading the full text in the screenshot.

## Scope limitation

This is a **limited physical smoke pass**, not a universal scan guarantee. It covers the four representative artifacts on a Google Android screen detector from the displayed contact sheet. It does not cover iPhone native camera, a third-party scanner app, printed output, reduced print sizes, glare, rotation, distance, or low-light conditions.

## Product decision

For MVP release-candidate purposes, this satisfies a pragmatic initial physical smoke gate for the representative Q7/Level 1 artifacts. Keep customer-facing wording bounded to tested evidence plus automated decoder checks; do not claim universal scan reliability.
