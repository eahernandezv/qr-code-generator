# High-Level Product Requirements Document

Status: Draft for Gate 1 review  
Version: 0.1  
Date: 2026-07-19

## 1. Product definition

The first product is a standalone, high-end Artistic QR Studio: customers turn URL/text payloads into distinctive, scene-integrated artwork, refine candidates, verify scan robustness, and export publication-ready assets. The broader product may later add static/bulk workflows, accounts, commerce, durable dynamic campaigns, redirects, custom domains, and analytics, but those capabilities are not permitted to dilute or block the Artistic MVP.

## 2. Personas and priority

- **P1 Small business operator:** highest launch priority.
- **P2 Independent marketer/agency:** high priority.
- **P3 Event/wedding planner:** high priority, especially static and finite campaigns.
- **P4 Operations manager:** bulk-pass priority.
- **P5 Internal support/operator:** required for safe launch but not a customer-facing enterprise console.

## 3. Core journeys

1. **Static:** arrive → enter content → style → validate scannability → preview → export PNG/SVG.
2. **Artistic:** enter URL/text → choose curated artistic template or describe/select a visual concept → optionally provide an owned reference image → generate candidates → validate scan confidence → adjust/regenerate → export a clearly labeled scan-validated result.
3. **Dynamic:** create draft → authenticate → pay → receive entitlement → configure destination/slug → activate → scan → edit destination without reprinting.
4. **Custom domain:** choose campaign → enter hostname → receive DNS instruction → prove control → provision TLS → activate → monitor/repair.
5. **Analytics:** open campaign → view scan totals and restrained time/location/device summaries → change range → export summary later if validated.
6. **Bulk:** choose style → upload CSV → map/validate columns → preview failures → pay → generate locally → download ZIP and manifest.
7. **Recovery:** regain account access → review entitlement/campaign state → restore safe configuration or contact support.
8. **Deletion:** delete campaign/account according to retention and legal obligations; deleted routes no longer resolve to former destination.

## 4. Functional requirements

### Release applicability

- **Artistic MVP requirements:** FR-001–006 and FR-046–058, narrowed by the MVP scope in Section 7.
- **Post-MVP requirements:** FR-007–045 remain approved product-direction requirements except that FR-012–013 webhook/idempotency principles apply to the narrow guest checkout. Full accounts, durable entitlements, dynamic campaigns, and broader commerce remain deferred.


### Static Studio

- **FR-001:** The product MUST generate static QR codes without registration.
- **FR-002:** It MUST validate supported payloads and reject unsafe or malformed inputs with actionable messages.
- **FR-003:** It MUST provide real-time preview while editing colors, background, error correction, margin, frame/preset, eye styling, and an optional logo.
- **FR-004:** It MUST export standards-compliant SVG and high-resolution PNG.
- **FR-005:** It MUST warn when styling or logo coverage creates material scan risk and provide a safe reset.
- **FR-006:** Static generation and export SHOULD occur locally without uploading payload or logo content.

### Identity and entitlements

- **FR-007:** Paid capabilities MUST require an authenticated account with verified ownership of its login identifier.
- **FR-008:** Every purchase MUST create an auditable, idempotent entitlement linked to the purchaser and offer.
- **FR-009:** Authorization MUST enforce tenant ownership for campaigns, domains, analytics, and purchases.
- **FR-010:** Users MUST be able to recover access without support when the configured identity provider permits it.

### Commerce

- **FR-011:** The product MUST support a one-time Dynamic Campaign purchase and one-time Bulk Batch Pass purchase.
- **FR-012:** Payment completion MUST be confirmed by authenticated provider webhook, not browser return alone.
- **FR-013:** Duplicate or retried payment events MUST NOT create duplicate entitlements.
- **FR-014:** Purchase history and entitlement status MUST be visible to the owner.
- **FR-015:** Refund, dispute, fraud, and payment reversal behavior MUST be defined per offer before launch; reversal MUST NOT silently redirect printed codes to an unrelated destination.

### Dynamic campaigns and redirect runtime

- **FR-016:** An entitled user MUST be able to create one active dynamic campaign per available campaign entitlement.
- **FR-017:** The owner MUST be able to edit a campaign destination without regenerating its QR image.
- **FR-018:** The system MUST validate destinations and block prohibited schemes and known unsafe targets.
- **FR-019:** A public campaign route MUST issue an editable-safe HTTP redirect and MUST NOT expose private account data.
- **FR-020:** Redirect serving MUST remain available during dashboard/control-plane degradation within the defined recovery window.
- **FR-021:** The campaign owner MUST be able to pause, resume, archive, and delete a campaign with explicit route behavior for each state.
- **FR-022:** Route suspension for abuse or legal reasons MUST have a reason code, audit record, safe response, and operator review/appeal path.

