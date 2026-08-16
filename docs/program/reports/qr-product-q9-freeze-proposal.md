# QR Product Architect — Q9 Freeze Proposal

Status: **FREEZE Q9 CORE QUALITY BASELINE FOR PR REVIEW; STUDIO STILL PAUSED**
Verified UTC: 2026-08-16T09:22:56Z
Baseline main: `234d759d978de159f105dcdfce0aeb3b1e275f9c`
Working branch: `product/q9-direct-visual-quality-loop`

## Selected Q9 policy

- Simple/logo targets: Q9 showcase with foreground-centroid centering.
- Complex/textured targets: Q9 showcase with scan-safer target-aware placement.
- Background-connected whitespace: trimmed; enclosed/internal logo negative space remains.
- Failed candidates: excluded.
- Public contract change: none.

## Selected outputs

| Target | Selected mode | Score | Decode | Artifact SHA-256 |
|---|---|---:|---:|---|
| simple-silhouette | image_first | 90 | 8/8 | `5736b57fac4b12d912154dbea584ee9788c35f156255a15d86dfe4efa29f76bf` |
| medium-logo | balanced | 97 | 8/8 | `95c5b58fcb51f849446da11d95a4a0ed7713d7d292aa899a3459730762b61b3f` |
| textured-subject | balanced | 88 | 8/8 | `97a0a6e3504382630a8275b3e52a8ece17f777e023ddc1767dccf5e9d6b3737e` |

## Verification reproduced

- Core build/tests: passed.
- Artistic build/tests/lint: passed via deterministic split fallback after known Vitest aggregate transport timeout pattern.
- Python provider tests: passed.
- Q9 evidence manifests: passed.
- Frozen contract diff: none.
- Git diff check: passed.

## Product decision

Q9 is the current high-water mark and should be frozen for Core PR review before Studio integration. Physical QA and Studio parity remain future gates.
