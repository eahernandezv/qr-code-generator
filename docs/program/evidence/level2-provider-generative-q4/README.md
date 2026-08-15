# Level 2 Provider-Generative Q4 Evidence

**Verdict:** provider architecture and fail-closed fallback validated; sponsor-quality gate failed.

## Scope

Eight user-supplied reference classes are bound by SHA-256 and represented through sanitized prompts. Source JPEGs are not copied into this public branch. The active model is `zylim0702/qr_code_controlnet` at live-resolved version `628e604e13cf63d8ec58bd4d238474e8986b054bc5e1326e50995fdbc851c557`.

This model is QR- and text-prompt-conditioned; it does **not** consume the supplied reference pixels. `referenceImage` metadata binds provenance/safety but does not establish image-to-image fidelity. Therefore Q4 tests semantic class composition, not exact logo recreation.

## Live provider evidence

- 8 predictions, one per supplied target class.
- 8/8 provider calls succeeded.
- Estimated provider cost: **$0.12**.
- Core scan threshold: `jsQR 1.4.0 / scan-v1-real-75pct`.
- Raw provider candidates passing Core threshold: **0/8**.
- Seven candidates passed 0/8 checks; one passed 1/8 but failed raw decode.
- Provider output never authorized export.

See `live-provider-evidence.json` and `provider-contact-sheet.png`.

## Bounded repair spike

The evidence-only `provider-art-composite-repair-spike-v1` composites the exact QR matrix over provider PNGs, gives functional regions full contrast, preserves a four-module quiet zone, and searches data-module opacities 0.45/0.60/0.75.

- 8/8 targets obtain a locally passing repair.
- Seven select opacity 0.60 and pass 7/8 or 8/8.
- The black-and-white wolf selects 0.75 and passes 8/8.
- This repair is **not promoted into runtime Core** because the visual gate fails: the conventional QR dominates and subject detail is materially obscured.

See `repair-evidence.json` and `repaired-contact-sheet.png`.

## Deterministic fallback

`deterministic-fallback-proof.json` replays an exact live provider PNG while forging optimistic provider scan/export claims. Core ignores the claims, locally rejects the bytes, and returns four `local-safe-fallback` candidates. All four pass 8/8 with exact payload equality.

## Visual gate

Unlabeled machine-vision inspection of raw provider art: clear 4/8, partial 2/8, unidentifiable 2/8. The scan-safe selected repairs decline to clear 2/8, partial 4/8, unidentifiable 2/8. Sponsor-ready: **0/8**.

This is not a blinded human panel and no physical/print scan was performed.

## Reproduction

```bash
npm exec --yes pnpm@9.0.0 -- --filter @qr/qr-core build
npm exec --yes pnpm@9.0.0 -- --filter @qr/artistic-qr build
# Live step requires REPLICATE_API_TOKEN and incurs provider cost:
node packages/artistic-qr/scripts/generate-provider-q4-evidence.mjs
node packages/artistic-qr/scripts/repair-provider-q4-evidence.mjs
node packages/artistic-qr/scripts/prove-provider-q4-fallback.mjs
```

## Rights and export safety

References were user-supplied and rights were not independently verified. Prompts omit trademark names and text recreation. Provider artifacts are quality-spike evidence only. Q4 does not authorize production export, sponsor presentation, physical scan claims, or frozen-contract changes.
