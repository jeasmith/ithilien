# Runtime rendering in Next.js 16 on Vercel, under microfrontends

Research notes for [#88](https://github.com/jeasmith/ithilien/issues/88), which feeds the
rendering decision in [#91](https://github.com/jeasmith/ithilien/issues/91) on the
[Radar wayfinder map](https://github.com/jeasmith/ithilien/issues/82).

**Date of research:** 2026-08-31.
**No application code was changed by this ticket.** Two throwaway builds were run to
verify a compatibility claim and then reverted; they are described under
[Build experiments](#build-experiments-run-for-this-ticket).

## Versions this is written against

Everything below is reasoned against the versions this repository actually resolves,
not "Next.js 15-era" or "Next.js 16-in-general" behaviour.

| Package                  | Version in `pnpm-lock.yaml` | Notes                                          |
| ------------------------ | --------------------------- | ---------------------------------------------- |
| `next`                   | `16.3.1` (exact pin)        | Upstream is on `v16.3.3` as of this writing    |
| `react` / `react-dom`    | `19.2.8`                    |                                                |
| `@vercel/microfrontends` | `2.4.0`                     | Declared `^2.4.0` in `apps/radar/package.json` |
| Node.js                  | `24.x`                      | `engines.node`, `.nvmrc`, Dockerfile           |

Next.js 16 ships a version-matched copy of its own documentation inside the package, at
`node_modules/next/dist/docs/`. Where a Next.js docs URL is cited below, the text was read
from that copy — so it is the documentation for `16.3.1` specifically, not whatever
nextjs.org is serving today. The public URL is given for convenience.

## Summary

| Option                                                 | How you turn it on                                                    | Stability in `next@16.3.1`                                                                                                                                                                                                                       | What it costs on Vercel                                                                 | Survives microfrontends?                                                                                              |
| ------------------------------------------------------ | --------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ | --------------------------------------------------------------------------------------- | --------------------------------------------------------------------------------------------------------------------- |
| **Static prerender** (today's Radar)                   | Default                                                               | Stable                                                                                                                                                                                                                                           | Nothing at request time                                                                 | Yes — this is the status quo                                                                                          |
| **ISR, time-based**                                    | `export const revalidate = N` in a route segment                      | Stable                                                                                                                                                                                                                                           | One function invocation per regeneration; ISR read/write units                          | Yes                                                                                                                   |
| **ISR, on-demand**                                     | `revalidateTag(tag, 'max')` / `revalidatePath()` from a Route Handler | Stable, but the **one-argument `revalidateTag(tag)` form is deprecated** in 16                                                                                                                                                                   | Same as above, triggered by your GitHub Actions run                                     | Yes, with one **domain-scoping caveat** — see [§6](#6-interaction-with-vercelmicrofrontends)                          |
| **Fully dynamic**                                      | `export const dynamic = 'force-dynamic'`, or just read runtime APIs   | Stable                                                                                                                                                                                                                                           | One invocation per request; `Cache-Control: private, no-cache, no-store` so no CDN help | Yes, but see the Hobby routed-request ceiling                                                                         |
| **Cache Components / PPR**                             | `cacheComponents: true` (**top-level**, not `experimental.*`)         | Shipped in 16.0. Not behind `experimental.*`, and Next's own build output lists it separately from "Experiments (use with caution)". Also **not labelled stable** anywhere; it is opt-in, off by default, and it is a migration, not a flag flip | Static shell from the CDN **plus** a function invocation on most requests               | Verified to **build** cleanly with `withMicrofrontends`; runtime behaviour behind the routing layer is **unverified** |
| **Partial Prefetching** (App Shell for unknown params) | `partialPrefetching: true`, requires `cacheComponents`                | **Introduced in 16.3.0** — one patch release before the version pinned here. New                                                                                                                                                                 | As PPR                                                                                  | Builds cleanly; runtime **unverified**                                                                                |
| **Streaming / Suspense**                               | Nothing. `<Suspense>` or `loading.tsx`                                | Stable, zero config                                                                                                                                                                                                                              | None on its own                                                                         | Yes — but note the CSP interaction in [§5](#5-streaming-and-suspense-for-the-private-backlog)                         |
| **`'use cache: private'`**                             | Requires `cacheComponents`                                            | New in 16 with Cache Components                                                                                                                                                                                                                  | Never stored server-side                                                                | Unverified                                                                                                            |
| **`unstable_cache`**                                   | `import { unstable_cache } from 'next/cache'`                         | Still carries the `unstable_` prefix in 16.3.1                                                                                                                                                                                                   | Data Cache reads/writes                                                                 | Yes                                                                                                                   |

**The short version.** Nothing in Vercel Microfrontends rules out any rendering strategy.
The routing decision happens inside Vercel's network before the cache check and does not
proxy to a second deployment, so `/radar/*` gets the ordinary Vercel cache and compute
behaviour of the Radar deployment. The constraints that actually bite are (a) the Hobby
plan's **50K microfrontends-routed requests per month** — a documented included
allowance; whether cached responses count toward it, and what happens once it is
exhausted, is an **inference** from the documented request order rather than a
published rule (see [§6](#6-interaction-with-vercelmicrofrontends) and the
unverified table below), (b) on-demand revalidation being scoped
to "the domain and deployment where you trigger it", and (c) `metadataBase` and sitemap
URLs, which must be pointed at the shared origin by hand because
`VERCEL_PROJECT_PRODUCTION_URL` resolves to Radar's own project domain.

---

## 1. Partial Prerendering / Cache Components

### What it is called now

In `next@16.3.1` there is no separate PPR flag. `experimental.ppr` and the
`experimental_ppr` route segment export were **removed** in 16.0, and Partial
Prerendering is now a consequence of enabling Cache Components:

> Next.js 16 removes the experimental Partial Prerendering (PPR) flag and configuration
> options, including the route level segment `experimental_ppr`. Starting with Next.js 16,
> you can opt into PPR using the `cacheComponents` configuration.
>
> — [Version 16 upgrade guide, "Partial Prerendering (PPR)"](https://nextjs.org/docs/app/guides/upgrading/version-16#partial-prerendering-ppr)

The reference page for the flag says the same thing from the other direction:

> Additionally, `cacheComponents` implements **Partial Prerendering (PPR)** as the default
> behavior in the App Router. This means the `experimental.ppr` configuration flag and the
> `experimental_ppr` route segment configuration are no longer necessary and have been
> removed.
>
> — [`cacheComponents`](https://nextjs.org/docs/app/api-reference/config/next-config-js/cacheComponents)

### The config

```ts
// next.config.ts
const nextConfig: NextConfig = {
  cacheComponents: true,
};
```

`cacheComponents` is a **top-level** key on `NextConfig`. This is verifiable in the shipped
types rather than only in prose: `next/dist/server/config-shared.d.ts` in `16.3.1` declares
`cacheComponents?: boolean` directly on `NextConfig` (default `false`), while the
`experimental` object retains three deprecated aliases:

- `experimental.ppr` — `@deprecated This configuration option has been merged into cacheComponents.`
- `experimental.cacheComponents` — `@deprecated use top-level cacheComponents instead`
- `experimental.useCache` — `@deprecated use top-level cacheComponents instead`

### Stability — read this carefully

This is the point the ticket asks to be precise about, and the honest answer has three
parts.

1. **It is not experimental in the mechanical sense.** It is not under `experimental.*`,
   and Next.js's own build output distinguishes it. Running `next build` on this repo's
   Radar app with the flag set prints two separate lines:

   ```text
   - Cache Components enabled
   - Experiments (use with caution):
     ✓ multiZoneDraftMode
   ```

   Cache Components is listed above the experiments block, not inside it. (`multiZoneDraftMode`
   is an experimental flag that `withMicrofrontends` turns on for you — see [§6](#6-interaction-with-vercelmicrofrontends).)

2. **It is not labelled stable either.** The Next.js 16 release post explicitly labels
   Turbopack "(stable)", Turbopack File System Caching "(beta)", React Compiler Support
   "(stable)" and the Build Adapters API "(alpha)". Cache Components gets **no label at
   all** — it is simply described as "a new set of features" and "entirely opt-in"
   ([Next.js 16 release post](https://nextjs.org/blog/next-16)). Neither the release post
   nor the `cacheComponents` reference page calls it stable, beta, or experimental.
   Treat it as _shipped and supported but young_, not as settled.

3. **It is a migration, not a flag.** Enabling it changes semantics across the whole app:

   - Route segment configs `dynamic`, `revalidate` and `fetchCache` **error** once it is
     on. "After enabling the flag, route segments that still export `dynamic`,
     `revalidate`, or `fetchCache` will error."
     ([Migrating to Cache Components](https://nextjs.org/docs/app/guides/migrating-to-cache-components))
   - `dynamicParams` is **not available** when Cache Components is enabled
     ([`dynamicParams`](https://nextjs.org/docs/app/api-reference/file-conventions/route-segment-config/dynamicParams)).
   - `generateStaticParams` must return **at least one param**; an empty array is a build
     error ([`generateStaticParams`](https://nextjs.org/docs/app/api-reference/functions/generate-static-params)).
   - `generateMetadata` follows the same rules as components and will error if it reads
     runtime data while the rest of the page is prerenderable
     ([Migrating to Cache Components §generateMetadata](https://nextjs.org/docs/app/guides/migrating-to-cache-components)).
   - Navigation starts using React's `<Activity>` to keep previous routes mounted and
     hidden, which changes component lifecycle assumptions
     ([`cacheComponents` §Navigation with Activity](https://nextjs.org/docs/app/api-reference/config/next-config-js/cacheComponents)).
   - **Node.js runtime required**: "Cache Components requires the Node.js runtime.
     Migrate any routes that set the deprecated `runtime = 'edge'` export" (ibid.). Radar
     has no edge routes today, so this is free.

   Vercel ships an agent skill (`next-cache-components-adoption`) specifically to drive
   this migration one route at a time, which is itself a signal about the size of the job.

### What it buys, and what it costs on Vercel

Vercel's platform side is unambiguous that PPR is wired up automatically:

> Next.js 16 applications that use Cache Components get PPR automatically when deployed
> to Vercel.
>
> — [Next.js 16.3 support on Vercel](https://vercel.com/blog/vercel-supports-next-js-16-3)

But the cost shape is not "free static":

> This is the key difference from ISR: even when the shell is served from the CDN cache,
> your function still runs to render the dynamic holes. It is possible to have a fully
> cached page, but **most PPR requests incur a function invocation**.
>
> — [Vercel, Partial Prerendering](https://vercel.com/docs/partial-prerendering)

So PPR is not a way to avoid invocations. It is a way to get a fast first paint on a page
that has _some_ genuinely dynamic content. For a page where everything is cacheable, ISR
is cheaper and simpler — Vercel says so directly: "If your page is fully static, use ISR
since there is no dynamic content."

### Related new APIs gated behind the same flag

- `use cache` — file, component or function level. `v16.0.0`: "`use cache` is enabled with
  the Cache Components feature." (`v15.0.0` had it as experimental.)
  ([`use cache`](https://nextjs.org/docs/app/api-reference/directives/use-cache))
- `cacheTag()` and `cacheLife()` — the `unstable_` prefixes were dropped in 16: "`cacheLife`
  and `cacheTag` are now stable. The `unstable_` prefix is no longer needed."
  ([Version 16 upgrade guide](https://nextjs.org/docs/app/guides/upgrading/version-16))
  They still require `cacheComponents`.
- `'use cache: remote'` — durable, shared cache instead of in-memory. On Vercel this is
  the [Runtime Cache](https://vercel.com/docs/runtime-cache) and is billed.
- `'use cache: private'` — allows `cookies()`/`headers()`/`searchParams` inside a cached
  scope, but "results are **never stored on the server**, they're cached only in the
  browser's memory and do not persist across page reloads."
  ([`use cache: private`](https://nextjs.org/docs/app/api-reference/directives/use-cache-private))

---

## 2. ISR with on-demand revalidation

### The API surface in 16.3.1

`revalidateTag` changed signature in 16 and the old form is deprecated:

> `revalidateTag(tag: string, profile: string | { expire?: number }): void;`
>
> The single-argument form `revalidateTag(tag)` is deprecated. It currently works if
> TypeScript errors are suppressed, but this behavior may be removed in a future version.
>
> — [`revalidateTag`](https://nextjs.org/docs/app/api-reference/functions/revalidateTag)

The semantics of the second argument matter for a nightly digest job:

- `profile="max"` (recommended) marks the tag **stale**, not expired, with
  stale-while-revalidate semantics. Crucially: "calling `revalidateTag` will not
  immediately trigger many revalidations at once. The invalidation only happens when any
  page using that tag is next visited." That is exactly what you want from a 07:00
  weekday job that touches thousands of tagged pages — no thundering herd of
  regenerations at 07:00.
- `{ expire: 0 }` expires immediately and the next request blocks on a fresh render.
  The docs call this out specifically for "webhooks or third-party services that need
  immediate expiration".

Three related functions to keep straight:

| Function                      | Callable from                         | Semantics                                               |
| ----------------------------- | ------------------------------------- | ------------------------------------------------------- |
| `revalidateTag(tag, profile)` | Server Actions **and Route Handlers** | Stale-while-revalidate (with `'max'`)                   |
| `updateTag(tag)`              | **Server Actions only**               | Read-your-own-writes; next request waits for fresh data |
| `refresh()`                   | **Server Actions only**               | Refreshes _uncached_ data; does not touch the cache     |

Sources: [`updateTag`](https://nextjs.org/docs/app/api-reference/functions/updateTag),
[`refresh`](https://nextjs.org/docs/app/api-reference/functions/refresh),
[Next.js 16 release post §Improved Caching APIs](https://nextjs.org/blog/next-16).

For a GitHub Actions run, **`revalidateTag` in a Route Handler is the only one of the
three that applies** — `updateTag` and `refresh` are Server-Actions-only, and
"`revalidateTag` cannot be called in Client Components or Proxy, as it only works in
server environments."

`revalidatePath` works through the same tag machinery. Next.js generates "soft tags"
prefixed `_N_T_` from the route path — `/blog/hello` produces `_N_T_/layout`,
`_N_T_/blog/layout`, `_N_T_/blog/hello/layout` and `_N_T_/blog/hello` — and
`revalidatePath('/blog/hello')` invalidates that leaf tag plus its ancestor layout tags
([How revalidation works](https://nextjs.org/docs/app/guides/how-revalidation-works)).
That means `revalidatePath('/radar')` will invalidate `_N_T_/layout` and
`_N_T_/radar/layout` too — broader than it looks. Prefer explicit tags.

### The auth story

There is **no framework-level authentication on revalidation**. Both Next.js and Vercel
document exactly the same pattern: an ordinary Route Handler that compares a secret
against an environment variable and returns 401 otherwise.

Vercel's version:

```ts
// app/api/revalidate/route.ts
import { revalidatePath } from "next/cache";

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  if (searchParams.get("secret") !== process.env.MY_SECRET_TOKEN) {
    return new Response("Invalid credentials", { status: 401 });
  }
  revalidatePath("/blog-posts");
  return Response.json({ revalidated: true, now: Date.now() });
}
```

— [Vercel, Getting started with ISR §On-demand revalidation](https://vercel.com/docs/incremental-static-regeneration/quickstart)

Next.js's `revalidateTag` reference shows the same shape with the tag in a query param
([`revalidateTag` §Route Handler](https://nextjs.org/docs/app/api-reference/functions/revalidateTag)).

Notes for the decision, distinguishing documented fact from recommendation:

- **Documented:** the secret lives in an environment variable, and this repo's `CLAUDE.md`
  already mandates "All environment variables go through Vercel env config". The GitHub
  Actions side stores the same value as a repository secret. This is the whole mechanism.
- **Recommendation (mine, not from the docs):** send the secret in a request header rather
  than a query string. Query strings appear in Vercel's runtime logs and in any
  intermediary's access logs; the docs' `?secret=` example is convenient rather than
  careful. `Authorization` or a custom `x-revalidate-secret` header costs nothing extra.
- The Pages Router `x-prerender-revalidate` flow and `experimental.allowedRevalidateHeaderKeys`
  exist and still work, but they are the Pages Router path. "Pages Router on-demand ISR
  APIs (for example `res.revalidate()` and the `x-prerender-revalidate` flow) are still
  supported and use the server cache handler" ([How revalidation works](https://nextjs.org/docs/app/guides/how-revalidation-works)).
  Radar is App Router; ignore them.
- Vercel's OIDC federation (`VERCEL_OIDC_TOKEN`) is for your functions authenticating
  _outward_ to backends, not for authenticating GitHub Actions _inward_. It is not the
  tool for this job.

### What revalidation actually does on Vercel

This is worth pinning down because the generic Next.js CDN guidance and the Vercel
platform guidance say different things, and Vercel's applies here.

Generic Next.js guidance for third-party CDNs:

> CDN-level caching alone does not support on-demand revalidation (`revalidateTag()` /
> `revalidatePath()`): those calls invalidate the Next.js server cache, but the CDN will
> continue serving its cached copy until the `s-maxage` TTL expires.
>
> — [Using a CDN with Next.js](https://nextjs.org/docs/app/guides/cdn-caching)

Vercel is not a third-party CDN here, and does better:

> **Globally consistent purging**: When you revalidate content, all caches across all
> regions update within 300ms. Vercel purges HTML and data payloads together, so users see
> consistent content across full page loads and client-side transitions.
>
> — [Vercel, Incremental Static Regeneration](https://vercel.com/docs/incremental-static-regeneration)

So on Vercel, a `revalidateTag` call from a GitHub Actions run does propagate to the edge.
No CDN purge API call is needed.

**The scoping rule that matters for microfrontends:**

> On-demand revalidation applies to the domain and deployment where you trigger it, and
> doesn't affect subdomains or other deployments.
>
> — [Vercel, Incremental Static Regeneration §On-demand revalidation limits](https://vercel.com/docs/incremental-static-regeneration)

See [§6](#6-interaction-with-vercelmicrofrontends) for what this means in practice.

One useful cost property: "When revalidation runs and the content hasn't changed from the
previous version, no ISR write units are incurred. This applies to both time-based and
on-demand revalidation."
([ISR Usage and Pricing](https://vercel.com/docs/incremental-static-regeneration/limits-and-pricing)).
The same page warns that `new Date()` or `Math.random()` in the ISR output defeats this.
`apps/radar/src/app/radar/page.tsx` currently computes `new Date().getFullYear()` at
module scope, which is the _mild_ form of the problem: module scope is evaluated once
per module instantiation, not per render, so the value only changes at a year boundary
or when the module is reinitialised. It will not make every regeneration differ. A
per-render `new Date()` inside a component would.

---

## 3. Fully dynamic rendering, `fetch` caching and cache tags — and what it costs

### The default changed in 16

Without Cache Components:

> By default, `fetch` requests are not cached. You can cache individual requests by
> setting the `cache` option to `'force-cache'`.
>
> — [Caching and Revalidating (Previous Model)](https://nextjs.org/docs/app/guides/caching-without-cache-components)

Tags are attached with `fetch(url, { next: { tags: ['posts'] } })`, and for non-`fetch`
work — which is what a database-backed Radar will actually be doing — the previous-model
tool is `unstable_cache`, which **still carries the `unstable_` prefix in 16.3.1**
(`node_modules/next/dist/docs/01-app/03-api-reference/04-functions/unstable_cache.md`).
That is a real consideration: the stable, non-experimental way to tag a _database query_
in the previous model is an API named `unstable_`. The Cache Components equivalent —
`'use cache'` + `cacheTag()` — is not `unstable_`, but requires the flag from [§1](#1-partial-prerendering--cache-components).

`Cache-Control` for a fully dynamic page is:

> **Dynamic pages** (no caching): `private, no-cache, no-store, max-age=0, must-revalidate`
>
> — [Using a CDN with Next.js](https://nextjs.org/docs/app/guides/cdn-caching)

So a `force-dynamic` Radar gets zero CDN help: every request reaches a function.

### Cost at Radar's traffic

Hobby plan included usage, per
[Fluid compute pricing](https://vercel.com/docs/functions/usage-and-pricing):

| Resource             | Hobby included        |
| -------------------- | --------------------- |
| Function Invocations | **1,000,000 / month** |
| Active CPU           | **4 hours**           |
| Provisioned Memory   | **360 GB-hrs**        |

Invocation counting: "Counts each request to your function. Billed per incoming request…
Counts regardless of request success or failure." Active CPU is only billed while your
code is running — "You are only billed during actual code execution and not during I/O
operations (database queries…)" — but Provisioned Memory bills through I/O wait.

And, separately, from [Vercel Microfrontends §Limits and pricing](https://vercel.com/docs/microfrontends):

|                                   | Hobby                    | Pro                |
| --------------------------------- | ------------------------ | ------------------ |
| Included Microfrontends Routing   | **50K requests / month** | N/A                |
| Additional Microfrontends Routing | —                        | $2 per 1M requests |
| Included Microfrontends Projects  | 2 projects               | 2 projects         |

**Working the numbers.** 50K routed requests/month is roughly **1,600 requests/day**. That
is the effective traffic ceiling on this site as currently configured (ADR-0016 already
records this). Suppose Radar somehow saturated it: 48K page requests/month.

- Fully dynamic: ~48K invocations = **4.8% of the 1M Hobby allowance**.
- Active CPU: 4 hours = 14,400 CPU-seconds. At a generous 50 ms of _active_ CPU per render
  (DB wait doesn't count), 48K renders ≈ 2,400 CPU-seconds ≈ **17% of the allowance**.
- Provisioned Memory is the one to watch, because it bills through database latency. With
  Fluid compute's request concurrency this is hard to estimate from docs alone and is
  **not something I can compute honestly from primary sources** — it depends on instance
  memory, concurrency and how long each render waits on the database.

**Conclusion for point 3.** At Radar's plausible traffic, function invocations are not the
binding constraint on dynamic rendering — the microfrontends routing ceiling is, and that
ceiling applies identically to a fully static Radar. The real arguments against
`force-dynamic` are TTFB (every visitor waits for a database round-trip from the function
region), and the loss of Vercel's request collapsing and cache shielding, both of which
are ISR features: "With `Cache-Control` headers alone, Vercel doesn't know a path is
cacheable until it receives the response, so these features aren't available."
([Vercel, ISR §Caching on Vercel](https://vercel.com/docs/incremental-static-regeneration)).

---

## 4. `generateStaticParams` at article-page scale

### The mechanics

- `generateStaticParams` runs at build time, before the corresponding layouts or pages are
  generated. Critically: **"During revalidation (ISR), `generateStaticParams` will not be
  called again."**
  ([`generateStaticParams`](https://nextjs.org/docs/app/api-reference/functions/generate-static-params))
  So it is not a mechanism that discovers new articles between deploys; new slugs are
  served by the fallback path, not by re-enumeration.
- Returning a **subset** is a first-class documented pattern: "To statically render a
  subset of paths at build time, and the rest the first time they're visited at runtime,
  return a partial list of paths."
- The fallback is controlled by `dynamicParams`, which "replaces the
  `fallback: true | false | blocking` option of `getStaticPaths`". Default is `true` —
  unlisted params are generated at request time. `false` returns 404.
  ([`dynamicParams`](https://nextjs.org/docs/app/api-reference/file-conventions/route-segment-config/dynamicParams))
- **`dynamicParams` is not available when Cache Components is enabled** (ibid.). Under
  Cache Components the equivalent is the App Shell, below.

### The Cache Components answer to the same problem

This is the modern shape and it is documented as a first-class guide:

> For a visit to a URL whose params were included in `generateStaticParams`, Next.js serves
> the fully prerendered page from the cache. For a visit to a URL whose params weren't,
> Next.js serves the App Shell instantly, then upgrades it in the background with the
> now-known params. Subsequent visits to that URL get the upgraded result from the cache,
> skipping the App Shell entirely.
>
> — [ISR with Cache Components](https://nextjs.org/docs/app/guides/incremental-static-regeneration-cache-components)

Two version facts to weigh:

- "The App Shell for unlisted params is served from **Next.js 16.3**. Earlier versions wait
  for a full server render before sending the response." (ibid.) This repo is on 16.3.1, so
  it is available — by one patch release.
- This flow wants `partialPrefetching: true` as well, which "requires `cacheComponents`.
  Without it, `next dev` and `next build` throw at config validation", and whose version
  history reads: **"16.3.0 — `partialPrefetching` introduced."**
  ([`partialPrefetching`](https://nextjs.org/docs/app/api-reference/config/next-config-js/partialPrefetching))
  That API landed in the same minor this repo is pinned to, one patch release ago. It is
  not marked experimental, but it is new enough that
  betting a rebuild on it deserves a conscious decision rather than a shrug.

And the docs give the direct advice:

> Not every route needs to be prerendered. Every page you prerender increases build work
> and produces output that has to be stored and deployed. Many routes may never be visited
> before your next deployment, making that work unnecessary. […] Less frequently visited
> routes are generated on demand and upgraded after their first visit, so you don't spend
> build time and storage on pages that may never be requested.
>
> — [ISR with Cache Components §Choosing what to prerender](https://nextjs.org/docs/app/guides/incremental-static-regeneration-cache-components)

### Verdict for Radar

**Build-time enumeration of the whole table is not sane, and it gets worse every year.**
`generateStaticParams` re-runs on every deployment, so the cost is not paid once — it is
paid on every push, forever, growing linearly. On Hobby the build machine is 2 vCPU / 8 GB
([Vercel Hobby plan](https://vercel.com/docs/plans/hobby)), and Hobby allows 100 deployments
per day; a build that renders tens of thousands of database-backed pages is the wrong shape
for that box.

**One correction to the premise, which the decision in #91 should absorb.** The ticket
frames this as "~66 rows per weekday (~16k/year)". Per the wayfinder map, 66 is the
_candidate_ count; the map states that "an article gets a public page from `brief` upward,
and raw candidates stay a private backlog", and that the agent curates "~13 items from ~66
candidates". So the **public page** count is closer to **~13/weekday ≈ 3,400/year** — with
the ~16k/year figure describing rows in the article table, most of which never become
public pages. That does not change the recommendation, but it changes its urgency: full
enumeration is untenable at 16k/year immediately, and untenable at 3.4k/year within a
couple of years.

**Recommended shape**, valid in either model:

- `generateStaticParams` returns a **bounded recent window** — say the current digest's
  entries plus the trailing 30 days — not the whole table.
- Everything older is generated on first visit and then cached.
  - Previous model: leave `dynamicParams` at its default `true`.
  - Cache Components: the App Shell handles it; remember `generateStaticParams` must
    return **at least one** param or the build errors.
- Old article pages are immutable in practice, so once generated they should get a long
  cache lifetime — `export const revalidate` in the previous rendering model, or
  `use cache` with an explicit `cacheLife` under Cache Components. The two are not
  interchangeable: `cacheComponents` replaces the route-segment config. Note that a
  finite lifetime still expires on its own, so tag invalidation on edit is the
  _prompt_ path, not the only one; only `cacheLife('max')` approximates
  invalidate-by-tag-only.

---

## 5. Streaming and Suspense for the private backlog

### Status: stable, no flag

> React's server renderer produces HTML in chunks aligned with `<Suspense>` boundaries.
> Next.js integrates this into the App Router so **streaming works without additional
> configuration**.
>
> — [Streaming](https://nextjs.org/docs/app/guides/streaming)

The platform support table on that page lists **Node.js server: Yes**, Docker: Yes, Static
export: No. Radar runs the standard Next.js production server (ADR-0010), so streaming is
available today with no config change and no flag.

`loading.tsx` puts the boundary at the segment edge; inline `<Suspense>` lets you place it
anywhere. Each boundary is an independent streaming point and boundaries do not block each
other.

### What this means for a private, per-session surface

The backlog reads a session, which means `cookies()` or `headers()`, which means the route
is dynamic. Two things follow:

- **Without Cache Components**, that is simply a dynamic route with `<Suspense>` boundaries
  around the slow parts. Straightforward, stable, and available now.
- **With Cache Components**, the guidance is to push the runtime read down and wrap it:
  "If your components access runtime APIs like `cookies` or `headers`, wrap them in
  `<Suspense>`. Their fallback UI is included in the static shell instead."
  ([ISR with Cache Components](https://nextjs.org/docs/app/guides/incremental-static-regeneration-cache-components))
  `'use cache: private'` exists as the escape hatch for caching a function that already
  reads runtime data, at the price of never persisting server-side.

### Two constraints specific to this repo

1. **The CSP in `apps/radar/vercel.json` currently permits streaming, and a stricter one
   would not.** Streaming works by sending inline `<script>` tags that swap Suspense
   fallbacks for resolved content. Today's policy is
   `script-src 'self' 'unsafe-inline'`, which allows them. If the CSP is ever tightened to
   nonces, note that Next.js requires dynamic rendering for nonces to work at all: "you
   **must use dynamic rendering** to add nonces… Static pages are generated at build time,
   when no request or response headers exist—so no nonce can be injected."
   ([Content Security Policy](https://nextjs.org/docs/app/guides/content-security-policy)).
   A nonce-based CSP and a statically prerendered Radar are mutually exclusive. Worth
   knowing before someone "hardens" the header.

2. **Bots don't stream.** "the server waits for the full render and sends one fully formed
   HTML document instead of streaming" for bot user agents
   ([Streaming §Bots and crawlers](https://nextjs.org/docs/app/guides/streaming)). Fine for
   a private backlog that should not be crawled anyway; relevant for public article pages,
   where a crawler will pay the full render latency.

**One experimental API to avoid quietly adopting.** `forbidden()` and `unauthorized()`
carry `version: experimental` in the 16.3.1 docs and require `experimental.authInterrupts`
([`forbidden`](https://nextjs.org/docs/app/api-reference/functions/forbidden)). If the
private-write story needs a 403 page, that is an experimental flag, not a stable one.

---

## 6. Interaction with `@vercel/microfrontends`

### Does the routing layer cache? Does it add a hop?

No hop, and the routing decision happens **before** the cache is consulted.

> When Vercel receives a request to a domain that uses microfrontends, it reads the
> `microfrontends.json` file in the live deployment to determine which application handles
> the path. **This happens within the same request. It is not a rewrite that results in a
> second outbound request to the child application's URL, so there is no additional network
> hop.**
>
> — [Vercel, Microfrontends Routing](https://vercel.com/docs/microfrontends/routing)

The general request pipeline puts routing before caching before compute:

> After passing security checks, the request enters **the proxy**. This is the decision
> engine of the Vercel network. […] Using this information, the proxy determines […] Route
> type: Does this URL point to a static file or a dynamic function? […]
>
> **How Vercel caches static and dynamic content** — For static assets, pre-rendered pages,
> and cacheable responses, the proxy checks the **Vercel Cache**. […] **Stale hit (ISR)**:
> Stale content serves instantly while a background process regenerates fresh content.
>
> — [How requests flow through Vercel](https://vercel.com/docs/fundamentals/infrastructure)

**So the documented request order implies that ISR, PPR and dynamic rendering behind
`/radar/*` should behave as they would if Radar were a standalone Vercel project on its
own domain**: the routing layer picks the deployment, and everything downstream — CDN
cache, ISR cache, request collapsing, function invocation — is that deployment's
ordinary behaviour.

**This is a reading of the request-flow documentation, not a tested result.** Nothing
cited here states PPR shell/hole behaviour or shared-origin on-demand revalidation for a
microfrontends deployment. Treat it as the working hypothesis the probe in
[#98](https://github.com/jeasmith/ithilien/issues/98) exists to confirm.

### There is nothing cache-related to configure

Verified against the package's own schema rather than the docs. `@vercel/microfrontends@2.4.0`
ships `schema/schema.json`, and the complete set of configurable keys is:

- `version`, `applications`, `options`
- per application: `packageName`, `development` (`local`, `task`, `fallback`), and for
  child apps `routing` (`group`, `flag`, `paths`) and `assetPrefix`
- `options`: `disableOverrides`, `localProxyPort`

There is **no** cache, TTL, header or revalidation configuration of any kind. Nothing in
`microfrontends.json` can opt a path out of caching, and nothing needs to be added to it to
make ISR work. `apps/ithilien/microfrontends.json` already claims `/radar` and
`/radar/:path*`, which covers every future Radar route including route handlers, sitemaps
and OG image routes.

### Does revalidation pass through? — partly **unverified**

**What is documented:** on-demand revalidation "applies to the domain and deployment where
you trigger it, and doesn't affect subdomains or other deployments"
([Vercel, ISR](https://vercel.com/docs/incremental-static-regeneration)). And the ISR cache
"is scoped to a specific deployment where each deployment generates its own cache" (ibid.).

**What is not documented:** Vercel publishes no page describing how on-demand revalidation
interacts with microfrontends routing specifically. I could not find one. The reasonable
reading — that because routing is same-request and not a cross-deployment rewrite, a
`POST https://www.ithilien.dev/radar/api/revalidate` executes inside the Radar deployment
_on the production domain_ and therefore purges the caches serving that domain — follows
from the two quotes above but is **not stated anywhere**. Label it unverified.

**Experiment to settle it** (about an hour, one throwaway branch):

1. Add to Radar a trivial ISR page at `/radar/isr-probe` that renders a timestamp from an
   external source with `export const revalidate = 86400`, plus a secret-guarded route
   handler at `/radar/api/revalidate-probe` calling `revalidatePath('/radar/isr-probe')`.
2. Deploy to production. Load `https://www.ithilien.dev/radar/isr-probe` twice and confirm
   `x-vercel-cache: HIT` on the second request.
3. `curl` the route handler **via the shared origin** with the secret. Reload the page.
   Expected: new timestamp, `x-vercel-cache: STALE` then `HIT`.
4. Repeat step 3 **via Radar's own `*.vercel.app` deployment domain**. Then reload the page
   on the shared origin. If the domain-scoping rule bites, the shared origin will _not_
   update — which is the finding that matters for wiring up GitHub Actions.
5. Delete the branch.

Until that runs, the safe _working assumption_ for the build ticket — an unverified
operational hypothesis, not an established behaviour — is: **trigger revalidation against
the shared production origin (`https://www.ithilien.dev/radar/...`), never against Radar's
own project domain.**

### Gotchas when only Radar is dynamic and Ithilien stays static

Each app is a separate Vercel project with its own build, its own ISR cache and its own
function region (ADR-0015; [Vercel, Microfrontends §Repository layout](https://vercel.com/docs/microfrontends)).
Nothing couples their rendering strategies. Ithilien can stay fully static. But five things
do bite:

1. **`withMicrofrontends` force-enables an experimental flag.** Reading
   `@vercel/microfrontends@2.4.0`'s `dist/next/config.js`, the draft-mode transform sets
   `next.experimental.multiZoneDraftMode = true` unless you have already set it. This is
   visible in this repo's build output today:
   `- Experiments (use with caution): ✓ multiZoneDraftMode`. It is benign, but it means
   Radar is already running one experimental Next.js flag that nobody chose, and it is
   worth knowing when reasoning about what "no experimental features" means here.

2. **`withMicrofrontends` owns `assetPrefix`.** For child applications it sets
   `next.assetPrefix = '/vc-ap-<hash>'`, rewrites `next.images.path` to
   `${assetPrefix}/_next/image`, and injects `beforeFiles` rewrites mapping
   `/<prefix>/_next/:path+` → `/_next/:path+` (plus `.well-known/vercel/flags`,
   the rate-limit API, and `/_vercel/:path*`). The transform **throws** if `assetPrefix` is
   already set to a different value. Any future `next.config.ts` change must leave these
   alone.

3. **`public/` assets need manual prefixing.** "JavaScript and CSS URLs are automatically
   prefixed with the asset prefix, but content in the `public/` directory needs to be
   manually moved to a subdirectory with the name of the asset prefix."
   ([Vercel, Microfrontends Routing §Next.js](https://vercel.com/docs/microfrontends/routing))
   Relevant the moment Radar ships static OG images or a logo.

4. **The local dev proxy does not cache and does not reproduce any of this.** Reading
   `@vercel/microfrontends@2.4.0`'s `dist/bin/cli.cjs`, the proxy is a plain HTTP pipe
   (`req.pipe(proxyReq)` / `realRes.pipe(res, { end: true })`) with no `Cache-Control`,
   `s-maxage`, ETag or `no-store` handling anywhere in the file. Combined with
   `development.fallback` pointing at `www.ithilien.dev`, **port 3024 will never show you
   ISR, PPR or revalidation behaving as it does in production.** The package changelog also
   records two recent fixes for the proxy crashing on mid-stream upstream errors (2.3.4,
   2.3.6), so streaming through the local proxy has a short history of being fragile.
   Any rendering decision has to be validated on a preview deployment, not locally.

5. **Routed requests are metered per request, and the routing decision happens before the
   cache check** — so a CDN hit still passes through routing. Vercel's docs give the
   pipeline order ([How requests flow through Vercel](https://vercel.com/docs/fundamentals/infrastructure))
   but do **not** publish the counting rule for microfrontends routed requests, so
   "cache hits still consume routed requests" is an **inference from the documented request
   order, not a stated fact**. If it holds, no rendering strategy reduces the 50K/month
   Hobby ceiling, and choosing ISR over dynamic buys latency and compute, not headroom.

### One thing that is not a constraint

`basePath` remains unusable (ADR-0016, `apps/radar/next.config.ts`), so Radar's routes stay
under `src/app/radar/`. That is a source-layout constraint, not a rendering one: every
option in this document works identically at a nested route path. `generateStaticParams`,
`revalidatePath`, `sitemap.ts` and `<Suspense>` do not care how deep the segment is — they
just need the full, unstripped path.

---

## 7. Dynamic `sitemap.ts` and article metadata on the `/radar` prefix

### Where the sitemap lands

`sitemap.(xml|js|ts)` is a file convention resolved relative to its route segment. The
`generateSitemaps` reference states this explicitly: "Your generated sitemaps will be
available at `/.../sitemap/[id].xml`. For example, `/product/sitemap/1.xml`", from a file at
`app/product/sitemap.ts`
([`generateSitemaps`](https://nextjs.org/docs/app/api-reference/functions/generate-sitemaps)).

So `apps/radar/src/app/radar/sitemap.ts` serves at **`/radar/sitemap.xml`**, which is
already matched by `/radar/:path*` in `apps/ithilien/microfrontends.json`. No config change
is needed, and no config change is _possible_ — the prefix comes for free precisely because
paths are not stripped.

**But the origin-root sitemap belongs to Ithilien.** `/sitemap.xml` and `/robots.txt` at the
root are unclaimed paths and therefore route to the default application. A sitemap at
`/radar/sitemap.xml` is also path-scoped by the sitemap protocol itself:

> A Sitemap file located at `http://example.com/catalog/sitemap.xml` can include any URLs
> starting with `http://example.com/catalog/` but can not include URLs starting with
> `http://example.com/images/`.
>
> — [sitemaps.org protocol, Sitemap file location](https://www.sitemaps.org/protocol.html)

That is nearly fine — but note the boundary case: `/radar` itself is a Radar URL and does
**not** begin with `/radar/`, so a strict reading of the protocol excludes the digest's own
landing page from its own sitemap. Either omit `/radar` from the child sitemap and list it
in Ithilien's root sitemap, or publish a sitemap index at the origin root that covers both.
Either way Ithilien must own a `robots.txt` (and ideally that sitemap index) pointing
crawlers at `/radar/sitemap.xml`, or the Radar sitemap has to be submitted to Search
Console separately. That is a cross-app
coordination point, and it is the one place in this research where the microfrontends split
makes an SEO surface more awkward than a single app would be.

### Is a database-backed sitemap dynamic?

By default, no — it is cached:

> `sitemap.js` is a special Route Handler that is **cached by default** unless it uses a
> Request-time API or dynamic config option.
>
> — [`sitemap.xml`](https://nextjs.org/docs/app/api-reference/file-conventions/metadata/sitemap)

So a sitemap that queries the database will be generated once at build and then frozen
unless you tag it and revalidate it (or, in the previous model, export `revalidate`). Put
it on the same tag the digest job invalidates.

Scale is not a problem: Google's limit is 50,000 URLs per sitemap and `generateSitemaps`
exists to split beyond that. At ~3,400 public pages/year (see [§4](#4-generatestaticparams-at-article-page-scale))
a single sitemap file lasts well over a decade.

### Metadata — the one that will actually bite

`metadataBase` supports a base path, which is exactly what a prefixed microfrontend needs:

> `metadataBase` can contain a subdomain e.g. `https://app.acme.com` or **base path e.g.
> `https://acme.com/start/from/here`**
>
> — [`generateMetadata` §metadataBase](https://nextjs.org/docs/app/api-reference/functions/generate-metadata)

And the URL composition rules make the prefix automatic, because Next deliberately treats
an "absolute" metadata path as relative to the end of `metadataBase`:

> An "absolute" path in a `metadata` field (that typically would replace the whole URL path)
> is treated as a "relative" path (starting from the end of `metadataBase`).

With `metadataBase: new URL('https://www.ithilien.dev/radar')`, a canonical of
`/article/foo` resolves to `https://www.ithilien.dev/radar/article/foo`, which is what you
want.

**The trap.** Do not derive `metadataBase` from `VERCEL_PROJECT_PRODUCTION_URL`. Vercel
defines it as:

> A production domain name of the project. We select the shortest production custom domain,
> or `vercel.app` domain if no custom domain is available.
>
> — [System environment variables](https://vercel.com/docs/environment-variables/system-environment-variables)

For the **Radar** Vercel project that resolves to Radar's own domain — not
`www.ithilien.dev`. A canonical tag, an OG image URL or a sitemap `<loc>` built from it
would point search engines and social scrapers at the child deployment rather than the
shared origin: duplicate content at best, a leaked internal URL at worst. The shared origin
must be a hardcoded constant or an explicit environment variable, and it should be the same
constant the sitemap uses.

Two further metadata notes:

- OG image routes (`opengraph-image.tsx`) are segment-relative like the sitemap, so they
  land under `/radar/...` and are already covered by the routing config.
- Under Cache Components, `generateMetadata` "follow[s] the same rules as components. If
  they read runtime data […] or fetch uncached data while the rest of the page is otherwise
  prerenderable, Next.js raises an error so the choice is explicit. If the metadata depends
  on external but not runtime data, add `use cache`."
  ([Migrating to Cache Components](https://nextjs.org/docs/app/guides/migrating-to-cache-components))
  A database-backed article title in `generateMetadata` is exactly that case and will need
  `'use cache'`.

---

## Build experiments run for this ticket

Two builds were run in this worktree to test one specific compatibility claim that no
document answers: **does `cacheComponents` co-exist with `withMicrofrontends`?**
`apps/radar/next.config.ts` was edited, built, and restored; `git status` is clean and the
config file is byte-identical to `main`. No application code is changed by this branch.

| Config                                              | Result                                                                         |
| --------------------------------------------------- | ------------------------------------------------------------------------------ |
| Baseline (as committed)                             | Builds. `- Experiments (use with caution): ✓ multiZoneDraftMode`               |
| `+ cacheComponents: true`                           | **Builds.** `- Cache Components enabled` printed _above_ the experiments block |
| `+ cacheComponents: true, partialPrefetching: true` | **Builds.** `- Cache Components enabled` / `- Partial Prefetching enabled`     |

Findings: the `assetPrefix`, rewrite and `multiZoneDraftMode` transforms applied by
`withMicrofrontends@2.4.0` do not conflict with Cache Components or Partial Prefetching at
build time, and `partialPrefetching`'s config validation accepts the combination. This says
nothing about **runtime** behaviour behind Vercel's routing layer, which remains
[unverified](#does-revalidation-pass-through--partly-unverified).

## What is unverified, and how to settle it

| Claim                                                                                                                                 | Status                                                                       | How to settle                                                                                                                |
| ------------------------------------------------------------------------------------------------------------------------------------- | ---------------------------------------------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------- |
| On-demand revalidation triggered via the shared origin purges the caches serving `/radar/*`                                           | **Unverified** — follows from two documented facts, stated nowhere           | The 5-step probe in [§6](#does-revalidation-pass-through--partly-unverified)                                                 |
| Cached responses still consume microfrontends routed requests                                                                         | **Inference** from the documented request order; counting rule not published | Deploy, generate known traffic to a cached `/radar` page, read the Vercel Delivery Network usage chart                       |
| PPR/Cache Components behaves correctly at runtime behind microfrontends routing (shell served, holes streamed, RSC prefetches routed) | **Unverified** — builds fine, never deployed                                 | Preview deployment with one PPR route under `/radar/`; check `x-vercel-cache` on the shell and that the dynamic hole streams |
| Provisioned Memory cost of a database-backed dynamic Radar                                                                            | **Not computable** from docs                                                 | Measure on a preview deployment under synthetic load                                                                         |

## Sources

Next.js (read from the version-matched docs shipped inside `next@16.3.1` at
`node_modules/next/dist/docs/`):

- [`cacheComponents`](https://nextjs.org/docs/app/api-reference/config/next-config-js/cacheComponents)
- [`partialPrefetching`](https://nextjs.org/docs/app/api-reference/config/next-config-js/partialPrefetching)
- [`use cache`](https://nextjs.org/docs/app/api-reference/directives/use-cache) ·
  [`use cache: private`](https://nextjs.org/docs/app/api-reference/directives/use-cache-private) ·
  [`use cache: remote`](https://nextjs.org/docs/app/api-reference/directives/use-cache-remote)
- [`revalidateTag`](https://nextjs.org/docs/app/api-reference/functions/revalidateTag) ·
  [`revalidatePath`](https://nextjs.org/docs/app/api-reference/functions/revalidatePath) ·
  [`updateTag`](https://nextjs.org/docs/app/api-reference/functions/updateTag) ·
  [`refresh`](https://nextjs.org/docs/app/api-reference/functions/refresh)
- [`generateStaticParams`](https://nextjs.org/docs/app/api-reference/functions/generate-static-params) ·
  [`dynamicParams`](https://nextjs.org/docs/app/api-reference/file-conventions/route-segment-config/dynamicParams)
- [`sitemap.xml`](https://nextjs.org/docs/app/api-reference/file-conventions/metadata/sitemap) ·
  [`generateSitemaps`](https://nextjs.org/docs/app/api-reference/functions/generate-sitemaps) ·
  [`generateMetadata`](https://nextjs.org/docs/app/api-reference/functions/generate-metadata)
- [`forbidden`](https://nextjs.org/docs/app/api-reference/functions/forbidden)
- [ISR with Cache Components](https://nextjs.org/docs/app/guides/incremental-static-regeneration-cache-components) ·
  [Migrating to Cache Components](https://nextjs.org/docs/app/guides/migrating-to-cache-components) ·
  [Caching and Revalidating (Previous Model)](https://nextjs.org/docs/app/guides/caching-without-cache-components)
- [How revalidation works](https://nextjs.org/docs/app/guides/how-revalidation-works) ·
  [Using a CDN with Next.js](https://nextjs.org/docs/app/guides/cdn-caching)
- [Streaming](https://nextjs.org/docs/app/guides/streaming) ·
  [Content Security Policy](https://nextjs.org/docs/app/guides/content-security-policy)
- [Version 16 upgrade guide](https://nextjs.org/docs/app/guides/upgrading/version-16)
- [Next.js 16 release post](https://nextjs.org/blog/next-16)
- Shipped types: `next/dist/server/config-shared.d.ts` (`16.3.1`)

Vercel:

- [Microfrontends](https://vercel.com/docs/microfrontends) ·
  [Microfrontends Routing](https://vercel.com/docs/microfrontends/routing) ·
  [Local development](https://vercel.com/docs/microfrontends/local-development)
- [How requests flow through Vercel](https://vercel.com/docs/fundamentals/infrastructure)
- [Incremental Static Regeneration](https://vercel.com/docs/incremental-static-regeneration) ·
  [Getting started with ISR](https://vercel.com/docs/incremental-static-regeneration/quickstart) ·
  [ISR Usage and Pricing](https://vercel.com/docs/incremental-static-regeneration/limits-and-pricing)
- [Partial Prerendering](https://vercel.com/docs/partial-prerendering) ·
  [Next.js 16.3 support on Vercel](https://vercel.com/blog/vercel-supports-next-js-16-3)
- [Fluid compute pricing](https://vercel.com/docs/functions/usage-and-pricing) ·
  [CDN pricing and usage](https://vercel.com/docs/manage-cdn-usage) ·
  [Hobby plan](https://vercel.com/docs/plans/hobby)
- [System environment variables](https://vercel.com/docs/environment-variables/system-environment-variables)
- [Runtime Cache](https://vercel.com/docs/runtime-cache)

`@vercel/microfrontends@2.4.0` package sources (read from the published tarball):

- `schema/schema.json` — the complete configuration surface
- `dist/next/config.js` — the `assetPrefix`, `rewrites`, `redirects` and `draft-mode` transforms
- `dist/bin/cli.cjs` — the local development proxy
- `CHANGELOG.md`

Other:

- [sitemaps.org protocol](https://www.sitemaps.org/protocol.html)

Repository context: `docs/adr/0006-static-rendering-by-default.md` (superseded by 0010),
`docs/adr/0010-use-the-nextjs-production-server.md`,
`docs/adr/0015-turborepo-monorepo.md`, `docs/adr/0016-vercel-microfrontends.md`,
`apps/ithilien/microfrontends.json`, `apps/radar/vercel.json`, `apps/radar/next.config.ts`.
