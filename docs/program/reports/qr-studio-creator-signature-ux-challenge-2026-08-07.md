# QR Studio — Creator Signature UX challenge report

**Status:** `READY_FOR_PRODUCT_ARCHITECT_REVIEW`
**Date:** 2026-08-07
**Owner:** QR Studio
**Target branch:** `studio/creator-signature-icon-ux-concept`
**Baseline:** `beb33aa5bc23ef7314430f8afeba3a08067bc4fb`
**Declared SOW SHA-256:** `0242c771e5521068fdc768eb23dde695823ca6afa209c4c555600969a772558c`

## Contract note

The dispatch's authoritative path `/home/hermes/qr-mvp-demo/docs/program/handoffs/qr-studio-creator-signature-ux-challenge-2026-08-07.md` was unavailable because `/home/hermes/qr-mvp-demo` did not exist in this execution context. The same path was absent from fetched `origin/main`, so the supplied SHA could not be independently recomputed. Implementation followed the complete frozen requirements included directly in the dispatch. Product Architect should compare this report/diff with the authoritative SOW copy before acceptance.

## Git evidence

- Implementation/evidence commit: `8f0bad86cc04a9e29e747ba80bd013fcfbd56e09`
- The implementation commit was pushed to `origin/studio/creator-signature-icon-ux-concept` and local/remote SHA equality was verified.
- GitHub open PR count for the target head was `0`.

## Child route

- Route path: `/concepts/creator-signature-ux/studio`
- Production-preview URL exercised locally: `http://127.0.0.1:4183/concepts/creator-signature-ux/studio`
- Intended deployed URL after Product Architect acceptance/release: `https://placeholder-online.com/concepts/creator-signature-ux/studio`
- The default `/` route retains the accepted Creator Signature control implementation; only the exact child pathname mounts this concept.

## Delivered concept

- Compact dark, cyan-accented tray harmonized with the existing QR Style visual system.
- Exactly two line cards, each retaining independent text, font, size, and colour state.
- Visual font glyphs, size dots, colour swatches, five placement diagrams, and `0/1/2/3mm` segmented offset controls.
- Strong selected treatment: cyan border, tint, glow, and status dot; no colour-only state dependency.
- Control-facing prose removed. Visible leaf text in the concept is limited to glyphs inside selection tiles (`A`, `M`, and `mm`) and user text inside inputs.
- Radio semantics, accessible names, roving tab stops, arrow/Home/End keyboard navigation, and visible focus rings retained.
- Existing shared Core-backed preview and template state are reused. No QR Core, commerce, export, destination, or payment logic changed.

## Browser evidence

### Screenshots

- `docs/program/evidence/qr-studio-creator-signature-ux-challenge/creator-signature-concept-mobile.png` — 390×844
- `docs/program/evidence/qr-studio-creator-signature-ux-challenge/creator-signature-concept-desktop.png` — 1440×1000

### Mechanical browser proof

Evidence: `docs/program/evidence/qr-studio-creator-signature-ux-challenge/browser-proof.json`

Both viewports returned HTTP 200 and had:

- zero page/console errors;
- exactly 2 text inputs;
- 8 radio groups (font/size/colour × 2, placement, offset);
- no horizontal tray overflow;
- 8 selected controls after interaction;
- successful interaction with Serif, Large, Accent, Top-left placement, and 3mm offset;
- concept bottom at `745.5px` within the `844px` mobile viewport.

The production-preview server was stopped after capture and port `4183` was verified closed.

## Tests and commands

Canonical final log: `docs/program/evidence/qr-studio-creator-signature-ux-challenge/final-gates.log`

1. `npx pnpm@9.0.0 --filter @qr/web test -- App.test.tsx`
   - PASS — 1 file, 9 tests.
   - Includes child-route isolation, exact semantic cardinalities, state updates, and default-route preservation.
2. `npx pnpm@9.0.0 --filter @qr/web build`
   - PASS — TypeScript and Vite production build; 126 modules transformed.
3. `FONTCONFIG_FILE=... LD_LIBRARY_PATH=... npx --yes node@20 docs/program/evidence/qr-studio-creator-signature-ux-challenge/browser-proof.mjs`
   - PASS — mobile and desktop HTTP/render/interaction/console/overflow proof; output in `browser-proof.json` and `browser-proof-final.log`.
4. `git diff --check`
   - PASS — no whitespace errors.

### Superseded attempts

- Initial build failed only for two unused type imports in the new concept component. Imports were removed; the complete test+build sequence was rerun and passed.
- Initial browser setup exposed runner-environment gaps (Node 18 versus Playwright 1.62's Node 20 requirement, missing browser/runtime libraries) and an orphaned Vite preview process. Browser Chromium/runtime libraries were installed locally, the proof ran under Node 20, stale preview trees were terminated, the final build was served on strict port `4183`, and the complete browser proof was rerun against that exact server.

## Files changed

### Product and tests

- `apps/web/src/App.tsx`
- `apps/web/src/App.test.tsx`
- `apps/web/src/components/ArtDirectionPanel.tsx`
- `apps/web/src/components/CreatorSignatureConceptControls.tsx`

### Evidence and report

- `docs/program/evidence/qr-studio-creator-signature-ux-challenge/app-test-attempt-1.log`
- `docs/program/evidence/qr-studio-creator-signature-ux-challenge/build-attempt-1.log`
- `docs/program/evidence/qr-studio-creator-signature-ux-challenge/final-gates.log`
- `docs/program/evidence/qr-studio-creator-signature-ux-challenge/browser-proof.mjs`
- `docs/program/evidence/qr-studio-creator-signature-ux-challenge/browser-proof.log`
- `docs/program/evidence/qr-studio-creator-signature-ux-challenge/browser-proof-final.log`
- `docs/program/evidence/qr-studio-creator-signature-ux-challenge/browser-proof.json`
- `docs/program/evidence/qr-studio-creator-signature-ux-challenge/creator-signature-concept-mobile.png`
- `docs/program/evidence/qr-studio-creator-signature-ux-challenge/creator-signature-concept-desktop.png`
- `docs/program/reports/qr-studio-creator-signature-ux-challenge-2026-08-07.md`

## Rationale

The concept treats the settings as an instrument panel rather than a form: each visual property is recognized by shape, typography, colour, or placement diagram. Two parallel line cards make per-line independence immediately visible. Placement and physical offset form a separate spatial row, while the live QR remains the dominant preview. The visual grammar intentionally reuses the QR Style tray's dark surfaces, compact tiles, rounded geometry, cyan focus/selection, and icon-first interaction.

## Risks and trade-offs

- Font choices use compact letterform samples (`A/A/M`); differentiation is visual and accessible by name, but users unfamiliar with typography may need title/assistive labels rather than visible prose.
- Mobile line inputs share one row to keep the full tray inside one viewport, so long signature text is horizontally clipped while editing (the underlying max lengths and full stored values remain unchanged).
- Colour swatches consume the current project palette semantics; colour identity is exposed through accessible names, but no visible text label is shown by design.
- This is a route-isolated concept, not a router framework addition. Vite history fallback serves it correctly, but any future server-side route allowlist must preserve the child path.
- The supplied SOW checksum remains declaration-only until Product Architect restores or provides the authoritative SOW file for independent hash verification.

## Authority boundaries

- No QR Core, commerce, export, destination, payment, or entitlement behavior changed.
- No PR was opened or merged.
- No deployment was performed.
- Product Architect retains acceptance, integration, release, and merge authority.
