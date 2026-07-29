# Agent Handoff — Wave 0E: Commerce, Entitlement, Security, and Privacy Spikes

## Mission

Validate one-time payment-to-entitlement semantics and define the minimum safe data/abuse model for campaigns, bulk passes, and analytics.

## Context

Webhook truth must be signed, replay-safe, and reconciled. Refunds/disputes cannot silently strand printed QR codes. Analytics should show simple totals/time/location/device while minimizing personal data.

## Frozen scope

- Execute SP-05 and SP-07; produce a threat model.
- Use payment test mode only.
- Do not charge real cards, publish policies, or implement final production services.

## Required proof

- Test-mode checkout and raw-body signature verification.
- Duplicate, delayed, out-of-order, failed, refunded, and disputed event behavior.
- Proposed entitlement state machines for campaign slots and single-use bulk passes.
- Options for refund/review route behavior with customer/support consequences.
- Scan data inventory, purpose, retention, deletion, bot/fraud needs, and coarse geolocation method.
- Threats: tenant access, webhook forgery/replay, SSRF/open redirect misuse, phishing/malware, operator privilege, CSV/logo handling, secret leakage.
- Proposed `commerce-events.v1`, `entitlements.v1`, and privacy-minimized analytics fields.

Return provider event/test IDs and commands as evidence, redacting secrets. Proposals do not freeze contracts; WS-01 owns them.