### Scan events and analytics

- **FR-023:** Successful and relevant failed route requests MUST emit privacy-minimized scan events asynchronously.
- **FR-024:** Campaign owners MUST see total scans and time-series summaries.
- **FR-025:** The dashboard SHOULD show coarse country/region and device/referrer categories only when reliably available and disclosed.
- **FR-026:** Analytics MUST distinguish bot/suspected abuse traffic from human-like scans when feasible and label uncertainty.
- **FR-027:** Analytics delay and retention MUST be disclosed.

### Custom domains

- **FR-028:** A Dynamic Campaign entitlement MUST permit one active custom hostname mapping, subject to domain limits and availability.
- **FR-029:** The user MUST prove control through documented DNS configuration before activation.
- **FR-030:** The system MUST prevent hostname takeover, conflicting claims, and activation before certificate readiness.
- **FR-031:** Users MUST see domain states and corrective instructions: pending DNS, verifying, provisioning, active, degraded, and removed.
- **FR-032:** Removing a custom domain MUST safely detach routing and prevent later account takeover of stale configuration.

### Bulk batches

- **FR-033:** Users MUST be able to upload a documented CSV format with up to 500 rows at launch.
- **FR-034:** The product MUST validate headers, row count, URL/payload data, duplicate output names, and unsafe filenames before payment/generation.
- **FR-035:** The user MUST preview valid/invalid row counts and representative output before consuming a pass.
- **FR-036:** A Bulk Batch Pass MUST be consumed exactly once only after generation begins under defined retry semantics.
- **FR-037:** Valid rows MUST generate consistently styled SVG files locally and download as one ZIP containing a manifest.
- **FR-038:** Partial failures MUST be listed in the manifest and MUST NOT silently omit rows.
- **FR-039:** Uploaded CSV content and generated assets SHOULD remain browser-local unless explicit recovery/storage is later introduced.

### Experience, growth, support, and lifecycle

- **FR-040:** The public homepage MUST expose the functional Static Studio above the fold without requiring registration.
- **FR-041:** The interface MUST support light/dark modes, a monochrome base, one configurable accent system, visual presets, and instant state updates.
- **FR-042:** Programmatic landing pages MUST provide unique, useful content and open the same canonical Studio rather than duplicate generator implementations.
- **FR-043:** Operators MUST have audited tools for campaign lookup, abuse state, payment/entitlement diagnosis, and domain diagnosis without unrestricted secret exposure.
- **FR-044:** Users MUST be able to request account/data deletion and understand retained billing/security records.
- **FR-045:** The service MUST publish status, support, acceptable-use, privacy, refund, and continuity information before paid launch.

### Artistic QR Studio

- **FR-046:** The MVP MUST let a customer create an artistic QR from a supported URL/text payload using curated artistic templates and, where SP-08 validates it, prompt- or reference-image-assisted generation.
- **FR-047:** Artistic generation MUST preserve a protected QR functional pattern, quiet-zone policy, and error-correction constraints rather than treating scannability as a cosmetic afterthought.
- **FR-048:** The system MUST validate every artistic candidate with the approved decoder matrix and MUST prevent or strongly block export when no candidate meets the launch scan threshold; confidence labels MUST NOT imply universal device guarantees.
- **FR-049:** Users MUST be able to compare candidates, adjust artistic strength/style, regenerate, and fall back to a safe deterministic rendering without re-entering the payload.
- **FR-050:** Prompt/reference-image inputs MUST be subject to published content, intellectual-property, privacy, retention, and provider-use rules; unsafe prompts or images MUST fail with actionable guidance.
- **FR-051:** The MVP MUST export a scan-validated artistic QR as high-resolution PNG. SVG is required only for deterministic/vector artistic templates; raster generative artwork MAY omit SVG with clear disclosure.
- **FR-052:** Artistic generation limits, queueing, retries, credits/entitlement, and failure treatment MUST be disclosed before generation; failed provider attempts MUST NOT consume paid allowance unless an approved policy explicitly says otherwise.

### Artistic MVP monetization

