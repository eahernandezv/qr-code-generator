# Level 2 Image-Fit Ranking Q7 Evidence

**Verdict:** scan-safe deterministic selection improved without a scan regression; visual gains are directional, not sponsor-ready.

## Change

Q3 stopped at the first QR version/ECC/mask whose artifact passed the decoder gate. Q7 now:

1. renders the allowed deterministic setting space;
2. preserves the Q3 first scan-passing candidate as a safety anchor;
3. evaluates at most two additional composition-aware challengers;
4. ranks scan verdict, perturbation checks, raw decode, target appearance, protected conflict, then deterministic preference;
5. retains the Level 1 fallback and unchanged fail-closed export blockers.

`recognition_score` now measures normalized rendered RGB displacement from the underlying QR modules across target-mask cells. This avoids the previous near-constant represented-cell ratio. Its score version is `image-fit-scan-first-appearance-q7`.

## Real-target evidence

Eight local rights-restricted Q3 references, three modes each:

- candidates: 24;
- Q3 pass: 24/24;
- Q7 pass: 24/24;
- Q3 perturbation checks: 182/192;
- Q7 perturbation checks: 183/192;
- settings changed: 21/24;
- appearance score improved: 21/24;
- appearance score equal: 3/24;
- appearance regressions: 0/24;
- per-candidate scan regressions: 0/24;
- Q7 fallbacks: 8/8 pass.

One material scan-strength improvement occurred: `wolf-profile-watermarked / image_first` advanced from 6/8 to 7/8 while remaining pass-qualified.

## Visual review

Changes are mostly subtle-to-moderate. J, M, geometric-mark, and some wolf contours improve directionally, especially in Image-first. No visible source-recognition regression was identified. The QR grid still dominates all outputs; fine typography and internal detail remain degraded. **Sponsor-quality count remains 0.**

## Rights and evidence handling

Reference JPEGs and source-bearing contact sheets remain under git-ignored local directories. The committed evidence contains hashes, aggregate metrics, scan results, and conservative visual findings—not reference pixels.

## Reproduction

```bash
npm exec --yes pnpm@9.0.0 -- --filter @qr/qr-core build
npm exec --yes pnpm@9.0.0 -- --filter @qr/artistic-qr build
node packages/artistic-qr/scripts/generate-image-fit-ranking-q7.mjs
node packages/artistic-qr/scripts/validate-image-fit-ranking-q7.mjs
```

Automated evidence uses jsQR 1.4.0 only. No physical-device or printed scan was performed.
