# Level 2 Image-Fit QR Implementation Plan

> **For Hermes:** Use subagent-driven-development or direct QR fleet handoff after contracts in Task 1 are frozen.

**Goal:** Build a Level 2 Image-Fit QR vertical slice where a user can combine a target image/logo with an optimized QR payload/short link and receive scan-validated candidates that balance readability and image resemblance.

**Architecture:** QR Creator owns the image-fit QR optimizer, QR matrix/density search, validation, and export-safe artifact contract. QR Studio owns the UI flow, short-link resolver/control surface, and customer-facing evidence. QR Product Architect owns PRD/contract freeze, integration sequencing, and independent verification.

**Tech Stack:** Existing QR monorepo; TypeScript packages under `packages/qr-core` and `packages/artistic-qr`; React/Vite app under `apps/web`; docs/contracts under `docs/**` and `packages/contracts/**`; short-link resolver implementation path to be confirmed after repository inspection.

---

## Acceptance criteria for first vertical slice

- **AC-01:** Given a target URL and simple logo fixture, the system generates at least three candidate outputs: Readable, Balanced, Image-first.
- **AC-02:** Each candidate records payload length, chosen short slug/payload mode, QR version/module count, ECC level, mask pattern, scan verdict, and image-fit score.
- **AC-03:** At least the Balanced candidate passes the approved automated scan validation for the fixture.
- **AC-04:** Candidate preview and export use the same payload and geometry.
- **AC-05:** Long original URL vs optimized short-link comparison proves why short links help.
- **AC-06:** Complex/high-risk image fixture fails safely or is downgraded with actionable guidance.
- **AC-07:** Public/product UI avoids technical jargon while retaining evidence for review.

## Task 1: Freeze contracts and fixtures

**Objective:** Define the data contracts that let Creator and Studio work in parallel.

**Files:**
- Create: `docs/architecture/contracts/image-fit-qr-api.v1.md`
- Create: `packages/contracts/src/imageFitQr.ts` or equivalent existing contracts location
- Create: `packages/contracts/fixtures/image-fit-qr/README.md`
- Create fixtures: simple logo, medium logo, complex image placeholder under an approved fixture path

**Steps:**
1. Define `ImageFitRequest` with destination, payload mode, image metadata/reference, target output mode, fit strength, and optional advanced QR settings.
2. Define `ImageFitCandidate` with id, mode label, payload metadata, QR settings, scan evidence, image-fit evidence, warnings, and artifact references.
3. Define `ShortLinkCandidate` and `CommittedShortLink` contracts.
4. Define error taxonomy: unsafe destination, unsupported image, too complex, no scan-safe candidate, short-link unavailable, optimizer timeout.
5. Add JSON/TS fixtures for one successful and one failure case.
6. Run contract typecheck/tests.

**Verification:** Contract consumers can import/validate fixtures without implementation dependencies.

## Task 2: QR Creator spike — density/mask/slug search harness

**Objective:** Prove that payload/slug/mask/version search can materially affect image-fit quality.

**Files:**
- Create/modify under `packages/artistic-qr/**` or a dedicated spike path.
- Create evidence under `docs/program/evidence/level2-image-fit-qr-spike/creator/`.

**Steps:**
1. Load 2–3 image fixtures.
2. Generate QR matrices across bounded versions, ECC Q/H, and mask 0–7.
3. Generate or consume a set of candidate short payloads/slugs.
4. Pixelate target image to each candidate module grid.
5. Compute a first-pass image-fit score: silhouette overlap, edge preservation, protected-zone conflict, and contrast viability.
6. Run existing decoder validation where available.
7. Produce a contact sheet and candidate JSON table.

**Verification:** Report includes at least one case where slug/mask/version changes image-fit or scan result.

## Task 3: QR Studio spike — short-link resolver MVP design

**Objective:** Define and, if feasible, prototype the minimum owned short-link capability needed for image-fit QR without expanding into campaigns/analytics.

**Files:**
- Create: `docs/architecture/decisions/ADR-level2-short-link-resolver.md`
- Create evidence under `docs/program/evidence/level2-image-fit-qr-spike/studio/`.
- Implementation paths TBD after repo inspection, likely web/API/server functions or current commerce server surface.

**Steps:**
1. Decide provisional route shape: e.g. `https://placeholder-online.com/r/<slug>` unless a short domain is approved.
2. Define one-hop redirect semantics: 302/307, cache headers, target validation, unknown/disabled slug behavior.
3. Define slug reservation/evaluation/commit lifecycle.
4. Prototype an in-memory or local persistent resolver sufficient for vertical-slice testing.
5. Exclude analytics/dashboard/custom domains.

**Verification:** A committed slug redirects to the final target; unsafe targets and unknown slugs fail safely.

## Task 4: Integrate optimizer contract with UI candidate flow

**Objective:** Expose Image-Fit QR as a Level 2 flow without disrupting Level 1 QR Style/Creator Signature.

**Files:**
- Modify: `apps/web/src/**` relevant editor components after current UI ownership review.
- Test: `apps/web/src/App.test.tsx` or new focused tests.

**Steps:**
1. Add Level 2 entry point/feature flag or internal route for Image-Fit QR.
2. Add image upload/select fixture path.
3. Add user-facing controls: treatment, strength, detail, link mode.
4. Display Readable/Balanced/Image-first candidate cards with compact evidence.
5. Show optimized short-link explanation and original URL warning.
6. Preserve Level 1 path unchanged.

**Verification:** Tests prove Level 1 remains available and Level 2 renders candidate evidence from contract fixtures.

## Task 5: Export parity and scan evidence

**Objective:** Ensure selected candidate export matches preview and carries the validated payload.

**Files:**
- Modify: `packages/artistic-qr/**`, `apps/web/src/**`, export tests.
- Evidence: `docs/program/evidence/level2-image-fit-qr-export/`.

**Steps:**
1. Export selected candidate using stored candidate geometry/settings.
2. Decode/export-test the artifact against the selected payload.
3. Include provenance metadata: QR version, ECC, mask, validation version, payload mode, short slug/project reference.
4. Prove preview/export parity through hashable metadata and visual/decoder evidence.

**Verification:** Exported QR decodes to the selected short URL/original URL and redirects to the final target in short-link mode.

## Task 6: Product QA and decision packet

**Objective:** Decide whether the Level 2 direction is ready for implementation expansion.

**Files:**
- Create: `docs/program/evidence/level2-image-fit-qr-spike/product-architect-review.md`
- Update: `docs/product/prd-level2-image-fit-qr.md` if spike changes requirements.

**Steps:**
1. Review Creator and Studio evidence directly.
2. Verify no dynamic campaigns/analytics/custom domains snuck into MVP scope.
3. Verify scan evidence and image-fit contact sheets.
4. Identify which settings become product controls vs internal optimizer knobs.
5. Recommend build/hold/pivot.

**Verification:** Decision packet explicitly accepts/rejects AC-01 through AC-07 with evidence paths.

## Dependency order

1. Product Architect freezes PRD and contracts.
2. Creator and Studio can run spikes in parallel after contract draft exists.
3. Integration waits for both spike outputs.
4. Export/public-flow work starts only after scan + short-link proof are accepted.

## Immediate next bounded stage

**Stage:** Contract + spike SOW dispatch  
**Deadline:** under 60 minutes from activation  
**Success:** Creator and Studio both have authoritative, self-contained SOWs with paths, owners, acceptance criteria, and a report deadline; no implementation starts outside contract/spike scope.
