# Stage 2 Guest-Commerce Validation Evidence

**Owner:** QR Studio
**Handoff target:** QR Product Architect
**Accepted baseline:** `ws/05-web-studio` at `b393da3c5f553b3899a8ddc3bc7c9b6e7f04fc57`
**Scope:** Stage 2 guest-commerce only
**Payment boundary:** mock/test adapter only; no live charge, production credential, or deployment

## Recovery-input decision

- Inspected preserved commit `preserve/stage2-commerce-790ce73` (`790ce73`) and stash `paused-commerce-after-role-correction-20260728T084056Z` before editing.
- The preserved commit was based on older Stage 1 commit `68ff4d6` and would delete accepted Stage 1 browser/unit tests and evidence if applied wholesale.
- Selectively recovered only the commerce schemas, shared error taxonomy, offer semantics, and service-package direction.
- Did not apply `stash@{0}` because it changes only an obsolete prior loop-state file.
- Reimplemented the Studio integration against accepted `b393da3`, preserving accepted Stage 1 UI/export behavior and tests.

## Implemented behavior

### Frozen pricing and scope

- Free preview: four candidates / one preview round and **no finished export**.
- Artistic Project: **$12**, 12 candidates / 3 successful rounds, one finished artwork, all formats.
- Extra Exploration: **$5**, exactly +8 candidates / +2 successful rounds and +1 finished artwork.
- Guest-only UI; no accounts, subscriptions, generic wallet/credits, campaigns, analytics, custom domains, bulk generation, or ads.

### Authoritative commerce service

`services/commerce` implements:

- provider adapter boundary plus a no-network `MockCheckoutProvider`;
- checkout creation and idempotency-key fingerprinting;
- pending, succeeded, failed, and canceled payment transitions;
- duplicate-event deduplication and reordered-event handling;
- service-authoritative successful-round/candidate accounting;
- failed/canceled generation non-consumption;
- one finished-artwork selection with repeat download in all formats;
- Extra Exploration one-time additive entitlement;
- SHA-256-hashed access/recovery capabilities;
- expiring, rotating, one-time guest recovery;
- service-authoritative export authorization independent of Zustand/local browser state.

### Studio integration

- `CheckoutPanel` is entirely gated by `artistic_checkout_enabled`.
- Checkout has pending/webhook-delay, test success, failure, cancel, provider-error, and safe-retry UX.
- `CandidateBoard` accounts only completed successful boards; cancel does not decrement prior successful usage.
- `ExportPanel` requests authoritative authorization before rendering/downloading. Local entitlement tampering is denied.
- A successful finished-artwork authorization permits all PNG/SVG/PDF/EPS representations of that artwork; selecting another finished artwork requires remaining entitlement.
- Recovery input uses a password field, is submitted only to the adapter, is cleared on success, rotates after use, and is never placed in a URL or browser persistence.
- Purchase copy explicitly states that payment does not imply scan validation; existing Core-evidence labeling remains unchanged.

## Final verification

Durable command log: `.work-loop/logs/final-validation-2.log`
Bounded worker state: `.work-loop/active-worker.json`
Worker: `stage2-final-validation-2`, wrapper PID `170161`, child PID `170171`
Deadline enforcement: `run_bounded_worker.py --timeout-seconds 1800`
Outcome: `process_outcome=exited`, exit `0`, finished `2026-07-28T11:16:17.216613Z`

Commands executed by the accepted final gate:

```bash
pnpm --filter @qr/commerce test
pnpm --filter @qr/commerce lint
pnpm --filter @qr/commerce build
pnpm --filter @qr/web test
pnpm --filter @qr/web lint
pnpm --filter @qr/web build
pnpm --filter @qr/web test:e2e
git diff --check
# Frozen Core/Artistic path diff assertion
# live-key/private-key pattern scan
```

Results:

- Commerce unit/integration: **13/13 passed** (1 file).
- Web unit/component/accessibility: **57/57 passed** (11 files), including 4 accessibility tests.
- Browser: **12/12 passed** in Chromium desktop.
- Commerce browser coverage includes:
  - free preview → $12 checkout → paid refinement → authorized export;
  - checkout failure → safe retry → paid unlock → recovery → replay denial;
  - local-state export tampering denial;
  - provider failure and safe retry.
