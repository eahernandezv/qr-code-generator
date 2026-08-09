# ADR draft — Level 2 MVP short-link resolver

- **Status:** Proposed for Product Architect review
- **Decision owner:** QR Product Architect
- **Studio spike owner:** QR Studio
- **Scope:** Project-bound payload optimization for Level 2 Image-Fit QR only

## Decision

Use the existing owned apex route for MVP:

```text
https://placeholder-online.com/r/<slug>
```

A shorter dedicated domain can replace the configured public base later only after ownership, abuse, availability, and migration policy are approved. It is not required for this vertical slice and there is no custom-domain capability.

The public resolver accepts `GET` and `HEAD` only and returns a one-hop **302 Found** to the validated final HTTPS destination. It does not use 301 by default.

### Why 302 rather than 307

QR scanners issue GET. Restricting the resolver to GET/HEAD makes method preservation unnecessary, while 302 is broadly understood by scanner/browser stacks and avoids replaying a non-GET method to a customer destination. A POST receives 405 rather than a redirect. A 307 would also be technically viable if a future frozen contract requires method preservation; 301 is rejected because stale permanent caches can trap a bad destination.

### Redirect response

```http
HTTP/1.1 302 Found
Location: https://validated-customer.example/final
Cache-Control: private, no-store, max-age=0
Pragma: no-cache
Referrer-Policy: no-referrer
X-Content-Type-Options: nosniff
X-Robots-Tag: noindex, nofollow
```

CDN/proxy configuration must respect `no-store`; no edge redirect caching in MVP. Recovery therefore changes resolver state without fighting a cached 301, although customer-facing destination editing remains excluded.

## Route and namespace

- Prefix: `/r/`
- Spike slug grammar: 5–16 lowercase unambiguous base58-style characters (`23456789abcdefghijkmnopqrstuvwxyz`), excluding reserved route words.
- Production recommendation: at least 8 cryptographically random characters by default; the optimizer may evaluate different reserved values/lengths within an approved bounded search.
- Route is resolver-only. There is no public create/update/list endpoint and no generic URL-shortener page.
- Slugs are case-sensitive only if the final contract explicitly says so; MVP proposal emits lowercase and rejects alternatives to avoid duplicate visual/payload states.

## Slug lifecycle

```text
generated -> reserved -> evaluated -> committed
                         \-> expired (all unchosen)
reserved -> expired (TTL)
committed -> disabled (abuse/recovery only)
```

1. Studio validates and normalizes one final destination.
2. A trusted project service requests a bounded candidate batch for one `projectId` and `destinationDigest`.
3. Resolver authority reserves unique candidates with a short TTL (proposal: 30 minutes). Reservation is not public routing.
4. QR Creator evaluates reserved short URLs alongside the original URL and returns candidate evidence.
5. After the selected validated candidate reaches the purchase/export authority boundary, Studio sends an idempotent commit request naming `projectId`, `reservationId`, `slug`, `candidateId`, and `destinationDigest`.
6. The resolver atomically commits exactly one matching unexpired reservation and expires all other reservations for that project.
7. Export is blocked until committed URL read-back matches the selected encoded payload.
8. A committed mapping is stable/immutable in customer MVP. Disable/support correction is a separate restricted recovery action, not campaign management.

Unique slug and one-committed-link-per-project constraints belong in durable server storage. The spike uses in-memory lifecycle code and environment-loaded committed records only to prove semantics; it is not production persistence.

## Destination validation

Validate at reservation/write **and again at redirect read** so corrupted or stale records fail closed.

MVP allow policy:

- absolute `https:` URL only;
- normalized host and URL serialization;
- no username/password, explicit port, control characters, or fragment in the encoded destination;
- public DNS-style hostname only;
- reject localhost, single-label, `.local`, `.internal`, loopback, private, carrier-grade NAT, link-local, unspecified, and metadata-address literals;
- reject reserved service slugs and known product/admin paths;
- apply approved threat/reputation and domain policy before public launch (not fabricated by this spike).

DNS resolution/rebinding controls and abuse intelligence require a server-side production validator. The spike proves deterministic syntactic/network-range rejection only and does not claim malicious-domain reputation coverage.

## Failure behavior

| Condition | Response | Redirect? | Cache |
|---|---:|---|---|
| malformed/reserved/unknown slug | 404 | no | no-store |
| expired/disabled/non-committed slug | 410 | no | no-store |
| stored target fails current safety policy | 410 | no | no-store |
| method other than GET/HEAD | 405 | no | no-store |
| committed safe slug | 302 | one hop | no-store |
| resolver/storage unavailable | 503 | no | no-store |

Unknown and malformed slugs intentionally share a 404 response to avoid namespace enumeration detail. Unsafe records never emit `Location`.

## Reliability and operations

Exported/printed QR codes depend on this runtime. Before production it needs:

- durable replicated mapping store and atomic unique constraints;
- independent resolver health/SLO, rollback, backups, and recovery runbook;
- rate limits and abuse controls;
- configuration validation that fails startup on unsafe records;
- operational request logs with short retention for reliability/security only—no customer click analytics, dashboard, counters, attribution, or campaign events;
- hostname/base-route configuration, but no customer custom-domain model.

## Prototype seam

- `apps/web/scripts/short-link-resolver.mjs` owns validation, lifecycle, and request handling.
- `apps/web/scripts/production-server.mjs` dispatches `/r/<slug>` before SPA static serving.
- `SHORT_LINK_RECORDS_JSON` loads committed records for local vertical-slice proof only.
- `apps/web/scripts/short-link-resolver.test.mjs` proves reservation/commit/expiry, safe redirect, unknown/disabled behavior, and unsafe startup/runtime rejection.

## Rejected alternatives

- **301 by default:** unsafe recovery/caching behavior.
- **Client-side redirect page:** adds a public hop, depends on JavaScript, leaks UX/runtime failure into printed QRs.
- **Generic shortener API/UI:** outside Level 2 MVP.
- **Custom domains now:** adds DNS/certificate/ownership lifecycle outside MVP.
- **Per-click analytics:** not needed to create or safely resolve an image-fit QR.
