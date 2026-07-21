# High-Level Solution Design

Status: Draft for Gate 2 review  
Version: 0.1  
Date: 2026-07-19

## 1. Architecture objectives

### MVP sequencing constraint

Only the Artistic Studio path is active MVP architecture scope: web experience, QR Core/validation, artistic generation/composition, export, narrow guest checkout/project-access capability, minimal provider infrastructure, safety/privacy, telemetry, and release QA. Full identity/entitlements/commerce, campaigns, redirect/analytics, domains, and bulk components remain future boundaries and must not become dependencies of the Artistic MVP.

- Keep static creation and bulk rendering browser-local where feasible.
- Deliver artistic QR creation in MVP through a deterministic safe-template baseline plus an optional provider-backed generative path only when scan, safety, privacy, latency, and cost gates pass.
- Isolate the latency-sensitive redirect data plane from dashboard/control-plane failures.
- Treat commerce webhooks as the authority for paid entitlements.
- Make analytics asynchronous and non-blocking.
- Automate custom-domain ownership and TLS safely.
- Give every state store, contract, and deployable one owner.

## 2. System context and trust boundaries

External actors/systems:
- anonymous visitors and scanners
- authenticated customers
- internal operators
- payment provider
- identity/email provider
- DNS and managed-certificate infrastructure
- destination websites
- abuse/malware intelligence provider, if selected

Trust boundaries:
- browser ↔ public web/API
- public redirect request ↔ edge runtime
- payment provider ↔ webhook receiver
- control plane ↔ redirect configuration projection
- DNS/public internet ↔ domain-control service
- operator tooling ↔ privileged APIs

No browser return, QR payload, destination, DNS claim, forwarded header, or analytics header is trusted without validation.

## 3. Logical planes and components

### Experience plane

**Web shell and Studio**
- Owns: route composition, navigation, session presentation, static tool UX.
- Does not own: entitlement, payment truth, campaign persistence, redirect serving.
- Exposes: browser UI and feature-module mounting contracts.
- Consumes: QR core, design system, control APIs.
- Stores: anonymous local preferences/drafts only unless consented.
- Failure: static tool should remain usable when paid APIs are unavailable.

**Feature modules**
- Static/Artistic Studio, campaign dashboard, domain setup, analytics views, and bulk wizard publish isolated modules to the integrator-owned shell.

### Control plane

**Identity and Entitlement Service**
- Owns: account identity mapping, tenant membership, offer/entitlement state, authorization primitives.
- Does not own: payment-provider objects or campaign settings.
- Exposes: identity/entitlement APIs and authorization claims.
- Consumes: verified identity and commerce grant/revoke events.
- Stores: accounts, tenants, entitlements, audit records.
- Failure: new paid actions unavailable; existing redirect projection remains active.

**Campaign Control Service**
- Owns: campaign metadata, destination, lifecycle, canonical route slug, configuration versions.
- Does not own: scan aggregates, payment state, TLS certificates.
- Exposes: campaign CRUD API and versioned route-configuration events.
- Consumes: entitlement checks and safety verdicts.
- Stores: source-of-truth campaign configuration and audit history.
- Failure: edits unavailable; last known valid redirect projection continues.

**Domain Control Service**
- Owns: hostname claims, verification challenges, certificate/provisioning state, route-to-hostname mapping.
- Does not own: registrar accounts or campaign destinations.
- Exposes: domain lifecycle API and verified mapping events.
- Consumes: DNS observations, entitlement/campaign ownership.
- Stores: normalized hostnames, verification tokens/hashes, state transitions, certificate references.
- Failure: new activation/repair delayed; hosted routes remain available.

### Commerce plane

**Artistic MVP guest purchase/unlock subset**
- Owns: $12 project and $5 exploration checkout creation, verified/idempotent provider-event inbox, successful-round/export allowance, opaque guest project-access capability, and purchase recovery.
- Does not own: customer accounts, subscription billing, generic credits, dynamic campaign entitlements, or QR generation decisions.
- Failure: free preview remains available; paid unlock/export waits for reconciliation and never trusts browser return alone.

