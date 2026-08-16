# QR Product Architect — Q9 Cycle 5 Background Whitespace Trim

Status: **ACCEPT CYCLE 5 AS CURRENT MEDIUM-LOGO WINNER; LOOP STILL OPEN**

## Change

Cycle 5 adds a connected-background trim in the Q9 visual island renderer. White/background-like pixels are preserved as logo negative space only when they are enclosed by foreground inside the detected crop. Background connected to the crop edge is treated as exterior whitespace and omitted from the overlay.

## Scores

| Candidate | Score | Decode | Verdict |
|---|---:|---:|---|
| Readable | 80 | 8/8 | safe lower tier |
| Balanced | 96 | 8/8 | current winner; top/background white cap reduced |
| Image-first | 93 | 8/8 | strong but less calm than Balanced |

## Product visual decision

The circled top/background whitespace is materially reduced on the medium-logo Balanced output while the meaningful internal logo negative space remains. This improves target recognizability and image/QR harmony without changing the public contract or weakening scan gates.

## Evidence

- Contact sheet: `docs/program/evidence/q9-quality-loop/cycle-5-background-trim/contact-sheet.png`
- Scores: `docs/program/evidence/q9-quality-loop/cycle-5-background-trim/scores.json`
- Objective evidence: `docs/program/evidence/q9-quality-loop/cycle-5-background-trim/objective-evidence.json`
- Manifest: `docs/program/evidence/q9-quality-loop/cycle-5-background-trim/sha256.txt`

## Next

Run Cycle 6 generalization with background trimming enabled across simple silhouette, medium logo, and textured subject. Studio remains paused.
