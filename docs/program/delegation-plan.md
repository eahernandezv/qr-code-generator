# Initial Multi-Agent Delegation Plan

Status: Ready for discovery/spike delegation; not ready for full implementation.

## Coordinator assignment

**QR Code Generator Agent (this Hermes): Product/Architecture Owner and Integrator**

Owns:
- product/architecture/program source-of-truth documents
- requirement and contract-change governance
- integration sequencing and independent verification
- acceptance of spike evidence and Gate 0–4 decisions

Does not independently approve risky public promises without sponsor decision.

## Immediate Artistic MVP assignments

| Lane | Suggested independent agent | MVP ownership | Blocking output |
|---|---|---|---|
| A | Artistic product, UX, and art-direction agent | Premium interaction model, six+ launch art directions, prompt/reference-image guidance, candidate/refinement UX | Tested creative brief, visual prototypes, quality rubric |
| B | QR integrity and scan-validation agent | QR functional masks, decoder/perturbation harness, confidence model, closed-loop repair criteria, safe fallback | SP-01 evidence and objective export threshold |
| C | Creative generation/model-pipeline agent | Deterministic and generative composition methods, conditioning, candidate diversity, variation/refinement, provider adapter | SP-08 candidates, latency/cost/pass-rate verdict, reproducible pipeline |
| D | Web Studio, composition, and export agent | Responsive Studio, candidate board, local/session continuity, high-resolution PNG/SVG, print preview, browser performance | Integrated interactive prototype and export evidence |
| E | Independent QA, safety, privacy, and release agent | Independent artistic quality review, physical/device scans, adversarial image/prompt tests, accessibility, provider privacy, release gate | Independent AJ-01/AJ-08 report and release recommendation |

The coordinator owns product boundaries, contracts, integration, minimal provider/telemetry decisions, and final acceptance. These five lanes plus the coordinator form the six-agent Wave 0 team. They return evidence and isolated artifacts; contract/source-of-truth edits remain coordinator-owned.

## Artistic MVP decision checkpoint

The coordinator integrates results and asks the sponsor to decide only the choices required to build the flagship Studio:

1. approved launch art directions and objective quality rubric
2. artistic provider/architecture and deterministic fallback
3. scan-validation threshold, perturbation/device matrix, and customer-facing confidence language
4. allowed prompt/reference-image modes, safety/IP/privacy/retention/provenance policy
5. generation latency, retry, and per-successful-export cost envelope
6. guest checkout provider/recovery and project/download availability details for the approved $0 preview, $12 project, and contextual $5 exploration model
7. exact publication/export formats, dimensions, print guidance, and supported browser/device matrix

Only after these decisions does WS-01 freeze `qr-core-api.v1` and `artistic-qr-api.v1` and open Artistic MVP implementation. Broader infrastructure decisions are intentionally deferred.

## Team sizing for the Artistic MVP

- **6 agents for validation:** coordinator plus lanes A–E above.
- **8 agents for implementation:** (1) coordinator/product/contracts/integration; (2) artistic direction/design system/UX; (3) QR Core/scan validation/repair; (4) creative generation/model pipeline; (5) Web Studio/composition/export; (6) guest checkout/project access/allowance accounting; (7) minimal provider platform/content safety/privacy/observability/performance; (8) independent QA/security/release.
- **No broader dynamic-infrastructure agents during MVP:** full identity/entitlements/commerce, campaign control, redirect/analytics, domains, and bulk owners activate only after the flagship Artistic Studio passes release and the sponsor authorizes the next version.

This is a responsibility change, not merely extra scope assigned to the old QR/bulk agent. Artistic generation and QR integrity are separated because each is large enough to own independently; QA remains independent from both.
