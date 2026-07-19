# Product Charter

Status: Draft for Gate 0 review  
Date: 2026-07-19

## Vision

Make professional QR infrastructure feel like buying a durable printing tool rather than renting enterprise software: immediate creation, clear one-time pricing, reliable redirects, and only the analytics users need.

## Target users and jobs

1. **Small business operator** — publish a menu, sign, flyer, or product label and retain destination control without recurring subscription anxiety.
2. **Independent marketer or agency** — create branded campaign assets, update destinations, and report basic results without enterprise dashboard overhead.
3. **Wedding/event planner** — create polished print-ready codes for finite campaigns with confidence that printed materials remain usable.
4. **Operations manager** — transform a spreadsheet into hundreds of consistently branded vector assets without an enterprise contract or API integration.

## Problem

The market appears polarized between free static generators with limited design/tracking and subscription products whose dynamic features, bulk operations, and custom domains are paywalled. Physical QR assets outlive billing cycles; users fear losing functioning redirects when payment lapses.

## Promised outcome

Users can create attractive static codes for free, purchase durable editable dynamic campaigns without a monthly subscription, and purchase self-serve bulk exports. The product is fast, transparent, and intentionally simpler than enterprise suites.

## Proposed commercial model

| Offer | Proposed price | Entitlement intent |
|---|---:|---|
| Static Studio | $0 | Browser-side static generation and high-resolution PNG/SVG export; no account required |
| Durable Dynamic Campaign | $19 one-time | One editable dynamic campaign, scan routing, basic analytics, and one custom-domain mapping, subject to service-life and fair-use terms |
| Bulk Batch Pass | $29 per batch | One browser-side batch job of up to 500 valid rows with branded SVG ZIP output |

Prices and limits are hypotheses until willingness-to-pay, fees, taxes, support load, storage, redirect traffic, domain automation, and continuity reserves are modeled.

## Differentiation

- Tool-first interface rather than a marketing wall.
- High-fidelity, minimalist design inspired by modern developer/creator utilities.
- One-time campaign and batch purchases instead of mandatory subscriptions.
- Print-ready vectors and visual presets available without enterprise sales.
- Compact, privacy-conscious analytics.
- Custom-domain access designed for small organizations.

## Explicit non-goals for launch

- Enterprise SSO/SCIM, procurement, SLAs, or dedicated account management.
- Full link-management suite, bio pages, social CRM, attribution platform, or ad retargeting.
- Native mobile applications.
- Arbitrary QR payload families beyond URL/text essentials unless validated.
- API-first bulk automation or warehouse integrations.
- Guaranteed perpetual operation independent of company/service existence.
- Exact user location, invasive fingerprinting, or retention of raw IP addresses for marketing.

## Constraints

- Dynamic redirects must not be deactivated solely because no recurring payment exists.
- One-time economics must fund payment fees, support, storage, analytics, domain certificates, abuse mitigation, and long-term redirect operations.
- Editable dynamic routes must use non-permanent HTTP redirect semantics to avoid stale browser/CDN caches.
- Logos and styling must preserve scannability and provide warnings/validation.
- Custom domains require proof of control, collision prevention, certificate automation, and safe offboarding.
- User-controlled destinations require phishing/malware/abuse controls and a transparent suspension/appeal process.
- Privacy notices, retention, deletion, tax, refund, consumer protection, and trademark review are required before launch.

## Product success metrics

- Static creation-to-download completion rate.
- Time to first valid export.
- Static-to-paid conversion rate.
- Checkout-to-activated-campaign success rate.
- Redirect success rate and latency.
- Percentage of custom domains activated without support.
- Bulk upload-to-successful ZIP completion rate.
- Refund, chargeback, abuse suspension, and support-contact rates.
- Contribution margin per campaign after modeled service-life costs.

## Initial launch targets (provisional)

- At least 95% of valid static sessions can export without server involvement.
- At least 98% of successful payments activate an entitlement automatically within two minutes.
- At least 99.95% monthly redirect availability after public launch.
- At least 95% of valid 500-row reference batches complete on supported desktop browsers.
- Zero cross-tenant campaign access in authorization tests.

## Kill or redesign criteria

- Modeled lifetime service cost plus risk reserve makes the proposed one-time price structurally loss-making.
- Abuse controls require invasive tracking inconsistent with positioning.
- Custom-domain support creates unsustainable manual operations at the proposed price.
- Browser-side batch generation is unreliable across the supported device/browser matrix.
- Redirect availability cannot be isolated from control-plane/dashboard failures.
- Customer research does not demonstrate meaningful preference for one-time campaign pricing.

## Governance

- Product owner decides scope, promises, and pricing semantics.
- Architecture owner decides boundaries and approves contract changes.
- Contract owners maintain versioned interfaces.
- Integrator owns the application shell, assembly, E2E environment, and release evidence.
- No implementation agent may silently broaden scope or change a shared contract.
