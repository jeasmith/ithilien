# CLAUDE.md — Project Context for AI Assistants

## Project Overview

Ithilien is a personal projects and blog website built with Next.js 16, deployed
on Vercel. It serves as a repository of experiments and learning — some pages are
simple content, others demonstrate different rendering and delivery methods.

It is a Turborepo monorepo holding two independently deployable applications
served on a single origin as a Vercel microfrontends group.

## Tech Stack

- **Framework**: Next.js 16 (App Router)
- **Language**: TypeScript 6 (strict mode)
- **Monorepo**: Turborepo + pnpm workspaces
- **Delivery**: Vercel Microfrontends — two Vercel projects, one origin
- **Package Manager**: pnpm 10
- **Styling**: Tailwind CSS v4 + shadcn/ui components
- **Testing**: Vitest + React Testing Library
- **Linting**: oxlint (`.oxlintrc.json`) + Prettier
- **Runtime**: Node.js 24 LTS — pinned in `.nvmrc`, `engines.node` and the
  Dockerfile. Vercel offers 24.x, 22.x and 20.x only, so 24 is the newest
  version that keeps local, CI and production on the same major.
- **Local dev**: Docker (`compose.yaml`) so the host needs no Node.js
- **Code navigation**: `typescript-language-server` over stdio (`pnpm lsp`)
- **Hosting**: Vercel

## Project Structure

```
apps/
  ithilien/   Serves /. The DEFAULT app — owns microfrontends.json.
  radar/      Serves /radar. An architectural digest.
packages/
  ui/                  Design tokens, globals.css, cn(), shadcn components
  typescript-config/   Shared tsconfig bases (base.json, nextjs.json)
docs/
  adr/        Architecture Decision Records
.github/
  workflows/  CI pipeline (GitHub Actions)
```

Each app follows the same internal shape:

```
apps/<app>/
  src/app/          App Router pages and layouts
  microfrontends.json   (ithilien only — the routing config)
  vercel.json       Security headers, per Vercel project
```

## Key Commands

Root scripts fan out across every project through Turborepo. Add
`--filter=<name>` to narrow them, e.g. `pnpm build --filter=radar`.

```bash
pnpm dev             # Both apps + the microfrontends proxy
pnpm dev:radar       # Radar only; Ithilien falls back to production
pnpm build           # Build every application
pnpm --silent lsp    # TypeScript language server over clean stdio
pnpm test            # Run tests
pnpm validate        # Run lint + typecheck + format check + tests
```

The same commands run in Docker, which needs no host Node.js:

```bash
docker compose up dev                       # Proxy on :3024
docker compose run --rm dev pnpm validate   # Any script, one-off
```

**Open port 3024, not 3000.** That is the microfrontends proxy, and it is the
only address where routing behaves as it does in production. 3000 is Ithilien
alone and 3001 is Radar alone.

Never bind-mount the host's `node_modules` into the container — Oxlint and
Next.js ship platform-native binaries, so the container keeps its own copy in a
named volume. pnpm creates a `node_modules` per workspace project, so each one
needs its own mask in `compose.yaml`.

## Microfrontends Rules

These are the constraints that are easy to get wrong:

- **Paths are not stripped.** Vercel routes `/radar/*` to the Radar deployment
  with the prefix intact, so Radar's routes live at `src/app/radar/`. Next.js
  `basePath` is not supported and cannot be used to shorten them.
- **Cross-application links** use `Link` from
  `@vercel/microfrontends/next/client`, not `next/link`. A `next/link` across
  applications tries a client-side transition to a route that is not in the
  current bundle.
- **New routed paths** must be added to `apps/ithilien/microfrontends.json` and
  covered in `apps/ithilien/src/__tests__/microfrontends.test.ts`, which asserts
  the real config with `validateRouting`.
- **Application names** in `microfrontends.json` must match the Vercel project
  names exactly.
- **Tests must supply** `NEXT_PUBLIC_MFE_CLIENT_CONFIG` themselves — see
  `apps/radar/vitest.setup.ts`. `withMicrofrontends` injects it at build time
  and Vitest never runs that step.

## Conventions

- **ADRs**: Every significant technology decision gets an ADR in `docs/adr/`.
  Use `docs/adr/0000-template.md` as the format. Start from `0017`.
- **Standard Next.js server**: The project uses the standard production server;
  see `docs/adr/0010-use-the-nextjs-production-server.md`.
- **Component style**: shadcn/ui components live in `packages/ui/src/components/`
  and are shared by both apps. They are source files we own, not imported from a
  package. Add with `pnpm dlx shadcn@latest add <component> -c packages/ui`.
- **No `@/*` in `packages/ui`**: Next.js resolves `@/*` from the consuming
  app's `tsconfig.json`, so an `@/lib/utils` import inside a shared package
  resolves against `apps/*/src` and fails the build. Use `@repo/ui/...`.
- **Testing**: Tests live alongside their source in `__tests__/` directories.
  Use React Testing Library — test behaviour, not implementation.
- **Formatting and linting**: Prettier handles formatting. Oxlint handles logic
  rules; both run once at the root rather than per package. Type-aware Oxlint
  requires TypeScript 7, so TypeScript 6 semantic checks remain in
  `pnpm typecheck`. There is no ESLint command or config — see
  `docs/adr/0012-use-typescript-6-with-oxlint.md`.
- **Semantic navigation**: Prefer the project-local TypeScript service. LSP
  clients can launch `pnpm --silent lsp`; VS Code is configured to use the
  workspace TypeScript SDK. Fall back to text search only when semantic
  navigation is not available.
- **No secrets in code**: All environment variables go through Vercel env
  config.

## Working with This Codebase

- Run `pnpm validate` before committing to catch issues early.
- Adding an application means editing `pnpm-workspace.yaml` (already globbed),
  `apps/ithilien/microfrontends.json`, the `Dockerfile` manifest COPY lines, and
  `compose.yaml` volume masks — plus creating the Vercel project.
- When making a technology choice: create a new ADR.
- The `@/*` path alias maps to an app's own `./src/*`. Shared code is `@repo/ui`.
