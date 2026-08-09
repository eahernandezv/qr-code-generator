# QR Studio — Level 2 production Image-Fit UI + short-link report

- **Verdict:** VALIDATED
- **Branch:** `studio/level2-production-image-fit-ui-shortlink`
- **Baseline:** `c5ec76dcd0263a8d5fbbdc26444adf3d3822a607` (`origin/main`)
- **Implementation/evidence commit:** `704e6d3df47d33b6c3ed14a2ab94b50e2ab091e6`
- **SOW SHA-256:** `40c1b32b3c2f070572c43ccfe7990007704ac6d57d214872d358606feb8c4157`
- **Concept route:** `/concepts/level2-image-fit-qr` (still isolated; public Level 1 default unchanged)

## Delivered

1. Added a browser-safe Studio adapter that imports the frozen `image-fit-qr-api.v1` schema and balanced response fixture. UI control values, request defaults, candidate identifiers/settings, scan evidence, authority blockers, and artifact hash now come from the frozen contract pack rather than a second UI field contract.
2. Hardened fixture evidence invalidation. Any target image, destination, treatment, strength, detail, or link-mode change hides the selected artifact, compact evidence, and candidate image; the UI changes to `Not generated yet` / `Evidence invalidated` and requires a new server-authoritative optimizer run.
3. Removed non-contract Readable/Image-first spike artifacts from the production-shaped fixture board. Only the Balanced candidate actually supplied by `valid-balanced-response.v1.json` is presented as fixture-backed evidence.
4. Kept export authority fail-closed: the concept has no Generate, Export, or Create-short-link action; `data-export-payload-bound="false"`; visible copy states preview is unpaid, slug is reserved rather than committed, and server selection, entitlement, commit, and preview/export parity are required.
5. Expanded the Studio-owned resolver lifecycle: atomic reserve-many with optimizer payloads, exactly-one commit, automatic/manual expiry of uncommitted reservations, explicit record-state loading, contract-valid slug syntax, safe HTTPS destination normalization, unknown/disabled/expired/uncommitted failure, and one-hop 302 redirect with no-store headers.
6. Added regressions preventing `Awaiting Creator`, `Confidence: NN%`, production-approved wording, or an export authority action on uncommitted/unpaid candidates.

## Authority and wording proof

- Fixture response has `entitlement_context.export_entitled=false`, reserved short-link state, and `export_authority.export_allowed=false`; Studio preserves those facts.
- No export payload is bound before entitlement/server selection.
- Visible validation language is limited to `8/8 controlled decoder checks` from the fixture.
- UI explicitly states physical-device and print scans were not performed and repeats that controlled checks are not a universal scan guarantee.
- No generic public shortener UI, account, analytics, campaign, custom-domain, Core internals, or frozen contract changes were introduced.

## Short-link resolver proof

`node --test apps/web/scripts/short-link-resolver.test.mjs` passed **4/4** tests:

- reserves three optimizer slugs and returns the exact `https://placeholder-online.com/r/<slug>` payloads;
- accepts the frozen schema/fixture-compatible slug `bD7xQ2`;
- commits exactly one and expires the other project reservations;
- refuses another reservation after project commit;
- manually and time-expires uncommitted reservations;
- blocks unsafe schemes, credentials, private/local targets, unsafe stored targets, and records without an explicit lifecycle state;
- production runtime returns one-hop `302`, exact final `Location`, and `private, no-store, max-age=0` for committed state;
- unknown returns 404 and disabled returns 410 without `Location`.

## Required gates

Canonical log: `docs/program/evidence/level2-production-image-fit-ui-shortlink/final-gates.log`

Terminal markers: `ALL_REQUIRED_GATES_OK`, `PORT_4173_CLOSED`.

| Command | Result |
|---|---|
| `CI=1 npm exec --yes pnpm@9.0.0 -- install --frozen-lockfile` | PASS — lockfile current, install complete |
| `npm exec --yes pnpm@9.0.0 -- --filter @qr/qr-core build` | PASS |
| `npm exec --yes pnpm@9.0.0 -- --filter @qr/artistic-qr build` | PASS |
| `npm exec --yes pnpm@9.0.0 -- --filter @qr/web test` | PASS — 14 files, 128 tests |
| `node --test apps/web/scripts/short-link-resolver.test.mjs` | PASS — 4/4 |
| `npm exec --yes pnpm@9.0.0 -- --filter @qr/web build` | PASS — TypeScript + Vite, 132 modules transformed |
| `npm exec --yes pnpm@9.0.0 -- --filter @qr/web lint` | PASS — zero warnings |
| `PLAYWRIGHT_LD_LIBRARY_PATH=/home/hermes/.cache/ms-playwright/local-libs/root/usr/lib/x86_64-linux-gnu npm exec --yes --package node@20 --package pnpm@9.0.0 -- pnpm --filter @qr/web test:e2e level2-image-fit-spike.spec.ts` | PASS — 1/1 Chromium |
| `git diff --check` | PASS |

The first browser attempt could not launch Chromium because the repository default local-library directory was absent; the host's actual Playwright library bundle is under `local-libs/root/usr/lib/x86_64-linux-gnu`. The exact required Node 20 / pnpm 9 command passed after setting `PLAYWRIGHT_LD_LIBRARY_PATH`; this was a runner-path issue, not a product failure.

## Browser and visual proof

Viewport: 390×844. Evidence:

- `balanced-contract-preview-mobile.png`
- `destination-change-invalidates-evidence-mobile.png`
- `browser-proof.json`
- `sha256.txt`

Mechanical proof:

- document width 390px; horizontal overflow false;
- contract-backed candidate image loaded;
- route remained isolated;
- after destination edit: stale candidate images `0`, selected artifact absent, export payload bound `false`;
- page errors `0`; console errors `0`;
- Playwright server cleanup verified: port 4173 closed.

Final pixel inspection found no clipping or horizontal overflow. The current state visibly identifies fixture-only evidence and export lock. The invalid state hides all candidate/preview artwork and scan-success evidence while preserving the export lock.

## Files changed

- `apps/web/src/imageFitContract.ts`
- `apps/web/src/components/ImageFitQrConcept.tsx`
- `apps/web/src/App.test.tsx`
- `apps/web/e2e/level2-image-fit-spike.spec.ts`
- `apps/web/scripts/short-link-resolver.mjs`
- `apps/web/scripts/short-link-resolver.test.mjs`
- `docs/program/evidence/level2-production-image-fit-ui-shortlink/*`
- `docs/program/reports/qr-studio-level2-production-image-fit-ui-shortlink.md`

## Review remediation

A read-only semantic review identified and Studio remediated before final gates:

- resolver slug syntax drift from the frozen schema;
- implicit committed state for records missing lifecycle state;
- non-contract legacy spike candidates presented beside the one contract fixture candidate;
- candidate/control mismatch risk.

No frozen contract change is requested. Product Architect owns independent reproduction, PR, merge, route promotion, and final production/export decision.
