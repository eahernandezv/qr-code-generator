# Design style options — Clean Logo-Fit first

Created: 2026-09-05
Updated: 2026-09-05 whitespace remediation
Base URL: https://placeholder-online.com

## Product decision

Expose two customer-selectable Level 2 design styles:

1. **Clean Logo** (`clean_logo_fit`): preserves a crisp logo/mascot over a scan-safe QR.
2. **Art Blend** (`embedded_image_fit`): visibly interweaves the uploaded image with the QR matrix.

Default recommendation: **Clean Logo** first.

## Whitespace correction

Ernesto flagged visible white space/halo in the Clean Logo outputs. Root cause: the Clean Logo raster renderer still painted a scan-safe silhouette substrate for exterior/background-connected pixels. That substrate is useful for the embedded Art Blend look, but it is visually wrong for Clean Logo because it creates white caps/halos around the mascot.

Fix: Clean Logo now paints only true foreground plus enclosed internal negative-space details, and skips exterior/background-connected silhouette substrate.

## Verified implementation

- Added optional `user_controls.image_embedding_style` to `image-fit-qr-api.v1`.
- Public UI exposes buttons: `Clean Logo` and `Art Blend`.
- Default public generation uses `clean-logo-fit-q11-preserve-subject`.
- `Art Blend` still routes to `image-fit-raster-image-layer-q10-continuous`.
- Export remains gated by Core authority/payment/parity blockers.

## Public proof summary

Proof command: `STUDIO_URL=https://placeholder-online.com node scripts/design-style-proof.mjs`

- fox Clean Logo: 3 validated / 3 scan-pass size candidates, all 8/8 checks.
- fox Art Blend: 3 validated / 3 scan-pass size candidates, all 8/8 checks.
- wolf Clean Logo: 3 validated / 3 scan-pass size candidates, all 8/8 checks.
- wolf Art Blend: 3 validated / 3 size candidates, small/medium 8/8 and large 7/8 while still returned as pass by current validator.

Evidence:

- Contact sheet: `clean-logo-vs-art-blend-contact-sheet.png`
- Proof JSON: `proof.json`

## Visual product review

### Clean Logo

Strengths:

- Better customer/commercial readability.
- Fox and wolf remain more recognizable and emotionally clean.
- Medium is the best default balance: clear mascot, controlled QR damage, scan-pass.
- Exterior white halo/substrate is reduced after the whitespace fix.

Weaknesses:

- Still reads closer to enhanced Icon-Island / Logo-Fit than pure embedded QR art.
- Some QR texture remains over face details; next quality loop should protect eyes/nose/mouth more aggressively.
- Internal white mascot details, such as muzzle/face highlights, remain intentionally preserved.

### Art Blend

Strengths:

- Stronger Level 2 thesis: the image participates in the QR matrix.
- Useful as a distinct customer option for a more experimental look.

Weaknesses:

- Noisier and less premium, especially in faces.
- Wolf large is riskier and visually muddier.
- Should remain secondary until visual cleanup improves.

## Recommended next optimization target

Optimize **Clean Logo / Medium** first.

Acceptance target for next loop:

- fox + wolf medium both scan 8/8;
- preserve eyes/nose/mouth with visibly less QR speckling;
- keep exterior/background-connected white substrate absent;
- preserve intentional internal white details like muzzle/face highlights;
- keep public UI selection working;
- visual acceptance target: >=4/5 for Clean Logo medium.
