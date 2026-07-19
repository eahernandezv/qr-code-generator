# Integration and Verification Plan

## 1. Repository and ownership model

Use one monorepo initially to simplify contract testing, with strict path ownership and independent worktrees/branches per workstream. ADR-001 must confirm this.

- Branch: `ws/<id>-<short-name>`.
- One active writer per owned path.
- Shared-contract changes originate from WS-01 and land before dependent changes.
- Integrator alone edits the app shell, root dependency graph when disputed, E2E tests, and merge queue configuration.
- Add CODEOWNERS and CI path checks after repository scaffolding.

## 2. Merge order

1. ADRs, contracts, fixtures, telemetry conventions.
2. Design system and platform baseline.
3. Independent producers/consumers using mocks.
4. Campaign/domain/event integrations.
5. Web shell composition and E2E journeys.
6. Growth pages using canonical Studio.
7. Launch policies, hardening, and release evidence.

Prefer producer-compatible additive changes before consumer activation. Feature flags keep incomplete integrations dark.

## 3. Contract testing

- Schema lint and generated-type compatibility in every affected change.
- Producer tests emit canonical fixtures.
- Consumer tests ingest valid, duplicate, out-of-order, stale, and invalid fixtures.
- HTTP clients test stable error envelopes and authorization failures.
- Contract version and ownership checks run in CI.

## 4. Integration environment

Staging must include:
- production-shaped edge runtime and route projection
- identity test tenant and recovery method
- payment provider test mode with signed webhook path
- dedicated test DNS zone and managed TLS
- analytics queue/storage and controllable failure injection
- observability/alerts and backup target
- safe destinations controlled by the project

Seed data and fixtures are WS-13-owned; domain services own schema migrations, not the integrator.

## 5. Feature flags

Minimum flags:
- `dynamic_checkout_enabled`
- `custom_domains_enabled`
- `bulk_checkout_enabled`
- `analytics_dimensions_enabled`
- `programmatic_page_family_<name>`

Flags are not authorization. Server-side entitlement checks remain mandatory.

## 6. E2E suites

- AJ-01 static render/export/scan.
- AJ-02 one-time payment → entitlement → campaign → scan → destination update.
- AJ-03 control/analytics outage isolation.
- AJ-04 custom-domain ownership/TLS/route/removal/takeover safety.
- AJ-05 500-row batch purchase/consume/generate/manifest.
- AJ-06 tenant isolation, webhook replay, unsafe destinations, operator scoping.
- AJ-07 lifecycle/refund/review/abuse/deletion/degraded-domain behavior.

Evidence includes real HTTP status/headers, provider event IDs in test mode, route versions, browser traces where relevant, metrics, and artifact paths/hashes. Secrets and personal data are redacted.

## 7. Security and quality gates

- Dependency/license and secret scanning.
- Static analysis, unit, integration, contract, E2E, accessibility, and browser tests.
- Threat-model review for checkout, redirect, DNS/TLS, operator access, CSV/file handling, and analytics.
- Load tests for redirects and batch envelope.
- Backup restoration and provider-failure drills.
- Manual physical scanning for reference print sizes/materials.

## 8. Release and rollback

- Deploy dark, migrate additively, reconcile projections, run staging and production synthetic probes, then enable cohorts.
- Web/control services roll back independently from edge route data.
- Never roll back to a schema/version that cannot understand active entitlements or route projection.
- Preserve last known valid route configuration through control rollbacks.
- Domain removal and campaign deletion are explicit workflows, not side effects of deployment.

## 9. Production proof checklist

- Hosted redirect success, editable destination update, latency metrics.
- Test-mode or approved low-risk production checkout proof with exactly-one entitlement.
- Custom-domain DNS/TLS/route proof on project-owned hostname.
- Static and bulk downloads scanned/validated.
- Analytics appearance and disclosed lag.
- Alert delivery, status page, support lookup, backup freshness.
- Rollback or feature-disable path exercised.

## 10. Agent completion report format

Every agent reports:
- owned scope changed
- exact files/commits
- contracts consumed/produced and versions
- commands run with real results
- acceptance and integration evidence
- security/operations evidence
- deviations and unresolved blockers
- explicit statement that no unowned paths/contracts were changed

WS-13 verifies claims independently before merge/release.
