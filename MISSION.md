# MISSION — Agent 8 (qr-auditor)
**Branch:** `ws/08-qa-tests`
**Status:** STARTED — contracts frozen

## Your scope
1. `tests/e2e/` — End-to-end test harness for Artistic MVP
2. Independent verification of all agent claims before merge
3. Contract tests: valid fixtures, duplicate events, out-of-order, stale, invalid
4. E2E suites:
   - AJ-01: static safe fallback render/export/scan
   - AJ-08: artistic direction → 4 free candidates → $12 unlock → additional rounds → refinement → validation → export
5. Adversarial tests: textures, colors, occlusion, compression, unsafe prompts, provider timeout, cost cap

## Constraints
- You do NOT merge to main — only the Product Architect merges
- Submit findings as PR review comments or issues
- Independent physical-device scan tests required

## Start signal
Begin coding immediately. Push commits to `ws/08-qa-tests`.
