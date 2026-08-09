# QR Studio report — Level 2 Image-Fit QR short-link and UX spike

- **Verdict:** PARTIAL
- **Branch:** `studio/level2-image-fit-short-link-ux-spike`
- **Baseline:** `origin/main` at `063c094338735648d9b08479e0e13ce998f43022`
- **Implementation/evidence commit:** `d2e8fd725cb3e17878d648d1aa5efd321163aac5`
- **Completed:** 2026-08-08T21:51:19Z
- **Prototype route:** `/concepts/level2-image-fit-qr`

## Summary

The minimum Studio UX and short-link resolver semantics are validated as a bounded spike:

- one owned route, `https://placeholder-online.com/r/<slug>`;
- one-hop 302 redirects for GET/HEAD with `no-store` recovery-safe headers;
- project-bound reserve-many / commit-one / expire-unused lifecycle;
- write-time and read-time destination validation;
- safe 404/410 behavior with no `Location` for unknown, disabled, or unsafe targets;
- isolated Level 2 UX containing every requested treatment, strength, detail, and link-mode control;
- truthful evidence placeholders for scan status, module count/density, and image-fit recommendation;
- explicit warning when Original URL can hurt density/image clarity.

The verdict is PARTIAL rather than VALIDATED because this spike intentionally does not provide production persistence, threat-reputation validation, QR Creator optimization/scan evidence, commit authority, or public deployment. Those contracts must be frozen before export can depend on a short link.

## Recommended MVP approach

1. Keep `/r/<slug>` on the existing owned apex for the first vertical slice. Treat a shorter domain as a later infrastructure decision, not a custom-domain feature.
2. Accept GET/HEAD only and return 302. Reject other methods with 405. Do not use 301 by default.
3. Return `Cache-Control: private, no-store, max-age=0`, `Pragma: no-cache`, `Referrer-Policy: no-referrer`, and noindex/nosniff headers.
4. Reserve a bounded batch of project-bound slug candidates for 30 minutes, let QR Creator evaluate them, atomically commit exactly one after candidate selection/authority, and expire the rest.
5. Keep committed destination mappings stable in customer MVP. Restrict disable/correction to a separately authorized recovery path.
6. Block export until committed resolver read-back matches the payload selected and validated by QR Creator.
7. Add durable replicated storage, abuse controls, reputation validation, and resolver SLO/backup/runbook before public launch.

Full decision detail: `short-link-resolver-design.md`.

## UX recommendation

Use a separate Level 2 entry point while the flow is experimental. Preserve Level 1 unchanged.

User-facing controls:

- **Treatment:** Logo / Pixel blend / Background image / Cutout-perforated
- **Strength:** Readable / Balanced / Image-first
- **Detail:** Simple / Detailed / Maximum
- **Link mode:** Optimized short link — Recommended / Original URL — Advanced

Candidate cards remain Readable, Balanced, and Image-first. The primary evidence row shows Scan, Density/module count, and Image fit. Technical version/ECC/mask details can live in an evidence disclosure or export provenance rather than becoming product controls.

The prototype deliberately displays `Not run`, `— modules`, and `Awaiting Creator`. The decorative matrix is labeled `Illustrative matrix only`; no decoder confidence was fabricated.

Full flow and copy: `ux-flow.md`.

## Resolver proof

`apps/web/scripts/short-link-resolver.test.mjs` executed the production runtime seam and proved:

- safe committed `7k9mqp` returned 302 to `https://example.com/final?source=qr`;
- response carried `private, no-store, max-age=0`;
- unknown `9zzzzz` returned 404 with no `Location`;
- disabled `8n4wxy` returned 410 with no `Location`;
- unsafe schemes, credentials, localhost/private/link-local/internal targets were rejected;
- an unsafe stored target returned 410 with no redirect;
- loading an unsafe committed record failed before runtime startup;
- reserving two candidates and committing one expired the unused candidate.

The local `SHORT_LINK_RECORDS_JSON` seam is spike-only. It is not proposed as production persistence or a public creation API.

