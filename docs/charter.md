# QR MVP — Product Charter

## Target Users
- Small businesses needing branded QR codes for menus, cards, and signage.
- Individual creators wanting artistic QR for portfolios or events.

## Jobs-to-be-Done
1. Generate a scannable QR code that does not look like a generic barcode.
2. Export it in print-ready formats (PNG, SVG, PDF).
3. Pay for higher resolution or watermark removal without creating an account.

## Explicit Non-Goals
- Dynamic redirect management (Phase 2).
- Custom domain or URL shortening.
- Analytics dashboard or scan tracking.
- Team plans, subscriptions, or enterprise features.
- Mobile app or offline editing.

## Success Metrics
- 90%+ of generated QRs pass validation on standard scanners.
- Export completes in <5 seconds for 1000x1000 PNG.
- Guest checkout completes in <3 clicks.

## Kill Criteria
- If artistic rendering drops scan reliability below 80% by week 4 of MVP dev.
- If guest purchase conversion is <2% in first 30 days post-launch.

## Legal/Security Constraints
- No user accounts or PII storage (guest-only).
- Payment handled by Stripe Checkout (no card data touches our servers).
- Exported QRs must not encode malicious URLs (input validation).
