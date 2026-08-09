# Level 2 Image-Fit QR Production Contract Pack v1

Status: **FROZEN for first production vertical slice**  
Owner: QR Product Architect (`@QRCodeGeneratorHermesBot`)  
Consumers: QR Creator, QR Studio  
Baseline: `origin/main` after merge `4fbed78d6efc9bdfbaab6328f80ad650126460d9`  
Date: 2026-08-09

## 1. Product boundary

Level 2 is **Image-Fit QR / Logo-Pixel QR**: the QR matrix itself is optimized to fit a target image/logo while preserving scan reliability. It is **not** poster/sticker/flyer/template generation.

Explicitly still excluded unless Ernesto approves separately: dynamic campaigns, analytics, custom domains, accounts, bulk generation, subscriptions, generic credit wallets, and generic public URL-shortener UI.

## 2. Public promise allowed for this slice

Allowed wording:

- “Generate image-fit QR candidates that passed controlled decoder checks.”
- “Choose between Readable, Balanced, and Image-first tradeoffs.”
- “Optimized short links can help the QR matrix fit the image more cleanly.”

Forbidden wording:

- “Universal scan guarantee.”
- “Works on every phone / every print.”
- “Production/export approved” unless `export_authority.export_allowed === true` and all launch gates pass.
- “Confidence: NN%” as a customer-facing universal scan claim.

## 3. Versioned contracts frozen here

Machine-readable schemas:

- `packages/contracts/schemas/image-fit-qr-api.v1.json`
- `packages/contracts/schemas/image-fit-qr-errors.v1.json`
- `packages/contracts/fixtures/image-fit-qr/valid-balanced-response.v1.json`
- `packages/contracts/fixtures/image-fit-qr/invalid-no-scan-safe-candidate.v1.json`

Human contract owner map:

| Contract surface | Owner | Consumers |
|---|---|---|
| request/candidate/validation schema | Product Architect | Creator, Studio |
| QR matrix, protected regions, rendering, decoder validation | Creator | Studio |
| short-link reservation/commit resolver | Studio | Creator optimizer, Product Architect QA |
| public UI copy/gating semantics | Product Architect | Studio |
| final merge and export-readiness decision | Product Architect | all |

## 4. Required lifecycle

```text
request_created
  -> candidate_generation_started
  -> candidate_generated[]
  -> candidate_validated[]
  -> candidate_selected
  -> purchase_or_internal_entitlement_verified
  -> short_link_committed, if optimized_short_link
  -> export_authorized
  -> export_artifact_created
```

A candidate can be previewable before payment, but it is not export-authorized until the server-authoritative export gate passes.

## 5. Request contract summary

`ImageFitQrRequestV1` MUST include:

- `request_id`, `schema_version: image-fit-qr-api.v1`
- `destination` with normalized URL, safety verdict, and redacted display string
- `target_image` metadata/reference, never raw bytes in the contract fixture
- `user_controls`: treatment, strength, detail, link mode
- `constraints`: max search time, max candidates, allowed ECC, allowed mask set, allowed versions
- `entitlement_context`: preview/project/internal, but no secrets

`link_mode` values:

- `optimized_short_link` — default for URL destinations
- `original_url` — advanced, may reduce image fit due to payload density

## 6. Candidate contract summary

Each `ImageFitQrCandidateV1` MUST include:

- stable `candidate_id`
- user-facing `mode`: `readable`, `balanced`, or `image_first`
- `qr_settings`: payload mode, encoded payload redacted/display form, version, module count, ECC, mask
- `image_treatment`: logo pixel, module recolor, background silhouette, cutout perforated, etc.
- `protected_regions`: quiet zone, finder, separator, timing, alignment, format, version, reserved core regions
- `scan_evidence`: decoder checks and explicit physical/print status
- `image_fit_evidence`: non-customer-universal fit metrics
- `export_authority`: explicit boolean plus blockers
- artifact refs with sha256 hashes

## 7. Protected QR regions

Creator MUST protect all functional QR regions before any image treatment:

- quiet zone
- finder patterns
- finder separators
- timing patterns
- alignment patterns for the selected QR version
- format information
- version information when present
- reserved dark module and module coordinates the QR core marks immutable

If current `qr-core` lacks an exported alignment-region API, Creator owns adding a narrow browser-safe/core-safe function rather than duplicating a stale table in Studio.

## 8. Export authority gates

A candidate may set `export_authority.export_allowed=true` only if all are true:

1. destination safety verdict is `pass`;
2. encoded payload matches the selected candidate payload;
3. all required protected-region checks pass;
4. automated decoder suite passes the frozen threshold version;
5. preview/export geometry parity is proven by metadata/hash or equivalent deterministic render proof;
6. optimized short link is committed when link mode is `optimized_short_link`;
7. payment/project entitlement authorizes export for public users;
8. no `block_export` warning remains.

`image_first` MAY be present as a preview candidate, but MUST default to `export_allowed=false` until it passes stricter launch gates and Product Architect explicitly promotes it.

## 9. Short-link contract summary

Studio owns the resolver lifecycle:

- reserve many candidate slugs for optimizer evaluation;
- expose payload strings for Creator to evaluate QR matrices;
- commit exactly one selected slug after entitlement/export authorization;
- expire uncommitted slugs;
- redirect committed slugs one hop to the validated target URL;
- fail closed for unknown, expired, disabled, unsafe, or uncommitted slugs.

MVP route shape: `https://placeholder-online.com/r/<slug>` unless Product Architect changes it in a later ADR. Use 302 or 307, not 301, until destination recovery policy is final. Responses must be CR/LF-safe and should avoid long-lived cache traps.

## 10. Error taxonomy

Required Level 2 stable errors are defined in `image-fit-qr-errors.v1.json` and must map to safe UI messages. Required codes include:

- `image_fit_destination_unsafe`
- `image_fit_target_unsupported`
- `image_fit_target_too_complex`
- `image_fit_no_scan_safe_candidate`
- `image_fit_optimizer_timeout`
- `image_fit_short_link_unavailable`
- `image_fit_short_link_commit_failed`
- `image_fit_export_not_authorized`
- `image_fit_preview_export_mismatch`
- `image_fit_physical_scan_not_performed`

## 11. Acceptance gates for worker branches

Creator branch acceptance:

- contract fixtures import/validate;
- protected-region contract includes alignment patterns;
- at least Readable and Balanced candidates can be produced for the simple fixture;
- Balanced passes automated decoder checks;
- fallback produces a safe Level 1 QR if no image-fit candidate passes;
- report includes exact commands and evidence hashes.

Studio branch acceptance:

- consumes the frozen schema without redefining fields;
- no fixture evidence is presented as live/generated after inputs change;
- public preview cannot bind export payload or commit slug before entitlement;
- short-link resolver tests cover reserve/evaluate/commit/expire/unknown/unsafe;
- normal UI path displays bounded copy and export gates fail closed;
- report includes exact commands and evidence hashes.

## 12. Integration order

1. Product Architect contract branch merges first.
2. Creator implements Core/optimizer contract and fixture service against `origin/main` containing these contracts.
3. Studio implements UI/resolver using mocked contract fixtures and, where available, Creator’s package exports.
4. Product Architect integrates Creator first, then Studio, unless Studio proves pure mock/UI work with no contract drift.
5. Final Product Architect QA proves normal user path, not seeded state.

## 13. Change protocol

Consumers must not silently fork this contract. If blocked, create a report with:

- exact blocked field/code;
- proposed additive or breaking change;
- compatibility impact;
- temporary mock or fallback used;
- Product Architect decision needed.