- **FR-053:** An anonymous user MUST receive one successful preview round with four preview-quality candidates and scan-check evidence without an account or card; no final professional export is included.
- **FR-054:** A one-time **$12 Artistic QR Project** purchase MUST unlock three successful rounds total, up to 12 candidates, refinement/repair, and one finished-artwork export bundle in all standard sizes/formats.
- **FR-055:** A contextual **$5 Extra Exploration** purchase MUST add two successful rounds and one additional finished-artwork export; it SHOULD appear only when the included exploration is exhausted.
- **FR-056:** A round MUST count only when the promised reviewable candidates are returned; provider/product errors, incomplete boards, and all-unscannable boards MUST NOT consume allowance, while internal retries remain bounded against abuse.
- **FR-057:** Payment MUST be confirmed by a verified, idempotent provider event and bound to an opaque project-access capability with a documented recovery path; browser return alone MUST NOT unlock export.
- **FR-058:** MVP pricing MUST NOT separately charge for standard dimensions, applicable PNG/SVG formats, validation, repair, or downloading the same purchased artwork during its allowed availability window; display ads, subscriptions, generic credit wallets, and unlimited/lifetime generation are excluded.

## 5. Non-functional requirements

- **NFR-001 Availability:** Public redirect runtime target is at least 99.95% monthly after general availability; control-plane availability has a separate lower target.
- **NFR-002 Latency:** Warm redirect processing SHOULD achieve p95 ≤100 ms and p99 ≤250 ms measured server-side, excluding client network and downstream destination.
- **NFR-003 Isolation:** Dashboard/control-plane failure MUST NOT require redirect runtime failure; analytics failure MUST NOT block redirects.
- **NFR-004 Security:** OWASP-relevant controls, tenant authorization tests, webhook signature verification, CSRF/session protections, SSRF-safe destination handling, rate limiting, and secret rotation MUST be implemented.
- **NFR-005 Privacy:** Collect the minimum scan data; raw IP MUST NOT be retained beyond the short processing/security window approved in policy.
- **NFR-006 Accessibility:** Customer interfaces MUST meet WCAG 2.2 AA for launch-critical journeys.
- **NFR-007 Browser support:** Latest two stable versions of major evergreen desktop browsers; mobile support for static/dynamic management; 500-row bulk guarantee may be desktop-only and disclosed.
- **NFR-008 Export fidelity:** Reference SVGs MUST validate, preserve quiet zone, embed/safely reference assets, and pass automated and physical scan tests at documented sizes.
- **NFR-009 Durability:** Campaign configuration and entitlement data MUST have encrypted backups, point-in-time recovery where available, and tested restoration.
- **NFR-010 Observability:** Correlated metrics/logs/traces and alerts MUST cover redirect errors/latency, webhook failures, domain provisioning, analytics lag, and abuse spikes.
- **NFR-011 Idempotency:** Commerce, entitlement, domain, and event consumers MUST tolerate retries without duplicate durable effects.
- **NFR-012 Cost controls:** Per-campaign traffic/storage/support costs and anomaly budgets MUST be observable; fair-use enforcement MUST be transparent and never based only on an expired card.
- **NFR-013 SEO quality:** Generated pages MUST be indexable only when unique and useful, with canonicalization, sitemap controls, and no doorway-page behavior.
- **NFR-014 Maintainability:** Shared contracts MUST be versioned; database tables and infrastructure resources have one owning workstream.
- **NFR-015 Recovery:** Provisional objectives: redirect RTO ≤30 minutes for regional/provider incident and control-data RPO ≤5 minutes where the selected stack supports it; validate via architecture spike.
- **NFR-016 Artistic quality and safety:** Artistic generation MUST have measured decoder/device pass rate, bounded generation latency and cost, provider-failure fallback, content-safety controls, and provenance metadata sufficient to identify the generation mode/provider/version without exposing prompts publicly.

## 6. Entitlement and lifecycle semantics

This section applies to the later Dynamic QR Infrastructure release and is not part of the standalone Artistic MVP.

### Terminology

Use **Durable Campaign License** in specifications. Public “lifetime/forever/unlimited” language remains prohibited until approved.

### Proposed semantics

- One purchase grants one campaign slot, consumed while a campaign is active.
- Archiving may release the slot only if the original public route is permanently retired; route reuse policy must prevent hijacking.
- No monthly rebilling is required to keep an otherwise compliant campaign active.
- Fair-use controls respond to abuse or exceptional cost, not ordinary popularity.
- Service continuity, company closure, force majeure, and migration/export commitments require explicit terms.
- A refunded or disputed purchase moves through a documented review state; it does not silently break a printed code.