- Accepted Stage 1 browser coverage remains green: cancellation, refinement/exhaustion, print dimensions, four single formats, four-size bundle, validation-source labeling, and mobile viewport.
- Commerce lint: pass.
- Web lint: pass with zero warnings.
- Commerce TypeScript build: pass.
- Web production build: pass; Vite transformed **514 modules**.
- `git diff --check`: pass.
- Frozen `packages/qr-core`, `packages/artistic-qr`, `qr-core-api.v1.json`, and `artistic-qr-api.v1.json` diff assertion: empty/pass.
- Live-key/private-key pattern scan: clean.
- Observable-work-loop wrapper smoke tests: short command exited `0`; over-deadline command timed out `124`; timeout child confirmed not alive.

## Browser/export evidence

Playwright report: `.work-loop/evidence/stage2-commerce/playwright-report/`
Screenshots: `.work-loop/evidence/stage2-commerce/browser/screenshots/`
Exports: `.work-loop/evidence/stage2-commerce/browser/exports/`

Artifact checks performed by browser tests:

- PNG signature and exact dimensions;
- SVG structure and dimensions;
- PDF `%PDF-` signature and nontrivial size;
- EPS header, bounding box, binary length, and artwork bytes;
- four PNG bundle dimensions: 512, 1200, 2400, and 3600 pixels;
- print-preview viewport containment on desktop and 390×844 mobile.

Representative SHA-256 values:

- PNG 512: `7ad71506fb697a28313170f60d679b0e9c107420ca64b6b463ac1955a226ebf0`
- SVG 512: `8489c90dd6b7a1d0550f03a8f4fd9ad658c0dcece2c8e4c86e68b920672c0ee0`
- PDF 512: `82be02cc364d8671eefc6e3c0904d96467e361c9fa48b8f2f65e49e9fd4eb800`
- EPS 512: `3b98b2849b3e124730b3df21e326e159bb3207ebbb3cbb46f90a2cda153e1e7e`
- PNG 3600 bundle: `fe310d0ec388d170642279cd48d694942cb731b2837bb0a889fa6313b26827d0`

## Remediation record

The first focused run produced 55/57 web tests passing. Remediation updated the obsolete cancellation expectation to the Stage 2 rule (cancellation leaves prior successful usage untouched) and removed duplicate provider-error alerts. The next full browser run produced 10/12 passing. Remediation then:

1. scoped recovery-code selection to the Purchase region instead of the header project ID; and
2. corrected finished-artwork semantics so one authorized artwork can be downloaded in all formats while a second artwork still requires another entitlement.

The complete full gate then passed with the counts above. A final duplicate-webhook snapshot review tightened replay responses to return current authoritative state; the commerce 13-test suite, commerce lint, commerce build, and `git diff --check` were rerun afterward and all passed.

## Changed implementation surfaces

- `apps/web`: app integration, checkout, candidate accounting, export authorization, recovery UX, store/types, unit/component/accessibility setup, and Playwright coverage/config.
- `services/commerce`: provider adapter, authoritative domain service, offer catalog, types, build/lint config, and integration tests.
- `packages/contracts`: preserved guest-commerce schemas and shared commerce/access error taxonomy.
- `docs/evidence/stage2-guest-commerce-validation.md`: this reproducible evidence report.

No frozen Core/Artistic implementation or API contract was changed.

## Known boundaries

- The payment provider is intentionally mock/test-only. There is no Stripe network call, live charge, production credential, or webhook endpoint deployment in this stage.
- The service uses process-local repositories for this vertical slice. A durable database/HTTP deployment adapter remains an infrastructure concern and was not introduced because the authorized mission excludes deployment and production credentials.
- QR generation remains the accepted Stage 1 simulated integration; scan-validation/repair algorithms remain QR Creator-owned. Commerce never fabricates scan confidence.

## Handoff state

Implementation, remediation, self-validation, evidence, and local review are complete. Final independent acceptance and merge authority remain with QR Product Architect.
