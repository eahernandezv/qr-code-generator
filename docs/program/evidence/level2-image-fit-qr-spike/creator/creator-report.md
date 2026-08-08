# QR Creator Report — Level 2 Image-Fit QR Density/Slug/Mask Spike

**Owner:** QR Creator
**Branch:** `creator/level2-image-fit-qr-spike`
**Base:** `origin/main` at `063c094338735648d9b08479e0e13ce998f43022`
**Experiment:** `level2-image-fit-spike.v1`
**Summary verdict:** **PARTIAL**

## 1. Verdict

The spike **validated the search thesis**: payload length/slug, forced QR version, ECC, mask, and image-integration strength materially change matrix density, measured image fit, and automated decoder viability. Current QR Core can force version, Q/H ECC, and every mask 0–7.

It did **not yet validate a product-ready Image-Fit QR**. At the scan-safe 2% data-module modification level, the contact-sheet codes retain scan performance but the fixture silhouettes are not clearly recognizable at a glance. At the 12% image-first stress level, all 320 generated candidates failed raw jsQR decode and the perturbation gate. The v0 technique therefore establishes a bounded search surface and a hard safety tradeoff, but not yet a visually convincing Balanced/Image-first product artifact.

No physical-device or printed scan was performed. All scan claims below are limited to real `jsQR 1.4.0` decoding through the existing `scan-v1-real-75pct` eight-case perturbation validator.

## 2. Experiment design

### Inputs

Two deterministic local fixtures were created because no approved source images were supplied:

1. `fixtures/bold-diamond.png` — simple, bold geometric mark.
2. `fixtures/medium-fox.png` — medium-complexity mascot mark with ears, face, eye cutouts, and muzzle detail.

Payload classes:

- Original long URL, 172 UTF-8 bytes:
  `https://www.example.com/products/image-fit-qr/creator-collection?utm_source=instagram&utm_medium=social&utm_campaign=summer-launch-2026&variant=balanced&ref=creator-profile`
- `https://q.example/r/a7` — slug `a7`
- `https://q.example/r/logo` — slug `logo`
- `https://q.example/r/pixel9` — slug `pixel9`

Search dimensions:

- forced versions: **7, 10, 15**;
- ECC: **Q, H**;
- masks: **0–7**, all tested;
- fixtures: **2**;
- payloads: **4**;
- treatment: protected data-module perforation;
- strengths:
  - `readable`: modify at most 2% of non-protected modules toward the fixture;
  - `image-first-probe`: modify at most 12%.

Total attempted combinations: **768**.

### Protection and score prototype

The spike preserves finder/separator, timing, format, version, dark, and alignment regions. Because current QR Core does not expose alignment patterns in `FunctionalRegions`, the harness uses a local, version-specific alignment-center table for versions 7, 10, and 15.

For each generated matrix:

1. Rasterize the fixture onto the QR module grid.
2. Score baseline weighted binary agreement between editable QR modules and fixture pixels.
3. Rank mismatching editable modules by fixture-region weight and deterministic SHA-256 tie-break.
4. Flip only the bounded number allowed by strength.
5. Compute post-integration image-fit agreement and gain.
6. Render a black/white PNG with a four-module quiet zone.
7. Run the existing eight-case decoder gate: raw, 0.5×, 2×, light blur, deterministic noise, low contrast, 2° rotation, and mild perspective.

The first-pass image-fit score is a weighted binary module/fixture agreement score, **not a perceptual similarity claim**. The protected-zone conflict score records target disagreement in immutable QR regions; those regions are never modified.

## 3. Results

### Aggregate

| Metric | Result |
|---|---:|
| Total attempts | 768 |
| Generated matrices | 640 |
| Encoding rejections | 128 |
| Automated scan passes | 316 |
| Automated scan failures | 324 |
| Generated versions | 7, 10, 15 |
| Generated ECC levels | Q, H |
| Generated masks | 0–7 |
| Canonical experiment runtime | 312.662 seconds |

Strength split:

| Strength | Generated | Scan pass | Scan fail | Interpretation |
|---|---:|---:|---:|---|
| Readable, 2% | 320 | 316 | 4 | Strong automated decoder survival; limited visible fixture identity |
| Image-first stress, 12% | 320 | 0 | 320 | Unsafe; all failed raw decode and therefore export gate |

ECC split at 2%:

- H: **160/160 passed**.
- Q: **156/160 passed**.

This supports H as the first safe default for this modification technique, while still searching Q for density/fit alternatives.

### Concrete proof: mask changes scan viability

Same fixture, payload, version, ECC, and strength:

