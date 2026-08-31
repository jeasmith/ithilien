# ADR-0016: Serve multiple applications with Vercel Microfrontends

## Status

Accepted

## Context

Ithilien is a place to try things out. Radar, an architectural digest, is the
first piece of the site substantial enough to want its own deployment
lifecycle: its content changes on a different rhythm to the rest of the site,
and it is a good excuse to run a delivery pattern that is hard to justify on a
site this size otherwise.

It still needs to live on the same origin. A separate subdomain would split
cookies and analytics, and would make relative links between the two
applications impossible.

The options considered:

- **One Next.js application, one route group.** Simplest by far. But a change
  to the digest rebuilds and redeploys the entire site, and there is nothing to
  learn from it.
- **Next.js multi-zone rewrites.** Keeps one origin using `rewrites` in
  `next.config.ts`. The rewrite targets are environment-specific, so preview
  deployments need the target URLs threading through environment variables, and
  asset prefixing has to be arranged by hand.
- **Vercel Microfrontends.** Vercel routes paths to separate projects at the
  edge, and `withMicrofrontends` handles asset prefixing so each application's
  JavaScript and CSS are routed back to the deployment that produced them.
  Preview deployments are wired up automatically.

## Decision

Run Ithilien and Radar as a Vercel microfrontends group on one origin.

Ithilien is the **default application**: it owns `microfrontends.json` and
receives every request not claimed by another application. Radar claims
`/radar` and everything beneath it.

`apps/ithilien/microfrontends.json`:

```json
{
  "applications": {
    "ithilien": {
      "development": { "fallback": "www.ithilien.dev", "local": 3000 }
    },
    "radar": {
      "routing": [{ "group": "radar", "paths": ["/radar", "/radar/:path*"] }],
      "development": { "local": 3001 }
    }
  },
  "options": { "localProxyPort": 3024 }
}
```

Both applications wrap their configuration in `withMicrofrontends`.

Vercel routes `/radar/*` to the Radar deployment **without stripping the
prefix**, so Radar's routes live at `src/app/radar/`. Next.js `basePath` is not
supported by Vercel microfrontends, so it cannot be used to shorten those
paths. Radar's `/` redirects to `/radar`, which only matters when the Radar
deployment is visited directly on its own Vercel domain.

Development ports are pinned rather than assigned dynamically, so the Docker
port mappings stay stable. `microfrontends port` reads these values, which is
what keeps each development server and the proxy agreeing on a port. Open
**port 3024**, the proxy — it is the only address where routing behaves as it
does in production.

Cross-application links use `Link` from `@vercel/microfrontends/next/client`
rather than `next/link`. It resolves which application owns an `href`, renders
a plain anchor with cross-zone prefetching when that is a different
application, and falls back to `next/link` within one. A bare `next/link`
across applications would attempt a client-side transition to a route that does
not exist in the current bundle.

Routing is covered by a test. `validateRouting` from
`@vercel/microfrontends/next/testing` asserts against the real
`microfrontends.json`, so a path claimed by the wrong application fails CI
rather than silently sending traffic to the wrong deployment.

## Consequences

### Positive

- Radar deploys without rebuilding Ithilien, and vice versa.
- One origin, so cookies, analytics, and relative links behave as if this were
  a single application.
- Routing is asserted in CI rather than discovered in production.
- Preview deployments route between applications automatically, so the whole
  composition is testable before it reaches production.

### Negative

- Requests are routed at the edge, which adds a hop and is metered. The Hobby
  plan includes 50K routed requests per month and two microfrontend projects,
  which is the effective ceiling on this approach here.
- Radar's routes are nested under `src/app/radar/`, which reads as redundant
  until you know that `basePath` is unavailable.
- The `development.fallback` points at production, so a local session with only
  one application running serves the other from the live site. That is the
  point, but it does mean local pages can mix local and production content.
- The security headers in `vercel.json` are now duplicated per application and
  can drift.

### Neutral

- `microfrontends.json` lives in the default application rather than the
  repository root. Vercel detects it automatically in a monorepo: a child
  application's build searches the repository for a config naming it, so Radar
  finds Ithilien's file without being told where it is.
- Each application's assets move under a hashed prefix, `/vc-ap-<hash>`, with
  rewrites back to `/_next/*`. That prefix is a path on the shared origin, so
  the `script-src 'self'` policy in `vercel.json` continues to cover it.
- Unit tests have to supply `NEXT_PUBLIC_MFE_CLIENT_CONFIG` themselves, because
  `withMicrofrontends` injects it at build time and Vitest never runs that step.

## References

- [Vercel Microfrontends quickstart](https://vercel.com/docs/microfrontends/quickstart)
- [Vercel Microfrontends local development](https://vercel.com/docs/microfrontends/local-development)
- [Vercel Microfrontends limits and pricing](https://vercel.com/docs/microfrontends#limits-and-pricing)
- [ADR-0015: Turborepo monorepo](0015-turborepo-monorepo.md)
