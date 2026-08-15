# Level 2 Image-Fit Composition Q2 Evidence

**Classification:** Core composition spike with sponsor-recognizable controlled silhouettes; real-photo readiness is not claimed.

## Pipeline

Q2 extends the verified Q1 edge/dark-coherence mask with deterministic module-grid composition repair:

1. bridge single-module horizontal, vertical, and diagonal gaps;
2. morphological close using bounded dilation/erosion;
3. remove tiny disconnected mask components;
4. retain only dominant composition components;
5. enforce mode budgets by removing weakest boundary modules with an interior-coherence bonus;
6. exclude every protected QR functional module during rendering.

Policy: `image-fit-composition-q2-morphology-v1`.

## Contact-sheet key

Every PNG under `contact-sheet/` contains three panels:

- **gray header / left:** source target;
- **amber header / middle:** Q1 mask/render;
- **blue header / right:** Q2 composition repair.

## Controlled targets

Six deterministic targets are included: square, diagonal gradient, dual spots, ring, heart silhouette, and house silhouette. Each has Readable, Balanced, and experimental Image-first variants.

## Objective scan evidence

- 18/18 Q2 candidates satisfy `scan-v1-real-75pct` using jsQR 1.4.0.
- Readable/Balanced candidates: 8/8 controlled checks on generated evidence.
- Image-first candidates: 6/8 controlled checks (the exact 75% threshold); they remain experimental and export-blocked.
- 6/6 deterministic Level 1 fallbacks pass.
- No physical-device or print scan was performed.
- No candidate modifies protected finder, separator, timing, alignment, format, version-info, or quiet-zone regions.

See `decoder-pass-proof.json` for per-target evidence.

## Visual verdict

Strict visual inspection of the target/Q1/Q2 sheets:

- dual spots: two distinct spot regions are recognizable; Q2 slightly consolidates boundaries;
- ring: recognizable open ring is preserved; Q2 closes narrow breaks without filling the center;
- heart: recognizable silhouette in Balanced mode;
- house: recognizable roof/body/door silhouette in Balanced mode;
- square and diagonal remain recognizable.

Q2 is materially stronger for controlled silhouette composition. It is **not evidence of sponsor-ready complex-photo output** because this evidence set intentionally isolates mask geometry. Real logos/photos and blinded human recognition remain the next gate.