- Fixture: `bold-diamond`
- Payload: `https://q.example/r/a7`
- Version: 7 (45 modules)
- ECC: Q
- Strength: readable 2%

| Mask | Image-fit score | Automated scan |
|---:|---:|---|
| 0 | 0.5476 | **PASS, 8/8** |
| 1 | 0.5117 | **FAIL, raw decode failed, 0/8** |
| 3 | 0.5569 | **PASS, 8/8** |

This is direct evidence that mask search cannot be replaced by one default mask when data-module image fitting is applied.

### Concrete proof: mask changes image fit while retaining scan

Same `bold-diamond`, short slug `logo`, version 10, ECC H, readable strength:

- mask 1: image-fit `0.5146`, automated scan pass;
- mask 3: image-fit `0.5509`, automated scan pass.

The mask change improves the score by `0.0363` while both remain decoder-safe in this controlled matrix.

### Concrete proof: payload/slug changes feasible density and fit

The 172-byte original URL was rejected at forced versions 7 and 10:

- Q reported minimum required version 11;
- H reported minimum required version 13.

The three short payloads fit versions 7, 10, and 15 at both Q and H. This allows the optimizer to choose a 45-, 57-, or 77-module grid independently of destination length.

Best automated-scan-passing scores found:

| Fixture | Payload class | Candidate | Fit | Scan |
|---|---|---|---:|---|
| Bold diamond | Original long URL | v15/Q/mask 0 | 0.5532 | 8/8 pass |
| Bold diamond | Short `a7` | v7/H/mask 5 | **0.5572** | 8/8 pass |
| Medium fox | Original long URL | v15/H/mask 2 | 0.5356 | 8/8 pass |
| Medium fox | Short `a7` | v7/H/mask 5 | **0.5497** | 8/8 pass |

The short payload improves the best safe score on both fixtures and unlocks lower-density versions. This does not establish that shorter is universally better; it validates short payload/slug/version as optimizer search variables.

### Visual review

`contact-sheet.png` contains eight selected scan-passing candidates across versions 7, 10, and 15, with fixture thumbnails and intact quiet zones/finder patterns. The matrices are visibly distinct. However, the 2% target modifications do not make the diamond/fox silhouettes clearly recognizable in the QR bodies. That is the main reason for a **PARTIAL**, not VALIDATED, verdict.

## 4. What current QR Core can control

Current Core already supports all required low-level search knobs:

- `QrPayload.errorCorrectionLevel?: 'L' | 'M' | 'Q' | 'H'`;
- `QrPayload.maskPattern?: number`;
- `QrPayload.version?: number`;
- `normalizePayload(...)` forwards version/ECC/mask to `qrcode.create(...)`;
- `generateMatrix(...)` again forces normalized version/ECC/mask;
- returned matrices record actual version, module count, ECC, mask, modules, and functional metadata;
- all masks 0–7, versions 7/10/15, and Q/H were generated in this spike.

There is no blocker to forcing version, ECC, or mask in current QR Core.

## 5. Missing Core capabilities and exact workaround

### Blocking gap: alignment patterns are absent from the functional-region contract

`packages/qr-core/src/types.ts` exposes finder, separators, timing, dark module, format info, and version info, but no alignment patterns. `packages/qr-core/src/patterned-palette.ts:isFunctionalModule(...)` consequently does not classify alignment modules as functional.

**Spike workaround:** `run-spike.mjs` builds a conservative local protected map including alignment centers for versions 7, 10, and 15.

**Smallest requested Core API/contract change:** after Product Architect approval, add:

```ts
alignmentPatterns: Array<{ x: number; y: number; size: number }>
```

to `FunctionalRegions`, populate every non-finder-overlapping 5×5 alignment pattern in `matrix.ts`, and include it in `isFunctionalModule(...)`. Add tests for versions 2, 7, 10, 15, and 40. Image-fit mutation must not ship while it relies on a partial functional mask.

### Capacity error is not structured enough

Forced under-capacity versions throw `PAYLOAD_TOO_LONG` containing an encoder message and minimum version. The optimizer can catch it, but parsing text is brittle.

**Smallest requested API change:** add a structured `VERSION_CAPACITY_EXCEEDED` error carrying requested version, minimum version, ECC, and byte length, or expose `canEncode(payload, version, ecc)`.

### No bounded image-fit search API exists

The artistic engine accepts one normalized matrix configuration and has no image target, mutation budget, image-fit score, or batch search contract. The spike therefore remains a reproducible evidence harness and does not alter frozen contracts.

**Smallest next contract:** Product Architect should freeze an internal optimizer request/result type before production code: payload candidates, allowed versions/ECC/masks, immutable functional mask, image target grid, strength budget, candidate provenance, image score, and existing scan verdict.

