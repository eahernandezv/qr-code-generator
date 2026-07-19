# High-Level Product Requirements Document

Status: Draft for Gate 1 review  
Version: 0.1  
Date: 2026-07-19

## 1. Product definition

A design-forward web utility for creating static QR assets, purchasing durable editable dynamic QR campaigns, and producing branded QR assets in browser-side batches without mandatory recurring subscriptions.

## 2. Personas and priority

- **P1 Small business operator:** highest launch priority.
- **P2 Independent marketer/agency:** high priority.
- **P3 Event/wedding planner:** high priority, especially static and finite campaigns.
- **P4 Operations manager:** bulk-pass priority.
- **P5 Internal support/operator:** required for safe launch but not a customer-facing enterprise console.

## 3. Core journeys

1. **Static:** arrive → enter content → style → validate scannability → preview → export PNG/SVG.
2. **Dynamic:** create draft → authenticate → pay → receive entitlement → configure destination/slug → activate → scan → edit destination without reprinting.
3. **Custom domain:** choose campaign → enter hostname → receive DNS instruction → prove control → provision TLS → activate → monitor/repair.
4. **Analytics:** open campaign → view scan totals and restrained time/location/device summaries → change range → export summary later if validated.
5. **Bulk:** choose style → upload CSV → map/validate columns → preview failures → pay → generate locally → download ZIP and manifest.
6. **Recovery:** regain account access → review entitlement/campaign state → restore safe configuration or contact support.
7. **Deletion:** delete campaign/account according to retention and legal obligations; deleted routes no longer resolve to former destination.

## 4. Functional requirements

### Static Studio

- **FR-001:** The product MUST generate static QR codes without registration.
- **FR-002:** It MUST validate supported payloads and reject unsafe or malformed inputs with actionable messages.
- **FR-003:** It MUST provide real-time preview while editing colors, background, error correction, margin, frame/preset, eye styling, and an optional logo.
- **FR-004:** It MUST export standards-compliant SVG and high-resolution PNG.
- **FR-005:** It MUST warn when styling or logo coverage creates material scan risk and provide a safe reset.
- **FR-006:** Static generation and export SHOULD occur locally without uploading payload or logo content.

### Identity and entitlements

- **FR-007:** Paid capabilities MUST require an authenticated account with verified ownership of its login identifier.
- **FR-008:** Every purchase MUST create an auditable, idempotent entitlement linked to the purchaser and offer.
- **FR-009:** Authorization MUST enforce tenant ownership for campaigns, domains, analytics, and purchases.
- **FR-010:** Users MUST be able to recover access without support when the configured identity provider permits it.

### Commerce

- **FR-011:** The product MUST support a one-time Dynamic Campaign purchase and one-time Bulk Batch Pass purchase.
- **FR-012:** Payment completion MUST be confirmed by authenticated provider webhook, not browser return alone.
- **FR-013:** Duplicate or retried payment events MUST NOT create duplicate entitlements.
- **FR-014:** Purchase history and entitlement status MUST be visible to the owner.
- **FR-015:** Refund, dispute, fraud, and payment reversal behavior MUST be defined per offer before launch; reversal MUST NOT silently redirect printed codes to an unrelated destination.

### Dynamic campaigns and redirect runtime

- **FR-016:** An entitled user MUST be able to create one active dynamic campaign per available campaign entitlement.
- **FR-017:** The owner MUST be able to edit a campaign destination without regenerating its QR image.
- **FR-018:** The system MUST validate destinations and block prohibited schemes and known unsafe targets.
- **FR-019:** A public campaign route MUST issue an editable-safe HTTP redirect and MUST NOT expose private account data.
- **FR-020:** Redirect serving MUST remain available during dashboard/control-plane degradation within the defined recovery window.
- **FR-021:** The campaign owner MUST be able to pause, resume, archive, and delete a campaign with explicit route behavior for each state.
- **FR-022:** Route suspension for abuse or legal reasons MUST have a reason code, audit record, safe response, and operator review/appeal path.

