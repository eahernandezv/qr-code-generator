# Core Engine acceptance evidence

Generated on 2026-07-28 from branch `ws/03-qr-core`.

## Reproduce deterministic evidence

```bash
npm run test:core
node scripts/generate-core-artifacts.mjs artifacts/core-engine
node scripts/verify-live-provider-fallback.mjs \
  artifacts/core-engine/high-conditioning \
  artifacts/core-engine/provider-fallback-decision.json
```

Independent decode used OpenCV 4.12.0 `QRCodeDetector` against `fallback-512x512.png`; the exact result is in `opencv-independent-decode.json`.

## Evidence inventory

- `deterministic-fallback-evidence.json` — four candidates with real jsQR raw/scale/blur/noise/contrast/rotation/perspective results and exact payload matches.
- `fallback-{512,1024}x{512,1024}.{png,svg}` — export-safe deterministic artifacts with SHA-256 hashes recorded in the evidence JSON.
- `opencv-independent-decode.json` — independent OpenCV decode of the 512 px fallback.
- `high-conditioning/provider-*.png` — a real Replicate `zylim0702/qr_code_controlnet` output generated at conditioning strength 1.0.
- `high-conditioning/provider-live-evidence.json` — local objective validation of that exact provider image. It failed all decoder/perturbation checks and is **not export-authorized**.
- `provider-fallback-decision.json` — replay of the failed live provider bytes through the engine; confirms replacement by four deterministic candidates, all locally decoded and export-authorized.

## Live provider reproduction

The live call spends provider credit and requires explicit credentials; no credential defaults are committed:

```bash
export REPLICATE_API_TOKEN='...'
export QR_CREATOR_CANDIDATE_COUNT=1
node scripts/run-live-provider-evidence.mjs artifacts/core-engine/high-conditioning
```

A provider image is never trusted based on provider claims. The Core Engine validates downloaded bytes locally and falls back deterministically when the candidate fails.
