# Integration and Verification Plan

## 1. Repository and ownership model

Use one monorepo initially to simplify contract testing, with strict path ownership and independent worktrees/branches per workstream. ADR-001 must confirm this.

- Branch: `ws/<id>-<short-name>`.
- One active writer per owned path.
- Shared-contract changes originate from WS-01 and land before dependent changes.
- Integrator alone edits the app shell, root dependency graph when disputed, E2E tests, and merge queue configuration.
- Add CODEOWNERS and CI path checks after repository scaffolding.

## 2. Artistic MVP merge order

1. Artistic brief/quality rubric, ADR-008, `qr-core-api.v1`, `artistic-qr-api.v1`, fixtures, and telemetry conventions.
2. QR functional mask plus decoder/perturbation validation harness.
3. Design system/art-direction primitives and one provider-neutral generation adapter.
4. One vertical artistic flow through candidate generation, repair, validation, and export.
5. Remaining launch art directions, refinement controls, local/session continuity, and print/export polish.
6. Independent safety, privacy, accessibility, performance, browser/device, and physical scan hardening.
7. Release evidence and production proof.

Campaign, domain, analytics, commerce, bulk, and growth integrations are excluded until a later release is authorized.

Prefer producer-compatible additive changes before consumer activation. Feature flags keep incomplete integrations dark.

## 3. Contract testing

- Schema lint and generated-type compatibility in every affected change.
- Producer tests emit canonical fixtures.
- Consumer tests ingest valid, duplicate, out-of-order, stale, and invalid fixtures.
- HTTP clients test stable error envelopes and authorization failures.
- Contract version and ownership checks run in CI.

## 4. Integration environment

Staging must include:
- production-shaped Artistic Studio and web delivery
- payment-provider test mode with signed webhook/reconciliation and guest project-access recovery
- real or production-equivalent artistic provider adapter with cost caps
- QR decoder/perturbation validation and repair harness
- export path plus controlled print/device fixtures
- content-safety/privacy controls and controllable provider failure injection
- observability/alerts and rollback/feature-disable path

Identity, payment, DNS/TLS, redirect, and analytics staging resources are deferred until their later releases.

Seed data and fixtures are WS-13-owned; domain services own schema migrations, not the integrator.

## 5. Feature flags

Minimum flags:
- `artistic_checkout_enabled`
- `artistic_extra_exploration_enabled`
- `artistic_generative_enabled`
- `artistic_direction_<name>_enabled`
- `artistic_reference_image_enabled`
- `artistic_deterministic_fallback_enabled`

Dynamic checkout, custom-domain, bulk, analytics, and programmatic-page flags are added only with their later releases.

Flags are release controls, not security boundaries. The anonymous MVP still requires server-side rate/cost limits and provider credential protection; entitlement checks are introduced only if a later monetized release adopts them.

## 6. E2E suites

### Artistic MVP blockers

- AJ-01 static-safe fallback render/export/scan.
- AJ-08 artistic direction → four free candidates → verified $12 project unlock → additional rounds → refinement → validation/repair → authorized high-resolution export/scan, plus contextual $5 exploration, fair failed-round accounting, duplicate webhook, provider/payment failure, unsafe-input rejection, guest recovery, and deterministic fallback.

### Deferred suites

- AJ-02 one-time payment → entitlement → campaign → scan → destination update.
- AJ-03 control/analytics outage isolation.
- AJ-04 custom-domain ownership/TLS/route/removal/takeover safety.
- AJ-05 500-row batch purchase/consume/generate/manifest.
- AJ-06 tenant isolation, webhook replay, unsafe destinations, operator scoping.
- AJ-07 lifecycle/refund/review/abuse/deletion/degraded-domain behavior.

MVP evidence includes real provider job references where safe, generation/validation versions, browser traces, decoder/perturbation results, physical-device/print observations, cost/latency metrics, and exported artifact paths/hashes. Secrets, prompts/reference images not approved for retention, and personal data are redacted.

## 7. Security and quality gates

- Dependency/license and secret scanning.
- Static analysis, unit, integration, contract, E2E, accessibility, and browser tests.
- MVP threat-model review for artistic prompts/reference images, upload parsing, provider credentials/retention, output provenance, anonymous abuse/cost controls, and exported files. Checkout, redirect, DNS/TLS, operator, CSV/bulk, and analytics reviews activate later with those features.
- Artistic red-team and quality gate: adversarial textures/colors/occlusion/compression, unsafe prompts, provider timeout, cost cap, false-confidence messaging, and independent physical-device scan tests.
- Load/concurrency tests for artistic generation, validation/repair, export, and anonymous cost controls.
- Provider-failure, queue saturation, timeout, retry, rollback, and feature-disable drills.
- Manual physical scanning for reference print sizes/materials.

## 8. Release and rollback

- Deploy provider-backed modes and art directions dark, run staging and production synthetic generation/validation/export probes, then enable cohorts.
- Web Studio, generation adapter, validation/repair logic, and individual art directions can be disabled or rolled back independently.
- Deterministic safe fallback remains available when a provider, model version, or artistic direction is disabled.
- Preserve compatible local/session project data across web rollbacks where practical; disclose when a draft cannot be recovered.

## 9. Production proof checklist

- Real artistic generation for the approved reference suite across all enabled launch art directions.
- Four-candidate board, refinement/variation, closed-loop repair, and local/session recovery proof.
- High-resolution artistic and deterministic fallback downloads scanned/validated; evidence includes generation/validation version and reference-device/print results.
- Unsafe input, provider timeout/outage, unscannable output, and anonymous cost-limit paths fail clearly and recover safely.
- Generation/validation latency, successful-export cost, failure/fallback metrics, and alert delivery are observed.
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
