# Agent Handoff — Wave 0C: Redirect Edge, Reliability, and Traffic Economics

## Mission

Validate a low-latency redirect data plane that survives control/analytics outages and quantify traffic/cost/abuse exposure for one-time campaigns.

## Context

Editable QR routes need 302/307 semantics, versioned configuration projections, non-blocking scan events, and a provisional 99.95% availability target. “Unlimited” is not an approved unconditional promise.

## Frozen scope

- Execute SP-03 and the infrastructure portions of SP-06.
- Prototype with candidate managed edge/storage/queue options or documented emulators.
- Model ordinary, viral, bot, and adversarial traffic.
- Do not build dashboard, commerce, or final campaign control service.

## Required proof

- Measured warm/cold p50/p95/p99 and error behavior.
- Same-route destination update with cache/header evidence.
- Control store unavailable, event sink unavailable, stale/out-of-order projection, and regional/provider failure experiments.
- Cost model per request/event/storage/logging tier and anomaly thresholds.
- Safe rate-limit/fair-use remediation options that do not depend on an expired card.
- Verdict and proposed `route-config-events.v1`, `redirect-http-policy.v1`, and `scan-events.v1` boundaries.

Return commands, real output, candidate/provider assumptions, and reproducible artifacts. Do not claim production SLA from a local benchmark.
