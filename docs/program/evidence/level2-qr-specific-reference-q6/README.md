# Level 2 QR-Specific + Reference Q6 Evidence

**Verdict:** existing hosted accelerators were exercised without a new purchase; neither qualifies for expansion or runtime integration.

## Frozen screen

- Targets: ribbon-M and wolf only.
- Intended architectures:
  1. QR-specific ControlNet plus reference Canny (`anotherjesse/multi-control`).
  2. Reference IP-Adapter plus exact-QR Canny (`chigozienri/ip_adapter-sdxl-controlnet-canny`).
- Gate: at least one clear-reference candidate with raw decode and at least 6/8 perturbations.
- No contract, Studio, commerce, deployment, threshold, or credit-refill change.

## Live provider result

- Architecture 1: 4/4 calls failed inside the hosted model with the same `canny_preprocess()` signature incompatibility. Recovered provider records show approximately `$0.000025` predict-time cost; the first call spent about 201 seconds waiting for cold start but only 0.006 seconds in failed prediction code.
- Architecture 2: 4/4 completed predictions succeeded and produced 16 PNG outputs. One preceding prediction remained queued without starting, was canceled at the timeout, and reports zero predict-time cost.
- Unique provider prediction IDs: 9. This is one above the initial eight-prediction envelope because the never-started canceled queue attempt was retried under the authorized recovery rule. The variance is explicit rather than hidden.
- Successful prediction cost estimate: `$0.040852`.
- Total Q6 provider cost estimate including failed predict time: `$0.040877`.
- One initial cold queued prediction was canceled after the bounded timeout and reports no predict-time cost.

## Core validation

- Provider outputs: 16.
- Raw decode: 0/16.
- Core threshold pass: 0/16.
- Export denied: 16/16.
- Three wolf outputs scored 1/8, but none raw-decoded.

## Visual review

- Clear reference recognition: 7/16 (conservative machine-vision review).
- Sponsor-ready: 0/16.
- M outputs were mostly fragmented or ambiguous.
- Wolf identity was stronger, but a conventional QR grid dominated the composition.

## Fallback authority

A real Q6 provider output was replayed with forged optimistic scan/export claims. Core rejected it and returned four deterministic local fallbacks at 7/8, 8/8, 8/8, and 8/8 with exact payload equality.

## Decision

- Do not expand to the remaining six references.
- Do not integrate either hosted model.
- Do not purchase Quick QR Art API credits: public documentation did not establish base-reference parity in the V5 API.
- Keep deterministic Level 1 and supported Q3 Image-Fit as the MVP release path.
- Further generative work now requires a maintained custom QR-specific ControlNet + IP-Adapter deployment or training effort and a separately approved GPU/spend boundary.

## Files

- `architecture-discovery.json` — exact model/version/field discovery and blocker.
- `live-screen.json` — prediction provenance, inputs, hashes, latency, and cost.
- `provider-failed-attempts.json` — failed/canceled predictions recovered by ID.
- `q6-validation.json` — Core decoder/perturbation evidence.
- `visual-review.json` — visual rubric result.
- `deterministic-fallback-proof.json` — forged-provider replay and safe fallback.
- `qr-control.png` — exact Q6 control input.
- `sha256.txt` — tracked evidence manifest.

Reference-bearing generated images and contact sheets remain local-only under `.gitignore`.
