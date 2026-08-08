# QR Creator Report — Level 2 Image-Fit Visual-Recognition Pass

**Owner:** QR Creator
**Branch:** `creator/level2-image-fit-visual-recognition-pass`
**Base:** prior Creator spike commit `0d2dd05ba27b14e78fe7b95c43dfeddf664fd122`
**Experiment:** `level2-image-fit-visual-pass.v1`
**Verdict:** **VALIDATED FOR SPIKE / NOT PRODUCTION EXPORT**

## 1. Verdict

This pass meets the visual-recognition spike acceptance criteria. The simple diamond target is visibly recognizable inside scan-safe QR candidates at contact-sheet/mobile scale. The strongest treatments are:

1. **background silhouette** — a gold diamond remains legible underneath the dark QR modules;
2. **module recolor** — a rust-colored diamond is visibly reconstructed from dark data modules.

Both selected candidates passed the existing real `jsQR 1.4.0` eight-case `scan-v1-real-75pct` validation matrix. The central binary logo-pixel treatment was also tested and passed for the selected diamond candidate, but its automated recognition metric overstates its human-perceived quality: it reads more like a dense central block than the cleaner colored diamond treatments.

This is automated and visual spike evidence only. **No physical-device or printed scan was performed or claimed.** No candidate is authorized for production export by this report.

## 2. Scope and SOW status

The requested SOW path was checked after fetching `origin/main` at `063c094338735648d9b08479e0e13ce998f43022`:

`docs/program/handoffs/qr-creator-level2-image-fit-visual-recognition-pass-2026-08-08.md`

It was not present, so the supplied SHA-256 `f96d192dd1d20f9288bac2944d0d5f03851c8056780b246a43f0973798f6f2e7` could not be independently verified against a repository file. The experiment followed the complete scope supplied directly in the activation message.

## 3. Experiment design

### Inputs and search dimensions

- Payload: `https://q.example/r/a7` — 22 UTF-8 bytes.
- Fixtures:
  - `fixtures/bold-diamond.png` — simple-logo target;
  - `fixtures/medium-fox.png` — medium-complexity target.
- Versions: **7 and 10**.
- Module counts: **45 and 57**.
- ECC: **Q and H**.
- Masks: **all 0–7**.
- Requested mutation budgets: **2%, 4%, 6%, 8%**.
- Treatments:
  1. `central-logo-pixel`;
  2. `background-silhouette`;
  3. `module-recolor`.
- Total candidates: **768**.
- Canonical runtime: **332.813 seconds**.

All candidates preserve finder/separator, timing, format, version, dark-module, and alignment regions. Alignment patterns remain protected by a local version-specific table because current QR Core does not expose them in `FunctionalRegions`.

### Treatment definitions

#### Central logo-pixel

Editable light modules at target-dark cells in the centered fixture are changed to dark, up to the requested budget. Existing dark modules are retained. This is a real binary module mutation and carries the greatest decoding risk.

#### Background silhouette

Only editable light target cells receive a pale-gold background tint. Matrix bits are not flipped. The budget limits the number of treated editable cells.

#### Module recolor

Only editable dark modules that intersect the target are recolored rust while remaining dark enough for binarization. Matrix bits are not flipped. The budget limits the number of recolored modules.

The requested budget is a ceiling. `modifiedModules` and `actualModifiedFraction` record the realized treatment, which can be lower when the centered target has fewer eligible cells.

## 4. Aggregate scan results

| Metric | Result |
|---|---:|
| Candidates | 768 |
| Automated scan passes | 760 |
| Automated scan failures | 8 |
| Selected contact-sheet candidates | 6 |

### By treatment

| Treatment | Pass | Fail |
|---|---:|---:|
| Central logo-pixel | 248 | 8 |
| Background silhouette | 256 | 0 |
| Module recolor | 256 | 0 |

### By requested budget

| Budget | Pass | Fail |
|---:|---:|---:|
| 2% | 192 | 0 |
| 4% | 192 | 0 |
| 6% | 189 | 3 |
| 8% | 187 | 5 |

All eight failures were medium-fox, central binary logo-pixel candidates at version 7/Q and 6% or 8%. All failed raw decoding and therefore failed all eight perturbation cases. This locates the observed safety boundary in the destructive binary treatment, not in the two color-based treatments.

