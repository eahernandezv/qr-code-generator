# Level 2 Image-Fit QR UX flow

## Product boundary

This is one project-bound creation flow. It does not expose accounts, campaigns, analytics, dynamic destination editing, custom domains, or a generic shortener.

Prototype route:

```text
/concepts/level2-image-fit-qr
```

The accepted Level 1 Studio remains unchanged.

## Primary journey

```text
Enter final URL
  -> choose one image/logo
  -> select treatment
  -> select strength
  -> select detail
  -> use Optimized short link (recommended)
  -> request bounded optimizer candidates
  -> compare Readable / Balanced / Image-first evidence
  -> select validated candidate
  -> atomically commit its reserved slug
  -> verify committed redirect + encoded payload
  -> export selected artifact
```

Generation, slug commit, and export are deliberately absent from the visual spike because QR Creator optimizer and purchase/export authority contracts are not frozen yet. The prototype says `Not run`, `— modules`, and `Awaiting Creator`; it never fabricates scan confidence.

## Screen structure

### 1. Preview-first workspace

- Large image-fit matrix preview.
- Explicit `Illustrative matrix only` marker during spike.
- Compact top evidence strip:
  - **Scan:** Not run / Passed controlled checks / Failed / Fallback required.
  - **Density:** `<moduleCount> modules` (optionally `Version <n>` in detail disclosure).
  - **Image fit:** Recommended / viable / weak / awaiting optimizer.
- Evidence language states controlled decoder proof is not a universal guarantee.

### 2. Inputs

- **Target image:** one browser-local file in the initial privacy posture; supported type/size contract still required.
- **Destination:** one absolute target URL. Validation occurs before reservation and before commit.

### 3. Product controls

#### Treatment

- **Logo** — protect a central mark with conservative blending.
- **Pixel blend** — integrate image structure into module styling.
- **Background image** — use image tones behind protected QR zones.
- **Cutout-perforated** — preserve the image through controlled module cutouts.

#### Strength

- **Readable** — strongest scan margin.
- **Balanced** — recommended default.
- **Image-first** — strongest image prominence that still must meet the export threshold.

#### Detail

- **Simple** — reduce thin/detail-heavy image structure.
- **Detailed** — default compromise.
- **Maximum** — preserve more detail; may require denser grid or downgrade.

#### Link mode

- **Optimized short link — Recommended**
  - Helper: “A shorter owned payload gives the optimizer more freedom to find a cleaner image-fit matrix. One committed project slug redirects directly to your validated destination.”
- **Original URL — Advanced**
  - Warning: “Original URLs can increase QR density and reduce image clarity. Candidate evidence must compare both payloads before export.”

The UI never calls the short link “tracking,” “dynamic,” or “campaign.”

### 4. Candidate comparison

Exactly three product modes when feasible:

- Readable
- Balanced (recommended default)
- Image-first

Each card consumes QR Creator evidence rather than calculating it in Studio:

- scan verdict and controlled-test summary;
- module count/density;
- image-fit recommendation/score band;
- warnings and fallback requirement;
- payload mode (optimized/original) and comparative fit impact.

Technical ECC/mask/version details belong in an optional evidence disclosure or report/export metadata, not the primary product controls.

## States and failure guidance

| State | Studio behavior |
|---|---|
| no image | show target-image requirement; no optimizer request |
| unsupported/too large | reject locally with supported type/size guidance |
| unsafe destination | block reservation/generation and name URL policy issue |
| short-link unavailable | offer original-URL comparison only if Creator can validate it; otherwise block export |
| complex/high-risk image | show simplify/crop/increase-detail guidance based on Creator reason codes |
| no scan-safe image-fit result | show deterministic Level 1 fallback; do not badge failed art as ready |
| reserved slug expires | reserve a fresh bounded batch and rerun affected candidates |
| committed slug read-back mismatch | block export and surface recovery error |
| original URL hurts fit | persistent amber warning plus comparative module/fit evidence |
| resolver unavailable | block short-link commit/export; never print a broken optimized payload |

## Accessibility

- Native labeled destination and file inputs.
- Product choices are real buttons with `aria-pressed` and visible selected borders/fills.
- No information depends on colour alone.
- Candidate evidence uses semantic headings and definition lists.
- Warning uses `role="alert"` after selecting Original URL.
- Keyboard order follows image, destination, treatment, strength, detail, link mode, evidence.

## Contract fields required from QR Creator optimizer

### Request accepted by Creator

```ts
interface ImageFitRequest {
  requestId: string
  projectId: string
  destinationDigest: string
  payloads: Array<{
    mode: 'optimized-short-link' | 'original-url'
    encodedUrl: string
    payloadByteLength: number
    reservationId?: string
    slug?: string
    reservationExpiresAt?: string
  }>
  image: {
    reference: string // browser-local/approved upload reference, not an invented public URL
    sha256: string
    mediaType: 'image/png' | 'image/jpeg' | 'image/webp' | 'image/svg+xml'
    width: number
    height: number
    complexity?: 'simple' | 'medium' | 'complex' | 'high-risk'
  }
  treatment: 'logo' | 'pixel-blend' | 'background-image' | 'cutout-perforated'
  strength: 'readable' | 'balanced' | 'image-first'
  detail: 'simple' | 'detailed' | 'maximum'
  searchBudget: { maxCandidates: number; deadlineMs: number }
}
```

### Candidate returned to Studio

```ts
interface ImageFitCandidate {
  candidateId: string
  mode: 'readable' | 'balanced' | 'image-first'
  rank: number
  payload: {
    mode: 'optimized-short-link' | 'original-url'
    encodedUrl: string
    payloadByteLength: number
    reservationId?: string
    slug?: string
    destinationDigest: string
  }
  qr: {
    version: number
    moduleCount: number
    ecc: 'Q' | 'H'
    mask: number
  }
  scan: {
    verdict: 'passed' | 'failed' | 'not-run'
    eligibleForExport: boolean
    evidenceId: string
    validatorVersion: string
    decodedPayloadSha256?: string
    testedSizes: number[]
    perturbationSummary: string
  }
  imageFit: {
    score: number
    band: 'recommended' | 'viable' | 'weak'
    protectedZoneConflict: boolean
    complexity: 'simple' | 'medium' | 'complex' | 'high-risk'
  }
  warnings: Array<{
    code: 'original_url_density' | 'image_too_complex' | 'low_contrast' | 'short_link_unavailable' | 'fallback_required'
    message: string
  }>
  artifact: {
    previewRef: string
    exportIntentRef: string
    geometryHash: string
    artifactSha256: string
  }
}
```

### Slug commit boundary needed by Studio

```ts
interface CommitShortLinkRequest {
  idempotencyKey: string
  projectId: string
  candidateId: string
  reservationId: string
  slug: string
  destinationDigest: string
}
interface CommittedShortLink {
  projectId: string
  slug: string
  publicUrl: string
  destinationDigest: string
  state: 'committed'
  committedAt: string
  mappingVersion: number
}
```

Studio needs Product Architect to freeze: public base URL, destination policy/version, reservation TTL/search cardinality, commit authority/trigger, whether a committed mapping is immutable, and the exact controlled scan threshold language.
