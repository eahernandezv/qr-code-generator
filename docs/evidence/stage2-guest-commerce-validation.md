# Stage 2 Guest-Commerce Remediation Cycle 1 — Validation Evidence

**Owner:** QR Studio
**Handoff target:** QR Product Architect
**Rejected baseline:** `ws/05-web-studio` at `8a490d8`
**Scope:** Product Architect blockers D1–D4 only; no live charge, production credential, deployment, Core/Artistic API change, or main merge.

## Remediation mapping

### D1 — Test controls excluded from launch path

- `CheckoutPanel` renders mock completion/failure/cancel controls only when `COMMERCE_TEST_MODE` is true.
- `COMMERCE_TEST_MODE` requires both Vite development mode and `VITE_COMMERCE_TEST_MODE=true`; a production build cannot enable it.
- Non-test UI exposes only `Check payment status`, which reads authoritative state.
- `apps/web/scripts/assert-production-commerce.mjs` inspects built JavaScript and rejects `Complete test payment`, `Simulate failure`, `grantPaidAccess`, or `__QR_COMMERCE_TEST__`; it also requires the `/api/commerce` HTTP boundary.
- Production-path Chromium test confirms all mock controls are absent.

### D2 — HTTP/service authority

- Added the `CommerceClient` interface and `HttpGuestCommerceClient`; non-test Studio mode selects the HTTP adapter.
- Access capability remains in adapter memory only and is sent as an Authorization header. It is not sourced from Zustand/localStorage.
- Added a local `@qr/commerce` HTTP server exposing checkout status, generation accounting, export authorization, and recovery.
- The HTTP client fails closed on network/API errors; no round/export unlock occurs.
- Production-path Chromium starts the actual local commerce server and makes real HTTP requests. Adversarial localStorage entitlement inflation receives HTTP `403` for both generation and export.

### D3 — Trusted raw-webhook verification

- Removed `PaymentEvent.verified` and the public `processPaymentEvent` mutation API.
- `CheckoutProvider.verifyWebhook(rawPayload, signature)` owns signature verification.
- `CommerceService.processPaymentWebhook` accepts raw payload plus signature and applies only the provider-verified domain event.
- `MockCheckoutProvider` uses HMAC-SHA256 and constant-time signature comparison; this is local-test-only and performs no provider network call.
- Tests cover valid signature, invalid signature, payload modification after signing, duplicate event, late failure after success, and success after earlier failed/canceled delivery.

### D4 — Durable restart/recovery boundary

- Added `CommerceRepository`, `MemoryCommerceRepository`, and atomic `JsonFileCommerceRepository`.
- Sessions, idempotency records, processed events, hashed access/recovery records, entitlements, successful-round operations, export operations, granted checkout IDs, and finished candidate identities persist after each mutation.
- Restart/re-instantiation tests prove purchase state, event deduplication, allowance, authorized artwork identity, recovery rotation/replay denial, and recovery expiry survive.
- Persisted records contain only `sha256:` capability hashes. Tests explicitly reject all issued raw access/recovery capabilities in the JSON store.

## Adversarial evidence

Production HTTP Chromium (`apps/web/e2e/commerce-production.spec.ts`): **3/3 passed**.

1. Checkout POST is observed at `http://127.0.0.1:4174/api/commerce/checkouts`; mock controls are absent; externally delivered mock-signed webhook is visible only after an HTTP status read.
2. A forged paid Zustand/localStorage project cannot authorize a finished export (`403`) or successful generation round (`403`).
3. Aborting the commerce API leaves paid access locked and presents a service-unavailable error.

Durable/signature commerce suite (`services/commerce/src/service.test.ts`): **15/15 passed**, including valid/invalid/modified signature, duplicate/reordered event, restart, hash-only persistence, replay, expiry, allowance, and artwork-identity assertions.

Representative persisted-record inspection: `.work-loop/evidence/stage2-remediation-cycle1/http-commerce-state.json` contains hashed access/recovery keys and no raw capability fields.

## Final bounded gate

- Worker: `stage2-remediation-full-gate-2`
- State: `.work-loop/active-worker-remediation.json`
- Durable log: `.work-loop/logs/stage2-remediation-final-gate.log`
- Hard deadline: `run_bounded_worker.py --timeout-seconds 1800`
- Process outcome: `exited`, exit `0`

Executed commands/results:

```text
pnpm --filter @qr/commerce test                 15/15 passed
pnpm --filter @qr/commerce lint                 pass, zero warnings
pnpm --filter @qr/commerce build                pass
pnpm --filter @qr/web test                      57/57 passed
pnpm --filter @qr/web lint                      pass, zero warnings
VITE_COMMERCE_TEST_MODE=true ... web build      pass, Vite 6.4.3 / 347 modules
pnpm --filter @qr/web assert:production-commerce pass; 5 JS assets inspected
pnpm --filter @qr/web test:e2e                  12/12 Chromium passed
pnpm --filter @qr/web test:e2e:production-commerce 3/3 Chromium passed
pnpm audit --audit-level high                   no known vulnerabilities
secret pattern scan                             clean
frozen Core/Artistic diff assertion             empty
git diff --check                                pass
```

Dependency audit remediation pins patched transitive tooling through root pnpm overrides (`vite 6.4.3`, `vitest 3.2.6`, `happy-dom 20.8.9`, `esbuild 0.25.0`, `brace-expansion 5.0.8`). The application and commerce package tests, builds, lint, and both browser suites passed after this update.

Observable-loop wrapper smoke proof remains separate from artifact acceptance: short worker exited `0`; over-deadline worker retained `timed_out` with exit `124`; timeout child was not alive.

## Changed surfaces

- `services/commerce`: provider signature boundary, repository boundary and durable JSON adapter, service hydration/persistence, HTTP server/CLI, adversarial/restart tests.
- `apps/web`: commerce-client interface and HTTP adapter, production-safe checkout UI, production bundle assertion, production HTTP Chromium config/spec.
- root/package lock: audit remediations only.

No frozen `packages/qr-core`, `packages/artistic-qr`, `qr-core-api.v1.json`, or `artistic-qr-api.v1.json` path changed.

## Handoff state

QR Studio remediation implementation and self-validation are complete. This evidence does **not** self-accept Stage 2; QR Product Architect retains independent acceptance and merge authority.
