# CLAUDE.md — Project Context for AI Assistants

## Project Overview

Ithilien is a personal projects and blog website built with Next.js 16, deployed
on Vercel. It serves as a repository of experiments and learning — some pages are
simple content, others demonstrate different rendering and delivery methods.

## Tech Stack

- **Framework**: Next.js 16 (App Router)
- **Language**: TypeScript 6 (strict mode)
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
pnpm build          # Production build
pnpm --silent lsp   # TypeScript language server over clean stdio
pnpm test           # Run tests
pnpm validate       # Run lint + typecheck + format check + tests
```

The same commands run in Docker, which needs no host Node.js:

```bash
docker compose up dev                      # Dev server on :3000
docker compose run --rm dev pnpm validate  # Any script, one-off
```

Never bind-mount the host's `node_modules` into the container — Oxlint and
Next.js ship platform-native binaries, so the container keeps its own copy in a
named volume.

## Conventions

- **ADRs**: Every significant technology decision gets an ADR in `docs/adr/`.
  Use `docs/adr/0000-template.md` as the format.
- **Standard Next.js server**: The project uses the standard production server;
  see `docs/adr/0010-use-the-nextjs-production-server.md`.
- **Component style**: shadcn/ui components live in `src/components/ui/`. They
  are source files we own, not imported from a package.
- **Testing**: Tests live alongside their source in `__tests__/` directories.
  Use React Testing Library — test behaviour, not implementation.
- **Formatting and linting**: Prettier handles formatting. Oxlint handles logic
  rules. Type-aware Oxlint requires TypeScript 7, so TypeScript 6 semantic
  checks remain in `pnpm typecheck`. There is no ESLint command or config — see
  `docs/adr/0012-use-typescript-6-with-oxlint.md`.
- **Semantic navigation**: Prefer the project-local TypeScript service. LSP
  clients can launch `pnpm --silent lsp`; VS Code is configured to use the
  workspace TypeScript SDK. Fall back to text search only when semantic
  navigation is not available.
- **No secrets in code**: All environment variables go through Vercel env
  config.

## Working with This Codebase

- Run `pnpm validate` before committing to catch issues early.
- When adding a new shadcn component: `pnpm dlx shadcn@latest add <component>`
- When making a technology choice: create a new ADR.
- The `@/*` path alias maps to `./src/*`.
