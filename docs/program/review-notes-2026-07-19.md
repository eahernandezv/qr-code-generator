# Independent Review Notes — 2026-07-19

## Review performed

Three independent Hermes subagents reviewed the initial product baseline in parallel:

1. Product charter, evidence, requirements, contradictions, and metrics.
2. Architecture, contracts, reliability, security, privacy, and feasibility spikes.
3. Capability decomposition, ownership, dependency graph, and agent handoffs.

Their full outputs remain in the Hermes delegation cache; this document records decisions applied to the source-of-truth repository.

## Findings already covered by the baseline

- Static browser-only behavior must be distinguished from hosted dynamic infrastructure.
- Anonymous static use and authenticated paid management are intentionally separate.
- “Forever,” “lifetime,” “unlimited,” and competitor-deactivation claims are unapproved pending evidence.
- Editable redirects use 302/307 rather than cache-sticky 301 behavior.
- Redirect runtime, control plane, analytics, commerce, and domain control are separated.
- Analytics is asynchronous and must not block redirects.
- Raw IP retention and invasive fingerprinting are not default analytics behavior.
- Payment webhooks—not browser success pages—create authoritative commerce events.
- Workstreams use unique artifact ownership and contract-first mocks.
- Integration/QA begins early and independently verifies E2E behavior.

## Accepted additions

### Central commercial-semantics artifact

The review correctly identified that pricing and entitlements should not remain scattered across the charter, PRD, and contracts. Added:

`docs/product/pricing-entitlement-semantics.md`

It centralizes:

- offer IDs and purchase units
- dynamic, domain, and bulk entitlement semantics
- campaign versus entitlement lifecycle
- prohibited public promises
- refund/dispute principles
- fair-use and continuity principles
- browser-local bulk retry limitations
- decision IDs `PES-001` through `PES-008`

### Bulk entitlement honesty

A server cannot reliably prove successful download when CSV processing and ZIP generation stay completely browser-local. The adopted proposal binds the paid batch to input/style fingerprints and allows bounded retries, rather than claiming exact server knowledge of local completion.

### Explicit marketing copy guardrails

The baseline already prohibited risky dynamic claims. Review confirms that safe static wording should emphasize that downloaded static QR assets do not depend on hosted redirect infrastructure.

## Suggestions deferred pending evidence

- The working name **“QR Forever”** was not adopted because it conflicts with the required caution around dynamic durability promises and has not undergone trademark/domain review.
- Magic-link authentication is plausible but remains an ADR/open product decision.
- One custom domain per account was not selected; per-campaign, per-account, or paid add-on remains a blocking economics/architecture decision.
- A 14-day refund policy, 30-day deletion recovery, 12-month analytics retention, and specific conversion targets were not adopted because the reviewers supplied no market, legal, or cost evidence.
- PDF export and broader payload types were not added to MVP; PNG/SVG and URL/text essentials remain the approved baseline.
- Subscription lifecycle concepts from one decomposition draft were rejected because the intended offers are one-time purchases.
- Storing `city`, raw user agent, or stable IP hashes in scan events was not adopted; SP-07 must establish minimum necessary fields.

## Corrections preferred over reviewer drafts

- Commerce provider events are external payment evidence; internal entitlement state remains owned by Identity/Entitlements. No single provider object becomes the complete product source of truth.
- Destination validation must not naïvely server-fetch arbitrary URLs. Any threat-intelligence fetcher must be isolated from private networks and metadata services.
- Redirect analytics are best-effort and non-blocking; route success cannot depend on event delivery.
- Circular identity/commerce dependencies are resolved with frozen claims/events and mocks, not represented as a real cyclic implementation DAG.

## Review disposition

The original Gate 0–5 baseline remains structurally sound. The central pricing/entitlement artifact is the only required source-of-truth addition from this review. Full implementation delegation remains blocked on Wave 0 evidence and sponsor decisions listed in `docs/program/delegation-plan.md`.
