# ADR-0018: Use ISR for Published Radar Pages

## Status

Accepted

## Context

Radar is changing from a hand-written placeholder into a digest rendered from a
Postgres library. Its public pages change when the scheduled or manually
dispatched GitHub Actions workflow publishes an issue, makes an article public,
adds a deep dive, or records new source coverage.

ADR-0006 selected a static export for the site's initial iteration. ADR-0010
already superseded that deployment model by adopting the standard Next.js
production runtime, making incremental and dynamic rendering available. Neither
ADR decides how database-backed Radar routes balance freshness, request latency,
cache shielding and deployment independence.

Build-time enumeration is not a viable default. `generateStaticParams` runs on
deploy, not during revalidation, so it cannot discover later publications. A
database-backed enumeration would also make deployments depend on Neon and need
an arbitrary cutoff for a library that grows continuously.

Fully dynamic rendering would keep every route fresh but make every reader wait
for a database query and remove Vercel's cache shielding and request collapsing.
Cache Components can mix cached and dynamic work, but enabling it changes the
rendering model across the application and is not justified by Radar's first
build. A production probe established that on-demand revalidation works through
the shared Vercel Microfrontends origin.

## Decision

Use Incremental Static Regeneration for Radar's published content, archive,
source-health and sitemap routes. Cache each route by its public path. Generate
parameterized issue and article pages on their first request rather than querying
the database from `generateStaticParams`.

The GitHub Actions write workflow invalidates affected paths through a
secret-protected route handler on `https://www.ithilien.dev` after committing its
database changes. It then verifies the affected public pages. Every ISR route
also revalidates after 24 hours as a recovery backstop; on-demand invalidation and
verification are the normal freshness mechanism.

Render the searchable `/radar/articles` route dynamically because its open-ended
search and filter parameters define the request. Do not enable Cache Components
or adopt `unstable_cache` solely to cache search results.

The complete route-to-trigger mapping and invalidation sequence are maintained
in [the rendering answer record](../radar/rendering-strategy.md).

This decision supplements ADR-0010. ADR-0006 remains unchanged as the already
superseded record of the initial static-export decision.

## Consequences

### Positive

- Most public reads are served without a database round trip.
- Publication controls freshness precisely and can verify the result before the
  workflow reports success.
- The 24-hour fallback prevents an invalidation fault from leaving cached content
  stale indefinitely.
- Deployments do not depend on Neon being reachable or enumerate an ever-growing
  article library.
- The first build stays on stable ISR primitives without a Cache Components
  migration.

### Negative

- The first request for an uncached issue or article waits for rendering.
- Search and filtered article-library requests always invoke the application and
  query the database.
- The workflow needs a protected revalidation endpoint and must coordinate a
  committed database write, invalidation and public verification.
- A failed on-demand invalidation can expose stale content until verification
  detects it or the time-based fallback runs.

### Neutral

- The dated issue remains an immutable publication. Revalidation may add the
  agreed link to a later deep dive, but never rewrites its brief text or section
  placement.
- Source health is invalidated for failed runs as well as successful
  publications; publication state and operational coverage remain distinct.
- Credential ownership is decided in #94. Failure classification, retries and
  notification are decided in #97.

## References

- [Radar rendering strategy](../radar/rendering-strategy.md)
- [Radar routes and publication contract](../radar/routes-and-content.md)
- [Runtime rendering research](../research/nextjs-runtime-rendering.md)
- [Production revalidation probe](../radar/revalidation-probe.md)
- [ADR-0010: Use the Next.js Production Server](0010-use-the-nextjs-production-server.md)
- [Rendering decision ticket #91](https://github.com/jeasmith/ithilien/issues/91)
