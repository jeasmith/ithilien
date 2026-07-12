# ADR-0010: Use the Next.js Production Server

## Status

Accepted

## Context

ADR-0006 selected a static export for the initial site. Running that export
locally required a separate static-file server, duplicating behavior that
Next.js already provides and preventing runtime features such as image
optimization, route handlers, middleware, and incremental rendering.

## Decision

Use the standard Next.js production runtime. `pnpm build` creates the
production build and `pnpm start` runs it with `next start`.

Remove the static export configuration and do not maintain a separate static
server implementation.

## Consequences

- Local production runs and Vercel use the same Next.js runtime model.
- Next.js runtime features remain available as the site grows.
- The deployment requires a supported Node.js runtime rather than generic
  static-file hosting.

## References

- [Next.js — CLI](https://nextjs.org/docs/app/api-reference/cli/next)
- [Next.js on Vercel](https://vercel.com/docs/frameworks/nextjs)