## 6. Recommended first product defaults

### Readable

- optimized short payload by default;
- ECC H;
- search all masks 0–7;
- test at least the minimum valid version plus one or two larger forced versions;
- start at a 2% protected data-module modification budget;
- require raw decode plus existing ≥75% perturbation threshold;
- deterministic Level 1 fallback when no candidate passes.

### Balanced

**Not frozen from this spike.** Start from the Readable candidate and perform a bounded adaptive strength search between 2% and the first failing level. Accept only a visually recognizable candidate that still passes the full decoder matrix. The attempted four-strength full matrix exceeded the 600-second command bound before committing evidence, so a narrower staged/binary search is recommended instead of brute-force expansion.

### Image-first

Do not expose/export yet. The 12% probe failed 320/320 generated candidates. Image-first requires a safer rendering treatment—likely protected color/texture composition, contiguous logo-region planning, or codeword-aware damage budgeting—followed by multi-decoder and physical-device evidence.

## 7. Commands and real outputs

Setup and build:

```bash
npx pnpm@9.0.0 install --frozen-lockfile
npx pnpm@9.0.0 --filter @qr/qr-core build
npx pnpm@9.0.0 --filter @qr/artistic-qr build
```

Result: all exited 0.

Canonical bounded experiment:

```bash
set -o pipefail
node docs/program/evidence/level2-image-fit-qr-spike/creator/run-spike.mjs \
  2>&1 | tee docs/program/evidence/level2-image-fit-qr-spike/creator/run-output.log
```

Result: exit 0; 768 attempts, 640 generated, 128 encoding-rejected, 316 scan-pass, 324 scan-fail; runtime 312.662 seconds.

An iterative four-strength expansion was also attempted under the tool's 600-second bound and terminated with:

```text
[Command timed out after 600s]
exit_code=124
```

It did not replace `candidates.json`; the harness was restored to the completed two-strength bounded experiment. No timed-out partial artifact is presented as accepted evidence.

Verification gates:

```bash
npx pnpm@9.0.0 --filter @qr/qr-core test
npx pnpm@9.0.0 --filter @qr/artistic-qr test
node --check docs/program/evidence/level2-image-fit-qr-spike/creator/run-spike.mjs
```

Results:

- QR Core: **21/21 tests passed**.
- Artistic QR TypeScript: **115/115 tests passed**.
- Artistic provider Python: **6/6 tests passed**.
- Harness syntax check: **passed**.
- Independent evidence schema/acceptance checker: **passed** for 768 attempts, 640 generated records, and 8 contact-sheet selections.

No production package or frozen contract file was modified by this spike.

## 8. Evidence

- `candidates.json` — all attempts, settings, scores, decoder verdicts, warnings, and failure reasons.
- `contact-sheet.png` — eight selected scan-passing candidates.
- `contact-sheet-index.json` — cell-to-candidate mapping.
- `fixtures/bold-diamond.png`
- `fixtures/medium-fox.png`
- `selected/*.png` — exact selected candidate rasters.
- `run-spike.mjs` — deterministic harness.
- `run-output.log` — canonical summary.
- `loop-state.json` — observable loop outcomes, including the accepted canonical run and rejected timed-out expansion.
- `sha256.txt` — integrity manifest.

## 9. Risks and next QR Creator tasks

1. Freeze and implement complete functional regions, especially alignment patterns.
2. Replace weighted binary agreement with perceptual/silhouette/edge metrics and objective fixture-recognition review.
3. Add codeword-aware mutation accounting; raw module percentage is too crude.
4. Run a bounded adaptive strength search rather than a full brute-force strength cross product.
5. Add a second independent decoder before export authorization.
6. Run evidenced physical scans on phones and printed sizes before any physical or universal scan claim.
7. Compare non-destructive color/texture treatments against binary module flipping.
8. Keep the Level 1 deterministic fallback mandatory.

## 10. Acceptance mapping

- At least two fixtures: **PASS** — bold diamond and medium fox.
- Long original plus multiple short payloads/slugs: **PASS** — one long and three short.
- At least two versions: **PASS** — 7, 10, 15.
- Q/H ECC: **PASS**.
- All eight masks: **PASS**.
- Concrete payload/slug/mask/version fit or scan change: **PASS** — examples above.
- Physical scan honesty: **PASS** — none performed or claimed.
- Core forcing blocker documented: **PASS** — no forcing blocker; exact functional-mask and capacity gaps documented.
- Product-ready visual image fit: **NOT YET** — reason for **PARTIAL** verdict.
