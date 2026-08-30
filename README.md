# Ithilien

A place to try out new stuff and share what I learn.

A personal website for projects, experiments, and writing. Some pages are simple
text. Others show off different methods of rendering and delivering websites.

## Layout

This is a Turborepo monorepo holding two independently deployable Next.js
applications, served on one origin as a
[Vercel microfrontends](docs/adr/0016-vercel-microfrontends.md) group.

| Path                         | Serves   | What it is                                          |
| ---------------------------- | -------- | --------------------------------------------------- |
| `apps/ithilien`              | `/`      | The site. The default app; owns the routing config. |
| `apps/radar`                 | `/radar` | Radar, an architectural digest.                     |
| `packages/ui`                | —        | Design tokens, `globals.css`, shared components.    |
| `packages/typescript-config` | —        | Shared `tsconfig` bases.                            |

Requests that no application claims go to `apps/ithilien`.

## Quick Start

### In Docker (no host Node.js required)

```bash
docker compose up dev
```

Open **[http://localhost:3024](http://localhost:3024)** — the microfrontends
proxy. Source edits on the host are picked up live.

Run one-off commands in the container:

```bash
docker compose run --rm dev pnpm validate
docker compose run --rm dev sh
```

VS Code users can instead run **Dev Containers: Reopen in Container**, which
uses the same image.

### On the host

Requires Node.js 24 (see `.nvmrc`) and pnpm 10.

```bash
pnpm install
pnpm dev
```

Open **[http://localhost:3024](http://localhost:3024)**.

### Why port 3024

`pnpm dev` starts both applications plus Vercel's microfrontends proxy. Only the
proxy stitches them onto a single origin the way production does, so it is the
address to use:

| Port   | Serves                                             |
| ------ | -------------------------------------------------- |
| `3024` | **The proxy.** Ithilien at `/`, Radar at `/radar`. |
| `3000` | Ithilien alone.                                    |
| `3001` | Radar alone.                                       |

Visiting a child application directly redirects back to the proxy. Set
`MFE_DISABLE_LOCAL_PROXY_REWRITE=1` to suppress that.

### Working on one application

You do not need to run both. The proxy falls back to production
(`www.ithilien.dev`) for anything not running locally, so the other
application's pages still resolve:

```bash
pnpm dev:radar      # Radar local, Ithilien served from production
pnpm dev:ithilien   # and the other way round
```

## Scripts

Root scripts run across every project via Turborepo. Add `--filter=<app>` to
narrow them, for example `pnpm build --filter=radar`.

| Command             | Description                                     |
| ------------------- | ----------------------------------------------- |
| `pnpm dev`          | Start both apps and the microfrontends proxy    |
| `pnpm dev:ithilien` | Start Ithilien and the proxy only               |
| `pnpm dev:radar`    | Start Radar and the proxy only                  |
| `pnpm build`        | Build every application                         |
| `pnpm start`        | Start the Next.js production servers            |
| `pnpm lint`         | Run Oxlint                                      |
| `pnpm typecheck`    | Run TypeScript 6 type checking                  |
| `pnpm lsp`          | Start the TypeScript language server over stdio |
| `pnpm format`       | Format code with Prettier                       |
| `pnpm test`         | Run tests                                       |
| `pnpm validate`     | Run all checks                                  |

## Adding a Shared Component

Shared components live in `packages/ui` so both applications stay visually
consistent:

```bash
pnpm dlx shadcn@latest add <component> -c packages/ui
```

Components inside `packages/ui` must **not** import via the `@/*` alias. Next.js
resolves `@/*` against the consuming application, so such an import would look
for the file in `apps/*/src` and fail the build. Use `@repo/ui/...` instead.

## Code Navigation

The repository installs `typescript-language-server` locally. LSP-capable
editors and agent hosts can launch `pnpm --silent lsp` from the repository root
to get definitions, references, rename support, diagnostics, and other
TypeScript 6 language intelligence over stdio. The `--silent` flag is important
for machine clients because it keeps pnpm's lifecycle banner off the protocol's
stdout stream.

VS Code uses its built-in `tsserver` integration rather than LSP. The committed
workspace settings point it at `node_modules/typescript`, so it uses the same
TypeScript 6 version as CI.

## Tech Stack

| Layer        | Choice         | ADR                                                              |
| ------------ | -------------- | ---------------------------------------------------------------- |
| Framework    | Next.js 16     | [ADR-0001](docs/adr/0001-use-nextjs-as-framework.md)             |
| Language     | TypeScript 6   | [ADR-0012](docs/adr/0012-use-typescript-6-with-oxlint.md)        |
| Packages     | pnpm           | [ADR-0002](docs/adr/0002-use-pnpm-as-package-manager.md)         |
| Monorepo     | Turborepo      | [ADR-0015](docs/adr/0015-turborepo-monorepo.md)                  |
| Delivery     | Microfrontends | [ADR-0016](docs/adr/0016-vercel-microfrontends.md)               |
| Hosting      | Vercel         | [ADR-0003](docs/adr/0003-deploy-on-vercel.md)                    |
| Components   | shadcn/ui      | [ADR-0004](docs/adr/0004-use-shadcn-for-components.md)           |
| Testing      | Vitest         | [ADR-0005](docs/adr/0005-use-vitest-for-testing.md)              |
| Rendering    | Next.js Server | [ADR-0010](docs/adr/0010-use-the-nextjs-production-server.md)    |
| CI           | GitHub Actions | [ADR-0007](docs/adr/0007-ci-pipeline-with-github-actions.md)     |
| Dep Security | Dependabot     | [ADR-0008](docs/adr/0008-dependency-security-with-dependabot.md) |
| Linting      | Oxlint         | [ADR-0012](docs/adr/0012-use-typescript-6-with-oxlint.md)        |
| Local Dev    | Docker         | [ADR-0013](docs/adr/0013-docker-based-local-development.md)      |
| Navigation   | TypeScript LSP | [ADR-0014](docs/adr/0014-project-local-typescript-lsp.md)        |

## Architecture Decisions

All significant technical decisions are recorded as ADRs in [`docs/adr/`](docs/adr/).

## License

[MIT](LICENSE)
