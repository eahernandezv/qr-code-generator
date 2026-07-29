# QR Code Generator — Product and Architecture Baseline

Status: **Planning baseline; implementation is not authorized by these documents alone.**  
Date: 2026-07-19

This repository contains the source-of-truth product, architecture, contract, and multi-agent execution documents for a design-forward QR infrastructure product.

## Gate status

| Gate | Artifact | Status |
|---|---|---|
| 0 | Product charter and evidence ledger | Drafted; assumptions require validation |
| 1 | High-level PRD | Drafted; open decisions remain |
| 2 | High-level solution design | Drafted; ADRs/spikes required |
| 3 | Contract pack | Boundary baseline only; machine-readable schemas not frozen |
| 4 | Workstreams, DAG, traceability | Drafted |
| 5 | Integration plan and handoff template | Drafted |

## Reading order

1. `docs/product/product-charter.md`
2. `docs/product/evidence-ledger.md`
3. `docs/product/pricing-entitlement-semantics.md`
4. `docs/product/prd.md`
5. `docs/product/artistic-mvp.md`
6. `docs/product/release-roadmap.md`
7. `docs/architecture/solution-design.md`
8. `docs/architecture/contracts/README.md`
9. `docs/program/workstreams.md`
10. `docs/program/dependency-graph.md`
11. `docs/program/traceability-matrix.md`
12. `docs/program/delegation-plan.md`
13. `docs/program/integration-plan.md`
14. `docs/program/handoffs/TEMPLATE.md`
15. `docs/program/review-notes-2026-07-19.md`

## Important qualification

The active MVP is the standalone high-end Artistic QR Studio described in `docs/product/artistic-mvp.md`. Accounts, commerce, dynamic campaigns, redirects, analytics, custom domains, bulk, teams, and APIs are deliberately deferred until that product passes its creative and technical release gates.

“Lifetime,” “forever,” and “unlimited” are not approved public promises. The current product intent is a **one-time Durable Campaign License** with defined service-life, fair-use, abuse, and continuity terms. Final wording requires economic, legal, and infrastructure validation.
