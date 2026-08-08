# QR Studio B31 UX harmony report

**Status:** `READY_FOR_PRODUCT_ARCHITECT_REVIEW`
**Completed:** 2026-08-08T09:44:40Z (before the 2026-08-08T10:27:20Z hard stop)
**Owner:** QR Studio
**Merge owner:** QR Product Architect only

## Contract and custody

- SOW: `docs/program/handoffs/qr-studio-b31-ux-harmony.md`
- SOW SHA-256: `4f7f4648f7a7d9e4cd085904d2a251e2f8768fd19085e0be3ffc3868e371d9b9`
- Exact baseline: `b07d4b1a0e5460be0b2773dd68498d41d38c507b` (`origin/main` verified equal after fetch)
- Target branch: `studio/b31-ux-harmony-screenshots`
- Implementation/evidence commit: `a51cfdb8ba53ede0ca8393ac07edca63ba7bb3e0`
- Work was performed in isolated worktree `/tmp/qr-studio-b31`; the pre-existing Studio checkout and its unrelated untracked files were not modified.
- No PR was opened; no merge or deployment was performed.
- `/home/hermes/ARTISTIC-QR-TEAM-CHARTER.md` and `/home/hermes/NEXT-MISSION.md` were absent on this host at dispatch. The active user-provided B31 SOW was followed without changing any frozen Core/commerce contract.

## Delivered behavior

- One shared indigo top-tab selection recipe for QR Style, Creator Signature, and Destination.
- One lower-panel token for border, background, radius, shadow, and compact padding across all three panels.
- Shared primary selected/inactive/focus recipes for family tabs, QR tiles, signature controls, and destination type chips.
- Cyan constrained to Creator Signature's currently edited line/control-group emphasis; generic selection moved to indigo.
- QR swatch checkmark inset from the selected perimeter; existing horizontal scrollbar clearance retained.
- Destination disabled CTA contrast raised to **6.97:1**; helper and placeholder copy made more readable.
- No state/authority semantics changed: public destination editing remains draft-only; side controls and preview geometry are stable; Creator Signature remains exactly two blank-by-default independently styled lines with no third/CTA default.

## Changed files

- `apps/web/src/components/uiSelectionGrammar.ts`
- `apps/web/src/components/ArtDirectionPanel.tsx`
- `apps/web/src/components/TemplateArtControls.tsx`
- `apps/web/src/components/PayloadInput.tsx`
- `apps/web/e2e/ux-harmony-b31.spec.ts`
- `docs/program/evidence/ux-harmony-b31/studio-audit.md`
- `docs/program/evidence/ux-harmony-b31/visual-review.md`
- `docs/program/evidence/ux-harmony-b31/ux-harmony-metrics.json`
- `docs/program/evidence/ux-harmony-b31/screenshots.sha256`
- Three mobile screenshots and final gate logs in this directory.

No `qr-core`, artistic engine, commerce contract, pricing, checkout, paid-gate, schema, or renderer files changed.

## Gates and real output

| Gate | Command | Result |
|---|---|---|
| Install | `CI=1 npm exec --yes pnpm@9.0.0 -- install --frozen-lockfile` | PASS — lockfile current; 423 packages linked; 2.6s. |
| Dependency builds + focused unit | build `@qr/qr-core`, build `@qr/artistic-qr`, then `pnpm --filter @qr/web test src/App.test.tsx` | PASS — 1 file, **10/10 tests**. Includes shared canvas, exact two-line Signature behavior, public draft-only gate, and accessible style controls. See `focused-unit-final.log`. |
| Web production build | `pnpm --filter @qr/web build` | PASS — TypeScript + Vite, 128 modules, production bundle emitted. See `build-final.log`. |
| Focused changed-file lint | ESLint on the five changed TS/TSX files with `--max-warnings 0` | PASS — zero findings. See `focused-lint-final.log`. |
| B31 browser regression | Node 22 + canonical `pnpm --filter @qr/web test:e2e e2e/ux-harmony-b31.spec.ts` with the repository Playwright config | PASS — **1/1 Chromium test**. See `focused-browser-final.log`. |
| Whitespace | `git diff --check` and staged `git diff --cached --check` | PASS. |
| Visual inspection | Three final 390×844 screenshots plus pixel inspection | PASS — no clipped controls or vertical overflow; intended QR Style carousel edge affordance retained. |

### Browser metrics

`ux-harmony-metrics.json` proves:

- selected-tab computed styles are identical for all three tabs;
- lower-panel computed styles are identical: 12px radius, 1px border, 6px padding, same background/shadow;
- preview zone is unchanged at `{x:21,y:95.5,width:356,height:264}`;
- `scrollHeight === clientHeight === 844` and no vertical scroll is required;
- disabled CTA contrast is 6.974:1;
- zero console or page errors.

## Screenshot evidence

- `qr-style-mobile.png` — SHA-256 `c2cbf93f9ff8c8b41d750fde55834cd4af99dfb3eed40c8774c6cfc956729db1`
- `creator-signature-mobile.png` — SHA-256 `dcd6ceb013020e0264d80e43cdb40087957969352f39c0ae5115762d1ae3f0f4`
- `destination-mobile.png` — SHA-256 `5316e4aa3c7e9edd617e403a5c5846371070d7cd14d991e64b7a83f8c2ccd79c`

## Runner recoveries and known risks

- First focused-unit invocation used an incorrect `npm exec` argument shape; it was superseded by `focused-unit-final.log` after building required workspace packages.
- First Playwright attempt exposed host Node 18 while Playwright requires Node 20+; the final run used ephemeral Node 22.23.2. A second attempt exposed the host's alternate local-library path; the final run set `PLAYWRIGHT_LD_LIBRARY_PATH=$HOME/.cache/ms-playwright/local-libs/root/usr/lib/x86_64-linux-gnu` and passed.
- Repository-wide web lint remains red on a **pre-existing, untouched** `react-hooks/exhaustive-deps` warning in `apps/web/src/components/CreatorSignatureIconConcept.tsx:169` (the script enforces zero warnings). All B31 changed files lint clean. This does not affect the customer-facing B31 route or the passing build/browser gate, but Product Architect may choose to schedule the unrelated cleanup.
- Visual evidence is Chromium at 390×844. No cross-browser matrix was required by this bounded SOW.

## Product Architect next step

Independently inspect the three screenshots and `ux-harmony-metrics.json`, reproduce the final unit/build/browser commands against the branch head, and decide acceptance/merge. QR Studio did not cross PR, merge, or deployment authority.