### Scan events and analytics

- **FR-023:** Successful and relevant failed route requests MUST emit privacy-minimized scan events asynchronously.
- **FR-024:** Campaign owners MUST see total scans and time-series summaries.
- **FR-025:** The dashboard SHOULD show coarse country/region and device/referrer categories only when reliably available and disclosed.
- **FR-026:** Analytics MUST distinguish bot/suspected abuse traffic from human-like scans when feasible and label uncertainty.
- **FR-027:** Analytics delay and retention MUST be disclosed.

### Custom domains

- **FR-028:** A Dynamic Campaign entitlement MUST permit one active custom hostname mapping, subject to domain limits and availability.
- **FR-029:** The user MUST prove control through documented DNS configuration before activation.
- **FR-030:** The system MUST prevent hostname takeover, conflicting claims, and activation before certificate readiness.
- **FR-031:** Users MUST see domain states and corrective instructions: pending DNS, verifying, provisioning, active, degraded, and removed.
- **FR-032:** Removing a custom domain MUST safely detach routing and prevent later account takeover of stale configuration.

### Bulk batches

- **FR-033:** Users MUST be able to upload a documented CSV format with up to 500 rows at launch.
- **FR-034:** The product MUST validate headers, row count, URL/payload data, duplicate output names, and unsafe filenames before payment/generation.
- **FR-035:** The user MUST preview valid/invalid row counts and representative output before consuming a pass.
- **FR-036:** A Bulk Batch Pass MUST be consumed exactly once only after generation begins under defined retry semantics.
- **FR-037:** Valid rows MUST generate consistently styled SVG files locally and download as one ZIP containing a manifest.
- **FR-038:** Partial failures MUST be listed in the manifest and MUST NOT silently omit rows.
- **FR-039:** Uploaded CSV content and generated assets SHOULD remain browser-local unless explicit recovery/storage is later introduced.

### Experience, growth, support, and lifecycle

- **FR-040:** The public homepage MUST expose the functional Static Studio above the fold without requiring registration.
- **FR-041:** The interface MUST support light/dark modes, a monochrome base, one configurable accent system, visual presets, and instant state updates.
- **FR-042:** Programmatic landing pages MUST provide unique, useful content and open the same canonical Studio rather than duplicate generator implementations.
- **FR-043:** Operators MUST have audited tools for campaign lookup, abuse state, payment/entitlement diagnosis, and domain diagnosis without unrestricted secret exposure.
- **FR-044:** Users MUST be able to request account/data deletion and understand retained billing/security records.
- **FR-045:** The service MUST publish status, support, acceptable-use, privacy, refund, and continuity information before paid launch.

## 5. Non-functional requirements

- **NFR-001 Availability:** Public redirect runtime target is at least 99.95% monthly after general availability; control-plane availability has a separate lower target.
- **NFR-002 Latency:** Warm redirect processing SHOULD achieve p95 ≤100 ms and p99 ≤250 ms measured server-side, excluding client network and downstream destination.
- **NFR-003 Isolation:** Dashboard/control-plane failure MUST NOT require redirect runtime failure; analytics failure MUST NOT block redirects.
- **NFR-004 Security:** OWASP-relevant controls, tenant authorization tests, webhook signature verification, CSRF/session protections, SSRF-safe destination handling, rate limiting, and secret rotation MUST be implemented.
- **NFR-005 Privacy:** Collect the minimum scan data; raw IP MUST NOT be retained beyond the short processing/security window approved in policy.
- **NFR-006 Accessibility:** Customer interfaces MUST meet WCAG 2.2 AA for launch-critical journeys.
- **NFR-007 Browser support:** Latest two stable versions of major evergreen desktop browsers; mobile support for static/dynamic management; 500-row bulk guarantee may be desktop-only and disclosed.
- **NFR-008 Export fidelity:** Reference SVGs MUST validate, preserve quiet zone, embed/safely reference assets, and pass automated and physical scan tests at documented sizes.
- **NFR-009 Durability:** Campaign configuration and entitlement data MUST have encrypted backups, point-in-time recovery where available, and tested restoration.
- **NFR-010 Observability:** Correlated metrics/logs/traces and alerts MUST cover redirect errors/latency, webhook failures, domain provisioning, analytics lag, and abuse spikes.
- **NFR-011 Idempotency:** Commerce, entitlement, domain, and event consumers MUST tolerate retries without duplicate durable effects.
- **NFR-012 Cost controls:** Per-campaign traffic/storage/support costs and anomaly budgets MUST be observable; fair-use enforcement MUST be transparent and never based only on an expired card.
- **NFR-013 SEO quality:** Generated pages MUST be indexable only when unique and useful, with canonicalization, sitemap controls, and no doorway-page behavior.
- **NFR-014 Maintainability:** Shared contracts MUST be versioned; database tables and infrastructure resources have one owning workstream.
- **NFR-015 Recovery:** Provisional objectives: redirect RTO ≤30 minutes for regional/provider incident and control-data RPO ≤5 minutes where the selected stack supports it; validate via architecture spike.

