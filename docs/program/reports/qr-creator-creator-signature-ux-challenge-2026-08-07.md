# QR Creator — Creator Signature icon UX challenge report

**Date:** 2026-08-07
**Owner:** QR Creator
**Status:** COMPLETE — ready for Product Architect review
**Branch:** `creator/creator-signature-icon-ux-concept`
**Controller baseline:** `beb33aa5bc23ef7314430f8afeba3a08067bc4fb`
**PR / merge:** none opened; none merged

## Deliverable

- Child route path: `/concepts/creator-signature-ux/creator`
- Baseline-host URL after this branch is integrated/deployed: `https://placeholder-online.com/concepts/creator-signature-ux/creator`
- Local proof URL used for final capture: `http://127.0.0.1:4176/concepts/creator-signature-ux/creator`
- The public `/` route remains on the baseline Studio.

## Concept rationale

The concept treats the signature as two independent visual layers instead of a form with explanatory labels:

1. Exactly two stacked line cards keep each line's text and styling physically associated.
2. Text appears only inside its input field. All surrounding controls are icon-first.
3. Font controls use visibly different glyph construction; size controls use progressively scaled type marks; colors are direct swatches from the current project palette.
4. Five placement controls use the same miniature QR frame while moving the two-line signature mark to the real placement represented.
5. Boundary offset uses four progressively separated boundary/text diagrams. Tiny `0mm`–`3mm` values live inside the selection buttons because the exact unit is product-critical and cannot be communicated truthfully by distance alone.
6. Cyan outline, glow, and dot selection states remain consistent across every family.
7. Visible labels and explanatory copy are removed; semantic names remain available through `aria-label`, `title`, fieldset legends, and focus rings.

All controls update the existing `CreatorSignatureTemplateFields` and the existing composed QR preview. No mock-only setting was introduced.

## Preserved product semantics

- Signature lines: exactly **2**
- Per line: text, font (`sans`/`serif`/`mono`), size (`small`/`medium`/`large`), color (`primary`/`secondary`/`accent`/`dark-ink`)
- Placement options: exactly **5**
  - bottom left
  - bottom right
  - below centered
  - top left corner
  - top right corner
- Boundary offsets: exactly **0 / 1 / 2 / 3 mm**
- Existing Creator Signature composition and shared QR preview are reused.

## Screenshots

1. `docs/program/evidence/creator-signature-icon-ux/creator-desktop-1440x1000.png`
   - Dimensions: 1440×1000
   - SHA-256: `7f7f41cab23396d34f403dbf38e99b6b56d0f876810fea23540c72bf1f35b396`
2. `docs/program/evidence/creator-signature-icon-ux/creator-mobile-390x844.png`
   - Full-page dimensions: 390×860 from a 390×844 viewport
   - SHA-256: `8aa1efa8758864a0b713999695cc16d040813310db69d98db717d2c94660aeea`

Browser capture assertions returned:

```json
{
  "errors": [],
  "semantics": {
    "lineInputs": 2,
    "placementOptions": 5,
    "offsetOptions": 4,
    "selectedPlacement": "Top right corner",
    "selectedOffset": "2mm boundary offset"
  }
}
```

Visual review found the preview square and fully visible at desktop and mobile sizes, both line cards visible, no horizontal clipping, all five placement and four offset controls visible, and no visible explanatory text outside controls. Mobile offset units are rendered inside their selection buttons.

## Files changed

- `apps/web/src/App.tsx`
  - Exact pathname gate for the child concept route.
- `apps/web/src/App.test.tsx`
  - Child-route isolation and exact semantic-control coverage.
- `apps/web/src/components/CreatorSignatureIconConcept.tsx`
  - New icon-first concept UI using the existing Studio store and Creator Signature fields.
- `docs/program/evidence/creator-signature-icon-ux/creator-desktop-1440x1000.png`
- `docs/program/evidence/creator-signature-icon-ux/creator-mobile-390x844.png`
- `docs/program/reports/qr-creator-creator-signature-ux-challenge-2026-08-07.md`

No files changed under `packages/qr-core`, `packages/artistic-qr`, commerce, checkout, export, or destination components.

## Commands run and observed outputs

### Repository and baseline

```bash
git fetch --all --prune
git cat-file -t beb33aa5bc23ef7314430f8afeba3a08067bc4fb
git show -s --format='%H %D %s' beb33aa5bc23ef7314430f8afeba3a08067bc4fb
git switch -c creator/creator-signature-icon-ux-concept beb33aa5bc23ef7314430f8afeba3a08067bc4fb
```

Observed: baseline resolved as a commit on `origin/main`; branch created at exact SHA `beb33aa5bc23ef7314430f8afeba3a08067bc4fb`.

### TDD RED

```bash
npx pnpm@9.0.0 --filter @qr/web test -- App.test.tsx
```