## 5. Visual recognition versus scan safety

Visual recognition and decoder safety are separate evidence dimensions:

- **Visual recognition:** independent inspection of `visual-contact-sheet.png` at contact-sheet/mobile scale. The mark must be visible in the QR body, not inferred from the bottom-right fixture thumbnail.
- **Scan safety:** real jsQR decode of the canonical payload through raw, 0.5×, 2×, light blur, deterministic noise, low contrast, 2° rotation, and mild perspective cases.

The contact sheet independently showed:

- diamond/background silhouette: **recognizable**;
- diamond/module recolor: **recognizable**;
- diamond/central binary: dense central mark, but less faithful than color treatments;
- fox/background silhouette: recognizable medium-complexity silhouette;
- fox/module recolor: recognizable medium-complexity silhouette;
- fox/central binary: face-like central form, but less clean than color treatments.

The numeric recognition fields in `visual-candidates.json` are treatment-specific coverage diagnostics, not a substitute for human recognition. In particular, the central-binary target-dark metric does not adequately penalize dark material outside the intended silhouette.

## 6. Strongest simple-logo candidates

### A. Background silhouette — preferred visual result

- Candidate: `bold-diamond__background-silhouette__v10-Q-m3-b8`
- Payload: `https://q.example/r/a7`
- Version: **10**
- Module count: **57**
- ECC: **Q**
- Mask: **3**
- Requested mutation budget: **8%**
- Budget ceiling: **221 modules**
- Treated modules: **149**
- Actual treated fraction: **5.38%**
- Treatment: `background-silhouette`
- Visual result: **recognizable diamond at contact-sheet/mobile scale**
- Decoder: **PASS, 8/8**
- Raw decode: **PASS**
- Decoder confidence: **high**
- Physical scan: **not tested**

### B. Module recolor — preferred module-native result

- Candidate: `bold-diamond__module-recolor__v10-Q-m1-b8`
- Payload: `https://q.example/r/a7`
- Version: **10**
- Module count: **57**
- ECC: **Q**
- Mask: **1**
- Requested mutation budget: **8%**
- Budget ceiling: **221 modules**
- Recolored modules: **156**
- Actual treated fraction: **5.64%**
- Treatment: `module-recolor`
- Visual result: **recognizable diamond at contact-sheet/mobile scale**
- Decoder: **PASS, 8/8**
- Raw decode: **PASS**
- Decoder confidence: **high**
- Physical scan: **not tested**

### C. Central binary logo-pixel — scan-safe selected example

- Candidate: `bold-diamond__central-logo-pixel__v10-Q-m0-b8`
- Payload: `https://q.example/r/a7`
- Version: **10**
- Module count: **57**
- ECC: **Q**
- Mask: **0**
- Requested mutation budget: **8%**
- Budget ceiling: **221 modules**
- Mutated modules: **134**
- Actual binary mutation fraction: **4.84%**
- Treatment: `central-logo-pixel`
- Visual result: central mark visible, but less faithful than A/B
- Decoder: **PASS, 8/8**
- Raw decode: **PASS**
- Decoder confidence: **high**
- Physical scan: **not tested**

## 7. Medium-complexity selected results

| Candidate | Version/ECC/mask | Requested / actual | Visual | Decoder |
|---|---|---:|---|---|
| `medium-fox__central-logo-pixel__v10-Q-m0-b8` | v10/Q/m0 | 8% / 7.33% | face-like, less clean | 8/8 pass |
| `medium-fox__background-silhouette__v10-H-m2-b8` | v10/H/m2 | 8% / 7.59% | recognizable fox silhouette | 8/8 pass |
| `medium-fox__module-recolor__v10-Q-m6-b8` | v10/Q/m6 | 8% / 7.95% | recognizable fox silhouette | 8/8 pass |

The simple diamond remains the stronger MVP target. The fox results are useful evidence that non-destructive color composition scales better than destructive central mutation, but they are not proposed as production defaults.

## 8. Core functional-region blocker and exact patch

The blocker remains unchanged: `FunctionalRegions` and `isFunctionalModule()` omit alignment patterns. The spike locally protects version 7 and 10 alignment centers.

After Product Architect approval, the exact minimum Core contract addition is:

```ts
alignmentPatterns: Array<{ x: number; y: number; size: number }>
```

Required implementation:

