# PRD — Level 2 Image-Fit QR / Logo-Pixel QR

Status: Draft v0.1 for Ernesto review and QR fleet execution planning  
Owner: QR Product Architect  
Date: 2026-08-08  
Scope: Focused Artistic QR MVP Level 2 direction

## 1. Product thesis

Level 2 should make the QR itself become the image/brand, not place the QR inside an external poster, label, sticker, or flyer.

**Product promise:** A customer provides a destination and a target logo/image, and QR Studio generates scan-safe QR candidates whose payload, density, mask, and rendering are selected to preserve the image while remaining readable.

This replaces the prior Level 2 “art template” direction for the next build. Creator Signature remains Level 1/basic package.

## 2. Why this matters

Image-embedded QR quality depends on two competing goals:

1. **Scan readability:** the QR must preserve finder/timing/alignment patterns, quiet zone, contrast, data redundancy, and sufficient intact modules.
2. **Image readability:** the target image/logo must remain recognizable after being pixelated, perforated, blended, or used as a background/central figure inside the QR matrix.

The key insight is that the QR payload is not merely content. For image-fit QR, payload choices affect the QR matrix and therefore become part of the visual design space.

## 3. Personas and jobs-to-be-done

### P1 — Creator/brand owner
- Wants a QR that visibly carries their logo/mark rather than looking like a generic code.
- Needs high confidence that people can scan it from social posts, phones, and printed assets.

### P2 — Small business/operator
- Wants product, menu, booking, or event URLs represented by branded QR images.
- Does not want to understand QR version, mask, ECC, or payload encoding.

### P3 — Agency/marketer
- Wants to generate multiple visual candidates and choose the tradeoff between readability and brand/image prominence.
- Needs evidence and fallbacks before sending artwork to clients.

## 4. Launch scope

### Included in Level 2 v0/v1

- Upload/select one target image or logo for a single QR project.
- Generate multiple image-fit QR candidates using a controlled search over QR/payload/render settings.
- Use an optimized short link by default when the destination is a URL.
- Return three user-facing tradeoff candidates when possible:
  - **Readable** — strongest scan safety, lower image dominance.
  - **Balanced** — recommended default.
  - **Image-first** — strongest image resemblance that still passes validation.
- Show honest scan/readability evidence for each candidate.
- Provide deterministic fallback to Level 1 styled QR if no image-fit candidate passes.
- Preserve Level 1 controls where compatible: Body Color, Corner Color, Style, Corners, Eyes, intensity, QR size/prominence, Creator Signature if it does not interfere with the image-fit surface.
- Export the selected validated composition as the finished artifact.

### Explicit exclusions

- Generic URL shortener product.
- Public analytics dashboard.
- Customer accounts.
- Customer custom domains.
- A/B routing, geolocation/device routing, campaign management, or subscription link management.
- Arbitrary drag/drop editing inside the QR matrix.
- Full prompt-generated campaign/poster artwork.
- Claims of universal scanning across all devices, lighting, print materials, and sizes.
- Using user-uploaded images with external providers unless separately approved under privacy/IP terms.

## 5. Functional requirements

### Image input and preprocessing

- **L2-FR-001:** The product MUST allow a user to provide one target image/logo for image-fit QR generation.
- **L2-FR-002:** The product MUST preprocess the target image into scan-compatible representations such as crop, alpha/background handling, contrast normalization, silhouette extraction, and grid/pixel-map variants.
- **L2-FR-003:** The product MUST classify image complexity at least coarsely: simple mark, medium logo, complex/photo-like image, and high-risk thin/detail-heavy image.
- **L2-FR-004:** The product MUST preserve critical QR functional zones from image overwrite: quiet zone, finder patterns, timing patterns, alignment patterns, format/version information, and minimum viable data modules.
- **L2-FR-005:** The product MUST provide actionable failure guidance when the image is too complex or too low contrast for the requested QR size/style.

### Payload and short-link optimization

