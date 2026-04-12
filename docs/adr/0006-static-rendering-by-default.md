# ADR-0006: Static Rendering by Default

## Status

Accepted

## Context

Next.js supports multiple rendering strategies: static export (SSG),
server-side rendering (SSR), incremental static regeneration (ISR), and
client-side rendering (CSR). We need to choose a default strategy for the
initial iteration of the site.

The first version is a single content page with no dynamic data, user
authentication, or personalisation. The content changes only when the code
is updated and deployed.

## Decision

Use **static export** (`output: "export"` in `next.config.ts`) as the default
rendering strategy for the initial iteration.

All pages are pre-rendered to HTML at build time. The output is a directory of
static files that can be served from any CDN or static hosting provider.

## Consequences

### Positive

- **Performance**: Pages are served as pre-built HTML — no server compute at
  request time, no cold starts, no latency from data fetching.
- **Security**: No server-side attack surface. No API routes, no middleware,
  no database connections.
- **Simplicity**: The deployment artifact is a folder of static files. Easy to
  reason about, easy to cache, easy to debug.
- **Portability**: A static export can be hosted anywhere — Vercel, Netlify,
  S3, GitHub Pages — reducing vendor lock-in.
- **Cost**: Static hosting on Vercel's free tier is more than sufficient.

### Vercel and Next.js alignment

- **`next build` produces `out/`** — same artifact locally and on Vercel; no
  `next start` or Node server is required for the static site.
- **Do not use `next.config` `headers` / `redirects` / `rewrites`** with static
  export; those need a Next.js runtime. Prefer **`vercel.json`** (or the
  project dashboard) for response headers and routing at the edge.
- **Explicit static segments** — the root layout exports
  `dynamic = 'force-static'` so the App Router stays prerender-only and
  accidental use of request-time APIs surfaces at build time (see Next.js route
  segment config).

### Negative

- **No server-side features**: API routes, middleware, ISR, and server-side
  data fetching are unavailable with static export.
- **Build-time only**: Content updates require a full rebuild and redeploy.
- **Image optimisation**: Next.js Image Optimization requires a server; we use
  `unoptimized: true` in the config and rely on pre-optimised assets.

### Neutral

- This decision is scoped to the initial iteration. When dynamic features are
  needed, we can remove `output: "export"` and switch to standard Next.js
  deployment on Vercel with no code changes required — only a config change.
  That transition should be captured in a new ADR.

## References

- [Next.js — Static Exports](https://nextjs.org/docs/app/guides/static-exports)
- [Next.js — Output Configuration](https://nextjs.org/docs/app/api-reference/config/next-config-js/output)
- [Next.js — Route Segment Config (`dynamic`)](https://nextjs.org/docs/app/api-reference/file-conventions/route-segment-config#dynamic)
- [Vercel — Next.js on Vercel](https://vercel.com/docs/frameworks/nextjs)
