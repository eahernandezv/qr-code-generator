# Agent Handoff — Wave A0: QR Integrity and Artistic Feasibility

## Mission

Prove the QR-integrity and artistic-generation foundations for a flagship standalone Artistic QR Studio. Bulk feasibility is deferred and must not consume MVP capacity.

## Context

The Studio must work without registration. Artistic mode must add real scene/composition integration without silently sacrificing QR function; provider-backed inputs require explicit network/privacy evidence. This is a discardable spike, not production implementation.

## Frozen scope

- Execute SP-01 and SP-08. Do not execute SP-02 during the Artistic MVP.
- Compare a small number of maintained QR/render/decoder libraries and a bounded set of artistic approaches: curated deterministic composition plus at least one practical provider-backed or locally runnable generative method.
- Produce representative artistic candidates across illustration, photographic/scene-integrated, branded/minimal, high-detail, and adversarial low-contrast/occlusion cases.
- Test protected functional masks, quiet zones, artistic-strength controls, multi-candidate selection, regeneration, and deterministic fallback.
- Measure per-candidate and per-successful-export latency/cost, number of attempts, decoder pass rate, provider failure behavior, input/output retention, content-safety controls, and provenance support.
- Test logos/reference images, quiet zones, error correction, Unicode/long URLs, cancellation, provider failures, and partial errors.
- Do not implement identity, payments, dynamic redirects, or production UI.

## Owned artifacts

Use an isolated spike repository/directory. Return a verifiable path/commit and report; do not edit baseline docs.

## Required proof

- Real static and artistic SVG/PNG samples and validation output; keep failed artistic candidates as evidence rather than cherry-picking.
- Scan matrix across available physical/reference devices and a documented multi-decoder suite, including resize, print-like blur, JPEG compression, perspective, lighting/contrast, and partial occlusion; identify missing physical coverage honestly.
- Artistic verdict separating (a) deterministic templates and (b) generative mode. Generative failure does not remove artistic QR from MVP if the deterministic artistic fallback passes.
- Candidate-board elapsed time, time to first exportable candidate, peak memory where observable, responsiveness, cancellation/retry behavior, and cost per successful export.
- Network proof distinguishing local inputs from explicitly disclosed provider-bound payload/prompt/reference-image data.
- Verdict per spike: VALIDATED, PARTIAL, or INVALIDATED.

## Contracts to propose

`qr-core-api.v1` and `artistic-qr-api.v1`. Proposals only; WS-01 owns final contracts.