## Contract needs from QR Creator

Studio needs these fields frozen before integration:

- request/project IDs and destination digest;
- each payload mode’s encoded URL, byte length, slug/reservation ID, and expiry;
- image reference/hash/media type/dimensions/complexity;
- treatment, strength, detail, and bounded search budget;
- candidate ID/mode/rank;
- exact encoded payload source (optimized/original);
- QR version, module count, ECC, and mask;
- scan verdict, export eligibility, evidence ID, validator version, decoded-payload hash, tested sizes, perturbation summary;
- image-fit score/band, protected-zone conflict, and complexity;
- structured warnings/fallback reason;
- preview/export references, geometry hash, and artifact SHA-256.

Commit needs idempotency key, project/candidate/reservation/slug, and destination digest; response needs public URL, stable state, committed time, and mapping version. Proposed TypeScript shapes are in `ux-flow.md`.

Product Architect must freeze public base URL, destination policy version, reservation TTL/cardinality, commit trigger/authority, mapping immutability/recovery, and controlled scan-threshold language.

## Exact commands and results

```text
node --test apps/web/scripts/short-link-resolver.test.mjs
PASS — 4/4

pnpm --filter @qr/web test src/App.test.tsx
PASS — 12/12

pnpm --filter @qr/web build
PASS — 129 modules transformed

pnpm --filter @qr/web lint
PASS — zero warnings

pnpm --filter @qr/web test:e2e level2-image-fit-spike.spec.ts
PASS — 1/1
```

Runtime screenshot proof at 390×844 found zero page errors, zero console errors, three candidate cards, and no horizontal overflow. Full-page vertical scrolling is intentional for this first Level 2 control spike.

## Files touched

### Runtime/prototype

- `apps/web/scripts/short-link-resolver.mjs`
- `apps/web/scripts/short-link-resolver.test.mjs`
- `apps/web/scripts/production-server.mjs`
- `apps/web/src/components/ImageFitQrConcept.tsx`
- `apps/web/src/App.tsx`
- `apps/web/src/App.test.tsx`
- `apps/web/e2e/level2-image-fit-spike.spec.ts`

### Evidence

- `docs/program/evidence/level2-image-fit-qr-spike/studio/studio-report.md`
- `docs/program/evidence/level2-image-fit-qr-spike/studio/short-link-resolver-design.md`
- `docs/program/evidence/level2-image-fit-qr-spike/studio/ux-flow.md`
- `docs/program/evidence/level2-image-fit-qr-spike/studio/image-fit-optimized-mobile.png`
- `docs/program/evidence/level2-image-fit-qr-spike/studio/image-fit-original-url-warning-mobile.png`
- `docs/program/evidence/level2-image-fit-qr-spike/studio/ux-runtime.json`
- final test/build/lint/browser logs
- `docs/program/evidence/level2-image-fit-qr-spike/studio/sha256.txt`

## Risks and next Studio tasks

1. **Production storage/authority:** replace environment-loaded records with an internal authenticated reserve/commit/read API and durable atomic constraints.
2. **Destination safety:** freeze shared server validator with DNS/reputation/abuse policy; current deterministic blocker is necessary but not sufficient for malicious-domain classification.
3. **Creator integration:** consume only frozen optimizer evidence; do not calculate scan confidence in Studio.
4. **Commit/export parity:** add a browser journey that commits the selected reservation, reads it back, verifies encoded payload equality, then exports.
5. **Failure UX:** implement unsafe destination, resolver unavailable, reservation expired, complex image, and Level 1 fallback states after error taxonomy is frozen.
6. **Image privacy:** keep browser-local by default until upload/retention/provider policy is approved.
7. **Independent acceptance:** Product Architect should reproduce redirect behavior and review whether 302, 30-minute TTL, and stable committed mapping are accepted.

## Explicit exclusions upheld

No analytics/click counters, dynamic routing/campaigns, accounts, customer custom domains, generic shortener UI/API, destination-editing UI, or QR optimizer/decoder implementation was added.
