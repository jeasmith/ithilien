# ADR-0015: Turborepo monorepo

## Status

Accepted

## Context

The repository held a single Next.js application at its root. Adding Radar (see
[ADR-0016](0016-vercel-microfrontends.md)) means the repository has to hold two
independently deployable applications that share a visual identity, a
TypeScript configuration, and a toolchain.

Two layouts were available:

- **Polyrepo** — a repository per application. Each deploys on its own and has
  no build-time coupling, but the shared `microfrontends.json` then lives in
  only one repository. Every other application has to obtain it with
  `vercel microfrontends pull` or `VC_MICROFRONTENDS_CONFIG`, and a build that
  cannot find it fails. Shared design tokens would need publishing to a
  registry, or duplicating.
- **Monorepo** — one repository, one lockfile. Vercel detects
  `microfrontends.json` automatically, and shared code is a workspace
  dependency rather than a published package.

Vercel's local development proxy also needs to run alongside the development
servers so that requests for an application that is not running locally fall
back to production. Turborepo starts that proxy automatically when it runs a
development task; without it the proxy has to be started and stopped by hand
next to each `next dev`.

A plain pnpm workspace would give us the shared packages without Turborepo. It
would not give us the proxy integration, and `pnpm -r run build` offers no
caching or task graph, so every check would re-run across both applications on
every change.

## Decision

Use a pnpm workspace driven by Turborepo, with applications in `apps/` and
shared code in `packages/`:

```
apps/
  ithilien/   the default application, owns microfrontends.json
  radar/      the architectural digest, served at /radar
packages/
  ui/                 design tokens, globals.css, cn(), shadcn components
  typescript-config/  shared tsconfig bases
```

Root scripts delegate to Turborepo (`turbo run build`, `turbo run typecheck`,
`turbo run test`). Oxlint and Prettier stay as single root invocations because
both are fast enough repository-wide that per-package caching would cost more
than it saves.

Each application is a separate Vercel project with its root directory set to
its own `apps/*` directory, so the security headers in `vercel.json` are
per-application rather than shared.

Shared components use relative or package-qualified imports rather than the
`@/*` alias. Next.js resolves `@/*` from the consuming application's
`tsconfig.json`, so an `@/lib/utils` import inside `packages/ui` would resolve
against the application's `src/` and fail to build.

## Consequences

### Positive

- The design tokens exist once. Both applications import the same
  `globals.css`, so they cannot drift apart visually.
- Turborepo starts the microfrontends proxy as part of `pnpm dev`, so the local
  setup matches production routing without extra processes to manage.
- Task-level caching means an unchanged application's checks are replayed from
  cache rather than re-run.
- One lockfile and one dependency upgrade surface for Dependabot.

### Negative

- Every workspace project needs its own `node_modules` mask in `compose.yaml`,
  which makes the Docker setup noticeably more verbose.
- The Dockerfile has to copy each project's `package.json` before installing,
  so adding an application means remembering to edit the Dockerfile.
- Contributors now have to know which directory they are working in; `pnpm dev`
  at the root starts both applications rather than one.

### Neutral

- Turborepo's remote caching is available but not enabled. Local caching is
  sufficient at this scale, and enabling it later needs no code changes.

## References

- [Vercel: microfrontends repository layout](https://vercel.com/docs/microfrontends#repository-layout)
- [Vercel: microfrontends local development](https://vercel.com/docs/microfrontends/local-development)
- [Turborepo: adding Turborepo to an existing repository](https://turborepo.com/docs/getting-started/add-to-existing-repository)
