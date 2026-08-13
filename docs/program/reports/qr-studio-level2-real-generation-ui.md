# QR Studio — Level 2 Real Generation UI

Verdict: **PARTIAL / BLOCKED on Creator runtime dependency**

- Baseline: `origin/main` `95849018d75c01a8a76343728905d6e4ed34aa32`
- Branch: `studio/level2-real-generation-ui`
- Implementation/evidence commit: `397139f` (`Add fail-closed Level 2 generation UI`)
- Creator dependency: no remote `creator/level2-real-generation-core` branch or merged Level 2 generation endpoint was available during implementation. Studio therefore binds to the same-origin contract endpoint `/api/artistic-qr/image-fit/candidates`, validates request-bound responses, and fails closed without fixture substitution.

## Delivered

- Visible **Generate candidates** action, disabled only for invalid/missing required input or while running.
- Frozen-contract-shaped request mapping for destination, image metadata, user controls, bounded constraints, and preview-only/no-export entitlement.
- Same-origin Creator request/response boundary; no local fixture toggle or production success stub.
- Request-ID binding and structural candidate checks before evidence is accepted.
- Candidate cards/preview display truthful status, scan counts/version, payload mode/display, QR version/module count/ECC/mask, image-fit label, warnings, and artifact SHA-256.
- Destination/image/treatment/strength/detail/link-mode changes abort an active request and remove all prior candidate evidence.
- Loading, cancellation, invalid input, invalid response, service outage, and retryable fail-closed presentation.
- Five-step public test instructions and 390×844 mobile QA.

## Gates

1. `CI=1 npm exec --yes pnpm@9.0.0 -- install --frozen-lockfile` — PASS; 423 packages, 4.3s.
2. `npm exec --yes pnpm@9.0.0 -- --filter @qr/web test` — PASS; **15 files / 133 tests**.
3. `node --test apps/web/scripts/short-link-resolver.test.mjs` — PASS; **4/4 tests**.
4. `npm exec --yes pnpm@9.0.0 -- --filter @qr/web build` — PASS; TypeScript + Vite, **134 modules**.
5. `npm exec --yes pnpm@9.0.0 -- --filter @qr/web lint` — PASS; zero warnings/errors.
6. `PLAYWRIGHT_LD_LIBRARY_PATH=/home/hermes/.cache/ms-playwright/local-libs/root/usr/lib/x86_64-linux-gnu npm exec --yes --package node@20 --package pnpm@9.0.0 -- pnpm --filter @qr/web test:e2e level2-image-fit-spike.spec.ts` — PASS; **1/1 browser test**, 4.2s. The explicit library path corrects this host's Playwright cache layout; the literal SOW command initially could not load `libnspr4.so`.
7. `git diff --check` / staged diff check — PASS.

## Browser/mobile and fail-closed proof

Evidence directory: `docs/program/evidence/level2-real-generation-ui/`

- `mobile-ready-to-generate.png` — initial real-generation shell at 390×844.
- `mobile-creator-response-bound.png` — contract response bound to a rendered Creator artifact; validated Balanced evidence visible.
- `mobile-creator-unavailable-fail-closed.png` — aborted endpoint yields explicit fail-closed error and zero candidate cards/artifacts.
- `browser-proof.json` — request body, viewport 390×844, document width 390, no horizontal overflow, `data-export-payload-bound=false`, `data-checkout-bound=false`, zero stale candidate images after outage, zero page errors. The single expected browser console network error is recorded from the intentionally aborted failure-path request.
- Visual inspection confirmed the final QR preview and thumbnail load, text/controls do not overlap or clip, and the Export/Checkout lock remains prominent.

## Short-link resolver proof

Resolver implementation was **not touched**. Existing web-owned resolver proof was rerun: 4/4 passing for reserve-many payload exposure, exactly-one commit, expiry, unknown/disabled no-redirect behavior, unsafe-target rejection, and a live 302 committed redirect.

## Scope and authority confirmation

- **Export and Checkout remain locked.** The route keeps `data-export-payload-bound="false"` and `data-checkout-bound="false"`; there is no Export, Checkout, or Create-short-link CTA and browser state cannot commit a slug or authorize export.
- No `packages/qr-core/**` or `packages/artistic-qr/**` internals were changed.
- No checkout/payment, accounts, analytics, campaigns, custom-domain, generic-shortener, contract, deployment, or Core optimizer scope was changed.
- No PR was opened or merged. Product Architect retains PR, merge, deployment, and acceptance authority.

## Changed files

- `apps/web/src/components/ImageFitQrConcept.tsx`
- `apps/web/src/lib/imageFitGenerationClient.ts`
- `apps/web/src/lib/imageFitGenerationClient.test.ts`
- `apps/web/src/App.test.tsx`
- `apps/web/e2e/level2-image-fit-spike.spec.ts`
- `docs/program/evidence/level2-real-generation-ui/browser-proof.json`
- `docs/program/evidence/level2-real-generation-ui/mobile-ready-to-generate.png`
- `docs/program/evidence/level2-real-generation-ui/mobile-creator-response-bound.png`
- `docs/program/evidence/level2-real-generation-ui/mobile-creator-unavailable-fail-closed.png`

## Product Architect decision needed

Integrate or expose Creator's real Level 2 endpoint at `/api/artistic-qr/image-fit/candidates` (or provide an explicit additive endpoint mapping), then rerun this exact browser path against an actual Creator-generated Readable/Balanced/Image-first response. Until that dependency exists, this is a tested fail-closed consumer shell, not a claim that real generation is available end to end.
