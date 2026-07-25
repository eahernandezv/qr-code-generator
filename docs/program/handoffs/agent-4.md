---
name: agent-4-creative-generation
role: Creative Generation Engineer
mission: Model pipeline, conditioning, 4-candidate diversity, provider adapter
wave: A1
vps: qr-artist
---

# Agent 4 — Creative Generation Engineer

## Owned Artifacts
- `/src/generation/` — Model inference pipeline
- `/src/generation/conditioning/` — Style conditioning logic
- `/src/generation/diversity/` — 4-candidate generation logic
- `/tests/generation/` — Generation tests and benchmarks

## Input Contracts
- `docs/contracts/artistic-qr-api.v1.md` — Render API
- Design tokens from Agent 2
- QR matrix from Agent 3

## What You Build
1. **Model Pipeline**: Load and run the artistic generation model
2. **Conditioning**: Apply style, palette, and QR-structure constraints
3. **4-Candidate Diversity**: Generate 4 distinct candidates per prompt, not 1
4. **Provider Adapter**: Abstract model provider (OpenAI, Stability, local, etc.)
5. **Candidate Scoring**: Rank candidates by quality rubric

## Shared VPS
You share `qr-artist` with **Agent 2 (Artistic Product/UX)**. You own the model/inference layer; they own design/UX. Coordinate via contracts, not shared files.

## Constraints
- Do NOT modify design system (Agent 2 owns that)
- Do NOT modify QR encoding (Agent 3 owns that)
- Do NOT build web UI (Agent 5 owns that)
- Max 5 colors per palette
- Must preserve finder patterns and format info

## Git Workflow
```bash
git checkout -b agent-4/creative-generation
git push origin agent-4/creative-generation
# Open PR, tag @eahernandezv for review
```

## Acceptance Criteria
- [ ] 4 distinct candidates generated per request
- [ ] All candidates scannable (≥90% via Agent 3 validator)
- [ ] Provider adapter supports at least 2 backends
- [ ] Generation completes in <30 seconds per candidate
- [ ] Conditioning respects design tokens from Agent 2
