# QR Creator — Level 2 Dual-Conditioned Provider Q5

**Branch:** `creator/level2-dual-conditioned-provider-q5`  
**Owner:** QR Creator / Core Engine  
**Verdict:** **VALIDATED DISCOVERY / FAILED ART+SCAN GATE / NO EXPANSION**

## Outcome

Q5 found and exercised a hosted model that genuinely consumes both reference pixels and a separate QR control image. Three architecture variants were screened and one received a bounded QR-strength remediation. None produced a candidate that simultaneously preserves high-end reference quality and passes raw QR decoding.

## Architecture screen

Model: `fofr/sdxl-multi-controlnet-lora@89eb212b3d1366a83e949c12a4b45dfe6b6b313b594cb8268e864931ac9ffb16`.

1. SDXL img2img reference + illusion QR ControlNet.
2. SDXL img2img reference + illusion QR + canny reference ControlNet.
3. SDXL img2img reference + illusion QR + lineart reference ControlNet.

All six Phase A outputs clearly preserve their reference subject. All six fail 0/8 Core checks because QR structure is not functionally retained.

## Remediation

Increasing QR conditioning from 1.15 to 2.0 and 3.0 makes the QR progressively visible. It does not cross the objective scan threshold:

- scale 2.0: 0/8 for both targets;
- scale 3.0: M 0/8; wolf 1/8 with raw failure.

At scale 3.0, artwork begins to look like a reference layered over a conventional QR. This repeats the Q4 quality ceiling rather than solving it.

## Honest gate decision

- Reference-clear outputs: 10/10.
- Core scan passes: 0/10.
- Sponsor-ready outputs: 0/10.
- Eight-reference expansion: **not performed**, as required by the frozen Phase A gate.
- Physical/print scan: `not_performed`.

## Economics

Ten successful predictions consumed 47.795 provider predict-seconds. At the live model-page price of $0.000975/second, estimated spend is **$0.046598**. No credit refill occurred.

## Safety and fallback

All outputs remain export-denied. Exact-byte replay with forged provider authorization was rejected, and four deterministic fallbacks passed the Core threshold with exact payload equality.

## Recommendation

Do not integrate this model or spend on the remaining references. A future gate needs a newer architecture trained jointly for reference identity and machine-decodable QR structure, not independent img2img and illusion controls competing at inference time. Preserve deterministic/Image-Fit MVP paths and fail closed.

No frozen contract, Studio, checkout, commerce, deployment, or export-authority rule changed. Product Architect retains independent acceptance and merge authority.