Observed before implementation: **1 failed / 8 passed**; expected failure was the missing `creator-signature-icon-concept` child route.

### Required focused gate

```bash
npx pnpm@9.0.0 --filter @qr/web test -- App.test.tsx
```

Final observed output: **1 test file passed; 9/9 tests passed**.

### Required build gate

```bash
npx pnpm@9.0.0 --filter @qr/web build
```

Final observed output: TypeScript PASS; Vite PASS; **126 modules transformed**; built in **3.56s**.

### Broader regression gate

```bash
npx pnpm@9.0.0 --filter @qr/web test
```

Final observed output: **14/14 test files passed; 118/118 tests passed**. Existing React `act(...)` warnings remained in `CandidateBoard.test.tsx`; no failures.

### Browser proof and screenshots

```bash
npx --yes node@22 ../../node_modules/.pnpm/playwright@1.62.0/node_modules/playwright/cli.js install chromium
LD_LIBRARY_PATH=/home/hermes/.cache/ms-playwright/local-libs/root/usr/lib/x86_64-linux-gnu \
  npx --yes node@22 .work-loop/capture-creator-signature-concept.mjs
```

Observed: Chromium installed; browser run completed with **zero page/console errors**, two fields, five placements, and four offsets. Screenshot paths and selected-state read-back matched the evidence above.

Environment remediation evidence:

- Node 18 could not run Playwright 1.62 (`requires Node.js 20 or higher`), so Node 22 was used through `npx`.
- Chromium initially lacked system libraries.
- `playwright install-deps` could not elevate because the host sets `no new privileges`.
- Required Ubuntu packages were downloaded without root using `apt download`, extracted under the user cache, and supplied through `LD_LIBRARY_PATH`; `ldd` then returned no missing libraries.

### Scope and artifact checks

```bash
git diff --check
sha256sum docs/program/evidence/creator-signature-icon-ux/*.png
git status --short
```

Observed: diff check PASS; screenshot hashes match this report; scope scan returned **0 Core/Artistic Core changes** and **0 commerce/checkout/export/destination changes**.

## Independent review and remediation

An independent read-only reviewer initially returned **CONDITIONAL** because the first version added a shared `QRPreview.showCaption` prop and global CSS. Those changes were not necessary for the child route.

Remediation:

- Restored `QRPreview.tsx` and `index.css` exactly to baseline.
- Scoped preview sizing and caption hiding to the new component through local Tailwind descendant selectors.
- Replaced root `overflow-hidden` with horizontal-only clipping so short mobile viewports retain native vertical scrolling.
- Restored the prior template-art level when the concept route unmounts, preventing isolated-route state from leaking back into the main Studio.
- Added regression coverage for route-state cleanup.
- Re-ran focused tests, build, full web tests, browser proof, and screenshots successfully.

The untracked-file concern from the interim review is resolved by the final branch commit containing the component and evidence.

## Risks / tradeoffs

1. **Discoverability:** icon-only controls reduce visual noise but require recognition. Hover titles and screen-reader names provide exact semantics; touch users rely on the icon and immediate preview response.
2. **Color meaning:** swatches communicate output directly, but body/corner/accent/dark-ink role names are not visibly spelled out. This is intentionally consistent with the no-copy constraint.
3. **Offset precision:** pure spacing icons could not truthfully distinguish millimeters, so compact unit values remain visible inside the four selection buttons.
4. **Mobile height:** the full mobile composition is 860px tall for an 844px viewport, requiring approximately 16px of native vertical scroll; horizontal overflow remains clipped.
5. **Route hosting:** direct navigation requires the existing SPA fallback configuration when deployed. Vite direct-route proof passed locally.
6. **Concept behavior:** entering the isolated concept route temporarily switches the existing project to `template-art`, as required for a real Creator Signature preview. Unmount restores the prior level, and destination, commerce, and export state are untouched.

## Source-contract availability note

The requested SOW path `/home/hermes/qr-mvp-demo/docs/program/handoffs/qr-creator-creator-signature-ux-challenge-2026-08-07.md`, `/home/hermes/ARTISTIC-QR-TEAM-CHARTER.md`, and `/home/hermes/NEXT-MISSION.md` were absent on this host, and `/home/hermes/qr-mvp-demo` did not exist. Therefore the supplied SOW SHA-256 could not be independently recomputed. The complete dispatch text in the activation message was treated as the executable scope. The actual repository was discovered at `/home/hermes/QR-Code-Generator`, and the supplied controller baseline resolved exactly after fetch.

## Final decision

**COMPLETE / READY FOR PRODUCT ARCHITECT REVIEW**

- Child route implemented and exercised.
- Required semantics present and wired to real Creator Signature fields.
- Main route behavior preserved by regression tests.
- No QR Core, commerce, checkout, export, or destination edits.
- No PR opened; no merge performed.
