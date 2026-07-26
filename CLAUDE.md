# CLAUDE.md — Project Context for AI Assistants

## Project Overview

Ithilien is a personal projects and blog website built with Next.js 16, deployed
on Vercel. It serves as a repository of experiments and learning — some pages are
simple content, others demonstrate different rendering and delivery methods.

## Tech Stack

- **Framework**: Next.js 16 (App Router)
- **Language**: TypeScript (strict mode)
- **Package Manager**: pnpm 10
- **Styling**: Tailwind CSS v4 + shadcn/ui components
- **Testing**: Vitest + React Testing Library
- **Linting**: oxlint (`.oxlintrc.json`) + Prettier
- **Runtime**: Node.js 24 LTS — pinned in `.nvmrc`, `engines.node` and the
  Dockerfile. Vercel offers 24.x, 22.x and 20.x only, so 24 is the newest
  version that keeps local, CI and production on the same major.
- **Local dev**: Docker (`compose.yaml`) so the host needs no Node.js
- **Hosting**: Vercel (static export)

## Project Structure

```
src/
  app/          — Next.js App Router pages and layouts
  components/
    ui/         — shadcn/ui generated components
  lib/          — Shared utilities (e.g., cn() for class merging)
  hooks/        — Custom React hooks
docs/
  adr/          — Architecture Decision Records
.github/
  workflows/    — CI pipeline (GitHub Actions)
```

## Key Commands

```bash
pnpm dev            # Start dev server with Turbopack
pnpm build          # Production build (static export)
pnpm test           # Run tests
pnpm validate       # Run lint + typecheck + format check + tests
```

The same commands run in Docker, which needs no host Node.js:

```bash
docker compose up dev                      # Dev server on :3000
docker compose run --rm dev pnpm validate  # Any script, one-off
```

Never bind-mount the host's `node_modules` into the container — oxlint and
`oxlint-tsgolint` ship platform-native binaries, so the container keeps its own
copy in a named volume.

## Conventions

- **ADRs**: Every significant technology decision gets an ADR in `docs/adr/`.
  Use `docs/adr/0000-template.md` as the format.
- **Static by default**: Current config uses `output: "export"` in
  `next.config.ts`. All pages are statically rendered.
- **Component style**: shadcn/ui components live in `src/components/ui/`. They
  are source files we own, not imported from a package.
- **Testing**: Tests live alongside their source in `__tests__/` directories.
  Use React Testing Library — test behaviour, not implementation.
- **Formatting**: Prettier handles formatting. oxlint handles logic rules,
  including type-aware ones via `oxlint-tsgolint`. Both must pass in CI.
  There is no ESLint — see `docs/adr/0012-upgrade-to-typescript-7.md`.
- **No secrets in code**: All environment variables go through Vercel env
  config.

## Working with This Codebase

- Run `pnpm validate` before committing to catch issues early.
- When adding a new shadcn component: `pnpm dlx shadcn@latest add <component>`
- When making a technology choice: create a new ADR.
- The `@/*` path alias maps to `./src/*`.
