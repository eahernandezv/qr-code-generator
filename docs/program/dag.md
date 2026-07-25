# Dependency DAG — QR MVP

## Wave A0: Foundation (Sequential)
1. **WS-01** — QR Core: encode + validate
2. **WS-02** — Validator: scan test suite

## Wave A1: Artistic (Depends on A0)
3. **WS-03** — Artistic Engine: render pipeline
4. **WS-04** — Exporter: PNG/SVG/PDF generation

## Wave A2: Commerce (Depends on A1)
5. **WS-05** — Guest Purchase: Stripe checkout + allowance
6. **WS-06** — Entitlement: resolution gating

## Wave A3: Integration (Depends on A2)
7. **WS-07** — Web UI: editor + export flow
8. **WS-08** — Integration Tests: end-to-end

## Critical Path
WS-01 → WS-03 → WS-05 → WS-07

## Parallel Lanes
- WS-02 can run alongside WS-01
- WS-04 can run alongside WS-03
- WS-06 can run alongside WS-05
- WS-08 runs only after all others complete
