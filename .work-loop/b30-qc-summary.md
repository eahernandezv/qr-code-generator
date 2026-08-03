# B30 QC — remove Creator Signature shelf line and tighten text placement

Status: ACCEPTED_BY_PRODUCT_ARCHITECT

## User-reported defects
- Unwanted visible horizontal divider line in the reserved shelf.
- Signature remained too far from the QR code border/boundary versus approved target.
- Product Architect QC should catch this before asking user to review.

## Fix
- Removed the rendered shelf divider line from Creator Signature SVG composition.
- Moved bottom shelf text baseline from QR bottom + 39 to QR bottom + 24.
- Kept bottom-right text anchored to QR right vertical boundary.
- Kept bottom-left mirrored to QR left vertical boundary.
- Preserved text-only/no badge/no pill grammar.

## Regression checks added
- Unit test now asserts bottom text uses QR bottom + 24.
- Unit/e2e tests now assert no rendered `stroke="#e2e8f0"` shelf divider remains.
- E2E geometry now reads explicit reserved-shelf marker instead of text bounding box.

## Gates run
- pnpm install --frozen-lockfile: PASS
- qr-core build: PASS
- artistic-qr build: PASS
- web lint: PASS
- creatorSignature.test.ts: 18/18 PASS
- web build: PASS
- Playwright B29/B30-relevant run: 34 PASS / 1 skipped
- git diff --check: PASS

## Visual QC evidence
- Before/after confirms no shelf divider and no dark/blue pill.
- All-position contact sheet confirms text-only labels and no visible divider lines.
