# QR Creator — Level 2 Image-Fit Ranking Q7

**Branch:** `creator/level2-image-fit-ranking-q7`
**Owner:** QR Creator / Core Engine
**Decision:** accept as a deterministic MVP selector improvement; do not claim sponsor-faithful image reconstruction.

## Implementation

The optimizer no longer treats the first scan pass as automatically optimal. It preserves that pass as a safety anchor, then admits at most two visual challengers and ranks them lexicographically:

1. Core scan verdict;
2. perturbation checks passed;
3. raw decode;
4. rendered target-appearance score;
5. protected-zone conflict;
6. frozen deterministic preference.

A candidate with stronger appearance cannot displace a safer candidate. The selection is bounded by the existing `max_search_ms` contract and two additional challengers per mode. Frozen contracts are unchanged.

The former represented-cell recognition score was replaced with normalized RGB appearance displacement and versioned as `image-fit-scan-first-appearance-q7`.

## Measured result

| Metric | Q3 | Q7 |
|---|---:|---:|
| Real-target candidates passing | 24/24 | 24/24 |
| Perturbation checks | 182/192 | 183/192 |
| Deterministic fallbacks | 8/8 | 8/8 |
| Protected violations | 0 | 0 |
| Settings changed | — | 21/24 |
| Appearance improved/equal/regressed | — | 21/3/0 |
| Sponsor-quality visual outputs | 0 | 0 |

The one scan-strength gain was the watermarked wolf-profile Image-first candidate, from 6/8 to 7/8. No candidate lost checks.

## Honest release framing

Q7 is useful because it extracts more quality from the existing deterministic setting space without weakening safety. It does not overcome module-grid quantization, recover fine typography, or produce generative sponsor artwork. Deterministic Level 1 and Image-Fit remain the recommended MVP path, with fallback always available.

No provider calls, purchases, contract changes, deployments, physical scans, or print scans were performed in Q7.
