# Level 2 Image-Fit Quality Spike — Evidence & Report

**Branch:** `creator/level2-image-fit-quality-spike`  
**Pipeline:** `image-fit-luma-v2-preprocess-edge-saliency`  
**Date:** 2026-08-14  
**Owner:** QR Creator (Core Engine)

## Objective

Replace the naive per-module luminance threshold (160) with a scan-safe image preprocessing/render policy:
- Square crop/resize, center-padding with white
- Edge/saliency-like target mask (Sobel gradient × local contrast)
- Protected-region exclusion (never touched by treatment)
- Coherent grouped image shapes (connected-component-aware filtering + horizontal-run SVG grouping)
- Mode-specific Readable/Balanced/Image-first tradeoffs

## Target Images

4 synthetic test targets were generated, each 64×64 px:

| # | Name | Description | Complexity |
|---|------|-------------|------------|
| 1 | `square-center` | Central dark square on white | simple_mark |
| 2 | `gradient-diagonal` | Dark-to-light diagonal gradient | medium_logo |
| 3 | `dual-spots` | Two dark circular spots | medium_logo |
| 4 | `circle-ring` | Dark ring (annulus) on white | medium_logo |

## Pipeline Details

### Preprocessing (step by step)

1. **Square crop / center pad** — source is padded to `max(w, h)` with white (255) and centered.
2. **2× scaled edge analysis** — target is scaled to `matrixSize × 2` using the `qrcode` library's `create()` to allow anti-aliased edge computation.
3. **Sobel gradient magnitude** — computes `dx`/`dy` at each scaled pixel, takes magnitude.
4. **Local contrast** — 3×3 neighborhood min-max difference.
5. **Saliency = 0.6 × normalized_edge + 0.4 × normalized_contrast**
6. **Adaptive percentile threshold** — per-mode target fraction:
   - `readable`: 12% of modules
   - `balanced`: 22% of modules
   - `image_first`: 38% of modules
7. **Speck removal** — flood-fill at 2× scale; components < 4 pixels (≈ 1 module) are removed.
8. **Downsample** — 2× thresholded binary mask collapsed to module grid.
9. **Cap enforcement** — if the downsampled fraction overshoots, lowest-saliency masked modules are dropped.
10. **Connected-component count** — measured at module level for diagnostics.

### Rendering (coherent mode-aware)

- **Legacy** — per-module `treatmentColor(mode, active)`; thin, noisy, speckled appearance.
- **Improved** — `modeAwareFill()` considers local neighbor coherence (`darkNeighbors` vs `lightNeighbors`):
  - `readable` — image appears only on light QR modules; dark modules stay solid black;
  - `balanced` — dark QR modules shift to deep blue-gray, light modules to lighter blue;
  - `image_first` — maximum image visibility, with stronger tint on dark modules.
- **SVG output** — grouped horizontal runs of same color, dramatically reducing element count and producing clean, contiguous shapes. Production fill colors are constrained to the `srgb` palette.

## Visual Inspection

### square-center — balanced
- **Legacy:** Faint, noisy blue speckles around the square; edges are broken by randomly scattered treatment modules. The square is barely recognizable.
- **Improved:** A clean, continuous rectangular frame is clearly visible. The edges are smooth and contiguous. The square is immediately recognizable.

### gradient-diagonal — image_first
- **Legacy:** Scattered noisy dots with only a faint suggestion of a diagonal pattern. Most of the image energy is lost.
- **Improved:** A striking, continuous diagonal band with smooth light-to-dark transitions. The diagonal gradient is highly recognizable.

### dual-spots — balanced
- **Legacy:** Sparse blue speckles near the spot locations; the two spots are indistinguishable from noise.
- **Improved:** Two distinct, well-separated dark regions are clearly visible. The spots have coherent boundaries.

### circle-ring — balanced
- **Legacy:** Fragmented blue pixels roughly outlining a ring. The ring shape is broken and hard to identify.
- **Improved:** A clear, continuous annular ring. The inner and outer boundaries are smooth and the shape is instantly recognizable.

## Automated Decoder Pass Proof

All 12 candidates (4 targets × 3 modes) were subjected to the full jsQR 1.4.0 decoder suite with 8 perturbations per candidate:

| Target | Readable | Balanced | Image-First | Fallback |
|--------|----------|----------|-------------|----------|
| square-center | ✅ 8/8 pass | ✅ 8/8 pass | ✅ 8/8 pass | ✅ 8/8 pass |
| gradient-diagonal | ✅ 8/8 pass | ✅ 8/8 pass | ✅ 8/8 pass | ✅ 8/8 pass |
| dual-spots | ✅ 8/8 pass | ✅ 8/8 pass | ✅ 8/8 pass | ✅ 8/8 pass |
| circle-ring | ✅ 8/8 pass | ✅ 8/8 pass | ✅ 8/8 pass | ✅ 8/8 pass |

**Summary:** 12/12 candidates passed the `scan-v1-real-75pct` threshold (raw decode + ≥75% overall). 4/4 fallback artifacts passed. No protected-region violations occurred.

## Protected-Region Safety

Every candidate was verified to:
- Have `violations: []` (zero protected modules were recolored)
- Preserve all `finder`, `separator`, `timing`, `alignment`, `format`, and `version_info` regions

## Export Authority

All candidates correctly report:
- `export_allowed: false` in preview mode
- Blockers include `preview_not_paid`, `short_link_not_committed`, `preview_export_parity_not_proven`
- `image_first` carries the additional `image_first_experimental` blocker

## File Manifest

```
docs/program/evidence/level2-image-fit-quality/
├── artifacts/              # Raw SVGs for every variant
│   ├── legacy--*.svg       # 12 files
│   └── improved--*.svg     # 12 files
├── visual-preview/         # Rasterized PNGs
│   ├── legacy--*.png       # 12 files
│   └── improved--*.png     # 12 files
├── contact-sheet/          # Side-by-side PNGs
│   └── pair--*.png         # 12 files (legacy | improved)
├── quality-evidence.json   # Full quantitative comparison
├── decoder-pass-proof.json # Automated scan results per target/mode
└── README.md               # This file
```

## Known Limitations & Next Steps

1. **Synthetic targets only** — real photo-like targets may show different `componentCount` behavior; recommend expanding tests with actual sampled PNGs.
2. **No physical-device scan** — decoder evidence is controlled lab conditions only. Product Architect should verify with physical print if Image-first promotion is requested.
3. **Preview-export parity not proven** — remains a contract-pinned blocker until Studio integration tests are performed.
4. **Color channel not used** — currently grayscale luma only. A future quality spike could incorporate chroma-aware saliency.
5. **No multi-scale edge analysis** — larger logos (> 128 px) may benefit from multi-scale saliency.

## Revision

| Component | Version | Notes |
|-----------|---------|-------|
| Pipeline | `image-fit-luma-v2-preprocess-edge-saliency` | Replaces v1 naive threshold |
| Score | `image-fit-target-coverage-v2` | Adds component count, edge score |
| Policy | `qr-functional-regions-v2-alignment` | Unchanged from prior |
| Decoder | jsQR 1.4.0 | Unchanged |
| Threshold | `scan-v1-real-75pct` | Unchanged |

## SHA-256 Summaries

```
# Legacy artifacts (naive per-module threshold 160)
4 targets × 3 modes = 12 artifacts (see quality-evidence.json)

# Improved artifacts (preprocessing pipeline)
4 targets × 3 modes = 12 artifacts (see quality-evidence.json)
```

Full SHA-256s are in `quality-evidence.json`.
