# QR Creator — Level 2 Real Generation Core Report

Owner: QR Creator (@QRCodeGenerator_CreatorBot)<br>
Date: 2026-08-12<br>
Branch: `creator/level2-real-generation-core`<br>
Baseline: `origin/main 95849018d75c01a8a76343728905d6e4ed34aa32`

---

## Verdict: **VALIDATED**

---

## Scope confirmation

- **Touched**: `packages/artistic-qr/scripts/generate-real-evidence.mjs` (evidence generation script)
- **Touched**: `docs/program/evidence/level2-real-generation-core/` (new evidence directory with artifacts)
- **Touched**: `docs/program/reports/qr-creator-level2-real-generation-core.md` (this report)
- **Did NOT touch**: `apps/web/**`, checkout, payment, accounts, analytics, campaigns, custom domains, or frozen contracts
- No PR opened or merged.

---

## Required gates — all passed

### Gate 1: `pnpm install --frozen-lockfile`
```
Lockfile is up to date, resolution step is skipped
Already up to date
Done in 2.1s
```

### Gate 2: `pnpm --filter @qr/qr-core build`
```
> @qr/qr-core@0.1.0 build
> node -e "require('fs').rmSync('dist',{recursive:true,force:true})" && tsc
✅ Success
```

### Gate 3: `pnpm --filter @qr/artistic-qr build`
```
> @qr/artistic-qr@0.1.0 build
> node -e "require('fs').rmSync('dist',{recursive:true,force:true})" && tsc
✅ Success
```

### Gate 4: `pnpm --filter @qr/qr-core test`
```
 RUN  v3.2.6 /home/hermes/QR-Code-Generator/packages/qr-core
 ✓ src/qr-core.test.ts (7 tests) 326ms
 ✓ src/corner-color.test.ts (2 tests) 362ms
 ✓ src/browser.test.ts (2 tests) 64ms
 ✓ src/functional-regions.test.ts (3 tests) 26ms
 ✓ src/style-primitives.test.ts (10 tests) 4919ms
 Test Files  5 passed (5)
      Tests  24 passed (24)
```

### Gate 5: `pnpm --filter @qr/artistic-qr test`
```
 Test Files  11 passed (11)
      Tests  122 passed (122)
      + 6 Python provider tests (OK)
```

### Gate 6: Schema JSON parse
```
Schema parse OK
```

---

## Evidence summary

### Fixture used
- **Path**: `docs/program/evidence/level2-image-fit-qr-spike/creator-visual-pass/fixtures/bold-diamond.png`
- **SHA-256**: `8cc54ea4a15b165eb5f9092722cff1b89cf47eff86e295fc129beb590df1a49b`
- **Dimensions**: 128×128 px, RGBA
- **Classification**: `simple_mark` (per contract fixture)

### Payload comparison: original URL vs optimized short link

| Mode | Original URL | Optimized Short Link | Savings |
|------|--------------|----------------------|---------|
| Bytes | 66 | 39 | **27 bytes (40.9%)** |

Both modes produce valid candidates, but the short link saves 40.9% payload bytes, enabling smaller QR versions and better image-fit.

### Candidate results (optimized short link mode)

| Mode | Status | Version | ECC | Mask | Modules | Scan | Fit Label | Recognition | Modified |
|------|--------|---------|-----|------|---------|------|-----------|-------------|----------|
| **Readable** | validated | 8 | H | 3 | 49 | **pass** | readable | 0.449775 | 12.5% |
| **Balanced** | validated | 10 | Q | 1 | 57 | **pass** | balanced | 0.914063 | 25.2% |
| **Image-first** | experimental | 12 | Q | 0 | 65 | **pass** | experimental | 0.947415 | 25.2% |

### Candidate artifact hashes

| Candidate | SHA-256 (artifact) | Size |
|-----------|-------------------|------|
| readable-94f37b04844d1272c07b | `23c9c86e554be9ad57ccafb19953064471d5cb14b091112044e6e1f0bd62f440` | 90,692 bytes |
| balanced-69ed8be61ed41307ef3a | `254746f6e441dc7ed2fe1c43029c825030a3e7a0ec8c9242b33d27d9a8c37b98` | 118,956 bytes |
| image-first-f58ce0081e316e658a9f | `344d8be0a7304b72c87deafa26dbe4bd400ba670d11fa00530ec83bd2e1ee322` | 158,331 bytes |
| fallback | `f453ef42520daa427212ce61b4b697f2ba6177652ea7004aa1734a4a3f8a2e7b` | 68,458 bytes |

### Evidence files SHA-256 manifest
```
db7be48dab3d329b1342d4ab4d293a74107a38f0dd70c3393cf55e0d73c727dd  evidence.json
f453ef42520daa427212ce61b4b697f2ba6177652ea7004aa1734a4a3f8a2e7b  fallback.svg
23c9c86e554be9ad57ccafb19953064471d5cb14b091112044e6e1f0bd62f440  readable-94f37b04844d1272c07b.svg
254746f6e441dc7ed2fe1c43029c825030a3e7a0ec8c9242b33d27d9a8c37b98  balanced-69ed8be61ed41307ef3a.svg
344d8be0a7304b72c87deafa26dbe4bd400ba670d11fa00530ec83bd2e1ee322  image-first-f58ce0081e316e658a9f.svg
```

