# Q9 Logo Size Control Integration

Status: **accepted for merge candidate**

## Product rule

Q9 Image-Fit exposes a real Core-backed **Logo size** control:

- Small = 40% of QR field width
- Medium = 50% of QR field width, default
- Large = 60% of QR field width

The control changes deterministic Core output bytes for Q9 Image-Fit. It is not a CSS-only preview scale.

## Scope

Included:

- `image-fit-qr-api.v1` optional `user_controls.logo_size` extension for backward-compatible requests.
- Core default fallback to `medium` if older callers omit `logo_size`.
- Q9 renderer logo/image island sizing at 40/50/60 for Balanced.
- Studio removes no-op Treatment, Detail, and pre-generation Image-Fit strength controls.
- Studio keeps candidate cards for Mellow/Balanced/Punchy after generation.
- Studio sends `logo_size` in real generation requests.
- Export remains denied unless Core/payment/short-link/scan/parity gates pass.

Deferred:

- QR Style / Creator Signature color layering for Image-Fit. The future requirement remains: preserve uploaded image/logo colours and recolor only non-image QR pixels/layers.
- Physical phone/print QA.

## Evidence

Live production-runtime proof:

- `docs/program/evidence/q9-logo-size-integration-live/proof.json`
- `docs/program/evidence/q9-logo-size-integration-live/large-logo-size-live.png`

Observed large-logo live proof:

- request submitted `user_controls.logo_size = large`
- no no-op Treatment/Detail/pre-generation strength controls visible
- selected Balanced candidate: pass, 8/8 controlled checks, 97% fit
- export blockers visible: `preview_export_parity_not_proven`, `preview_not_paid`, `short_link_not_committed`
- console errors: none
- page errors: none

## Validation

Passed:

- `npm exec --yes pnpm@9.0.0 -- --filter @qr/qr-core build`
- `npm exec --yes pnpm@9.0.0 -- --filter @qr/artistic-qr build`
- `npm exec --yes pnpm@9.0.0 -- --filter @qr/artistic-qr exec vitest run src/image-fit.test.ts -t 'logo-size ladder' --pool=threads --poolOptions.threads.singleThread`
- `npm exec --yes pnpm@9.0.0 -- --filter @qr/artistic-qr exec vitest run src/contracts.test.ts src/http-service.test.ts --pool=threads --poolOptions.threads.singleThread`
  - tests passed; Vitest reported a known worker close timeout after completion for the http-service/contracts run.
- `(cd packages/artistic-qr && python3 -m unittest discover -s provider -p 'test_*.py')`
- `npm exec --yes pnpm@9.0.0 -- --filter @qr/web test`
- `npm exec --yes pnpm@9.0.0 -- --filter @qr/web build`
- `playwright test e2e/level2-image-fit-spike.spec.ts --config=playwright.config.ts`
- live Playwright proof script `apps/web/scripts/q9-logo-size-live-proof.mjs`
- `git diff --check`
