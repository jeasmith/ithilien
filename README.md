# Ithilien

A place to try out new stuff and share what I learn.

A personal website for projects, experiments, and writing. Some pages are simple
text. Others show off different methods of rendering and delivering websites.

## Quick Start

### In Docker (no host Node.js required)

```bash
docker compose up dev
```

Open [http://localhost:3000](http://localhost:3000). Source edits on the host
are picked up live.

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

Open [http://localhost:3000](http://localhost:3000).

## Scripts

| Command          | Description                                     |
| ---------------- | ----------------------------------------------- |
| `pnpm dev`       | Start the development server (Turbopack)        |
| `pnpm build`     | Build the production application                |
| `pnpm start`     | Start the Next.js production server             |
| `pnpm lint`      | Run Oxlint                                      |
| `pnpm typecheck` | Run TypeScript 6 type checking                  |
| `pnpm lsp`       | Start the TypeScript language server over stdio |
| `pnpm format`    | Format code with Prettier                       |
| `pnpm test`      | Run tests                                       |
| `pnpm validate`  | Run all checks                                  |

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
