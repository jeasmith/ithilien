# ADR-0002: Use pnpm as the Package Manager

## Status

Accepted

## Context

Node.js projects require a package manager. The three main options are npm,
Yarn, and pnpm. Key requirements:

- **Security**: Strict dependency resolution that prevents phantom dependencies
  (packages that are accessible but not explicitly declared).
- **Speed**: Fast installs in CI to keep pipeline times short.
- **Disk efficiency**: Content-addressable storage to avoid duplicate copies of
  the same package version.
- **Lockfile integrity**: A lockfile format that is easy to audit and hard to
  tamper with.

## Decision

Use **pnpm** as the package manager, with the version pinned via the
`packageManager` field in `package.json` (corepack-compatible).

## Consequences

### Positive

- **Strict node_modules**: pnpm creates a non-flat `node_modules` layout by
  default. Packages can only `require()` their declared dependencies, which
  eliminates phantom dependency issues that can introduce security
  vulnerabilities or break builds unpredictably.
- **Content-addressable store**: Shared package store across projects means
  faster installs and less disk usage.
- **Frozen lockfile in CI**: `pnpm install --frozen-lockfile` ensures CI builds
  use exactly the dependencies that were reviewed and committed.
- **Workspace support**: When the project grows to a monorepo, pnpm workspaces
  are ready.

### Negative

- Slightly less mainstream than npm — some developers may need a brief
  orientation.
- Strict `node_modules` layout can occasionally cause issues with packages that
  rely on hoisting (rare, but possible).

### Neutral

- Dependabot supports pnpm natively.
- Vercel auto-detects pnpm from the lockfile.

## References

- [pnpm — Motivation](https://pnpm.io/motivation)
- [pnpm — Strict node_modules](https://pnpm.io/symlinked-node-modules-structure)
- [Corepack](https://nodejs.org/api/corepack.html)
