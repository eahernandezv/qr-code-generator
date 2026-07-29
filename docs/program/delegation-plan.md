# Active Multi-Agent Delegation Plan

Status: Active three-role implementation model.

## Role 1 — QR Product Architect

Owns:
- product/architecture/program source-of-truth documents
- requirement and contract governance
- integration sequencing and final merge authority
- independent verification, QA coordination, safety review, and release decision packet
- assignment of historical branch work into the two active implementation lanes

## Role 2 — QR Creator / Core Engine

Owns:
- QR functional masks, encoding, rendering, scan validation, and repair
- deterministic and generative artistic composition
- candidate diversity, variation/refinement, provider adapters, and safe fallback
- objective export thresholds and engine-level tests
- absorbed work from former Artist and Validator lanes

Primary active branch: `ws/03-qr-core`.

## Role 3 — QR Studio / Studio-Commerce

Owns:
- responsive Studio, candidate board, project continuity, and export UX
- high-resolution PNG/SVG/print workflows
- guest checkout, webhook/idempotency, allowance, and recovery UX
- application integration, CI/deployment support, and operational implementation
- absorbed work from former Checkout and application-facing Guardian lanes

Primary active branch: `ws/05-web-studio`.

## Integration rules

- Historical branches `ws/02-design-artistic`, `ws/06-guest-commerce`, `ws/07-platform-ops`, and `ws/08-qa-tests` remain preserved as code/evidence inputs, not active agents.
- QR Creator and QR Studio cherry-pick or port reusable work into their active branches.
- Product Architect independently verifies behavior and merges to `main`.
- Each active role reports Aim, Success criteria, ETA, Status, and Safe fix on the agreed cadence.
- No additional agent/VPS role is created without Ernesto's explicit approval.