**Future Checkout and Webhook Service**
- Owns: checkout-session creation, payment event inbox, provider-object mapping, refund/dispute ingestion.
- Does not own: final campaign or batch behavior.
- Exposes: checkout API and verified commerce events.
- Consumes: signed provider webhooks.
- Stores: provider IDs, event IDs, status, amounts/currency/tax metadata, audit records.
- Failure: activation delayed but recoverable by replay/reconciliation.

### Redirect data plane

**Edge Redirect Runtime**
- Owns: public route resolution, lifecycle enforcement, safe response, latency/availability metrics, scan-event emission.
- Does not own: customer editing or authoritative billing decisions.
- Exposes: hosted and custom-domain HTTP routes.
- Consumes: versioned route and hostname projections.
- Stores: replicated read-optimized route projection and short-lived counters/cache.
- Failure: serve last known valid configuration; fail closed for unknown/unsafe routes; analytics emission may drop or buffer without blocking redirect.

Use 302 or 307 by policy for editable destinations; do not default to 301. Define cache headers explicitly.

### Analytics plane

**Scan Event Ingestion and Read Model**
- Owns: event validation/deduplication, bot classification, privacy minimization, aggregates, retention, analytics queries.
- Does not own: routing decisions.
- Exposes: event schema consumer and owner-scoped analytics API.
- Consumes: asynchronous scan events.
- Stores: privacy-approved event fields and aggregates.
- Failure: analytics become delayed; redirects remain unaffected.

### Browser compute plane

**QR Core and Artistic Rendering Pipeline**
- Owns: payload normalization, QR matrix/style rendering, protected functional masks, deterministic artistic templates, candidate composition, SVG/PNG generation, decoder orchestration, scan-risk scoring, and safe fallback.
- Does not own: campaign persistence, payments, ZIP packaging, provider infrastructure, or global content policy.
- Exposes: deterministic `qr-core-api.v1`, `artistic-qr-api.v1`, validation evidence, and fixtures.
- Stores: no payload/logo/reference image by default for local modes; provider-backed artistic mode uses short-lived encrypted job metadata and the minimum provider retention permitted by approved policy.
- Failure: provider timeout/unsafe output/unscannable candidates return an actionable failure and preserve a deterministic safe candidate; no unvalidated artistic export is labeled scan-safe.

**Artistic generation adapter (conditional MVP path)**
- Owns: model/provider-neutral job submission, protected QR conditioning/masks, candidate retrieval, timeout/cancellation, provider version/provenance, and retry accounting.
- Consumes: approved prompt/reference image, QR functional mask, content-safety verdict, and artistic entitlement/allowance when adopted.
- Does not own: QR acceptance thresholds, commerce truth, or provider infrastructure credentials.
- Build/buy: prefer a managed image-generation provider for MVP; keep provider behind an adapter and feature flag.

**Bulk Engine**
- Owns: CSV schema/parser, row validation, deterministic naming, worker orchestration, ZIP/manifest generation, local progress/retry behavior.
- Does not own: QR rendering rules or entitlement truth.
- Consumes: QR Core and a single-use batch authorization token.
- Stores: browser memory/temporary local state only for MVP.

### Operations and growth planes

**Platform/Operations** owns deployment, environments, secrets mechanism, monitoring, backups, WAF/rate limits, incident hooks, and operator access baseline. It does not own domain-specific business rules.

**Marketing/SEO** owns public content, metadata, sitemap, canonical rules, and content quality. It consumes the canonical embedded Studio; it must not fork QR generation code.

## 4. Primary entities and source of truth

