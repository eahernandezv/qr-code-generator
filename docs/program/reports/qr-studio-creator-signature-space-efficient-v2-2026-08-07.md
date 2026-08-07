# QR Studio — Creator Signature Space-Efficient V2

**Status:** `READY_FOR_PRODUCT_ARCHITECT_REVIEW`

## Contract and custody

- SOW: `docs/program/handoffs/qr-studio-creator-signature-space-efficient-v2-2026-08-07.md`
- SOW SHA-256: `e097aae3b65d209bfc87a9f62db8b7191c35e6fe007a17172c79cc8d7cdd4855`
- Exact baseline: `a9a3084dbd9ed50a1b63f56c512f6884ef142676`
- Branch: `studio/creator-signature-space-efficient-v2`
- Route: `/concepts/creator-signature-ux/space-studio`
- Review URL during local proof: `http://127.0.0.1:4189/concepts/creator-signature-ux/space-studio`
- No PR opened, no merge performed, no deployment performed.

## Result

The route retains the accepted main Studio shell and shared Core-backed QR canvas, opens Creator Signature by default, and replaces six duplicated per-line style groups with one three-group inspector for the selected line.

Two compact line cards remain simultaneously visible. Each contains its text input and a live visual font/size/color summary. The numbered line selector, cyan border, selected dot, `aria-pressed`, and inspector line badge make the active styling target explicit. Focusing an input also selects that line. All icon-only controls retain accessible names, titles, visible focus rings, and selected states.

The frozen contract remains intact:

- exactly two empty-by-default editable text lines;
- independent font, size, and color state for each line;
- six fonts, four sizes, and four current semantic colors;
- five placements and four boundary offsets;
- no third line or CTA;
- no changes to QR Core, rendering geometry, text compression, commerce, export, payment, destination, entitlement, or checkout.

## Space-efficiency evidence

At 390×844, browser geometry measured the accepted duplicated tray at **436px** tall and this shared-inspector tray at **352px** tall: **84px / 19.3% shorter**. Style-group cardinality drops from **6 to 3** while line textboxes remain **2**. The final mobile state has no horizontal overflow and requires no document scrolling (`scrollHeight = clientHeight = 844`). Placement and offset rows remain visible in the first viewport.

Evidence:

- `docs/program/evidence/creator-signature-space-efficient-v2/layout-metrics.json`
- `docs/program/evidence/creator-signature-space-efficient-v2/space-studio-mobile-390x844.png`
  - SHA-256 `d53638a037e24f320d60234f4bb1ac33595796538e194982852d1beb4b2745c7`
- `docs/program/evidence/creator-signature-space-efficient-v2/space-studio-desktop-1440x1000.png`
  - SHA-256 `b9164e17cb172dc2e5a4cf52bf404909c7c07e046bca1fd196cc51d503e5f02c`
- Reproducible capture: `docs/program/evidence/creator-signature-space-efficient-v2/capture-evidence.mjs`
- Capture log: `docs/program/evidence/creator-signature-space-efficient-v2/evidence-capture-final-success.log`

Pixel inspection found no clipping or horizontal overflow. On mobile, both line cards, the active Line 2 shared inspector, all placement choices, and all offsets are visible. The signature remains at the QR card edge outside active modules. On desktop, the compact control rail and shared preview remain balanced within the accepted one-screen Studio shell.

## Interaction and authority proof

`App.test.tsx` proves:

- `/` does not render the shared inspector;
- the exact target route renders the existing Studio application and starts on Creator Signature;
- only one font, size, and color group is mounted at a time;
- switching from Line 1 to Line 2 changes only the active target;
- distinct per-line font/size/color values persist in canonical project template fields;
- exactly two line textboxes remain, with no Line 3 or CTA;
- placement and offset cardinalities remain 5 and 4.

The existing `creatorSignature.test.ts` and `QRPreview.test.tsx` gates continue to prove render geometry, no `textLength`/`lengthAdjust`, line spacing, placement/offset behavior, and Core-backed preview behavior. No trusted validation or decoder-confidence presentation was introduced.

## Required gates

Canonical final log: `docs/program/evidence/creator-signature-space-efficient-v2/final-gates.log` (ends in `FINAL_GATE_SUCCESS`).

| Command | Result |
|---|---|
| `CI=1 npx pnpm@9.0.0 install --frozen-lockfile` | PASS — lockfile current |
| `npx pnpm@9.0.0 --filter @qr/qr-core build` | PASS |
| `npx pnpm@9.0.0 --filter @qr/artistic-qr build` | PASS |
| `npx pnpm@9.0.0 --filter @qr/web test -- App.test.tsx QRPreview.test.tsx creatorSignature.test.ts` | PASS — 3 files, 42 tests |
| `npx pnpm@9.0.0 --filter @qr/web build` | PASS — 126 modules transformed |
| `git diff --check` | PASS |
| Browser capture/assertion at 390×844 and 1440×1000 | PASS — no console/page errors; 19.3% tray-height reduction |
| Preview server teardown / port 4189 cleanup | PASS — port closed |

An initial focused test was attempted before workspace package builds and could not resolve the unbuilt `@qr/artistic-qr/render-intent` subpath. QR Core and Artistic QR were built, then the focused App suite passed 10/10. The complete fail-fast final sequence was rerun from installation through web build and passed; only the final successful gate log is canonical.

## Changed files

- `apps/web/src/App.tsx`
- `apps/web/src/App.test.tsx`
- `apps/web/src/components/ArtDirectionPanel.tsx`
- `apps/web/src/components/TemplateArtControls.tsx`
- `docs/program/handoffs/qr-studio-creator-signature-space-efficient-v2-2026-08-07.md`
- `docs/program/evidence/creator-signature-space-efficiency-challenge/user-circled-duplication.jpg`
- `docs/program/evidence/creator-signature-space-efficient-v2/*`
- `docs/program/reports/qr-studio-creator-signature-space-efficient-v2-2026-08-07.md`

## Tradeoffs and residual review points

- One inspector means styles are compared through the persistent summaries rather than two fully expanded grids. This is the intentional source of the 19.3% height reduction; line switching is one tap.
- Desktop preserves the accepted no-scroll Studio shell, leaving substantial below-editor whitespace at 1440×1000. The concept optimizes mobile control density and does not redesign the wider Studio composition.
- Product Architect should independently reproduce the exact route, verify the screenshots/metrics, and decide whether this route-isolated concept should replace the duplicated main-route layout. PR and merge authority remain with Product Architect.
