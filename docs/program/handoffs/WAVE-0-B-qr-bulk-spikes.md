# Agent Handoff — Wave 0B: QR Fidelity and Browser Bulk Spikes

## Mission

Prove whether a deterministic browser-local QR renderer can produce attractive scan-safe SVG/PNG and whether 500 styled SVGs can be packaged reliably on supported desktops.

## Context

The static tool must work without registration or payload/logo upload. Bulk should parse CSV and generate a ZIP/manifest locally. This is a discardable spike, not production implementation.

## Frozen scope

- Execute SP-01 and SP-02.
- Compare a small number of maintained QR/render/CSV/ZIP libraries.
- Test logos, quiet zones, error correction, Unicode/long URLs, unsafe filenames, cancellation, and partial errors.
- Do not implement identity, payments, dynamic redirects, or production UI.

## Owned artifacts

Use an isolated spike repository/directory. Return a verifiable path/commit and report; do not edit baseline docs.

## Required proof

- Real SVG/PNG samples and validation output.
- Scan matrix across available physical/reference devices or documented decoder suite; identify missing physical coverage honestly.
- 1/100/500-row elapsed time, peak memory where observable, ZIP size, responsiveness, cancellation/retry behavior.
- Network proof that payload/logo/CSV is not uploaded.
- Verdict per spike: VALIDATED, PARTIAL, or INVALIDATED.

## Contracts to propose

`qr-core-api.v1`, `bulk-csv.v1`, `bulk-manifest.v1`. Proposals only; WS-01 owns final contracts.