- **L2-FR-010:** For URL destinations, the product SHOULD use an owned optimized short link by default for image-fit QR.
- **L2-FR-011:** The short-link payload MUST redirect to the customer target URL through a validated one-hop public redirect.
- **L2-FR-012:** The system MUST validate target destinations and block unsafe schemes, control characters, credential-bearing URLs where policy prohibits them, and known dangerous/reserved targets.
- **L2-FR-013:** The optimizer MUST be able to generate multiple candidate slugs for the same target URL and evaluate which QR matrices best support the target image.
- **L2-FR-014:** The optimizer MAY vary slug length and characters, route prefix, QR version, error-correction level, and mask pattern to find better scan/image tradeoffs.
- **L2-FR-015:** The product MUST NOT expose short-link creation as a general public shortener; short links are project-bound QR optimization infrastructure.
- **L2-FR-016:** Public redirect serving SHOULD be one-hop from optimized short link to final target. Internal resolver chaining is allowed; unnecessary public multi-hop redirects SHOULD be avoided.
- **L2-FR-017:** The product MUST keep a stable mapping from chosen short slug to target destination for the purchased/exported project.
- **L2-FR-018:** Destination edits after export are not part of MVP customer UI. Admin/support correction MAY be supported as a narrow recovery path if product/legal policy approves it.

### QR candidate generation

- **L2-FR-020:** The generator MUST produce candidates across a bounded matrix of QR settings: version/module count, ECC level, mask pattern, module style, image dominance/strength, and image treatment.
- **L2-FR-021:** Candidate generation MUST evaluate QR density as a fit variable rather than always using the minimum possible QR version.
- **L2-FR-022:** The system MUST support forced/larger QR versions with short payloads when image resolution needs a denser grid without increasing payload length.
- **L2-FR-023:** The system MUST test all available QR mask patterns or a documented subset when searching for image fit.
- **L2-FR-024:** Candidate generation MUST preserve a safe deterministic fallback path when image-fit candidates fail.
- **L2-FR-025:** Candidate generation SHOULD produce at least three ranked candidate styles when feasible: Readable, Balanced, Image-first.

### Image-fit scoring

- **L2-FR-030:** Each candidate MUST receive a scan/readability verdict based on automated decoder validation.
- **L2-FR-031:** Each candidate SHOULD receive an image-fit score based on target-image resemblance after QR integration.
- **L2-FR-032:** The selection algorithm MUST combine scan score and image score using mode-specific weights for Readable, Balanced, and Image-first.
- **L2-FR-033:** The system MUST block or clearly mark candidates that fail the launch scan threshold, even if they look visually strong.
- **L2-FR-034:** The product MUST disclose uncertainty honestly: validation evidence is not a universal guarantee.

### User experience

- **L2-FR-040:** The user-facing controls MUST avoid technical QR internals by default.
- **L2-FR-041:** The preferred user-facing controls are:
  - image treatment: Logo / Pixel blend / Background image / Cutout-perforated;
  - strength: Readable / Balanced / Image-first;
  - detail: Simple / Detailed / Maximum;
  - link mode: Optimized short link recommended / Original URL advanced.
- **L2-FR-042:** The UI MUST explain that optimized short links help create a scan-safe QR pattern that fits the image more cleanly.
- **L2-FR-043:** The UI MUST show when using the original URL reduces fit quality or scan reliability.
- **L2-FR-044:** The UI MUST show candidate evidence compactly: scan status, density/module count, and image-fit recommendation.

### Export and artifact integrity

- **L2-FR-050:** Exported artifacts MUST use the same geometry and selected candidate settings shown in preview.
- **L2-FR-051:** Exported artifacts MUST encode the chosen payload, not a hidden different destination.
- **L2-FR-052:** Export metadata SHOULD record non-sensitive provenance: image-fit mode, QR version, ECC, mask, validation version, and short-link slug/project reference.
- **L2-FR-053:** The product MUST provide a safe fallback export if the image-fit candidate cannot pass validation.

## 6. Non-functional requirements