| Entity | Source-of-truth owner | Notes |
|---|---|---|
| Account/Tenant | Identity & Entitlement | All customer-scoped resources carry tenant ID |
| Offer/Entitlement | Identity & Entitlement | Mutated only by verified commerce/admin policy |
| Commerce Event/Purchase | Commerce | Immutable provider event inbox plus reconciled status |
| Campaign | Campaign Control | Versioned destination and lifecycle |
| Route Projection | Redirect Runtime | Derived, rebuildable read model |
| Domain Claim | Domain Control | Normalized hostname uniquely claimed |
| Scan Event/Aggregate | Analytics | Privacy-minimized; not routing authority |
| Batch Pass | Identity & Entitlement | Single-use state machine with idempotent consumption |
| Audit Record | Owning service + central sink | Append-only security-relevant transitions |

No service reads another service's private tables as an integration mechanism.

## 5. Core flows

### Dynamic purchase and activation

1. Authenticated client requests checkout for immutable offer ID.
2. Commerce creates provider checkout with internal tenant/idempotency metadata.
3. Provider webhook is signature-verified and inserted into event inbox once.
4. Commerce emits `commerce.payment_succeeded.v1`.
5. Entitlement service grants `dynamic_campaign_slot` once.
6. User creates campaign; Campaign Control authorizes entitlement.
7. Campaign emits versioned route config; Redirect Runtime updates projection.

### Redirect and scan

1. Resolve normalized host + path/slug.
2. Read local/edge projection.
3. Enforce active/safe lifecycle.
4. Emit non-blocking privacy-minimized event with unique request/event ID.
5. Return 302/307 and explicit cache policy.

### Custom domain

1. User requests normalized hostname claim for owned campaign.
2. Domain service returns DNS challenge/target.
3. Repeated verification checks authoritative DNS with takeover-safe state.
4. Managed TLS is provisioned; readiness is confirmed before mapping event.
5. Redirect projection accepts host only after active mapping event.
6. Removal invalidates mapping before claim release; cooldown prevents stale takeover.

### Artistic QR

1. Browser normalizes URL/text through QR Core and creates the protected QR matrix/mask.
2. User selects a curated template or, if enabled, submits an approved prompt/reference image.
3. Deterministic composition runs locally; provider-backed generation passes only the minimum approved inputs through the artistic adapter.
4. Returned candidates are composited with protected modules/quiet zone and tested by the decoder matrix at multiple render scales/perturbations.
5. Only passing candidates can be labeled scan-validated/exportable; failures offer regeneration or deterministic fallback.
6. Export embeds non-sensitive provenance (mode/provider/model version and validation version) in project metadata, not visibly in the QR payload.

### Bulk

1. Browser parses/validates CSV and previews style/output.
2. User purchases/pass is confirmed.
3. Control API issues short-lived single-use authorization bound to input summary.
4. Web Worker renders through QR Core and packages ZIP/manifest.
5. Consumption/retry protocol records start/completion without uploading customer rows in MVP.

## 6. Security, privacy, and abuse

- Tenant checks at every control/read API; deny-by-default operator scopes.
- Signed webhook verification against raw body; replay-safe event inbox.
- Destination allowlist of schemes; block credentials/control characters; do not server-fetch arbitrary destinations in the redirect path.
- If safety scanning fetches URLs, isolate it against SSRF/private-network access.
- Normalize internationalized domains safely; protect reserved hostnames and slug namespaces.
- WAF/rate limits by route class; anomaly response must preserve ordinary legitimate traffic.
- Coarse geolocation may be derived transiently; raw IP retention requires a narrowly defined security window.
- User logos/CSV stay local in MVP; reference images/prompts stay local unless the user explicitly invokes provider-backed artistic generation under disclosed retention/use terms. CSP and dependency integrity reduce exfiltration risk.
- Artistic inputs and outputs pass content-safety checks; provider terms, training use, deletion, copyright/trademark complaints, and generation provenance are documented before enablement.
- Append-only audits for destination, entitlement, domain, abuse, and operator changes.
- Publish suspension reason/appeal rules; never redirect suspended codes to ads or unrelated content.

## 7. Reliability, backup, and recovery

