# Creator Signature Space-Efficiency Challenge — 2026-08-07

## Product context
User liked the new icon-driven Creator Signature controls, but the mobile screenshot shows a serious space-efficiency defect: Line 1 and Line 2 each repeat the same font/size/color icon grids. This duplicates a large block of controls and pushes placement/offset lower on mobile.

Reference screenshot copied locally for this worker:
`docs/program/evidence/creator-signature-space-efficiency-challenge/user-circled-duplication.jpg`

Current merged baseline:
`origin/main` = `a9a3084dbd9ed50a1b63f56c512f6884ef142676`

## Hard contract to preserve
- Exactly two signature lines.
- No 3rd line, no CTA, no default line text.
- Each line remains independently editable for text, font, size, color.
- Fonts: Sans, Serif, Mono, Cursive, Handwritten, Display.
- Sizes: Small, Medium, Large, Extra Large.
- Colors: current semantic Creator Signature color set.
- Placements: bottom-left, bottom-right, below-centered, top-left, top-right.
- Boundary offsets: 0mm, 1mm, 2mm, 3mm.
- Preserve current accepted render behavior: no SVG textLength/lengthAdjust compression; current line spacing and above/below baseline rules.
- Preserve QR Core, commerce, export, payment, destination, and entitlement behavior.

## Challenge
Create a route-isolated alternative that improves the current merged main Studio Creator Signature UX, specifically reducing or eliminating the duplicated per-line control rows while keeping per-line independence.

The concept should be visually driven, compact, modern, and harmonious with QR Style. Prefer little/no explanatory text; text belongs inside inputs/controls only. Icon-only controls need accessible names, titles, focus states, and selected states.

## Non-goals
- Do not replace the main route.
- Do not open/merge a PR.
- Do not change QR Core, commerce, export, payment, destination, entitlement, or checkout.
- Do not remove independent per-line styling.

## Required evidence
- Route path and URL.
- Files changed.
- Screenshots: mobile 390x844 and desktop 1440x1000 if browser tooling allows.
- Test/build commands and outputs.
- Final branch HEAD and remote read-back if push works.
- Report SHA-256.
- Short rationale: how the design reduces duplicated controls and what tradeoffs remain.

## Suggested gates
```bash
npx pnpm@9.0.0 install --frozen-lockfile
npx pnpm@9.0.0 --filter @qr/qr-core build
npx pnpm@9.0.0 --filter @qr/artistic-qr build
npx pnpm@9.0.0 --filter @qr/web test -- App.test.tsx QRPreview.test.tsx creatorSignature.test.ts
npx pnpm@9.0.0 --filter @qr/web build
```

## QR Studio assignment
Owner: QR Studio.

Target branch:
`studio/creator-signature-space-efficient-v2`

Target route:
`/concepts/creator-signature-ux/space-studio`

Design direction to explore:
A production-feasible compact Studio concept that keeps the original main Studio shell and shared QR canvas, but replaces duplicated Line 1 / Line 2 style grids with one shared style inspector controlled by an active-line selector.

Possible pattern:
- Two compact line input rows/cards at top.
- Each line row displays a compact visual summary of its current font/size/color.
- Tapping Line 1 or Line 2 selects the active line.
- One shared font grid, one shared size grid, and one shared color grid below mutate only the active line.
- Placement and offset remain shared signature-level controls below that.
- Strong active-line state; must be obvious which line is being styled.

Acceptance emphasis:
- Demonstrably shorter vertical footprint than current duplicated layout.
- No loss of per-line independence.
- Feels like a real candidate for main route integration, not just a wireframe.

Report path:
`docs/program/reports/qr-studio-creator-signature-space-efficient-v2-2026-08-07.md`
