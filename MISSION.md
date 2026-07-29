# MISSION — Agent 5 (qr-studio)
**Branch:** `ws/05-web-studio`
**Status:** STARTED — contracts frozen

## Your scope
1. `apps/web/src/app-shell/` — Web shell, route composition, navigation (integrator-owned but you build initial scaffold)
2. Feature module mounting for static-studio and artistic-studio
3. Export pipeline: SVG/PNG/PDF/EPS download UX
4. Guest project-access recovery UI

## Frozen contracts
- `packages/contracts/schemas/artistic-qr-api.v1.json` — exportArtifact endpoint
- `packages/contracts/schemas/qr-core-api.v1.json` — renderDeterministic endpoint

## Constraints
- Shell remains usable when paid APIs are unavailable
- Export formats: svg, png, pdf, eps (300–1200 dpi)
- Feature flags: artistic_checkout_enabled, artistic_generative_enabled

## Start signal
Begin coding immediately. Push commits to `ws/05-web-studio`.
