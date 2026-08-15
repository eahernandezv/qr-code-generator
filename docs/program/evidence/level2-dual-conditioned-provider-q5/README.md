# Level 2 Dual-Conditioned Provider Q5 Evidence

**Verdict:** three dual-conditioned architectures were proven and screened; none qualifies for eight-reference expansion or sponsor release.

## Architecture discovery

Live Replicate schema inspection identified `fofr/sdxl-multi-controlnet-lora` as a genuine dual-input hosted pipeline:

- `image` consumes reference pixels through SDXL img2img;
- `controlnet_1_image` consumes a separate exact QR image through `illusion` ControlNet;
- a second ControlNet can additionally consume the reference through `edge_canny` or `lineart`.

Three architectures were tested: img2img+illusion, img2img+illusion+canny, and img2img+illusion+lineart. Local execution was rejected because this host has no GPU and only 7.6 GiB RAM.

## Phase A screen

Each architecture ran on a geometric ribbon-M reference and a complex frontal-wolf reference.

- Predictions: 6/6 provider success.
- Reference recognition: 6/6 clear.
- Core scan: 0/6 pass; every candidate scored 0/8 with raw failure.
- Interpretation: img2img preserved the references, but QR conditioning was absent or imperceptible.

Per the frozen Q5 gate, no architecture qualified for expansion to all eight references.

## Bounded tuning

The strongest architecture received one remediation sweep:

- QR scale 2.0: references remain clear, QR ghost too faint, both 0/8.
- QR scale 3.0: QR becomes obvious; M 0/8, wolf 1/8 with raw failure; conventional QR pixels begin to dominate artwork.

The loop stopped for stagnation rather than spending on the other six references.

## Cost and latency

- Total live predictions: 10/10 succeeded.
- Predict time: 47.795 seconds.
- Estimated cost at the model page's live `$0.000975/predict-second`: **$0.046598**.
- No provider credit was refilled.

## Core authority and fallback

All ten provider outputs remain export-denied. A replay of the visually strongest QR-heavy candidate with forged optimistic provider authorization was rejected by Core. Core returned four deterministic safe fallbacks: one passed 7/8 and three passed 8/8, all with raw decode and exact payload equality.

## Evidence files

- `architecture-discovery.json`
- `phase-a-live.json`
- `tuning-live.json`
- `q5-validation.json`
- `visual-review.json`
- `deterministic-fallback-proof.json`
- `loop-state.json`
- `sha256.txt`

Source JPEGs and source-bearing generated images remain local and are excluded from the public branch. No physical or print scan was performed.
