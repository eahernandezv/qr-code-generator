# QR Creator — Level 2 Production Image-Fit Core Report

- **Reported (UTC):** 2026-08-09T10:55:00Z
- **Authoritative SOW:** `docs/program/handoffs/qr-creator-level2-production-image-fit-core-2026-08-09.md`
- **Verified SOW SHA-256:** `4b6419aeea125d5ff58de3c3b764f58f8e1f744e4d4f989cdef7b15c3cb397e4`
- **Baseline:** `origin/main` at `c5ec76dcd0263a8d5fbbdc26444adf3d3822a607`
- **Branch:** `creator/level2-production-image-fit-core`
- **Implementation/evidence HEAD before this report:** `4ddb3e739af649c5c062349b057919b1100f8c29`
- **Verdict:** **VALIDATED within automated scope; export remains fail-closed**

## Outcome

Implemented the first production-shaped, synchronous Core/optimizer boundary for frozen `image-fit-qr-api.v1` without modifying the frozen contract or Studio/commerce surfaces.

The boundary now:

1. Accepts the frozen request plus an engine-bound, hash-bound grayscale target representation.
2. Enforces exact optimized-route/payload coupling, bounded constraints, and target-source hash binding.
3. Searches deterministic allowed QR version/ECC/mask combinations in Readable, Balanced, and Image-first order.
4. Exposes complete QR functional-region metadata, including ISO alignment-pattern positions, and prevents image-fit recoloring of protected modules.
5. Produces deterministic candidate IDs, SVG bytes, artifact hashes, image-fit metadata, protected-region evidence, and real local jsQR perturbation evidence.
6. Retains a deterministic Level 1 fallback and searches later allowed settings when a preferred setting cannot encode the payload.
7. Fails export closed for failed destination safety, decoder failure, protected-region violations, unproven preview/export parity, missing entitlement, uncommitted short links, and Image-first experimental status.

## Changed files

### Core implementation and tests

- `packages/qr-core/src/functional-regions.ts`
- `packages/qr-core/src/functional-regions.test.ts`
- `packages/qr-core/src/lib/matrix.ts`
- `packages/qr-core/src/types.ts`
- `packages/qr-core/src/index.ts`
- `packages/artistic-qr/src/image-fit.ts`
- `packages/artistic-qr/src/image-fit.test.ts`
- `packages/artistic-qr/src/index.ts`
- `packages/artistic-qr/scripts/generate-image-fit-evidence.mjs`

### Reproducible evidence

- `docs/program/evidence/level2-production-image-fit-core/optimizer-response.json`
- `docs/program/evidence/level2-production-image-fit-core/artifact-index.json`
- `docs/program/evidence/level2-production-image-fit-core/scan-evidence.json`
- `docs/program/evidence/level2-production-image-fit-core/sha256.txt`
- `docs/program/evidence/level2-production-image-fit-core/artifacts/{readable,balanced,image-first,fallback-level1}.svg`
- `docs/program/evidence/level2-production-image-fit-core/visual-preview/{readable,balanced,image-first}.png`
- `docs/program/evidence/level2-production-image-fit-core/visual-inspection.md`

No frozen contract/schema/fixture, Studio UI, commerce, analytics, campaigns, account, or custom-domain file was changed.

## Fixture and generated candidate identities

- **Target fixture:** `docs/program/evidence/level2-image-fit-qr-spike/creator-visual-pass/fixtures/bold-diamond.png`
- **Target SHA-256:** `8cc54ea4a15b165eb5f9092722cff1b89cf47eff86e295fc129beb590df1a49b`
- **Encoded payload SHA-256:** `0b9d3c08679190dc700907affabb5257b049d4cf154027168e366bed74571d7d`

| Mode | Candidate ID | QR settings | Automated scan | Artifact SHA-256 | Export |
|---|---|---|---|---|---|
| Readable | `readable-767dfb22f336e040c704` | v8 / H / mask 3 | 8/8 pass | `23c9c86e554be9ad57ccafb19953064471d5cb14b091112044e6e1f0bd62f440` | blocked |
| Balanced | `balanced-38d1d42054e297be0a9a` | v10 / Q / mask 1 | 8/8 pass | `254746f6e441dc7ed2fe1c43029c825030a3e7a0ec8c9242b33d27d9a8c37b98` | blocked |
| Image-first | `image-first-b3d3125d2689d6d28d88` | v12 / Q / mask 0 | 8/8 pass; experimental | `344d8be0a7304b72c87deafa26dbe4bd400ba670d11fa00530ec83bd2e1ee322` | blocked |
| Level 1 fallback | deterministic fallback | v8 / H / mask 3 | 8/8 pass | `6c3329552f8ec5e5bea4c78d96fe7bfb136ca3b7768d17dfaf6ea72361f25150` | internal fallback only |