## 6. Entitlement and lifecycle semantics

### Terminology

Use **Durable Campaign License** in specifications. Public “lifetime/forever/unlimited” language remains prohibited until approved.

### Proposed semantics

- One purchase grants one campaign slot, consumed while a campaign is active.
- Archiving may release the slot only if the original public route is permanently retired; route reuse policy must prevent hijacking.
- No monthly rebilling is required to keep an otherwise compliant campaign active.
- Fair-use controls respond to abuse or exceptional cost, not ordinary popularity.
- Service continuity, company closure, force majeure, and migration/export commitments require explicit terms.
- A refunded or disputed purchase moves through a documented review state; it does not silently break a printed code.

## 7. Launch scope

### MVP

- Static URL/text QR Studio with safe presets and PNG/SVG.
- Account, one-time dynamic campaign purchase, one dynamic route, destination editing.
- Basic totals and time-series analytics.
- One custom hostname flow if the spike validates self-service economics; otherwise controlled beta.
- CSV-to-SVG ZIP bulk pass up to 500 on supported desktop browsers.
- Status, privacy, acceptable use, refunds, continuity policy, support tooling, monitoring.

### Later

- Teams, roles, transfer, advanced analytics, API, scheduled redirects, multi-domain portfolios, PDF/EPS, webhooks, richer QR payloads, and agency branding.

## 8. Acceptance journeys

- **AJ-01:** Anonymous user creates a styled QR, downloads SVG/PNG, and both scan to the exact payload on reference devices.
- **AJ-02:** User pays once, webhook grants entitlement once, creates campaign, scans public QR, changes destination, and the same QR reaches the new destination.
- **AJ-03:** Control plane is disabled during test; an existing route continues to redirect and analytics failure does not increase redirect failures.
- **AJ-04:** User verifies a hostname, certificate becomes active, hostname routes correctly, and stale/unverified ownership cannot be claimed.
- **AJ-05:** User validates and purchases a 500-row batch; ZIP contains 500 valid SVGs plus complete manifest within the supported performance envelope.
- **AJ-06:** Cross-tenant and webhook replay tests fail safely with audit evidence.
- **AJ-07:** Paused, deleted, abusive, refunded/review, and degraded-domain states each produce the documented safe behavior.

## 9. Open product decisions

1. Exact service-life and continuity promise replacing “forever.”
2. Fair-use thresholds and remediation sequence.
3. Refund/dispute treatment for already printed dynamic codes.
4. Whether a campaign slot can be transferred or reused.
5. Canonical hosted route domain and slug policy.
6. Which analytics dimensions are useful enough to justify collection.
7. Custom-domain scope: hostname per campaign versus hostname per account with multiple slugs.
8. Authentication methods and guest-to-paid transition.
9. Taxes/VAT, currencies, invoice requirements, and launch jurisdictions.
10. Support SLA and migration/export remedy if service is discontinued.
