# Creator Signature card UX alternative

- **Status:** READY_FOR_PRODUCT_ARCHITECT_REVIEW
- **Baseline:** `3bf71cec69727a22592f3947abd4857afb92bf85`
- **Implementation/evidence commit:** `7517708ad2047eb16d2a6de8152342486042998e`
- **Branch:** `studio/creator-signature-card-ux-alt`
- **Prototype URL:** `/?creatorSignatureUX=card`
- **Captured:** 2026-08-08T13:34:42Z

## Recommendation

Advance this query-isolated card alternative to Product Architect comparison testing. It is materially closer to QR Style than the current dense inspector: one compressed card, two line chips, one active text field, one visible visual selector row, and collapsed placement controls. Keep the accepted public UX unchanged until review; the query flag makes the comparison reversible.

## What changed

- Added `creatorSignatureUX=card` as an isolated Studio query variant. Without the flag, existing public behavior is unchanged.
- Replaced simultaneous line cards and all-at-once controls with:
  - two selected-state line chips;
  - one active-line text editor;
  - Font / Size / Colour family tabs exposing one visual tile row at a time;
  - a collapsed Placement disclosure containing the existing five position and four offset choices.
- Added roving left/right keyboard behavior and accessible labels for both line and style tablists.
- Added component interaction coverage and a mobile Playwright proof at 390×844.

## Frozen behavior preserved

- Exactly two persistent signature lines; both default blank.
- Independent per-line text, six-font choice, four-size ladder, and four-colour choice.
- Existing Line 2 size ladder and line-spacing/render behavior are untouched: `apps/web/src/lib/creatorSignature.ts` and export/Core composition were not changed.
- No line 3, CTA, default copy, `textLength`, or `lengthAdjust` was introduced.
- Position and offset values are the existing producer-aligned values.
- All halos, card boundaries, chips, and disclosures are browser UI only and remain outside exported QR composition.

## Why this follows QR Style better

1. **Preview first:** the shared QR canvas remains dominant while the editor occupies one compact lower card.
2. **Family navigation:** line and style tabs mirror QR Style's selected family row.
3. **Visual choices:** font, size, colour, position, and offset remain tile/icon selectors rather than select boxes.
4. **Progressive density:** one active style row is visible; placement is secondary and collapsed by default.
5. **Selected-state grammar:** indigo perimeter, fill, and inset dot reuse the Studio's established selection treatment.

## Tradeoffs

- Only the active line has a visible textbox. The second line remains explicit as a line chip and becomes editable with one tap or arrow key; this saves substantial height but adds a mode switch.
- Placement values are icon-first and depend on accessible labels/tooltips for exact names.
- The expanded Placement state remains within the viewport, but it is intentionally denser than the default collapsed state.
- This is a comparative prototype, not a public replacement decision.

## Verification

| Gate | Result |
|---|---|
| `pnpm --filter @qr/web test src/App.test.tsx` | PASS — 11/11 |
| `pnpm --filter @qr/web test src/lib/creatorSignature.test.ts` | PASS — 30/30 |
| `pnpm --filter @qr/web build` | PASS |
| `pnpm --filter @qr/web lint` | PASS — zero warnings |
| focused Playwright mobile prototype | PASS — 1/1 |
| browser page/console errors | PASS — 0/0 |
| collapsed mobile document/body height | PASS — 844/844 px |

Node 22.14.0 and pnpm 9.0.0 were used. The first browser attempt under host Node 18 was rejected by Playwright before launching; the final canonical attempt used Node 22 and passed. Final logs carry terminal exit markers under this directory.

## Evidence

- `creator-signature-card-mobile.png` — populated Line 2, Colour row, Placement collapsed.
- `creator-signature-card-placement-mobile.png` — Placement expanded with selected top-left/3mm.
- `mobile-metrics.json` — viewport/no-scroll measurements.
- `browser-errors.json` — zero page and console errors.
- `screenshots.sha256` — screenshot/evidence integrity manifest.
- `*-final.log` and `playwright-final.log` — final gate output.

## Product Architect decision

Compare the single-active-input interaction cost against the height and hierarchy improvement. Recommended next move: accept the card grammar, then decide whether Placement should stay as one disclosure or become a fourth family tab before replacing the current public inspector.