All generated candidates report `protected_regions.violations: []`. Preview/export parity is deliberately reported as `not_proven`, which is an export blocker rather than an unsupported claim.

## Exact validation commands and observed outputs

### Scope and contract integrity

```bash
sha256sum docs/program/handoffs/qr-creator-level2-production-image-fit-core-2026-08-09.md
# 4b6419...397e4  docs/program/handoffs/qr-creator-level2-production-image-fit-core-2026-08-09.md

git diff --exit-code origin/main -- \
  packages/contracts/schemas/image-fit-qr-api.v1.json \
  packages/contracts/fixtures/image-fit-qr/valid-balanced-response.v1.json
# exit 0
```

### Required install and syntax gates

```bash
npm exec --yes pnpm@9.0.0 -- install --frozen-lockfile
# Scope: all 8 workspace projects
# Lockfile is up to date; Done in 1.9s

node -e "JSON.parse(require('fs').readFileSync('packages/contracts/schemas/image-fit-qr-api.v1.json','utf8')); JSON.parse(require('fs').readFileSync('packages/contracts/fixtures/image-fit-qr/valid-balanced-response.v1.json','utf8'))"
# exit 0
```

### Core package

```bash
npm exec --yes pnpm@9.0.0 -- --filter @qr/qr-core build
# exit 0

npm exec --yes pnpm@9.0.0 -- --filter @qr/qr-core test
# Test Files 5 passed (5)
# Tests 24 passed (24)
```

### Artistic/Core optimizer package

```bash
npm exec --yes pnpm@9.0.0 -- --filter @qr/artistic-qr build
# exit 0

npm exec --yes pnpm@9.0.0 -- --filter @qr/artistic-qr test
# Test Files 11 passed (11)
# Tests 121 passed (121)
# Python provider tests: Ran 6 tests; OK
```

Focused post-remediation run:

```bash
npm exec --yes pnpm@9.0.0 -- --filter @qr/artistic-qr exec vitest run src/image-fit.test.ts
# Test Files 1 passed (1)
# Tests 6 passed (6)
```

### Evidence reproduction and frozen-schema validation

```bash
node packages/artistic-qr/scripts/generate-image-fit-evidence.mjs
# Produced Readable, Balanced, Image-first, and fallback artifacts/evidence.

(cd docs/program/evidence/level2-production-image-fit-core && sha256sum -c sha256.txt)
# readable/balanced/image-first SVG: OK
# readable/balanced/image-first PNG: OK
# fallback SVG and JSON evidence files: OK
```

The generated `optimizer-response.json` was compiled with Ajv against the frozen schema from the `@qr/artistic-qr` package context:

```text
CONTRACT_VALID
```

Independent decode of each rasterized preview with jsQR 1.4.0 returned the exact expected payload:

```text
readable: PNG_DECODE_PASS https://placeholder-online.com/r/bD7xQ2
balanced: PNG_DECODE_PASS https://placeholder-online.com/r/bD7xQ2
image-first: PNG_DECODE_PASS https://placeholder-online.com/r/bD7xQ2
```

`git diff --check` returned exit 0.

## Remediation history

- Corrected QR alignment-pattern spacing/order expectations and added explicit functional-region protection.
- Removed metadata-only synthetic image substitution; production input now requires a bounded grayscale target bound to the declared target-image SHA-256.
- Corrected failed Image-first status from `experimental` to `failed` when scan validation fails.
- Added protected-region violations to explicit export blockers.
- Replaced single-setting fallback generation with deterministic search through the caller-bounded allowed settings.
- Removed the unsupported preview/export parity claim; parity is `not_proven` and therefore blocks export.
- Added real raster previews, qualitative inspection notes, hashes, and exact PNG decoding checks.

## Truthful evidence limits and residual risks

1. Automated evidence uses **jsQR 1.4.0** only. This is real decoder evidence, not a universal scan guarantee.
2. Perturbation coverage is the existing `scan-v1-real-75pct` suite (8 checks per artifact); it is not a multi-decoder farm.
3. **Physical-device scan:** not performed.
4. **Printed scan:** not performed.
5. **Preview/export parity:** not proven in this boundary; export is fail-closed with `preview_export_parity_not_proven`.
6. Image-first remains experimental and export-blocked.
7. No live optimized-link reservation/commit service was exercised; evidence uses the frozen fixture's reserved placeholder route.
8. The optimizer is synchronous and bounded by request constraints, but a single in-process decoder invocation is not preemptively cancellable mid-call.

## Handoff

Product Architect can reproduce from branch `creator/level2-production-image-fit-core` at implementation/evidence commit `4ddb3e739af649c5c062349b057919b1100f8c29`, then include this report commit from branch HEAD. Product Architect retains independent verification, PR, merge, and release acceptance authority.
