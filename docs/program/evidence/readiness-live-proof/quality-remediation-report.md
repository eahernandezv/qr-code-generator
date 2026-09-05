# Level 2 Image-Fit visual confidence pass — fox/wolf

Created: 2026-09-05T08:15:57Z
Base exercised: local production-built Core service at `http://127.0.0.1:8787`
Branch: `pa/q10-visual-confidence`

## Product verdict

**PASS AS CONTROLLED LEVEL 2 DEMO CANDIDATE / HOLD PUBLIC RELEASE UNTIL LIVE UI PROOF.**

This pass continues the prior remediation by tuning the Q10 raster Image-Fit layer for better sponsor-demo confidence:

- low-resolution readiness still detects real foreground bounds;
- prepared assets still crop/scale around the detected foreground;
- the broad pasted white-square substrate remains removed;
- the image layer now uses **size-aware QR texture blending**: small/medium variants preserve more subject color while large stays punchier for QR/art integration;
- fox and wolf both generate scan-passing small/medium/large variants;
- readable contact-sheet labels replace the prior primitive bitmap labels;
- explicit Product-quality scores are saved in `quality-score.json`.

This is now strong enough to call a **controlled Level 2 Image-Fit demo candidate** for Core/readiness evidence. It is not yet a public sponsor release because apex/public UI proof is still unavailable (`placeholder-online.com` was returning Cloudflare 530 in the prior check) and normal Studio flow proof has not been rerun from the merged `main` baseline.

## Evidence

- Readable contact sheet: `docs/program/evidence/readiness-live-proof/fox-wolf-readable-quality-sheet.png`
- Raw contact sheet: `docs/program/evidence/readiness-live-proof/fox-wolf-source-prepared-output-review.png`
- Proof JSON: `docs/program/evidence/readiness-live-proof/proof.json`
- Quality score JSON: `docs/program/evidence/readiness-live-proof/quality-score.json`
- This report: `docs/program/evidence/readiness-live-proof/quality-remediation-report.md`

## Readiness proof summary

### Fox

- `subjectRegion`: `{ "x": 0.2, "y": 0.076, "width": 0.606, "height": 0.803 }`
- cleanup actions: `pad`, `crop`, `center_subject`
- readiness proof scan: `4 passed / 0 failed` (`jsQR`, `mvp-l2-readiness-v1`)
- generated candidates: `3`
- validated candidates: `3`
- artifact hashes:
  - small: `8e6df5600bd6757fb0811d62dc949cc4f8d6e5425d604731194708dfb8313ee9`
  - medium: `5a5bf45e5f609810bf1f040abaef418c44ec0bd54724e9d11d665578cd416d39`
  - large: `bc08d89c8c1f650ca49bd42f9aabe2f85a31c09e9316025a53b72cdd5924be1b`

### Wolf

- `subjectRegion`: `{ "x": 0.194, "y": 0.076, "width": 0.617, "height": 0.803 }`
- cleanup actions: `pad`, `crop`, `center_subject`
- readiness proof scan: `4 passed / 0 failed` (`jsQR`, `mvp-l2-readiness-v1`)
- generated candidates: `3`
- validated candidates: `3`
- artifact hashes:
  - small: `9c5929ec74a80f85bbcf9c703a44b08498cad84e013afb31fc585e465ff74915`
  - medium: `ae85e0df43fbe81476e051f2fcedec7dd21ca3ff785188d4368a822e3beb383c`
  - large: `a7ea34dcaf63bc2c3a6dea5f265544243d66158917e4c3ea98e4a3bbbda82537`

## Visual score

Scale: 1 = poor, 5 = sponsor-demo strong.

### Fox

- Scan safety: 5
- Recognizability: 4
- Cleanliness: 4
- QR/art balance: 4
- Sponsor-demo confidence: 4
- Best candidate: **large**. It has the strongest Image-Fit read: recognizable fox, no broad pasted white square, and visible QR texture through the face. Medium is cleaner but less integrated.

### Wolf

- Scan safety: 5
- Recognizability: 4
- Cleanliness: 4
- QR/art balance: 4
- Sponsor-demo confidence: 4
- Best candidate: **medium**. It balances wolf recognition and QR texture best. Large is more integrated but noisier around the eyes/face.

## Product interpretation

Accepted improvements:

1. **Subject detection fixed** — no fake 1×1 foreground region.
2. **Prepared asset occupancy improved** — source subject is cropped and scaled before proof.
3. **Variant generation improved** — fox/wolf produce small, medium, and large validated variants.
4. **White-square substrate removed** — output no longer shows a broad pasted white card behind the icon.
5. **QR/art integration improved** — QR texture passes through the image layer, with size-aware blending for readability.
6. **Sponsor-confidence threshold met for controlled evidence** — at least one fox and one wolf candidate now score `4/5`.

Remaining release gates:

1. Re-run normal public UI/Studio proof from merged `main` after deployment is healthy.
2. Confirm public URL availability; prior apex check returned Cloudflare 530.
3. Run physical smoke contact-sheet scan if this becomes a sponsor-facing packet.

## Gates run

- `npm exec --yes pnpm@9.0.0 -- --filter @qr/qr-core build` — pass
- `npm exec --yes pnpm@9.0.0 -- --filter @qr/artistic-qr build` — pass
- `npm exec --yes pnpm@9.0.0 -- --filter @qr/artistic-qr exec vitest run src/image-fit.test.ts --pool=threads --poolOptions.threads.singleThread=true` — 29 tests pass
- Local production-built Core service smoke: `node packages/artistic-qr/dist/http-service-main.js` on `127.0.0.1:8787`
- `STUDIO_URL=http://127.0.0.1:8787 node scripts/readiness-live-proof.mjs` — fox/wolf readiness + generation pass
- `node scripts/build-quality-review-sheet.mjs` — raw contact sheet generated
- Python/Pillow readable contact sheet generation — pass

## Next recommended bounded step

Integrate this confidence pass through PR, then run a deployment/UI proof stage when the public route is healthy:

- update live demo worktree to merged `main`;
- rebuild/restart Core/web if owned runtime is available;
- verify normal UI path: upload → readiness → generate → candidate cards;
- if public apex still returns Cloudflare 530, classify deployment as blocked separately from Core quality.
