# QR Creator — Level 2 QR-Specific + Reference Q6

**Branch:** `creator/level2-qr-specific-reference-q6`
**Owner:** QR Creator / Core Engine
**Verdict:** **EXISTING SOLUTIONS EXERCISED / FAILED ART+SCAN GATE**

## Objective

Test the recommended existing-solution route before committing to custom GPU infrastructure: combine reference guidance with a separate exact QR structural control and retain Core as sole export authority.

## What ran

### QR-specific ControlNet + reference Canny

`anotherjesse/multi-control` exposes separate `qr_image` and `canny_image` inputs. Its hosted version failed four reproducible calls because its Canny preprocessor is incompatible with the deployed call signature. It is not a usable accelerator without maintaining our own fork.

### Reference IP-Adapter + exact-QR Canny

`chigozienri/ip_adapter-sdxl-controlnet-canny` exposes separate reference `image` and QR `controlnet_input` fields. Four live predictions generated 16 outputs across two references and two strength pairs.

## Results

| Metric | Result |
|---|---:|
| Unique provider prediction IDs | 9 |
| Completed/failed screen records | 8 |
| Canceled before provider start | 1 |
| Successful predictions | 4 |
| Provider images | 16 |
| Raw decode | 0/16 |
| Core threshold pass | 0/16 |
| Export denied | 16/16 |
| Clear reference recognition | 7/16 |
| Sponsor-ready | 0/16 |
| Successful-call cost estimate | $0.040852 |
| Total predict-time cost estimate | $0.040877 |
| New subscription/refill/purchase | none |

The IP-Adapter route preserved wolf identity better than the M emblem, but all outputs failed raw decoding and most visibly placed artwork over a conventional QR-like grid. It did not achieve premium integrated art.

The ninth prediction ID is an explicit resource-envelope variance: the first IP-Adapter call never started, was canceled at the timeout with zero reported predict-time cost, and was retried through the persisted recovery path.

## Safety result

Core rejected a replayed real provider image despite forged optimistic provider claims. Four deterministic fallbacks preserved exact payload equality and passed at 7/8, 8/8, 8/8, and 8/8.

## Recommendation

1. Do not integrate these hosted models.
2. Do not expand Q6 to six additional references.
3. Keep deterministic Level 1 plus Q3 Image-Fit as the MVP path.
4. Treat further generative work as a custom-model lane requiring Product Architect approval for GPU hosting/spend: maintained QR Code Monster/Dion QR ControlNet plus IP-Adapter, trained or packaged together rather than composed through stale community endpoints.
5. Quick QR Art remains a possible black-box benchmark, but no API purchase is justified until reference-image parity is contractually confirmed.

Physical or print scanning was not performed. Product Architect retains independent verification and merge authority.
