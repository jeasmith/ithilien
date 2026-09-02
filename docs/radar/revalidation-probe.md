# Does on-demand revalidation cross the microfrontends proxy?

The answer record for [#98](https://github.com/jeasmith/ithilien/issues/98) on the
[Radar wayfinder map](https://github.com/jeasmith/ithilien/issues/82). Run on
2026-09-02 against production. The probe routes were removed the same morning
(PR #101); nothing in this document is still deployed.

## The answer

**Yes, and it takes about three seconds.**

On-demand revalidation triggered against the shared production origin reaches the
Radar deployment and invalidates the copy served at that origin. The route handler
executes _inside_ the Radar deployment, and the next request to the shared origin
regenerates.

```text
POST https://www.ithilien.dev/radar/api/revalidate-probe   07:18:36.166Z
  → executed inside the Radar production deployment
    deploymentUrl: radar-cuya7c5ik-…   vercelEnv: production
  → {"revalidated": true}

shared origin  t=0.5s   HIT           generated-at 07:17:51.735Z   (old)
shared origin  t=3.3s   REVALIDATED   generated-at 07:18:38.807Z   (NEW)
shared origin  t=5.6s   HIT           generated-at 07:18:38.807Z
       …through t=70s   HIT           generated-at 07:18:38.807Z   (32 reads, stable)
```

The probe page carried `export const revalidate = 86400`, so no time-based
regeneration could have produced that change within the window. The only
invalidation was the POST.

## What the Actions job must do

**Call the shared origin. Radar's own domain is unreachable.**

This turned out to be forced rather than advisable. Both Vercel projects run
`ssoProtection: all_except_custom_domains`, so **every `*.vercel.app` URL answers
an unauthenticated request with `302 → vercel.com/sso-api`** — preview deployments
and _Radar's own production deployment URL alike_. Verified directly:

| URL                                                     | Unauthenticated response |
| ------------------------------------------------------- | ------------------------ |
| `radar-<hash>.vercel.app/radar` (production deployment) | `302` → SSO              |
| `radar-<hash>.vercel.app/radar` (preview)               | `302` → SSO              |
| `www.ithilien.dev/radar`                                | `200`                    |

So the custom domain is the only surface an unauthenticated client can reach, and
it only ever serves production. A GitHub Actions job has no way to address Radar
directly without an automation bypass secret.

**Shape:**

```text
POST https://www.ithilien.dev/radar/api/<handler>
     x-<name>-secret: <from Vercel env config>
```

The endpoint must fail closed when its secret is unset. The probe returned `403`
on a missing secret, `403` on a wrong one, and `405` on `GET`; comparison was
constant-time over hashed buffers so neither the value nor its length leaks.

## Consequences for the rendering decision

This removes the last blocker on [#91](https://github.com/jeasmith/ithilien/issues/91).
ISR with on-demand revalidation is viable behind the proxy, which was the option
the whole plan rested on.

Three seconds also means [#97](https://github.com/jeasmith/ithilien/issues/97) can
design the daily run to **revalidate and then verify** rather than fire and forget
— the run can confirm the published issue is actually being served before it
reports success.

## Two findings that were not the question

**Bypass tokens are deployment-scoped, which makes preview testing of cross-app
paths impractical.** The first attempt ran on preview deployments. Microfrontends
routing works there and routes to the _matching branch build_ — the shared preview
origin served a path that existed only in the probe branch, which is a useful fact
in itself. But the `_vercel_jwt` share token is scoped to one deployment, and on
the shared origin `/radar/*` is served by the _other_ deployment. Cached hits pass;
any read that needs the origin falls back to SSO. That is exactly the read a
cache-invalidation probe depends on, so the preview run could not measure latency
and reported a misleading ~90 s. The real figure is ~3 s.

**Rapid polling of production trips Vercel's bot mitigation.** Roughly 35 requests
over 95 seconds from one IP caused `www.ithilien.dev` to start answering `403` with
`x-vercel-mitigated: challenge` and a "Vercel Security Checkpoint" page, on every
path, for about twenty minutes. It cleared without intervention. Anything that
polls this origin — a deploy check, an uptime probe, a post-revalidation
verification in the daily run — should stay well below that rate and back off on a
`403` carrying `x-vercel-mitigated`.
