# Flagship Artistic QR MVP Brief

Status: Primary major deliverable. Broader QR infrastructure is deferred until this release gate passes.

## Product thesis

The MVP is not a conventional QR generator with an “artistic” checkbox. It is a premium creative instrument whose output can stand alone as branded artwork while retaining measured QR function. The product should win on the combination of **artistic quality, useful control, and trustworthy scannability**.

The MVP will use a **non-ad-based, one-time project model**. Display advertising, subscriptions, generic credit wallets, per-size pricing, and lifetime/unlimited generation are excluded from MVP.

## Approved MVP offer

- **Free preview — $0:** one successful round with four preview-quality artistic candidates and scan-check evidence; no final professional export.
- **Artistic QR Project — $12:** three successful rounds total (the free round plus two after payment), up to 12 candidates, refinement/repair, one finished artwork, all standard digital/print sizes, high-resolution PNG, applicable SVG, print guidance, scan-validation summary, and deterministic fallback.
- **Extra Exploration — $5:** offered contextually after the included rounds are exhausted; adds two successful rounds (up to eight candidates) and one additional finished-artwork export.

Public messaging sells a finished project: **“Preview 4 options free. Pay $12 to explore up to 12 options and export one finished QR artwork.”** Boards, provider calls, repair attempts, and internal compute units are not presented as a customer credit wallet.

A round counts only when the promised reviewable candidates are returned. Provider errors, product errors, incomplete boards, or all-unscannable boards do not consume the customer allowance, subject to internal retry and abuse caps.

## Target outcome

A customer can move from a URL/text payload and creative intent to a publication-ready artistic QR in minutes, understand why it is considered robust, refine it without starting over, and export it confidently for digital or print use.

## Signature experience

1. Enter URL/text and optionally an owned reference image.
2. Choose one of at least six meaningfully different launch art directions or describe a concept.
3. Set composition/focal area, palette/brand colors, artistic strength, and protected QR prominence.
4. Generate a board of four visibly distinct candidates.
5. See artistic-quality cues and honest scan-robustness evidence for each candidate.
6. Select, vary, refine, or regenerate without losing the creative direction.
7. Run automatic closed-loop validation and targeted repair/reinforcement.
8. Preview at digital/print sizes and export a high-resolution PNG; export SVG when the design is deterministic/vector.
9. Recover from provider failure or an unscannable candidate through retry or safe deterministic fallback.

## Launch art-direction bar

Ship at least six internally coherent, non-cosmetic art directions selected through Wave A0. Candidate families should cover distinct visual structures such as:

- editorial illustration
- organic/botanical integration
- architectural/geometric scenes
- photographic/cinematic composition
- premium minimal/brand-led graphics
- playful character/object integration

Names and exact styles are provisional. A launch direction must produce recognizable, varied, high-quality output across the reference prompt/payload suite; changing only colors, module shapes, or frames does not count as a distinct art direction.

## High-end capability requirements

- **Composition-aware generation:** preserve finder patterns/functional modules while integrating the code into the scene, not merely placing art behind a square QR.
- **Multi-candidate exploration:** four candidates per generation board with meaningful diversity.
- **Refinement rather than roulette:** variation, artistic strength, composition/focal area, palette, QR prominence, and deterministic seed where supported.
- **Closed-loop scan repair:** validation results can trigger targeted contrast/module/quiet-zone reinforcement and revalidation.
- **Evidence, not a green check:** show tested robustness dimensions and limitations without claiming universal scannability.
- **Publication-ready output:** high-resolution export, sensible color handling, print-size guidance, no accidental provider watermark, and metadata/provenance policy.
- **Graceful failure:** timeout, moderation, cost cap, and unscannable output never strand the user or falsely consume a successful result.

## Standalone MVP boundary

Included:
- anonymous free preview plus guest one-time checkout/project unlock; full customer accounts are not required
- URL/text payloads
- curated and prompt-guided artistic creation
- reference-image mode if privacy/safety/provider gates pass
- local/session continuity
- scan validation and repair
- PNG plus applicable SVG export
- minimal provider infrastructure, observability, and support guidance

Excluded until later:
- full accounts/cloud project library
- subscriptions, generic credits, and durable cross-project entitlements
- dynamic redirects and analytics
- custom domains
- bulk artistic generation
- teams, APIs, webhooks, and white labeling

## Release gate

The MVP cannot ship merely because the workflow exists. Release requires:

1. Sponsor-approved quality rubric and six+ launch art directions.
2. AJ-08 passes end to end in a production-shaped environment.
3. Approved decoder/perturbation and real-device/print matrix passes at the defined threshold.
4. Independent QA finds no misleading scan-confidence behavior.
5. Safety/privacy/provider retention and provenance policies are approved and tested.
6. Generation latency, retry rate, and cost per successful export remain inside the approved envelope.
7. Provider outage, unsafe input, and unscannable output recover through clear retry/fallback paths.
8. Accessibility, responsive browser performance, export fidelity, telemetry, rollback, and feature-disable gates pass.

## Success measures

- Time to first exportable artistic candidate
- Percentage of sessions producing an exportable candidate
- Successful candidates per generation board
- Attempts and repair cycles per successful export
- Independent decoder/device/print pass rate
- Candidate selection, variation, refinement, and export rates
- User-rated artistic quality and “proud to publish” score
- Provider failure, moderation, abandonment, and fallback rates
- Cost per successful exported artifact
