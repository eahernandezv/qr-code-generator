# Requirement and Risk Traceability

## Functional requirements

| Requirements | Accountable WS | Supporting WS | Primary contract/proof |
|---|---|---|---|
| FR-001–006 | WS-03 | WS-02, WS-13 | `qr-core-api.v1`, AJ-01 |
| FR-007–010 | WS-04 | WS-13 | `identity-claims.v1`, tenant/recovery tests |
| FR-011–015 | WS-05 | WS-00, WS-04, WS-13 | `commerce-events.v1`, checkout replay/refund tests |
| FR-016–022 | WS-06 | WS-04, WS-07, WS-12, WS-13 | `campaign-api.v1`, `route-config-events.v1`, AJ-02/AJ-07 |
| FR-023 | WS-07 | WS-09, WS-12 | `scan-events.v1`, outage proof |
| FR-024–027 | WS-09 | WS-07, WS-13 | `analytics-api.v1`, staging scan proof |
| FR-028–032 | WS-08 | WS-04, WS-06, WS-07, WS-12, WS-13 | `domain-api.v1`, `hostname-events.v1`, AJ-04 |
| FR-033–039 | WS-10 | WS-03, WS-04, WS-05, WS-13 | `bulk-csv.v1`, `bulk-manifest.v1`, AJ-05 |
| FR-040–041 | WS-13 | WS-02, WS-03 | shell contract, AJ-01, visual/accessibility tests |
| FR-042 | WS-11 | WS-03, WS-13 | canonical Studio embed and SEO tests |
| FR-043 | WS-12 | WS-04–09, WS-13 | operator scopes, audit events, support drill |
| FR-044–045 | WS-00 | WS-04, WS-05, WS-09, WS-12 | published policies plus deletion/status tests |

## Non-functional requirements

| Requirement | Accountable WS | Supporting WS | Verification |
|---|---|---|---|
| NFR-001–003 | WS-07 | WS-12, WS-13 | load/SLO and dependency outage tests |
| NFR-004 | WS-12 | Every implementation WS, WS-13 | threat model, SAST/DAST, tenant/webhook/SSRF tests |
| NFR-005 | WS-09 | WS-00, WS-07, WS-12 | data inventory, retention/deletion test |
| NFR-006 | WS-02 | WS-03, WS-08–11, WS-13 | automated + manual WCAG audit |
| NFR-007 | WS-13 | WS-03, WS-10 | browser/device matrix |
| NFR-008 | WS-03 | WS-10, WS-13 | SVG validator and physical scan matrix |
| NFR-009 | WS-12 | WS-04–09 | backup restoration exercise |
| NFR-010 | WS-12 | All deployables | telemetry contract and alert drill |
| NFR-011 | WS-01 | WS-04–10 | contract and replay tests |
| NFR-012 | WS-00 | WS-07, WS-09, WS-12 | cost dashboard, economics model, fair-use policy |
| NFR-013 | WS-11 | WS-13 | crawler/indexation/canonical/content audit |
| NFR-014 | WS-01 | WS-12, WS-13 | ownership check and compatibility tests |
| NFR-015 | WS-12 | WS-07, WS-13 | recovery/failover drill |

## Major risks

| Risk | Accountable WS | Mitigation/proof |
|---|---|---|
| One-time price cannot fund long-term operations | WS-00 | SP-06 economics scenarios and reserve policy |
| Printed route breaks because control plane fails | WS-07 | independent projection and AJ-03 |
| Dynamic redirect cached permanently | WS-07 | redirect policy contract and destination-change test |
| Cross-tenant control or analytics access | WS-04 | deny-by-default authorization and AJ-06 |
| Payment replay duplicates entitlement | WS-05 | event inbox, idempotency, reconciliation test |
| Custom hostname takeover | WS-08 | proof/cooldown/removal/collision test |
| QR styling reduces scannability | WS-03 | validation plus device/print matrix |
| Browser batch exhausts memory | WS-10 | SP-02 and worker/bounded ZIP design |
| Analytics becomes invasive | WS-09 | privacy-minimized event contract and retention audit |
| Programmatic pages become doorway spam | WS-11 | unique-content/index quality gate |
| Shared files/contracts create agent collisions | WS-01 | CODEOWNERS/ownership CI after repository setup |
| Self-reported implementation success hides broken E2E | WS-13 | independent staging journeys and captured evidence |
