# QR Creator — Level 2 Provider-Generative Q4

**Branch:** `creator/level2-provider-generative-q4`  
**Owner:** QR Creator / Core Engine  
**Verdict:** **VALIDATED architecture / FAILED sponsor-quality gate / deterministic fallback accepted**

## Decision

Q4 executed the recommended provider-generative test against all eight supplied target classes. Live provider generation works, provenance/cost/latency are captured, local Core validation remains authoritative, and deterministic fallback behaves correctly. The tested provider path is not sponsor-ready.

## Live results

- Model: `zylim0702/qr_code_controlnet@628e604e13cf63d8` (version re-resolved from live API before execution).
- Predictions: 8/8 succeeded.
- Estimated spend: $0.12.
- Raw candidates passing `jsQR 1.4.0 / scan-v1-real-75pct`: 0/8.
- Exact outcomes: seven at 0/8 checks; one at 1/8 with raw decode false.
- Core export authorization: 0/8.
- Physical/print scan: `not_performed`.

## Repair result

A bounded evidence-only composite repair searched three QR-opacity levels while preserving full-contrast functional regions and the quiet zone. It produced 8/8 automated scan passes: one 8/8 at opacity 0.75, one 8/8 at 0.60, and six 7/8 at 0.60.

The repair is intentionally **not integrated into runtime Core**. Visual inspection shows that passing repair requires a conventional QR to dominate the composition, reducing recognizable subjects from raw clear 4/8 to repaired clear 2/8. Shipping that repair would meet scan mechanics while failing the high-end artistic product objective.

## Fallback authority proof

An exact live provider PNG was replayed with forged optimistic provider validation and `exportAllowed: true`. The engine ignored those claims, rejected the provider bytes through fresh local validation, and returned four deterministic `local-safe-fallback` candidates. Each passed 8/8 and decoded the exact canonical payload.

## Root cause

The active Replicate model is text-prompt + QR conditioned, not reference-image conditioned. It produces visually strong class-level scenes for burgers and wolves but does not preserve exact supplied geometry. At conditioning sufficient for attractive art, none of the eight outputs scans. Restoring scanability by compositing the exact QR matrix destroys the integrated-art advantage.

## Scope integrity

No frozen contract, Studio UI, checkout, commerce, account, analytics, custom domain, deployment, or export-authority rule changed. Provider credit was not refilled. Product Architect retains independent acceptance and merge authority.

## Evidence

- `docs/program/evidence/level2-provider-generative-q4/live-provider-evidence.json`
- `docs/program/evidence/level2-provider-generative-q4/repair-evidence.json`
- `docs/program/evidence/level2-provider-generative-q4/deterministic-fallback-proof.json`
- `docs/program/evidence/level2-provider-generative-q4/visual-review.json`
- `docs/program/evidence/level2-provider-generative-q4/provider-contact-sheet.png`
- `docs/program/evidence/level2-provider-generative-q4/repaired-contact-sheet.png`
- `docs/program/evidence/level2-provider-generative-q4/sha256.txt`

## Recommendation

Do not tune deterministic crop/morphology further and do not ship the composite repair as the premium experience. The next provider gate requires a model that accepts both QR control and actual reference-image conditioning, followed by the same exact-byte local validation/fallback loop. That provider/model decision is outside this completed Q4 evidence pass.
