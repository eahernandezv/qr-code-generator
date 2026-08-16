# QR Product Architect — Q9 Cycle 7 Centroid Centering

Status: **PARTIAL ACCEPT; CENTERING IMPROVED FOR LOGO/SIMPLE, TEXTURED NEEDS NARROW REMEDIATION**

| Target | Best visually centered candidate | Score | Decode | Product decision |
|---|---|---:|---:|---|
| simple-silhouette | image_first | 90 | 8/8 | Improved centering; selected |
| medium-logo | balanced | 97 | 8/8 | Best logo result so far; selected |
| textured-subject | balanced | 86 | 6/8 | Visually better centered but scan margin regressed |
| textured-subject | readable | 84 | 8/8 | Robust selected fallback until Cycle 8 |

## Decision

Centroid-based placement is a good scoring opportunity for simple/logo targets. It raises the medium-logo path from 96 to 97 and the simple silhouette from 89 to 90. However, applying the same centering globally reduces textured-subject Balanced from 8/8 to 6/8. Since the goal is major quality without weakening scan gates, Cycle 8 should make centering target-aware: full centroid centering for simple/logo, damped centering for textured/complex targets.

Studio remains paused.
