# Contributing

Thanks for your interest in contributing to Ithilien.

## Getting Started

### Prerequisites

- [Node.js](https://nodejs.org/) 24 LTS (see `.nvmrc`)
- [pnpm](https://pnpm.io/) 10 or later

### Setup

```bash
# Clone the repository
git clone https://github.com/jeasmith/ithilien.git
cd ithilien

# Install dependencies
pnpm install

# Start the development server
pnpm dev
```

### Available Scripts

| Command              | Description                                |
| -------------------- | ------------------------------------------ |
| `pnpm dev`           | Start the development server (Turbopack)   |
| `pnpm build`         | Build the production application           |
| `pnpm lint`          | Run Oxlint                                 |
| `pnpm lint:fix`      | Run Oxlint with auto-fix                   |
| `pnpm format`        | Format code with Prettier                  |
| `pnpm format:check`  | Check formatting without writing           |
| `pnpm typecheck`     | Run TypeScript type checking               |
| `pnpm --silent lsp`  | Start the TypeScript LSP server over stdio |
| `pnpm test`          | Run tests with Vitest                      |
| `pnpm test:watch`    | Run tests in watch mode                    |
| `pnpm test:coverage` | Run tests with coverage report             |
| `pnpm validate`      | Run all checks (lint, types, format, test) |

## Pull Request Process

1. Create a feature branch from `main`.
2. Make your changes.
3. Run `pnpm validate` to ensure everything passes.
4. Open a pull request against `main`.
5. Fill in the PR template.

## Architecture Decisions

Significant technical decisions are documented as Architecture Decision Records
(ADRs) in the `docs/adr/` directory. If your change involves a meaningful
technology choice, please add or update an ADR.

See `docs/adr/0000-template.md` for the format.

## Code Style

- TypeScript strict mode is enabled.
- Oxlint and Prettier are configured — run `pnpm format` before committing.
- Prefer named exports over default exports for components (except pages).
- Write tests for new functionality.
