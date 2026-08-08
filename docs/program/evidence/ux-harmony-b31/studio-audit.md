# B31 Studio visual audit — UX harmony

## Source evidence

| Panel | Source | SHA-256 | Before-state audit |
|---|---|---|---|
| QR Style | `~/qr-workspace/ux-harmony-screenshots/qr-style.jpg` | `2a8ea5305aa7cab3d0d9e0cb1174d7d66619ced0c95df8df1b02f59a4acaec77` | Top active tab was muted slate while inner family selection was indigo. The lower tray was correctly compact and outlined, but flatter and less deliberate than the signature tray. The selected swatch used a white perimeter plus indigo halo/check, creating a second selected recipe. |
| Creator Signature | `~/qr-workspace/ux-harmony-screenshots/creator-signature.jpg` | `3e83a21679cf0a2412c746e3b18a9c4dc44db11c3c4d90fd2dfd5a29923e1aa8` | Top active tab, whole panel outline, active line, style choices, and dots all leaned bright cyan. The glow made the entire section read as a separate skin rather than an active-edit state within the Studio. |
| Destination | `~/qr-workspace/ux-harmony-screenshots/destination.jpg` | `dfa173beba3058b7a06570a9548c4a1827185442389c71dbc6dc05187ba7aa6a` | Top active tab and URL chip used indigo, but the panel radius/background/padding differed from both other trays. Disabled CTA text and placeholder were too muted relative to the helper line. |

## Final token decisions

1. **Primary selected token:** Studio indigo (`studio-600` fill for top navigation; translucent `studio-500` fill + `studio-400` perimeter/ring for inner choices). It is used by all three top tabs and selected inner controls.
2. **Focus token:** `studio-300` two-pixel focus-visible ring with a slate-950 offset. Cyan remains only on the Creator Signature active-line/edit container, where it communicates editing focus rather than generic selection.
3. **Panel token:** `rounded-xl`, one-pixel `slate-700/70` border, `slate-950/40` background, and a restrained black shadow. Compact trays use `p-1.5`; all three lower panels expose `data-ui-panel="harmony"` for regression checks.
4. **Inactive token:** low-depth translucent white surface, subtle white/slate perimeter, slate-400 copy, and a restrained hover lift.
5. **Selected tile perimeter:** indigo border/ring; the checkmark is inset at `top/right 1.5` with its own border so it does not collide with the selected perimeter.
6. **Destination readability:** disabled CTA uses slate-700 with slate-300 text and slate-600 border; helper copy is slate-200; placeholder rises to slate-500. The focused input uses the shared indigo focus token.
7. **Density:** no new rows or wrappers were added. QR Style keeps `pb-3` selector scrollbar clearance; compact tray padding was normalized without increasing the intended no-scroll footprint.

## Frozen behavior retained

The harmonization changes presentation only. Creator Signature remains exactly two blank-by-default editable/rendered lines with independent font/color/size, fixed placement/offset behavior, and no third/CTA default. Public destination typing remains draft-only until payment; Core QR preview and side controls are unchanged.