---

## Scan evidence and decoder suite

- **Primary decoder**: `jsQR` v1.4.0
- **Decoder suite version**: `scan-v1-real-75pct`
- **Checks performed**: 8 per candidate
  1. `decode_raw` (scale 1×)
  2. `decode_0.5x`
  3. `decode_2x`
  4. `blur_light`
  5. `noise_light`
  6. `contrast_low`
  7. `rotation_2deg`
  8. `perspective_mild`
- **All candidates**: 8/8 checks passed (100%)
- **Pass rate threshold**: ≥75% (raw decode must pass + overall ≥75%)

---

## Physical / print status

- **Physical scan**: `not_performed` — explicitly stated for every candidate
- **Print scan**: `not_performed` — explicitly stated for every candidate
- **Disclaimer**: "Controlled decoder checks are not a universal scan guarantee. No physical-device or print scan was performed."
- This satisfies the contract requirement for honest disclosure and avoids forbidden universal-guarantee wording.

---

## Functional-region protection

- **Protected regions**: quiet zone, finder patterns, separators, timing patterns, alignment patterns, format information, version information (when applicable), dark module
- **Alignment patterns**: ISO/IEC 18004 centers computed for every version; alignment boxes excluded from finder overlap
- **Immutable modules policy version**: `qr-functional-regions-v2-alignment`
- **Violations**: `[]` (zero violations for all candidates)
- The `isProtectedFunctionalModule` function in `packages/qr-core/src/functional-regions.ts` is already contract-compliant and covers all required regions.

---

## Deterministic fallback

- **Fallback kind**: `level1_styled_qr`
- **Fallback available**: `true`
- **Fallback scan verdict**: `pass`
- **Fallback artifact**: 68,458-byte SVG, deterministic render using `renderDeterministic` with `colorDark: #111827`, `colorLight: #ffffff`
- **Fallback behavior**: Triggered automatically if no image-fit candidate passes scan gates; produces a plain styled QR encoding the same payload.

---

## Export authority

All candidates have `export_allowed: false` with blockers:
1. `preview_export_parity_not_proven`
2. `preview_not_paid`
3. `short_link_not_committed` (optimized mode)
4. `image_first_experimental` (image-first mode only)

This satisfies the contract: export remains locked until a later entitlement/export-parity wave.

---

## Limitations and notes

1. **Physical/print scan**: Not performed; evidence is purely automated decoder-based.
2. **Image-fit scoring**: Uses pixel-level luma thresholding (dark≤64, light≥218) and silhouette overlap. A more sophisticated perceptual/image-similarity metric is deferred.
3. **Short-link reservation**: Slugs are reserved but not committed; Studio owns the commit lifecycle.
4. **Preview/export parity**: Marked `not_proven` in this wave; requires Studio integration + artifact comparison.
5. **Provider generative path**: Not used here; this wave uses the deterministic image-fit renderer.
6. **No contract changes made**: The frozen contracts in `packages/contracts/schemas/` and `docs/architecture/contracts/` were consumed but not modified.

---

## Changed files

| Path | Action |
|------|--------|
| `packages/artistic-qr/scripts/generate-real-evidence.mjs` | Added — evidence generation script |
| `docs/program/evidence/level2-real-generation-core/evidence.json` | Added — candidate metadata |
| `docs/program/evidence/level2-real-generation-core/payload-comparison.json` | Added — original vs short-link comparison |
| `docs/program/evidence/level2-real-generation-core/sha256.txt` | Added — artifact hash manifest |
| `docs/program/evidence/level2-real-generation-core/artifacts/readable-*.svg` | Added — Readable candidate artifact |
| `docs/program/evidence/level2-real-generation-core/artifacts/balanced-*.svg` | Added — Balanced candidate artifact |
| `docs/program/evidence/level2-real-generation-core/artifacts/image-first-*.svg` | Added — Image-first candidate artifact |
| `docs/program/evidence/level2-real-generation-core/artifacts/fallback.svg` | Added — Deterministic fallback artifact |
| `docs/program/reports/qr-creator-level2-real-generation-core.md` | Added — this report |

---

## Confirmation

- ✅ No Studio UI code touched
- ✅ No checkout/payment/accounts/analytics/campaign/custom-domain scope touched
- ✅ No frozen contracts modified
- ✅ No PR opened or merged
- ✅ All required gates passed
- ✅ Real generation with actual image fixture produces contract-valid candidates
- ✅ Deterministic fallback verified and scan-passing
- ✅ All artifact hashes recorded
- ✅ Physical/print status explicitly stated as not performed

---

*Report produced by QR Creator. Product Architect owns PR, merge, deployment, and final acceptance.*
