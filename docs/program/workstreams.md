# Multi-Agent Workstream Catalog

Status: Draft Gate 4 baseline. Paths are proposed monorepo ownership and become binding after ADR-001.

## Ownership rules

- One workstream owns each write surface. Other agents consume published packages/contracts.
- `apps/web/src/app-shell/**` and `tests/e2e/**` belong only to WS-13 Integrator.
- Feature teams publish modules under their owned package/feature path; they do not independently rewire the app shell.
- `packages/contracts/**` is WS-01-owned. Contract changes are proposals, not direct cross-owner edits.
- Infrastructure resources are WS-12-owned; service agents supply requirements/manifests through agreed interfaces.

## WS-00: Product, Economics, and Policy

**Mission:** Convert hypotheses into approved product promises and policies.  
**Owns:** `docs/product/**`, pricing semantics, acceptable-use/refund/continuity policy requirements, evidence ledger.  
**Produces:** frozen PRD versions and policy decisions.  
**Excludes:** application code and architecture implementation.  
**Depends on:** sponsor decisions; research/spike evidence.  
**Can start:** immediately.  
**Acceptance:** open decisions resolved or explicitly deferred; no unverified competitor claim published; unit-economics gate passed.  
**Integration proof:** terms and UI language map to entitlement/lifecycle contracts.  
**Operational proof:** support and abuse policies have owners.

## WS-01: Architecture and Contract Foundation

**Mission:** Publish versioned cross-workstream interfaces and ADRs.  
**Owns:** `docs/architecture/**`, `packages/contracts/**`.  
**Consumes:** PRD and spike outcomes.  
**Produces:** APIs/events/errors/fixtures and architecture decisions.  
**Excludes:** domain implementations.  
**Depends on:** WS-00 baseline; critical spikes.  
**Can start:** initial boundary work now; freeze after Gate 1 decisions.  
**Acceptance:** schema validation and consumer fixture tests pass.  
**Integration proof:** every consumer compiles/tests against the same contract version.

## WS-02: Design System and Interaction Foundation

**Mission:** Implement the monochrome/single-accent visual language and accessible interaction primitives.  
**Owns:** `packages/design-system/**`, design tokens, component/preset documentation, visual test fixtures.  
**Consumes:** accessibility NFR and feature-module shell contract.  
**Produces:** tokens/components/theme API.  
**Excludes:** business state, campaign pages, analytics logic.  
**Depends on:** WS-01 shell/token contract draft.  
**Can start:** Wave 1.  
**Acceptance:** WCAG checks, keyboard/focus tests, visual regression, light/dark themes.  
**Integration proof:** reference Studio/dashboard fixture renders without private overrides.

## WS-03: QR Core and Static Studio

**Mission:** Deliver anonymous real-time QR creation and trustworthy PNG/SVG exports.  
**Owns:** `packages/qr-core/**`, `apps/web/src/features/static-studio/**`.  
**Consumes:** WS-02 design system.  
**Produces:** `qr-core-api.v1`, scan-risk validation, deterministic fixtures.  
**Excludes:** accounts, payments, dynamic routes, ZIP batches.  
**Depends on:** SP-01; WS-02 primitives can be mocked initially.  
**Can start:** Wave 1 spike, then Wave 2 implementation.  
**Acceptance:** AJ-01, SVG validation, visual/physical scan matrix, no payload/logo network upload.  
**Integration proof:** module mounts in integrator shell and exports exact fixture hashes where deterministic.

## WS-04: Identity and Entitlements

**Mission:** Own authenticated tenant identity, authorization, and durable offer entitlements.  
**Owns:** `services/identity-entitlements/**`, identity/entitlement tables and migrations, account UI module.  
**Consumes:** identity provider, commerce events.  
**Produces:** claims, authorization API, entitlement events.  
**Excludes:** checkout provider logic and campaigns.  
**Depends on:** ADR-003/004; WS-01 contracts.  
**Can start:** Wave 2 with mocked commerce events.  
**Acceptance:** tenant-isolation, recovery, replay/idempotency, entitlement state tests.  
**Integration proof:** one payment event grants one usable slot; cross-tenant requests fail safely.

## WS-05: Commerce

**Mission:** Implement one-time checkout and reliable payment/refund/dispute ingestion.  
**Owns:** `services/commerce/**`, commerce tables/migrations, checkout UI module, provider configuration code.  
**Consumes:** identity claims and immutable offer catalog.  
**Produces:** verified commerce events.  
**Excludes:** granting entitlements directly or altering campaign routes.  
**Depends on:** SP-05; WS-01 and WS-04 claim contract.  
**Can start:** Wave 2 using entitlement consumer mock.  
**Acceptance:** signature, replay, ordering, reconciliation, failure-return, refund/dispute tests.  
**Integration proof:** provider test-mode checkout → webhook → exactly one event/entitlement.

## WS-06: Dynamic Campaign Control

**Mission:** Own editable campaign configuration and lifecycle.  
**Owns:** `services/campaign-control/**`, campaign tables/migrations, campaign-management UI module.  
**Consumes:** identity/entitlement and safety contracts.  
**Produces:** campaign API and versioned route-config events.  
**Excludes:** serving redirects, analytics aggregation, payment truth, TLS.  
**Depends on:** WS-01 and WS-04.  
**Can start:** Wave 3 with mocked entitlement/edge consumers.  
**Acceptance:** destination validation, lifecycle, audit, optimistic concurrency, authorization tests.  
**Integration proof:** destination update emits newer projection and same public route reaches new target.

## WS-07: Redirect Edge Runtime and Scan Capture

