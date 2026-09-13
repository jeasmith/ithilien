# Radar rendering strategy

Answer record for [#91](https://github.com/jeasmith/ithilien/issues/91) on the
[Radar wayfinder map](https://github.com/jeasmith/ithilien/issues/82), agreed
with Jamie on 2026-09-13. The route and publication contract is in
[routes-and-content.md](./routes-and-content.md). The architectural decision is
recorded in [ADR-0018](../adr/0018-use-isr-for-published-radar-pages.md).

## Route table

| Route                              | Rendering | Cache identity        | Invalidation trigger                                                           |
| ---------------------------------- | --------- | --------------------- | ------------------------------------------------------------------------------ |
| `/radar`                           | ISR       | Path                  | Issue publication; a deep dive for an article in the latest issue              |
| `/radar/YYYY-MM-DD`                | ISR       | Dated path            | Its publication; a deep dive becoming available for an included article        |
| `/radar/articles/<permanent-slug>` | ISR       | Permanent-slug path   | First public publication; a deep dive being added                              |
| `/radar/articles`                  | Dynamic   | Uncached full request | None; every request reads the current public projection                        |
| `/radar/archive`                   | ISR       | Path                  | A successful issue publication                                                 |
| `/radar/sources`                   | ISR       | Path                  | Every finalized run, including a run that publishes no issue because it failed |
| `/radar/sitemap.xml`               | ISR       | Path                  | A newly public issue or article                                                |

Every ISR route also has a 24-hour time-based revalidation interval. This
schedules a recovery attempt; it does not guarantee freshness if regeneration
keeps failing. Exact on-demand invalidation after a database write is the normal
path, and the workflow must verify the affected public pages before reporting
success.

The deferred `/radar/sources/runs/<run-id>` route follows the same ISR pattern
when it enters scope: the run-specific path is its cache identity, it is
invalidated when that run's coverage is finalized, and it retains the 24-hour
backstop.

There is no private backlog route in the first build. GitHub is the private
write surface, as settled on the map; this decision therefore has no
authenticated page to render.

## Generation

Radar's parameterized issue and article routes return an empty array from
`generateStaticParams`, use `dynamicParams = true`, and generate and enter the
cache on their first request. They do not query Neon while enumerating routes at
build time. This avoids an arbitrary recent window that would still fail to
enumerate articles published between deploys.

The fixed ISR routes are prerendered by `next build` and therefore do read Neon
during a deployment. This database dependency is accepted: those pages need the
current public projection to produce a correct initial cache entry, and serving
a synthetic build-time shell would trade a visible correctness failure for
deployment independence. The build must fail rather than replace current Radar
content when Neon is unavailable.

The publication workflow naturally warms the latest issue and its newly public
article pages while verifying them. An older, uncached page pays one database
read on its first request and is then served from ISR.

## Invalidation owner and sequence

The GitHub Actions workflow that writes Radar is also responsible for cache
invalidation. After committing the database transaction, it calls a
secret-protected route handler on the shared production origin:

```text
POST https://www.ithilien.dev/radar/api/<handler>
     x-<name>-secret: <from Vercel environment configuration>
```

The shared origin is required: the production Radar deployment URL is protected
by Vercel SSO, while the revalidation probe established that a request routed
through the shared microfrontends origin reaches and invalidates Radar's cache.
The handler fails closed if its secret is absent. Credential ownership and the
exact inventory remain #94; retry, notification and failure classification
remain #97.

The write determines the paths to invalidate:

- Publishing an issue invalidates `/radar`, its dated issue path,
  `/radar/archive`, `/radar/sitemap.xml`, `/radar/sources`, and every article
  associated with that issue, including articles already public from an earlier
  appearance.
- Adding a deep dive invalidates the article's permanent path and every dated
  issue in which it appeared, so those immutable publications may add only the
  agreed availability link. It also invalidates `/radar` when one of those
  appearances is the latest issue, and invalidates `/radar/sitemap.xml` when the
  deep dive is the article's first public writing.
- Finalizing coverage invalidates `/radar/sources` even when the run fails and
  publishes no issue. Operational truth is not conditional on publication.

The workflow must use restrained retries when verifying the shared origin. The
probe triggered Vercel bot mitigation at roughly 35 requests in 95 seconds; a
`403` carrying `x-vercel-mitigated: challenge` requires backoff rather than
tight polling.

## Why the article library is dynamic

The article library accepts open-ended text and filter query parameters. Under
the current Next.js rendering model, reading request search parameters makes the
route dynamic. Caching its database queries cleanly would require either the
still-prefixed `unstable_cache` API or enabling Cache Components across the app.

Neither migration is justified solely to cache low-traffic searches. The route
therefore reads the public database projection on every request. The trade-off
is a database round trip and slower time to first byte; the expected invocation
volume is small relative to the existing microfrontends routed-request ceiling.
