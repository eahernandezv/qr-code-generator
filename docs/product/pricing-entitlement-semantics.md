# Pricing and Entitlement Semantics

Status: Provisional Gate 0 decision document; unresolved items require sponsor approval.  
Version: 0.1  
Date: 2026-07-19

## Purpose

Provide one commercial vocabulary for product copy, checkout, authorization, campaign lifecycle, support, refunds, and implementation agents. This document overrides informal phrases in brainstorm material but does not override final published legal terms.

## Offers

| Offer ID | Working price | Purchase unit | Entitlement | Recurring billing |
|---|---:|---|---|---|
| `static_studio_free` | $0 | Not applicable | Anonymous browser use and PNG/SVG export | None |
| `durable_dynamic_campaign` | $19 | One campaign slot | `dynamic_campaign_slot` plus provisional `custom_hostname_slot` | None |
| `bulk_batch_500` | $29 | One input-bound batch authorization | `bulk_batch_pass`, maximum 500 accepted rows | None |

Prices, taxes, currencies, domain inclusion, and limits remain hypotheses until the evidence and economics gates pass.

## Approved conceptual promises

- Static QR creation requires no subscription or account.
- A downloaded static QR does not depend on the service to continue encoding its payload.
- A dynamic campaign purchase does not create monthly rebilling.
- A compliant dynamic campaign is not disabled merely because time passed or a recurring card payment was absent.
- Limits, service continuity, and suspension reasons must be disclosed before purchase.

## Prohibited public promises until approved

- “Dynamic hosting forever.”
- “Lifetime hosting with no conditions.”
- “Truly unlimited scans.”
- “We can never suspend or discontinue a code.”
- Unsourced claims that a named competitor disables codes or imposes a particular limit.

## Entitlement types

### `dynamic_campaign_slot`

Grants the owner the right to configure one active editable campaign under the durability, acceptable-use, and fair-use policies.

Provisional lifecycle:

```text
pending -> active -> reserved -> active
                    |          |
                    v          v
               under_review  refunded/revoked
                    |
                    v
                  active or revoked
```

Rules:

- `pending`: payment not yet confirmed by verified webhook.
- `active`: available to create or bind a campaign.
- `reserved`: bound to a draft/active campaign.
- `under_review`: payment, fraud, abuse, or legal review; route behavior follows explicit campaign policy and never silently changes to an unrelated destination.
- `refunded`/`revoked`: final entitlement outcome under approved refund/abuse policy.
- Elapsed time alone MUST NOT move a compliant Dynamic Campaign entitlement to `expired`.
- Transfer and slot-reuse behavior are unresolved.

### `custom_hostname_slot`

Provisional inclusion with each Dynamic Campaign purchase. Final scope must choose one:

1. One hostname bound to one campaign.
2. One hostname per account with multiple campaign slugs.
3. Separately priced custom-hostname add-on.

No implementation or marketing copy may assume the choice until SP-04 and unit economics are accepted.

### `bulk_batch_pass`

Authorizes a bounded local generation attempt for up to 500 accepted CSV rows.

Recommended browser-local semantics:

1. Validate and preview before checkout.
2. After verified payment, reserve the pass against a normalized input fingerprint and style-version fingerprint.
3. Issue a short-lived generation lease.
4. Treat the lease as the paid batch unit; permit retries for the same fingerprints during a disclosed recovery window, provisionally 24 hours.
5. A materially different CSV/style input requires a new pass.
6. Do not pretend the server can prove that a browser-local ZIP downloaded successfully when the files are never uploaded.

Provisional states:

```text
pending -> active -> reserved -> consumed
                       |
                       v
              retryable_same_input
                       |
                       v
                    consumed
```

The final state machine must define browser crash, abandoned download, refund, chargeback, and support-issued retry behavior.

## Campaign lifecycle versus entitlement lifecycle

Campaign state and payment entitlement are separate:

- `draft`
- `active`
- `paused_by_owner`
- `suspended_for_abuse`
- `under_payment_review`
- `archived`
- `deleted`

An entitlement answers **whether the owner may use a commercial capability**. Campaign state answers **what the public route currently does**. Implementations must not collapse both into a single `paid` boolean.

## Refund and dispute principles

- Browser return is not payment truth; signed provider webhook is required.
- Duplicate/replayed provider events cannot duplicate entitlements.
- A refund request does not instantly or silently break printed material.
- Refund eligibility may depend on activation/material use, but exact policy requires legal and sponsor approval.
- Disputes/fraud may enter `under_review`; route behavior, customer notice, and appeal path must be explicit.
- Operators need audited override/reconciliation tools; they cannot directly rewrite provider history.

## Fair-use principles

- “Normal-business scans” is not yet a sufficient legal or technical threshold.
- Traffic thresholds must come from measured cost and abuse scenarios.
- Ordinary popularity should not be punished as abuse.
- Remediation sequence should prefer verification, caching, anomaly controls, or temporary review before suspension.
- Abuse/legal suspension requires reason code, safe public response, audit record, and appeal/review process.

## Continuity principles

Before paid launch, publish:

- service-life wording
- provider/company discontinuation remedy
- route/configuration export or migration commitment
- backup and recovery objectives
- planned maintenance/status communication
- prohibited-use and suspension process

The product goal is durable operation, not an impossible guarantee independent of service or company existence.

## Open decisions

| ID | Decision | Blocking evidence/owner |
|---|---|---|
| PES-001 | Final public durability wording | SP-06, legal, sponsor |
| PES-002 | Fair-use thresholds and remediation | SP-03/SP-06, WS-07/12 |
| PES-003 | Custom hostname scope and inclusion | SP-04, economics, sponsor |
| PES-004 | Dynamic slot transfer/reuse | Product owner |
| PES-005 | Refund window and material-use test | Commerce spike, legal, sponsor |
| PES-006 | Bulk retry window and input fingerprint | SP-02/SP-05 |
| PES-007 | Taxes, currencies, invoices, launch jurisdictions | Finance/legal |
| PES-008 | Continuity/migration remedy | Architecture/economics/legal |
