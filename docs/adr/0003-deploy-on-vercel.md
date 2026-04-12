# ADR-0003: Deploy on Vercel

## Status

Accepted

## Context

The site needs a hosting platform. Requirements:

- Zero-config deployment from a GitHub repository.
- Preview deployments for every pull request.
- Global CDN for fast page loads.
- Support for both static sites and server-rendered Next.js applications
  (future-proofing).
- Free or low-cost for personal/hobby use.

Alternatives considered:

- **Netlify**: Strong static hosting, but Next.js support lags behind Vercel.
- **Cloudflare Pages**: Excellent performance, but Next.js integration is less
  mature.
- **AWS Amplify / S3 + CloudFront**: Maximum control, but significantly more
  operational overhead for a personal project.
- **GitHub Pages**: Free and simple, but limited to static sites with no path
  to SSR.

## Decision

Deploy on **Vercel**.

Vercel is built by the team behind Next.js, providing the tightest integration:
automatic framework detection, optimised build caching, edge network, and
first-class support for every Next.js rendering mode.

## Consequences

### Positive

- Push-to-deploy workflow with zero configuration.
- Every PR gets a unique preview URL — excellent for review.
- Global edge network for fast delivery.
- If we move from static export to SSR/ISR later, no hosting migration needed.
- Free tier is generous for a personal site.

### Negative

- Vendor coupling to Vercel for deployment infrastructure.
- Some Next.js features (e.g., edge middleware, ISR) are most fully supported
  on Vercel, which deepens the coupling.

### Neutral

- Security headers and redirects can be managed via `vercel.json`.
- Custom domains are straightforward to configure.

## References

- [Vercel — Next.js on Vercel](https://vercel.com/docs/frameworks/nextjs)
- [Vercel — Pricing](https://vercel.com/pricing)