## 7. Launch scope

### MVP (v1.0) — Standalone High-End Artistic QR Studio

- Focused Studio for URL/text payloads with anonymous free preview and guest one-time checkout/project access; no full account, campaign, domain, analytics, or bulk dependency.
- Premium prompt-guided, reference-image, and curated art-direction workflows where SP-08 validates them.
- At least six launch-quality, meaningfully distinct art directions rather than cosmetic color presets.
- Four-candidate generation board with regenerate, variation, artistic-strength, composition/focal-area, palette, and protected-QR controls.
- Closed-loop scan repair: generate → multi-decoder/perturbation validation → targeted repair/reinforcement → revalidate.
- Side-by-side candidate comparison with honest robustness evidence and an always-available safe fallback.
- Publication-ready high-resolution PNG; deterministic/vector designs also export SVG. Print preview and minimum-size guidance are required.
- Local/session project continuity sufficient to recover the current work without requiring cloud identity.
- Approved $0 preview, $12 project unlock, and contextual $5 exploration offer with verified/idempotent payment, opaque guest project access, fair successful-round accounting, and export authorization.
- Content/IP/privacy disclosures, provider/payment failure handling, accessibility, performance, observability, and independent release proof.

### Post-MVP versions

- **v1.1 — Artistic Pro:** saved local projects/history, reusable brand kits, more art directions, deterministic seeds/variations, stronger print/export tooling, and generation provenance.
- **v1.2 — Creative workflow and monetization:** optional accounts/cloud sync, transparent artistic-generation allowances or paid packs, project library, sharing, and selected batch/template workflows.
- **v2.0 — Dynamic QR infrastructure:** durable campaign purchase, editable redirects, lifecycle controls, basic analytics, and operational continuity built around artistic assets.
- **v2.1 — Domains and scale:** custom domains, richer analytics, bulk artistic generation, teams/agency controls, APIs/webhooks, and higher-volume operations after their own feasibility gates.

## 8. Acceptance journeys

For MVP release, AJ-01 and AJ-08 are mandatory; AJ-02–AJ-07 are retained for later infrastructure releases and are not MVP blockers.

- **AJ-01:** Anonymous user creates a styled QR, downloads SVG/PNG, and both scan to the exact payload on reference devices.
- **AJ-02:** User pays once, webhook grants entitlement once, creates campaign, scans public QR, changes destination, and the same QR reaches the new destination.
- **AJ-03:** Control plane is disabled during test; an existing route continues to redirect and analytics failure does not increase redirect failures.
- **AJ-04:** User verifies a hostname, certificate becomes active, hostname routes correctly, and stale/unverified ownership cannot be claimed.
- **AJ-05:** User validates and purchases a 500-row batch; ZIP contains 500 valid SVGs plus complete manifest within the supported performance envelope.
- **AJ-06:** Cross-tenant and webhook replay tests fail safely with audit evidence.
- **AJ-07:** Paused, deleted, abusive, refunded/review, and degraded-domain states each produce the documented safe behavior.
- **AJ-08:** User starts from a URL/text payload, directs a genuinely artistic composition, receives multiple visibly distinct candidates, refines a selected candidate, exports only after closed-loop validation/repair meets the approved robustness threshold, scans the exported high-resolution PNG on the reference device/perturbation matrix to the exact payload, and can recover safely from unscannable output or provider failure.

## 9. Open product decisions

### Artistic MVP blockers

1. Sponsor-approved artistic quality rubric and final six+ launch art directions.
2. Artistic generation model/provider and deterministic composition/fallback architecture.
3. Permitted prompt/reference-image modes, safety/IP policy, provider retention, deletion, and provenance.
4. Launch decoder/perturbation/device/print threshold and honest customer-facing robustness language.
5. Generation latency, retries, anonymous abuse/cost limits, and maximum cost per successful export.
6. Exact PNG/SVG dimensions, print guidance, local/session continuity, and supported browser/device matrix.
7. Guest purchase recovery method and paid project/download availability window without requiring a full customer account.

### Deferred infrastructure decisions

8. Exact service-life and continuity promise replacing “forever.”
9. Fair-use thresholds and remediation sequence for dynamic routes.
10. Refund/dispute treatment for already printed dynamic codes.
11. Campaign-slot transfer/reuse and canonical hosted-route/slug policy.
12. Analytics dimensions and retention.
13. Custom-domain scope.
14. Authentication, taxes/VAT, currencies, invoices, support SLA, and discontinuation remedy.