- **L2-NFR-001 Scan reliability:** A candidate labeled exportable MUST pass the approved decoder matrix at configured render sizes and perturbations.
- **L2-NFR-002 Latency:** Initial v0 spike may be offline/batch. Product v1 SHOULD return candidate results within a user-tolerable bounded time target to be set after spike measurement.
- **L2-NFR-003 Privacy:** Uploaded target images SHOULD remain browser-local for the first implementation unless server-side optimization is explicitly approved. If images are uploaded, retention, deletion, and provider-use rules must be disclosed.
- **L2-NFR-004 Security:** Short-link destination validation, redirect response policy, slug namespace protection, rate limits, and abuse controls are required before public short-link use.
- **L2-NFR-005 Availability:** Short-link redirect runtime must be more operationally reliable than the editor/control surface because exported/printed QRs depend on it.
- **L2-NFR-006 Performance:** The optimizer must bound slug/mask/version search to prevent abuse and runaway CPU/cost.
- **L2-NFR-007 Accessibility:** Image-fit controls and candidate evidence must remain keyboard/screen-reader accessible.
- **L2-NFR-008 Honesty:** The product must distinguish controlled decoder proof from real-world universal scan guarantees.

## 7. Short-link architecture requirements

### Public behavior

```text
QR payload -> https://<owned-short-domain>/<slug> -> customer target URL
```

- Public redirect SHOULD be one hop.
- Redirect status should be explicitly chosen, likely 302 or 307 for editable-safe behavior; do not use 301 by default.
- Cache headers must avoid trapping incorrect destinations during recovery.

### Internal resolver behavior

```text
slug -> project/route record -> active destination + optimization metadata
```

Internal multi-step lookup is allowed. Public multi-hop redirect chains are not preferred.

### Slug search behavior

The short-link service should support reserving/evaluating multiple candidate slugs for the same target during optimization, then committing exactly one chosen slug for the purchased/exported project.

## 8. Acceptance journeys

- **L2-AJ-01:** User enters a long target URL, uploads a simple logo, selects Balanced, receives image-fit QR candidates, chooses one, exports it, and the exported QR scans to the final target URL via the chosen optimized short link.
- **L2-AJ-02:** User compares Readable, Balanced, and Image-first candidates and sees a clear scan/image tradeoff without technical QR jargon.
- **L2-AJ-03:** A complex/photo-like image fails or is downgraded with actionable guidance rather than producing a misleading unscannable export.
- **L2-AJ-04:** Optimizer evaluates multiple slugs/masks/versions and records the selected candidate’s density, ECC, mask, scan verdict, and image-fit evidence.
- **L2-AJ-05:** User chooses Original URL advanced mode; UI warns when density/fit becomes worse than the optimized short-link version.
- **L2-AJ-06:** Short-link resolver is down or target validation fails; export is blocked or degraded safely, and no broken printed QR is falsely labeled ready.

## 9. Open decisions

1. Owned short domain: use current domain path first, acquire/use a very short domain, or both?
2. Browser-local vs server-side optimization for v1.
3. Decoder matrix and physical/device scan threshold for image-fit candidates.
4. Supported image formats and max upload size.
5. Whether admin/support can edit destination after export in MVP.
6. Whether short links are included in $12 project or only Level 2 paid package.
7. Exact naming: Image-Fit QR, Logo-Pixel QR, Embedded Image QR, or another product label.
8. Storage/retention for uploaded images and optimization metadata.
9. Whether custom customer domains remain deferred for this package.

## 10. Success metrics

- At least one simple-logo reference and one medium-logo reference produce a Balanced candidate that passes decoder validation.
- Balanced candidate is visually recognizable to sponsor/user at mobile preview size.
- Optimized short-link candidate demonstrably outperforms original long URL on at least one density/scan/image-fit comparison.
- Candidate evidence contains QR version/module count, ECC, mask, payload length, slug, scan verdict, and image-fit score.
- Export preview parity is mechanically verified.

## 11. Product boundary update

Creator Signature remains Level 1/basic package. Level 2 is now **Image-Fit QR / Logo-Pixel QR**, not poster/label/sticker/flyer templates. Level 3 remains custom campaign artwork and prompt/reference-driven bespoke composition.
