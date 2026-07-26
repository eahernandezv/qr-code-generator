# MISSION — Agent 2 (qr-artist)
**Branch:** `ws/02-design-artistic`
**Status:** STARTED — contracts frozen

## Your scope
1. `packages/design-system/` — Design tokens, components, artistic style primitives
2. Art direction specifications for 6 launch directions:
   - minimal, gradient_mesh, organic_flora, circuit_board, watercolor, geometric_tessellation
3. Candidate-comparison and confidence-display patterns
4. Visual test fixtures

## Frozen contract
- `packages/contracts/schemas/artistic-qr-api.v1.json` — ArtDirection enum, CandidateState enum

## Constraints
- WCAG accessible, keyboard/focus tested
- Light/dark themes
- No QR matrix/rendering algorithms (qr-creator owns those)
- No provider integration (qr-creator owns adapter)

## Start signal
Begin coding immediately. Push commits to `ws/02-design-artistic`.
