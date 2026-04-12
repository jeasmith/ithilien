# ADR-0001: Use Next.js as the Application Framework

## Status

Accepted

## Context

We need a framework for building a personal website that will host a mix of
content types: static text pages, blog posts, and interactive demos that
showcase different rendering strategies and web delivery methods. The framework
must support:

- Static site generation (SSG) for content pages
- The option to add server-side rendering (SSR) or client-side interactivity
  later without a rewrite
- A mature ecosystem with strong TypeScript support
- First-class deployment support on Vercel

Alternatives considered:

- **Astro**: Excellent for content-heavy static sites, but switching to
  interactive pages requires more ceremony (islands architecture).
- **Remix / React Router v7**: Strong server-first model, but less natural for
  static export and content-driven sites.
- **Plain React + Vite**: Maximum flexibility but no built-in routing, SSG, or
  SSR — we'd be rebuilding what a framework provides.

## Decision

Use **Next.js** (App Router, version 16) as the application framework.

Next.js gives us the widest spectrum of rendering strategies under one roof:
static export today, with the ability to opt individual routes into SSR,
ISR, or streaming server components later. This directly supports the site's
goal of experimenting with different delivery methods.

## Consequences

### Positive

- Single framework covers static, server-rendered, and client-rendered pages.
- App Router and React Server Components are the current direction of the React
  ecosystem — learning them here pays dividends elsewhere.
- Deep integration with Vercel for zero-config deployments, preview URLs, and
  edge functions.
- Large community and well-maintained ecosystem of tooling.

### Negative

- Next.js is a heavier dependency than a pure static site generator.
- The framework moves fast — major version upgrades can require migration work.
- Some flexibility is traded for convention (file-based routing, specific
  config patterns).

### Neutral

- TypeScript is a first-class citizen in Next.js, which aligns with our
  quality goals.

## References

- [Next.js Documentation](https://nextjs.org/docs)
- [Next.js App Router](https://nextjs.org/docs/app)
- [Static Exports](https://nextjs.org/docs/app/guides/static-exports)