- Redirect projection is independently deployable and survives control database/API outage.
- Route changes are versioned and idempotent; stale versions cannot overwrite newer ones.
- Reconciliation periodically compares source campaign/domain state to edge projection.
- Commerce event inbox supports replay and provider reconciliation.
- Control data uses encrypted backups/PITR where supported; quarterly restoration exercises before GA.
- Domain/certificate expiry and DNS drift are monitored.
- Analytics queue has bounded retention/dead-letter behavior; dropping analytics must not drop redirects.
- Define safe static error pages for missing, paused, deleted, abusive, and degraded routes.

## 8. Deployment environments and release

- Local: emulators/mocks and contract fixtures.
- Preview: per-change web environment with mocked external providers where practical.
- Artistic MVP staging: production-shaped Studio, payment-provider test mode and signed webhook path, guest project-access recovery, artistic provider adapter, QR validation/repair harness, export path, safety controls, cost telemetry, and controllable provider/payment failure injection.
- Future infrastructure staging: identity, payment test mode, DNS test domain, edge runtime, and analytics pipeline only when the relevant later release is authorized.
- Production: isolated secrets/data/resources, least-privilege deploy identities.
- MVP feature flags for provider-backed artistic modes, individual art directions, and deterministic fallback; future flags cover dynamic checkout, custom domains, analytics dimensions, bulk purchase, and SEO page families.
- Contract changes use additive versioning first; destructive changes require migration and consumer proof.

## 9. Build/buy candidates (not final decisions)

- CDN/edge compute and managed custom hostnames/TLS: buy managed capability unless spike disproves economics/control.
- Relational control-plane database: managed PostgreSQL-class service favored for integrity/PITR.
- Payment: Stripe Checkout/webhooks candidate for a later commerce release.
- Identity/email: managed provider candidate for a later account release; the Artistic MVP does not require customer identity.
- QR rendering/CSV/ZIP: use audited libraries behind owned deterministic wrappers.
- Analytics: owned minimal event model on managed queue/storage; avoid enterprise analytics dependency in redirect path.

All selections require ADRs covering cost, lock-in, limits, data location, export, and failure modes.

## 10. Mandatory architecture spikes

### Artistic MVP blockers

- **SP-01 QR fidelity:** SVG/PNG/logo/style output and physical/device scan matrix.
- **SP-08 Artistic QR feasibility:** compare deterministic templates and selected generative approaches across prompt/style/reference-image cases; measure candidate pass rate, adversarial scan robustness, latency, retry rate, accessibility/UX, provider retention/safety, and per-successful-export cost. Define the deterministic fallback that keeps artistic creation in MVP if generative mode fails.

### Deferred infrastructure spikes

- **SP-02 Bulk envelope:** 500-row time/memory/ZIP behavior across supported desktop browsers; worker cancellation/retry.
- **SP-03 Redirect runtime:** p95/p99, projection propagation, control-plane outage, event-pipeline outage, and cost per traffic scenario.
- **SP-04 Custom hostnames:** ownership, DNS UX, certificate timing/renewal, hostname limits, teardown/takeover, and per-domain cost.
- **SP-05 Commerce semantics:** webhook replay/order, refund/dispute states, tax/currency, and entitlement reconciliation.
- **SP-06 Economics/abuse:** five-year cost distributions, reserve, anomalous scan traffic, rate limits, and honest fair-use wording.
- **SP-07 Privacy:** fields needed for coarse analytics and fraud; retention/deletion impact assessment.

## 11. Key ADR sequencing

Artistic MVP blockers:

- ADR-001 monorepo/runtime language and MVP package boundaries.
- ADR-008 artistic generation/validation architecture, provider, provenance, content safety, retention, and cost controls.

Deferred until the corresponding infrastructure release:

- ADR-002 edge/CDN and route-projection storage.
- ADR-003 control database and tenant strategy.
- ADR-004 identity provider and account recovery.
- ADR-005 managed custom-hostname/TLS provider.
- ADR-006 event transport and analytics storage.
- ADR-007 continuity/fair-use technical enforcement.