**Mission:** Serve reliable low-latency hosted/custom redirects from a derived projection.  
**Owns:** `services/redirect-edge/**`, route projection schema/storage, public redirect HTTP policy.  
**Consumes:** route-config and active-hostname events.  
**Produces:** redirect responses, scan events, runtime telemetry.  
**Excludes:** control editing, authoritative commerce, analytics queries.  
**Depends on:** SP-03, WS-01; can use route fixtures before WS-06.  
**Can start:** Wave 2.  
**Acceptance:** latency/load, route-state, stale-event, injection, control-outage, event-outage tests.  
**Integration proof:** AJ-02/AJ-03 with observed redirect and non-blocking event behavior.  
**Operational proof:** SLO dashboard, alert, rollback, projection reconciliation.

## WS-08: Custom Domain Control

**Mission:** Safely automate hostname ownership, DNS guidance, TLS, mapping, renewal, and removal.  
**Owns:** `services/domain-control/**`, domain tables/migrations, domain-setup UI module.  
**Consumes:** identity, entitlement, campaign ownership, DNS/TLS provider.  
**Produces:** hostname lifecycle/mapping events.  
**Excludes:** redirect response implementation and registrar changes.  
**Depends on:** SP-04, ADR-005, WS-01/04/06.  
**Can start:** spike Wave 1; implementation Wave 3.  
**Acceptance:** normalization, verification, collision, stale takeover, certificate, teardown, drift tests.  
**Integration proof:** AJ-04 on staging test domain.  
**Operational proof:** renewal/DNS drift alert and repair runbook.

## WS-09: Analytics

**Mission:** Convert privacy-minimized scan events into simple trustworthy metrics.  
**Owns:** `services/analytics/**`, analytics event/aggregate stores, analytics UI module.  
**Consumes:** `scan-events.v1`, identity/campaign ownership.  
**Produces:** `analytics-api.v1`, lag/data-quality metrics.  
**Excludes:** redirect serving and campaign state.  
**Depends on:** SP-07, WS-01, event fixtures from WS-07.  
**Can start:** Wave 2 with synthetic events.  
**Acceptance:** dedupe, bot labels, timezone/range, retention/deletion, authorization tests.  
**Integration proof:** real staging scan appears once within disclosed lag; pipeline outage does not affect redirect.

## WS-10: Bulk Browser Engine

**Mission:** Validate CSV and generate up to 500 consistently branded SVGs plus manifest/ZIP locally.  
**Owns:** `packages/bulk-engine/**`, `apps/web/src/features/bulk/**`, bulk CSV and manifest schemas.  
**Consumes:** QR Core, design system, batch-pass authorization.  
**Produces:** browser ZIP/manifest and pass-consumption protocol.  
**Excludes:** QR rendering internals and server storage of uploaded rows.  
**Depends on:** SP-02, WS-03 QR API, WS-04 entitlements.  
**Can start:** spike Wave 1; implementation after QR API freezes.  
**Acceptance:** malformed CSV, filenames, 500-row envelope, worker cancel/retry, partial-failure manifest tests.  
**Integration proof:** AJ-05 and no CSV/logo upload observed.

## WS-11: Marketing and Programmatic SEO

**Mission:** Acquire qualified traffic using useful vertical pages without generator forks or doorway content.  
**Owns:** `apps/marketing/**`, content schemas, metadata/sitemap/canonical rules, experiment definitions.  
**Consumes:** integrator-approved Studio embed and analytics consent contract.  
**Produces:** public pages and acquisition events.  
**Excludes:** QR generation code and paid dashboard.  
**Depends on:** WS-00 claims approval, WS-03 embeddable Studio, WS-13 shell contract.  
**Can start:** research Wave 1; publishing after canonical Studio exists.  
**Acceptance:** unique-content quality, canonical, structured data, performance, accessibility, indexation controls.  
**Integration proof:** each page opens the canonical Studio and conversion events contain no QR payload.

## WS-12: Platform, Security, and Operations

**Mission:** Provide environments, deployment, secrets, telemetry, backups, WAF/rate limits, operator-access baseline, and incident readiness.  
**Owns:** `infra/**`, `.github/workflows/**`, `packages/telemetry/**`, `docs/operations/**`.  
**Consumes:** service resource/SLO declarations.  
**Produces:** deployment interfaces, telemetry conventions, environments, runbooks.  
**Excludes:** product lifecycle rules and domain tables.  
**Depends on:** ADRs and component inventory; starts Wave 1.  
**Acceptance:** least privilege, secret scan, backup restore, alert tests, environment isolation, rollback drill.  
**Integration proof:** staging deploy plus observed synthetic redirect/checkout/domain/analytics signals.

## WS-13: Web Composition, Integration, and Independent QA

**Mission:** Own assembly and prove complete customer journeys independently of implementer claims.  
**Owns:** `apps/web/src/app-shell/**`, `tests/contract/**`, `tests/e2e/**`, release evidence, merge queue.  
**Consumes:** all feature modules and contracts.  
**Produces:** integrated web app, E2E reports, release recommendation.  
**Excludes:** changing feature internals to hide failures; contract changes require owner approval.  
**Depends on:** WS-01 contracts and incremental deliverables from all workstreams.  
**Can start:** test harness Wave 1; integration continuously.  
**Acceptance:** AJ-01–AJ-07, accessibility/security/performance gates, production-shaped staging proof.  
**Operational proof:** release/rollback checklist and post-deploy synthetic verification.

## Preliminary independence score

Scale 0–2 across cohesion, exclusive ownership, stable contracts, testability, deployability/mockability, coordination surface, parallel value. All proposed lanes target ≥9/14; WS-13 is intentionally cross-cutting but has unique assembly/test ownership rather than feature ownership.
