# Session Recap — 2026-07-21

## Status

All session decisions committed to main as `595c1e1`.

## Key decisions

### 1. Artistic QR is the standalone MVP

The original plan built a broad QR infrastructure platform: static, dynamic campaigns, custom domains, analytics, bulk, commerce, and accounts in one go.

**Today's pivot:** The MVP is a **flagship standalone Artistic QR Studio**. The broader QR infrastructure will be built only after this product passes its creative and technical release gates.

**Impact:**
- All product, architecture, program, and integration documents updated to reflect the artistic-first scope.
- Active MVP requirements narrowed to FR-001–006 and FR-046–058.
- Full identity/commerce/campaign/redirect/analytics/bulk/domains/APIs are deferred.

### 2. Non-ad direct monetization approved

Two subagents independently reviewed the monetization options and confirmed: **display ads are unsuitable for this premium creative instrument**.

**Approved MVP offer:**

- **$0** — One free preview round, 4 preview-quality candidates, scan-check shown, no final export.
- **$12** — Artistic QR Project: 3 successful rounds total, up to 12 candidates, refinement/repair, 1 finished artwork export in all standard sizes/formats, PNG + applicable SVG, print guidance, scan-validation summary, deterministic fallback.
- **$5** — Extra Exploration: offered contextually after included rounds are exhausted; 2 additional successful rounds, 1 additional final-artwork export.

**Fair-use rule:** A round counts only when promised reviewable candidates are returned. Provider/product errors, incomplete boards, and all-unscannable boards do not consume the customer allowance.

**Impact:**
- Added FR-053–058 to the PRD.
- Added narrow guest-checkout/project-access workstream to the architecture.
- Updated product charter, artistic MVP brief, roadmap, integration plan, and traceability.

### 3. 8-agent implementation team

Original plan: 8 agents for the broad platform. Today's plan: 8 agents for the **focused Artistic MVP**.

**Wave 0 — 6 validation agents:**
1. Coordinator (me)
2. Artistic Product/UX/Design System
3. QR Core/Scan Validation/Repair
4. Creative Generation/Model Pipeline
5. Web Studio/Composition/Export
6. Independent QA/Safety/Release

**Wave 1–2 — expands to 8:**
7. Guest Checkout/Project Access/Allowance Accounting
8. Platform/Safety/Privacy/Ops

**Explicitly dormant during MVP:**
- Full identity/entitlements/commerce
- Campaign control
- Redirect/analytics
- Domains
- Bulk

**Impact:**
- Delegation plan updated with 6/8 team sizing.
- Workstream activation rules updated.
- No broader dynamic-infrastructure agents until sponsor authorizes next version.

### 4. Execution waves restructured

Original plan: Waves 0–4 (decisions → foundations → cores → stateful composition → hardening).

**New artistic-first waves:**
- **A0** — Creative and technical proof: art directions, SP-01/SP-08.
- **A1** — Contracts and vertical prototype: one complete end-to-end slice.
- **A2** — Flagship Studio: six+ art directions, full premium interaction model.
- **A3** — Hardening and release: independent AJ-01/AJ-08 proof and release gate.

**Deferred Waves B+:** Infrastructure around the proven core.

### 5. New artifacts created

- `docs/product/artistic-mvp.md` — Flagship Artistic QR MVP Brief (quality rubric, 6+ art directions, 4-candidate board, closed-loop repair, release gate, success metrics).
- `docs/product/release-roadmap.md` — Artistic-first release outline (v1.0 Studio → v1.1 Pro → v1.2 Workflow → v2.0 Dynamic → v2.1 Scale).

### 6. Documents updated

| Document | Status | Key changes |
|---|---|---|
| README.md | Updated | Added artistic MVP brief and roadmap to reading order; flagged MVP as active |
| product-charter.md | Updated | Delivery priority: Artistic first; approved $0/$12/$5 offer; explicit non-goals for MVP |
| evidence-ledger.md | Updated | Added EV-017–020 (artistic demand, feasibility, fallback, no-ads decision) |
| prd.md | Updated | Artistic-first scope; FR-046–058; deferred post-MVP requirements; MVP blockers vs deferred decisions |
| artistic-mvp.md | Created | Flagship brief: thesis, target outcome, signature experience, art-direction bar, high-end capabilities, boundary, release gate, success measures |
| release-roadmap.md | Created | v1.0–v2.1 scope and sequencing rule |
| solution-design.md | Updated | Artistic-first objective; QR Core/Artistic Rendering Pipeline; narrow guest commerce subset; ADR-008 as MVP blocker; ADRs 002–007 deferred |
| contracts/README.md | Updated | `artistic-qr-api.v1` contract semantics; `artistic_generation_allowance` provisional entitlement type |
| workstreams.md | Updated | WS-03 mission expanded to artistic generation; WS-02 mission includes artistic direction; WS-05 narrow subset active; dormancy rules for WS-04 and WS-06–11 |
| dependency-graph.md | Updated | Artistic-first Waves A0–A3; deferred Waves B+; critical path updated |
| delegation-plan.md | Updated | 6-agent Wave 0 team (A–E + coordinator); 8-agent implementation team; checkout agent added; infrastructure agents dormant |
| integration-plan.md | Updated | Artistic MVP merge order; staging scope; E2E suites; security gates; release/rollback; production proof |
| traceability-matrix.md | Updated | MVP activation clause; FR-046–052 and FR-053–058 ownership; NFR-016 ownership |
| handoffs/WAVE-0-B-qr-bulk-spikes.md | Updated | Renamed to Wave A0; dropped SP-02 bulk scope; focused on SP-01/SP-08 only |

## Open decisions still requiring sponsor input

1. **Final art directions:** Confirm or adjust the six+ launch directions and quality rubric.
2. **Artistic provider:** Select the generation model/provider and deterministic fallback architecture.
3. **Scan threshold:** Approve the decoder/perturbation/device/print pass threshold.
4. **Safety/IP policy:** Approve prompt/reference-image rules, provider retention, deletion, and provenance.
5. **Cost envelope:** Approve generation latency, retry limit, and maximum cost per successful export.
6. **Guest checkout provider:** Select the payment provider and guest recovery method.
7. **Browser/device matrix:** Confirm supported browser/device envelope.

## Next steps after session refresh

1. Decide the open decisions above.
2. Freeze `qr-core-api.v1`, `artistic-qr-api.v1`, and the narrow guest-purchase contract.
3. Open Wave A0 spike delegation for SP-01 and SP-08.
4. Begin Artistic MVP implementation after sponsor approves creative bar and pipeline direction.
