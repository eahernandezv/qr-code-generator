# Q13 Logo-Fit Premium Polish Cycle 1

Status: **Product-validated merge candidate**

## Goal

Improve the accepted Q11 Logo-Fit/Image-Fit raster path toward a more sponsor-facing clean mascot/logo result without weakening the hard QR gates.

## Change

Q13 adjusts only the active-module texture mix in the Q10/Q11 raster Image-Fit path:

- foreground pixels on active QR modules carry more uploaded-logo color;
- internal negative-space pixels become more conservative;
- background-connected exterior whitespace remains omitted, preserving the Q11 no-broad-substrate behavior.

This keeps the public contract and generated Small/Medium/Large candidate flow unchanged.

## Evidence

- Contact sheet: `docs/program/evidence/q13-logo-fit-cycle1/contact-sheet-q11-vs-q13.png`
- Objective evidence: `docs/program/evidence/q13-logo-fit-cycle1/objective-evidence.json`
- Candidate artifacts: `docs/program/evidence/q13-logo-fit-cycle1/q13-candidate/`

## Objective results on controlled RGB logo target

Q11 baseline:

- Small 40%: scan pass, 8/8 checks, 0 protected violations, recognition `0.808731`
- Medium 50%: scan pass, 8/8 checks, 0 protected violations, recognition `0.859408`
- Large 60%: scan pass, 8/8 checks, 0 protected violations, recognition `0.895685`

Q13 candidate:

- Small 40%: scan pass, 8/8 checks, 0 protected violations, payload equal, recognition `0.94158`
- Medium 50%: scan pass, 8/8 checks, 0 protected violations, payload equal, recognition `0.962649`
- Large 60%: scan pass, 8/8 checks, 0 protected violations, payload equal, recognition `0.974063`

## Product visual review

The Q13 row is a clear visual improvement over Q11 for Logo-Fit / Clean Mascot. The mark is substantially more recognizable, with stronger cyan/purple source-color continuity and a cleaner mascot/logo silhouette. Medium becomes the best default: it now reads as a deliberate embedded logo rather than a faint motif reconstructed from QR noise. Large has the strongest sponsor-facing presence but should still remain a comparison candidate until physical scan confirmation.

No broad pasted white substrate is visible in the contact sheet. The candidate still reads as a QR-dominant Logo-Fit step, not Level 3 Brand-Matrix or full Campaign-Art.

## Validation

Passed before evidence generation:

- `@qr/artistic-qr build`
- `vitest run src/image-fit.test.ts src/visual-quality.test.ts --pool=threads --testTimeout=45000`: 37 tests pass

Passed after evidence generation:

- `objective-evidence.json` JSON parse
- `git diff --check`

## Product decision

Promote Q13 as the next deterministic Logo-Fit polish improvement. Keep export locked and keep UI visual acceptance labels conservative until payment, committed short-link, preview/export parity, physical smoke, and release gates are proven.
