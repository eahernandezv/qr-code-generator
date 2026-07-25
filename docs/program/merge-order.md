# Integration Sequencer

## Current Stage
`wave-a0-foundation`

## Merge Order
| Order | Branch Pattern | Owner | Gate |
|-------|---------------|-------|------|
| 1 | `agent-1/qr-core-encode` | Agent 1 | Contract tests pass |
| 2 | `agent-2/validator-suite` | Agent 2 | Scan reliability ≥90% |
| 3 | `agent-3/artistic-engine` | Agent 3 | Renders validate against core matrix |
| 4 | `agent-4/exporter-pipeline` | Agent 4 | Export artifacts open correctly |
| 5 | `agent-5/guest-purchase` | Agent 5 | Stripe test mode checkout succeeds |
| 6 | `agent-6/entitlement-gate` | Agent 6 | Low-res allowed, high-res blocked until paid |
| 7 | `agent-7/web-ui` | Agent 7 | E2E editor flow completes |
| 8 | `agent-8/integration-tests` | Agent 8 | All waves pass |

## Rules
- Agent N cannot open a PR for stage K until stage K-1 is merged to `main`.
- If an agent needs a contract change, they open an issue tagged `contract-change` and block until I approve.
- I update this file atomically after each merge.
