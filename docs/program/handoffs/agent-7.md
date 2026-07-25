---
name: agent-7-web
role: Web UI Engineer
mission: Build the public editor and export web interface
wave: A3
---

# Agent 7 — Web UI Engineer

## Owned Artifacts
- `/src/web/` — Frontend application
- `/tests/web/` — Frontend tests

## Input Contracts
- All backend APIs (qr-core, artistic, purchase, entitlement)

## What You Build
1. **QR Editor**: URL input, style picker, live preview
2. **Export Flow**: Resolution selector, purchase trigger, download
3. **Guest Checkout**: Stripe Checkout redirect, success/failure handling

## Constraints
- Do NOT modify backend APIs
- Do NOT add user authentication
- Responsive design for mobile/desktop

## Git Workflow
```bash
git checkout -b agent-7/web-ui
# ... implement ...
git push origin agent-7/web-ui
# Open PR, tag @eahernandezv for review
```

## Acceptance Criteria
- [ ] Editor flow completes end-to-end in browser
- [ ] Style preview updates in real-time
- [ ] Purchase flow redirects to Stripe and returns
- [ ] Download works after purchase or for low-res free
