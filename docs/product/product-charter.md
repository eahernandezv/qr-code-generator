# Product Charter

Status: Draft for Gate 0 review  
Date: 2026-07-19

## Vision

Make artistic QR creation feel like a premium creative instrument rather than a decorated utility. The first major deliverable is a standalone, high-end Artistic QR Studio that produces distinctive artwork customers are proud to publish while preserving independently measured scan reliability. Dynamic infrastructure, commerce, domains, analytics, bulk workflows, and broader platform capabilities follow only after this creative core meets its release gate.

## Target users and jobs

1. **Small business operator** — publish a menu, sign, flyer, or product label and retain destination control without recurring subscription anxiety.
2. **Independent marketer or agency** — create branded campaign assets, update destinations, and report basic results without enterprise dashboard overhead.
3. **Wedding/event planner** — create polished print-ready codes for finite campaigns with confidence that printed materials remain usable.
4. **Operations manager** — transform a spreadsheet into hundreds of consistently branded vector assets without an enterprise contract or API integration.

## Problem

The market appears polarized between free static generators with limited design/tracking and subscription products whose dynamic features, bulk operations, and custom domains are paywalled. Physical QR assets outlive billing cycles; users fear losing functioning redirects when payment lapses.

## Promised outcome

Users can create attractive static and artistic QR codes, purchase durable editable dynamic campaigns without a monthly subscription, and purchase self-serve bulk exports. Artistic creation is an MVP capability: customers can turn a URL/text payload into visually integrated artwork while the product continuously protects the functional QR structure and clearly labels scan confidence. The product is fast, transparent, and intentionally simpler than enterprise suites.

## Delivery priority

1. **Artistic MVP first:** build, validate, and release the standalone Artistic QR Studio.
2. **Creative depth next:** improve projects, brand reuse, print/export quality, and artistic control using real customer evidence.
3. **Infrastructure around the proven core:** only then activate accounts/commerce, dynamic campaigns, redirect/analytics, custom domains, bulk, teams, and APIs in sequenced releases.

The broader commercial and infrastructure model remains a product direction, not MVP scope.

## Proposed commercial model

| Offer | Proposed price | Entitlement intent |
|---|---:|---|
| Standalone Artistic Studio MVP | $0 preview; $12 project; $5 contextual exploration | Four-candidate free proof, one-time guest project unlock with up to 12 candidates and one finished export, plus optional extra exploration; no full account or broader commerce platform required |
| Durable Dynamic Campaign | $19 one-time | One editable dynamic campaign, scan routing, basic analytics, and one custom-domain mapping, subject to service-life and fair-use terms |
| Bulk Batch Pass | $29 per batch | One browser-side batch job of up to 500 valid rows with branded SVG ZIP output |

Prices and limits are hypotheses until willingness-to-pay, fees, taxes, support load, storage, redirect traffic, domain automation, and continuity reserves are modeled.

## Differentiation

- Tool-first interface rather than a marketing wall.
- High-fidelity, minimalist design inspired by modern developer/creator utilities.
- One-time campaign and batch purchases instead of mandatory subscriptions.
- Print-ready vectors, visual presets, and scan-validated artistic QR creation available without enterprise sales.
- Artistic output that visibly integrates the QR into a scene or illustration while retaining a protected functional pattern and measurable scan confidence.
- Compact, privacy-conscious analytics.
- Custom-domain access designed for small organizations.

## Explicit non-goals for the Artistic MVP

- Customer accounts, paid checkout, entitlements, dynamic campaigns, redirects, scan analytics, custom domains, and bulk generation. These are sequenced after the Artistic MVP release gate, not removed from the product vision.
- Saved cloud projects or cross-device history; local/session persistence is sufficient unless a narrow anonymous project mechanism is approved.
- Unrestricted model/provider choice, unrestricted prompts, every visual style, or artistic bulk generation.
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
- Logos, deterministic styling, and generated artwork must preserve scannability and provide warnings/validation; an artistic result cannot be represented as safe until it passes the approved decoder/device test policy.
- Artistic prompts/reference images require content-safety, intellectual-property, privacy, provenance, provider-retention, latency, and per-generation cost decisions before launch.
- Custom domains require proof of control, collision prevention, certificate automation, and safe offboarding.
- User-controlled destinations require phishing/malware/abuse controls and a transparent suspension/appeal process.
- Privacy notices, retention, deletion, tax, refund, consumer protection, and trademark review are required before launch.

## Product success metrics

- Static creation-to-download completion rate.
- Time to first valid export.
- Artistic generation success rate, time to first scan-validated artistic export, regeneration rate, and decoder/device pass rate.
- Static-to-paid conversion rate.
- Checkout-to-activated-campaign success rate.
- Redirect success rate and latency.
- Percentage of custom domains activated without support.
- Bulk upload-to-successful ZIP completion rate.
- Refund, chargeback, abuse suspension, and support-contact rates.
- Contribution margin per campaign after modeled service-life costs.

## Initial launch targets (provisional)

- At least 95% of valid static sessions can export without server involvement.
- At least 90% of completed artistic generations produce at least one exportable candidate that passes the launch decoder matrix within three attempts; physical-device coverage and exact threshold remain subject to SP-08.
- At least 98% of successful payments activate an entitlement automatically within two minutes.
- At least 99.95% monthly redirect availability after public launch.
- At least 95% of valid 500-row reference batches complete on supported desktop browsers.
- Zero cross-tenant campaign access in authorization tests.

## Kill or redesign criteria

- Modeled lifetime service cost plus risk reserve makes the proposed one-time price structurally loss-making.
- Abuse controls require invasive tracking inconsistent with positioning.
- Custom-domain support creates unsustainable manual operations at the proposed price.
- Browser-side batch generation is unreliable across the supported device/browser matrix.
- Artistic generation cannot achieve an acceptable scan-pass rate, latency, content-safety posture, or sustainable per-generation cost; in that case the MVP must fall back to curated deterministic artistic templates rather than remove artistic QR creation entirely.
- Redirect availability cannot be isolated from control-plane/dashboard failures.
- Customer research does not demonstrate meaningful preference for one-time campaign pricing.

## Governance

- Product owner decides scope, promises, and pricing semantics.
- Architecture owner decides boundaries and approves contract changes.
- Contract owners maintain versioned interfaces.
- Integrator owns the application shell, assembly, E2E environment, and release evidence.
- No implementation agent may silently broaden scope or change a shared contract.
