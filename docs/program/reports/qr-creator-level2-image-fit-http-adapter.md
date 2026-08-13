# QR Creator — Level 2 Image-Fit HTTP Adapter Report

**SOW:** Add the missing Core HTTP adapter for Level 2 Image-Fit generation.  
**Branch:** `creator/level2-image-fit-http-adapter`  
**Baseline:** `6f0c3306c2f0aa2dde13d8bdf51ca9a3c2cd4594` (origin/main)  
**Date:** 2026-08-13  
**Owner:** QR Creator (Core Engine)

---

## Verdict

**VALIDATED** — All gates pass. The new `POST /image-fit/candidates` route is live, contract-valid, and safely gated.

---

## Summary

Product Architect identified that Studio POSTs to `/api/artistic-qr/image-fit/candidates`, but the production proxy strips `/api/artistic-qr`, so Core receives `/image-fit/candidates`. Core previously only accepted `POST /candidates` and `POST /exports`, so live Level 2 returned 404.

This change adds `POST /image-fit/candidates` to the Core HTTP service, accepting the frozen `image-fit-qr-api.v1` request shape, computing target_luma from controlled fixture paths, returning `image-fit-qr-api.v1` responses, and preserving export authority locked for public preview.

---

## Changed Files

| File | Description |
|------|-------------|
| `packages/artistic-qr/src/http-service.ts` | Added `POST /image-fit/candidates` route, `handleImageFitCandidates()`, `computeTargetLuma()`, `loadPng()`, `generateSlug()`, `sha256()`. Updated `sendServiceError` / `sendErrorJson` to include `'image-fit/candidates'` route. |
| `packages/artistic-qr/src/http-service.test.ts` | Added 6 new tests for the image-fit HTTP route: valid controlled input, missing target image, path traversal, outside controlled paths, short-link slug reservation, and export authority lock. |
| `packages/artistic-qr/fixtures/test-target.png` | Controlled fixture image (4×4 checkerboard) for MVP-safe testing. |
| `docs/program/reports/qr-creator-level2-image-fit-http-adapter.md` | This report. |
| `docs/program/evidence/level2-image-fit-http-adapter/evidence.json` | Live optimizer output evidence. |
| `docs/program/evidence/level2-image-fit-http-adapter/sha256.txt` | Artifact hash manifest. |

---

## Build & Test Gates

### Gate 1: pnpm install — frozen-lockfile

```
Scope: all 8 workspace projects
Lockfile is up to date, resolution step is skipped
Already up to date
Done in 2s
```

**Result:** ✅ PASS

### Gate 2: Build @qr/qr-core

```
> @qr/qr-core@0.1.0 build
> node -e "require('fs').rmSync('dist',{recursive:true,force:true})" && tsc
```

**Result:** ✅ PASS

### Gate 3: Build @qr/artistic-qr

```
> @qr/artistic-qr@0.1.0 build
> node -e "require('fs').rmSync('dist',{recursive:true,force:true})" && tsc
```

**Result:** ✅ PASS

### Gate 4: Test @qr/artistic-qr

```
Test Files  11 passed (11)
     Tests  128 passed (128)
Duration  53.67s
```

**Result:** ✅ PASS (includes 6 new image-fit HTTP tests)

### Gate 5: Schema JSON parse

```
Schema OK
```

**Result:** ✅ PASS

---

## Candidate Metadata

| candidate_id | mode | status | payload_mode | scan | checks | export_allowed | blockers |
|---|---|---|---|---|---|---|---|
| readable-18bf5821e57b09b0eb1f | readable | validated | original_url | pass | 8/8 | false | preview_export_parity_not_proven, preview_not_paid |
| balanced-bd292febbbd0a721c600 | balanced | validated | original_url | pass | 8/8 | false | preview_export_parity_not_proven, preview_not_paid |
| image-first-3360d6fc8367d713c988 | image_first | experimental | original_url | pass | 8/8 | false | preview_export_parity_not_proven, preview_not_paid, image_first_experimental |

---

## Scan Evidence

- **Decoder suite:** jsQR v1.4.0
- **Threshold version:** scan-v1-real-75pct
- **Checks per candidate:** 8 (raw, 0.5×, 2×, blur, noise, contrast, rotation, perspective)
- **Pass threshold:** Raw decode must pass + ≥75% overall
- **Physical/print scan:** `not_performed` (stated explicitly)

---

## Export Authority

All candidates in preview mode have `export_allowed: false` with these blockers:

- `preview_not_paid`
- `preview_export_parity_not_proven`
- `image_first_experimental` (image_first mode only)

`requires_payment_or_internal_entitlement: true` is preserved for all candidates.

---

## Fallback

| Property | Value |
|---|---|
| available | true |
| kind | level1_styled_qr |
| scan_verdict | pass |

---

## Contract Compliance

- **Frozen contract:** `image-fit-qr-api.v1`
- **Schema version:** `image-fit-qr-api.v1` (validated via AJV against frozen schema)
- **No contract changes made**
- **No Studio UI / checkout / accounts / analytics / campaign / custom-domain scope touched**

---

## Limitations

- `target_luma` is computed on-the-fly from controlled fixture paths (`fixtures/`, `docs/program/evidence/`). Unsafe paths are rejected with structured errors.
- No physical-device or print scan was performed.
- `optimized_short_link` mode generates a deterministic reserved slug; no checkout/slug commit occurs.
- Export authority remains locked in preview mode; payment entitlement required for release.

---

## Next Steps

1. **QR Product Architect** to independently reproduce evidence and decide merge.
2. **QR Studio** to consume `POST /image-fit/candidates` once Core is promoted.
3. Consider adding `docs/program/evidence/` to `ALLOWED_FIXTURE_PATHS` if additional fixture images are needed beyond `fixtures/`.

---

## Artifact Hashes

See `docs/program/evidence/level2-image-fit-http-adapter/sha256.txt` for the complete manifest.

---

*Report generated by QR Creator on 2026-08-13.*
