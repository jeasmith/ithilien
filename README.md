# Ithilien

A place to try out new stuff and share what I learn.

A personal website for projects, experiments, and writing. Some pages are simple
text. Others show off different methods of rendering and delivering websites.

## Quick Start

```bash
pnpm install
pnpm dev
```

Open [http://localhost:3000](http://localhost:3000).

## Scripts

| Command          | Description                              |
| ---------------- | ---------------------------------------- |
| `pnpm dev`       | Start the development server (Turbopack) |
| `pnpm build`     | Build the production application         |
| `pnpm start`     | Start the Next.js production server      |
| `pnpm lint`      | Run oxlint (including type-aware rules)  |
| `pnpm typecheck` | Run TypeScript type checking             |
| `pnpm format`    | Format code with Prettier                |
| `pnpm test`      | Run tests                                |
| `pnpm validate`  | Run all checks                           |

## Tech Stack

| Layer        | Choice         | ADR                                                              |
| ------------ | -------------- | ---------------------------------------------------------------- |
| Framework    | Next.js 16     | [ADR-0001](docs/adr/0001-use-nextjs-as-framework.md)             |
| Packages     | pnpm           | [ADR-0002](docs/adr/0002-use-pnpm-as-package-manager.md)         |
| Hosting      | Vercel         | [ADR-0003](docs/adr/0003-deploy-on-vercel.md)                    |
| Components   | shadcn/ui      | [ADR-0004](docs/adr/0004-use-shadcn-for-components.md)           |
| Testing      | Vitest         | [ADR-0005](docs/adr/0005-use-vitest-for-testing.md)              |
| Rendering    | Next.js Server | [ADR-0010](docs/adr/0010-use-the-nextjs-production-server.md)    |
| CI           | GitHub Actions | [ADR-0007](docs/adr/0007-ci-pipeline-with-github-actions.md)     |
| Dep Security | Dependabot     | [ADR-0008](docs/adr/0008-dependency-security-with-dependabot.md) |

## Architecture Decisions

All significant technical decisions are recorded as ADRs in [`docs/adr/`](docs/adr/).

## License

[MIT](LICENSE)
