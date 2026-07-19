# Contract Pack — Boundary Baseline

Status: **Not frozen.** This document defines ownership and required machine-readable contracts. WS-01 must publish schemas and fixtures before dependent implementation begins.

## Contract ownership

| Contract | Owner | Consumers |
|---|---|---|
| `qr-core-api.v1` | WS-03 Static/QR Core | WS-10 Bulk, WS-13 Integrator |
| `design-tokens.v1` and feature-module shell API | WS-02 Design System | All UI-producing workstreams |
| `identity-claims.v1`, `entitlements.v1` | WS-04 Identity & Entitlements | WS-05, WS-06, WS-08, WS-09, WS-10, WS-13 |
| `commerce-events.v1` | WS-05 Commerce | WS-04, WS-13 |
| `campaign-api.v1`, `route-config-events.v1` | WS-06 Campaign Control | WS-07, WS-08, WS-09, WS-13 |
| `redirect-http-policy.v1`, `scan-events.v1` | WS-07 Redirect Runtime | WS-09, WS-12, WS-13 |
| `domain-api.v1`, `hostname-events.v1` | WS-08 Domain Control | WS-07, WS-13 |
| `analytics-api.v1` | WS-09 Analytics | WS-13 |
| `bulk-csv.v1`, `bulk-manifest.v1` | WS-10 Bulk | WS-13 |
| `error-taxonomy.v1`, `audit-event.v1` | WS-01 Contract Foundation | All services |
| `telemetry-conventions.v1` | WS-12 Platform/Ops | All deployables |

## Required shared semantics

Commercial vocabulary and lifecycle intent come from `docs/product/pricing-entitlement-semantics.md`. Contract schemas may encode those decisions but MUST NOT silently redefine them.

### Identifiers

- Opaque, non-sequential public IDs.
- Stable internal IDs distinct from mutable names/slugs.
- Every tenant-scoped record includes `tenant_id` internally; public responses never trust client-provided tenant ownership.

### Idempotency

- Mutating APIs accept an idempotency key where retries are expected.
- Events include `event_id`, `event_type`, `occurred_at`, `schema_version`, aggregate ID, and aggregate version.
- Consumers keep an inbox/deduplication record or equivalent.
- Projection updates reject versions older than the currently applied aggregate version.

### Entitlement vocabulary

Provisional types:
- `dynamic_campaign_slot`
- `custom_hostname_slot`
- `bulk_batch_pass`

Provisional states:
- `pending`, `active`, `reserved`, `consumed`, `under_review`, `revoked`, `refunded`, `expired`

“Expired” MUST NOT be used for a compliant Dynamic Campaign merely because time passed; any service-life policy must be explicit and approved.

### Campaign lifecycle

- `draft`, `active`, `paused_by_owner`, `suspended_for_abuse`, `under_payment_review`, `archived`, `deleted`
- Each state maps to an explicit redirect HTTP response and dashboard explanation.
- Destination/configuration changes increment `campaign_version`.

### Domain lifecycle

- `requested`, `pending_dns`, `verifying`, `provisioning_tls`, `active`, `degraded`, `removing`, `removed`, `blocked`
- Hostnames are lowercase/IDNA-normalized with a unique active claim.

### Redirect policy

- Editable destinations return 302 or 307, selected consistently by ADR.
- `Location` is validated and CR/LF-safe.
- Unknown/deleted/paused/abuse states return documented branded responses; no ad substitution.
- Analytics event emission is non-blocking.

### Scan event minimum

Proposed fields:
- `event_id`, `occurred_at`, `campaign_id`, `route_version`
- normalized hosted/custom route class
- response category and latency bucket
- coarse country/region if approved
- normalized device class and referrer domain/category if approved
- bot/suspected-abuse classification and classifier version

Do not include destination query secrets, account identifiers, or retained raw IP in analytics payloads.

### Error envelope

Every API error returns:
- stable `code`
- safe human `message`
- `request_id`
- optional field-level details
- retryability indicator when meaningful

Never expose stack traces, provider secrets, DNS tokens, or cross-tenant existence.

## Machine-readable artifacts WS-01 must create

```text
packages/contracts/
  openapi/control-api.yaml
  schemas/events/*.json
  schemas/entitlements/*.json
  schemas/analytics/*.json
  fixtures/valid/*
  fixtures/invalid/*
  src/errors.ts
```

## Contract change protocol

1. Contract owner opens a versioned proposal and compatibility note.
2. Consumers add/adjust contract tests using shared fixtures.
3. Additive producer changes deploy before consumers.
4. Breaking changes use a new version and explicit migration window.
5. Integrator verifies all consumers; no agent edits another owner's contract directly.
