# QR Studio — Level 2 apex discoverability, no checkout

**Status:** `READY_FOR_PRODUCT_ARCHITECT_REVIEW`

## Contract and revision

- SOW SHA-256: `99af3e16c4e3c8a36df722553936ad3c5b6c5812225cd9436a928e0360f8b851`
- Baseline: `b7292206a2cfdbd2339f5734d40612c2148a96aa` (`origin/main` at execution preflight)
- Branch: `studio/level2-apex-discoverability-no-checkout`
- Implementation/evidence commit: `a24a57a9a06bd151c31bc321441f870344e47ff5`
- Final branch-tip/report commit: recorded by the remote read-back in the external handoff because a tracked report cannot embed the SHA of the commit containing itself.
- Product Architect retains PR, merge, deployment, and acceptance authority. No PR was opened; nothing was merged or deployed.

## Delivered behavior

The default `/` remains the Level 1 Artistic QR Studio. Its header now contains a compact, keyboard-focusable link labeled `Image-Fit QR` / `Level 2 · export locked` whose destination is `/concepts/level2-image-fit-qr`.

The affordance does not claim generation, export, payment, pricing, checkout, or unlock authority. Existing Level 2 fail-closed behavior is unchanged: no Generate button, no Export button, no checkout CTA, `data-export-payload-bound="false"`, and destination edits hide prior fixture evidence.

## Exact changed files

- `apps/web/src/App.tsx`
- `apps/web/src/App.test.tsx`
- `docs/program/evidence/level2-apex-discoverability-no-checkout/apex-entry-mobile-390x844.png`
- `docs/program/evidence/level2-apex-discoverability-no-checkout/browser-proof.json`
- `docs/program/reports/qr-studio-level2-apex-discoverability-no-checkout.md` (this report-only handoff commit)

No commerce, checkout, feature-flag, Core optimizer, or frozen-contract file changed.

## Required gates

All commands ran in SOW order from the isolated target-branch worktree. The Playwright command used `PLAYWRIGHT_LD_LIBRARY_PATH=$HOME/.cache/ms-playwright/local-libs/root/usr/lib/x86_64-linux-gnu` because this host's cached browser libraries are under `local-libs/root`; the command itself remained the mandated package-script invocation.

1. `npm exec --yes pnpm@9.0.0 -- --filter @qr/qr-core build` — **PASS** (`tsc`)
2. `npm exec --yes pnpm@9.0.0 -- --filter @qr/artistic-qr build` — **PASS** (`tsc`)
3. `npm exec --yes pnpm@9.0.0 -- --filter @qr/web test` — **PASS**, 14 files / 129 tests
4. `npm exec --yes pnpm@9.0.0 -- --filter @qr/web build` — **PASS**, 133 modules transformed
5. `npm exec --yes pnpm@9.0.0 -- --filter @qr/web lint` — **PASS**, zero warnings/errors
6. `npm exec --yes --package node@20 --package pnpm@9.0.0 -- pnpm --filter @qr/web test:e2e level2-image-fit-spike.spec.ts` — **PASS**, 1 Playwright test

Focused implementation test after prerequisite package builds: `npm exec --yes pnpm@9.0.0 -- --filter @qr/web test src/App.test.tsx` — **PASS**, 19/19. A preliminary attempt before building workspace package outputs failed at import resolution and was superseded by the required ordered package builds and successful focused/full reruns.

## Browser and mobile evidence

- Screenshot: `docs/program/evidence/level2-apex-discoverability-no-checkout/apex-entry-mobile-390x844.png`
  - SHA-256: `158ef08a894eae8c4e6102ad5ba8db490ff2df554728b1421a02cf5fed0c0014`
- Mechanical proof: `docs/program/evidence/level2-apex-discoverability-no-checkout/browser-proof.json`
  - SHA-256: `94c5651ec501d0f4a9a6d24d50eaa0b19fd1caba75a7a6d09ac5a0262d882e36`

Fresh Chromium proof at 390×844 established:

- apex pathname `/`, Level 1 app present, Level 2 concept absent;
- link `href=/concepts/level2-image-fit-qr` and click navigation succeeds;
- viewport/document widths both 390px; no horizontal overflow;
- no forbidden checkout/payment/pricing/export-unlock action;
- Level 2 has no Generate/Export buttons and no checkout text;
- Level 2 export payload binding remains `false` before and after destination mutation;
- fixture candidate evidence is initially present and absent after destination mutation;
- no page errors or console errors.

The final screenshot was visually inspected: the compact entry point is visible and readable without clipping or overlap, while the Level 1 editor remains the dominant page experience.

## Authority statement

**Checkout flows were not touched, enabled, reprioritized, or tested by a new checkout-specific change. This lane adds no checkout CTA or commerce promise. Level 2 export remains locked and fail-closed; QR Studio has not claimed or created export authority.**
