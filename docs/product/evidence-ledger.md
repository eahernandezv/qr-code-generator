# Evidence Ledger

Status: Initial ledger; user-provided market statements are **context, not independently verified evidence**.

| ID | Claim | Type | Evidence today | Confidence | Required validation | Owner |
|---|---|---|---|---|---|---|
| EV-001 | Users dislike recurring QR subscriptions and fear printed-code deactivation | Hypothesis | Strategic background supplied by sponsor | Medium | 15–20 interviews plus cancellation/review analysis | Product research |
| EV-002 | $19 one-time is an attractive and sustainable dynamic-campaign price | Hypothesis | Proposed pricing only | Low | Price sensitivity test and five-year unit-economics scenarios | Product + Finance |
| EV-003 | $29 for 500 SVGs is attractive to operations users | Hypothesis | Proposed pricing only | Low | Landing-page test and interviews with bulk handlers | Product research |
| EV-004 | Competitor limits/prices described in background are current | Assumption | Sponsor-provided comparison; not independently checked | Low | Date-stamped plan/terms audit for Bitly/QRCode Monkey, Flowcode, Uniqode, QR Tiger | Competitive research |
| EV-005 | Static QR generation and SVG export can run entirely in supported browsers | Assumption | Established technical pattern, not yet tested for chosen library/style set | Medium | Library spike with scan tests and browser matrix | WS-03 |
| EV-006 | A 500-row styled SVG ZIP can be generated reliably client-side | Hypothesis | Proposed architecture only | Low | Memory/time spike on low-, mid-, high-spec devices | WS-10 |
| EV-007 | One-time custom-domain support can be mostly self-serve | Hypothesis | Proposed workflow only | Low | DNS/TLS provider spike and support-path simulation | WS-08 |
| EV-008 | “Unlimited scans” has manageable abuse and cost exposure | Hypothesis | No traffic distribution or abuse model | Low | Load/cost model, fair-use policy, and adversarial test | WS-07 + WS-12 |
| EV-009 | Minimal weekly/location analytics satisfy target users | Hypothesis | Sponsor positioning | Medium | Prototype testing and analytics requirement interviews | WS-09 |
| EV-010 | A tool-first homepage increases activation relative to a sales-first page | Hypothesis | Design analogies to Shots.so | Medium | Instrumented A/B or sequential experiment | WS-11 |
| EV-011 | Dub/Linear/Shots-inspired visual language creates trust | Hypothesis | Sponsor design direction | Medium | Usability and trust testing with target users | WS-02 |
| EV-012 | Dynamic routes should remain active without recurring rebilling | Decision | Core positioning | High | Validate legal wording and economics; preserve decision unless charter changes | Product owner |
| EV-013 | Editable routes must not use cache-sticky 301 responses by default | Decision | HTTP behavior and product requirement | High | Architecture test for 302/307 and cache headers | WS-07 |
| EV-014 | Raw IP addresses are unnecessary for the proposed analytics | Assumption | Privacy-first design direction | Medium | Confirm coarse geolocation pipeline and fraud needs | Security + WS-09 |
| EV-015 | Programmatic SEO can acquire qualified demand without paid ads | Hypothesis | Proposed growth strategy | Low | Keyword research, quality threshold, indexation experiment | WS-11 |
| EV-016 | “Lifetime/forever” language is legally and operationally safe | Assumption | No review completed | Very low | Legal review and continuity-policy decision; do not publish beforehand | Product + Legal |
| EV-017 | Target customers value artistic QR codes enough to improve activation or willingness to pay | Hypothesis | Sponsor added artistic creation to MVP | Low | Prototype tests with small business, agency, and event users; compare completion and stated preference | WS-00 + WS-03 |
| EV-018 | A bounded artistic pipeline can produce scan-safe output with acceptable latency and unit cost | Hypothesis | No selected model/provider or scan evidence | Low | SP-08 prompt/style/reference-image matrix, multi-decoder/device tests, safety/privacy review, and cost model | WS-03 + WS-12 + WS-13 |
| EV-019 | Curated deterministic artistic templates are a viable MVP fallback if generative output is unreliable | Assumption | Existing QR styling pattern only | Medium | Implement representative templates and test perceived quality plus scan reliability | WS-02 + WS-03 |
| EV-020 | The flagship Artistic QR MVP will not use display advertising | Decision | Sponsor explicitly discarded the ad-based option | High | Evaluate only direct monetization structures: free proof plus one-time project/export, bounded credits, or later subscription | Product owner |

## Decision discipline

- Facts require a link, date, captured terms, experiment, or production measurement.
- Assumptions must not silently become requirements.
- Failed hypotheses trigger scope/pricing redesign rather than cosmetic wording changes.
- Competitor facts must be refreshed immediately before public comparison copy is published.