1. Add the field to `FunctionalRegions`.
2. Populate every non-finder-overlapping 5×5 alignment pattern in `matrix.ts`.
3. Include alignment rectangles in `isFunctionalModule(...)`.
4. Add protection tests for versions 2, 7, 10, 15, and 40.

No frozen contract or production Core file was changed in this spike.

## 9. Product recommendation

For the next bounded prototype:

- **Readable:** background silhouette with H or Q, all-mask search, 2–6% realized tint coverage, existing decoder gate, deterministic fallback.
- **Balanced:** module recolor, all-mask search, adaptive 4–8% ceiling, require explicit mobile-scale visual review and decoder pass.
- **Image-first:** do not use broad binary mutation. Central binary mutation showed real failures at 6–8%, especially v7/Q. Keep it experimental until codeword-aware damage accounting, a second decoder, and physical tests exist.

The color-based treatments are promising because they improve human recognition without changing the QR bit matrix. Their production contract must nevertheless bound luminance/contrast and export color profiles rather than assuming all colors remain decoder-dark/light.

## 10. Commands and real outputs

Build:

```bash
npx pnpm@9.0.0 install --frozen-lockfile
npx pnpm@9.0.0 --filter @qr/qr-core build
npx pnpm@9.0.0 --filter @qr/artistic-qr build
```

Result: all exited 0.

Canonical experiment:

```bash
set -o pipefail
node docs/program/evidence/level2-image-fit-qr-spike/creator-visual-pass/run-visual-pass.mjs \
  2>&1 | tee docs/program/evidence/level2-image-fit-qr-spike/creator-visual-pass/run-output.log
```

Result: exit 0; 768/768 candidates completed; 760 passed and 8 failed automated validation; runtime 332.813 seconds.

Verification gates:

```bash
npx pnpm@9.0.0 --filter @qr/qr-core test
npx pnpm@9.0.0 --filter @qr/artistic-qr test
node --check docs/program/evidence/level2-image-fit-qr-spike/creator-visual-pass/run-visual-pass.mjs
```

Results:

- QR Core: **21/21 tests passed**.
- Artistic QR TypeScript: **115/115 tests passed**.
- Artistic provider Python: **6/6 tests passed**.
- Harness syntax: **passed**.
- Independent evidence acceptance checker: **passed** for 768 candidates, 760 scan passes, 8 scan failures, and 6 selected 8/8-pass PNGs.

## 11. Prior branch availability remediation

A normal push of `creator/level2-image-fit-qr-spike` was attempted first and failed with:

```text
/home/hermes/.local/bin/gh auth git-credential get: /home/hermes/.local/bin/gh: not found
fatal: could not read Username for 'https://github.com': No such device or address
```

No credentials were requested or restored. A complete verified Git bundle was produced instead:

- File: `/home/hermes/level2-image-fit-qr-spike.bundle`
- Ref: `creator/level2-image-fit-qr-spike`
- Commit: `0d2dd05ba27b14e78fe7b95c43dfeddf664fd122`
- SHA-256: `243f37f2b3ab149b847d3c5221b7eb9442e2f76e8ff63b2b0da9e98ee3ec8912`
- `git bundle verify`: **OK; complete history**

## 12. Evidence files

- `creator-visual-report.md`
- `visual-candidates.json`
- `visual-contact-sheet.png`
- `visual-contact-sheet-index.json`
- `selected/*.png`
- `fixtures/bold-diamond.png`
- `fixtures/medium-fox.png`
- `run-output.log`
- `run-visual-pass.mjs`
- `sha256.txt`

## 13. Acceptance mapping

- Bounded 2/4/6/8% budgets explored: **PASS**.
- Central protected/logo-pixel treatment: **PASS**.
- Background/silhouette treatment: **PASS**.
- Perforated/cutout or module recolor treatment: **PASS — module recolor**.
- Simple mark visibly recognizable inside QR at contact/mobile scale: **PASS**.
- At least one recognizable candidate passes automated validation: **PASS — multiple 8/8 examples**.
- Visual recognition separated from scan safety: **PASS**.
- Exact QR settings reported: **PASS**.
- Alignment protection and exact Core patch documented: **PASS**.
- Physical scan honesty: **PASS — none performed or claimed**.
- Product export authorization: **NOT CLAIMED**.
