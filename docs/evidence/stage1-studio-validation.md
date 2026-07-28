# Stage 1 Studio validation evidence

- **Role:** QR Studio
- **Branch:** `ws/05-web-studio`
- **Baseline:** `68ff4d6`
- **Completed (UTC):** 2026-07-28T10:07:40Z
- **Scope:** Studio UX, export, accessibility, browser behavior, and tests only. No guest-commerce implementation.

## Outcome

Stage 1 Studio validation and remediation passed. Browser evidence uses an explicitly labeled fixture candidate; it verifies Studio rendering/export behavior and does **not** claim Core Engine scan safety.

## Remediation delivered

- Cancellation clears all scheduled candidate timers, prevents stale completion callbacks, and restores the consumed preview round.
- Refinement now starts a real new candidate round; exhausted allowances remain disabled.
- Print-preview dialog traps focus, closes on Escape, restores invoking focus, announces a semantic title, and fits desktop/mobile viewports.
- Export failures are announced with an accessible alert.
- Validation summaries distinguish Core Engine provenance from fixture/unknown evidence.
- PNG/PDF rendering now waits for candidate artwork and uses deterministic direct-canvas rendering; browser checks reject one-color/blank artifacts.
- SVG export remains vector-wrapped; EPS now embeds the actual rendered RGB artwork as efficient binary PostScript image data and no longer requires Node `Buffer`.
- Temporary high-resolution canvases are released after export.
- Remote Google Fonts dependency was removed to eliminate CORS/export errors and improve offline behavior.
- PDF/EPS code is dynamically loaded; production build has no oversized-chunk warning.
- ESLint and Playwright configurations were added.

## Verification commands

Run from `apps/web`:

```bash
pnpm lint
pnpm test
pnpm build
pnpm test:e2e
```

Observed final results:

- `pnpm lint`: pass, 0 warnings/errors.
- `pnpm test`: 9 files passed, 48 tests passed.
- `pnpm build`: pass; 512 modules transformed; initial app chunk 212.75 kB, lazy export chunk 391.19 kB; no chunk-size warning.
- `pnpm test:e2e`: 8 Chromium tests passed in one worker/process.
- `git diff --check`: pass.

Browser suite covers:

1. generation cancellation and seven-second stale-timer check;
2. refinement starting a new round;
3. exhausted refinement disabled;
4. all four print sizes and physical dimensions;
5. focus trap, Escape, and focus restoration;
6. PNG/SVG/PDF/EPS artifact generation and signatures;
7. four-file PNG bundle with 512/1200/2400/3600 dimensions;
8. sampled pixel diversity (rejects blank one-color PNGs);
9. truthful fixture/unknown validation labeling;
10. mobile 390×844 modal bounds.

## Artifact evidence

Local reproducible evidence:

- `.work-loop/evidence/stage1-studio/exports/`
- `.work-loop/evidence/stage1-studio/screenshots/`
- `.work-loop/evidence/stage1-studio/playwright-report/`
- `.work-loop/evidence/stage1-studio/playwright-results/`

Generated artifact sizes/signatures:

| Artifact | Bytes | Verified signature/dimensions | SHA-256 |
|---|---:|---|---|
| Social EPS | 786,818 | EPSF 3.0; 786,432 embedded RGB bytes; sampled pixels match PNG | `3b98b2849b3e124730b3df21e326e159bb3207ebbb3cbb46f90a2cda153e1e7e` |
| Social PDF | 789,677 | `%PDF-1.3` | `a2279787e68992914b5877a7c3e9adb481ccc8b9a10746b11be73a1c98c2a658` |
| Social PNG | 7,211 | PNG 512×512, >1 sampled color | `7ad71506fb697a28313170f60d679b0e9c107420ca64b6b463ac1955a226ebf0` |
| Social SVG | 851 | `<svg xmlns=...>` | `8489c90dd6b7a1d0550f03a8f4fd9ad658c0dcece2c8e4c86e68b920672c0ee0` |
| Bundle social PNG | 7,211 | PNG 512×512, >1 sampled color | `7ad71506fb697a28313170f60d679b0e9c107420ca64b6b463ac1955a226ebf0` |
| Bundle small PNG | 33,043 | PNG 1200×1200, >1 sampled color | `c7de54988e4c5750483521759588d5e694da5015a80fcd300be9b3760afe5f39` |
| Bundle medium PNG | 119,896 | PNG 2400×2400, >1 sampled color | `6c244349ea88fd7121c793b9d641424e048e8de177ae5768848f15756091406f` |
| Bundle large PNG | 259,170 | PNG 3600×3600, >1 sampled color | `fe310d0ec388d170642279cd48d694942cb731b2837bb0a889fa6313b26827d0` |

Five retained screenshots cover all desktop print sizes and the mobile Large Print modal. Visual inspection confirms candidate artwork is present and unclipped.

## Scope isolation

The out-of-stage commerce object is protected by branch `preserve/stage2-commerce-790ce73` and existing commerce stashes. This Stage 1 commit does not include checkout/services/commerce modules.
