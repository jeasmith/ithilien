# ADR-0011: Node 24 as the Runtime Baseline

## Status

Accepted

## Context

The project pinned Node 20 in `.nvmrc` and declared `engines.node: ">=20"`.
Node 20 has reached end of life, so it no longer receives security patches, and
the toolchain has started to move past it:

- `jsdom` 30 declares `engines.node: "^22.22.2 || ^24.15.0 || >=26.0.0"`. On Node
  20 it fails at require time inside Vitest, which is why the testing group
  update could not pass CI.
- Staying on an end-of-life runtime means the project inherits unpatched Node
  vulnerabilities regardless of how current its npm dependencies are.

Alternatives considered:

- **Node 22**: The minimum that satisfies `jsdom` 30. Still an active LTS line,
  but it is the older of the two supported options and would need revisiting
  sooner.
- **Hold `jsdom` at 29**: Keeps Node 20, but pins the test stack to a version
  whose transitive `undici` carries known advisories, and defers the runtime
  problem rather than solving it.

## Decision

Adopt **Node 24** as the runtime baseline.

- `.nvmrc` is set to `24`, which drives both local development via `nvm` and CI
  via `actions/setup-node`'s `node-version-file`.
- `engines.node` is raised to `">=24"`, which is also the signal Vercel reads
  when selecting the Node version for builds and the production server.

## Consequences

### Positive

- The project runs on a supported Node line that still receives security
  patches.
- Unblocks `jsdom` 30, and with it the rest of the Vitest/Vite testing group.
- `engines.node` now fails fast and loudly for a contributor on an unsupported
  runtime, rather than surfacing as a confusing module-load error in tests.

### Negative

- Contributors on Node 20 or 22 must upgrade before `pnpm install` will
  succeed.
- Any future dependency that has not yet published Node 24 support would need
  handling case by case.

### Neutral

- CI and Vercel both derive the version from files in the repository, so there
  is no separate dashboard setting to keep in sync.

## References

- [Node.js release schedule](https://github.com/nodejs/release#release-schedule)
- [jsdom 30 release notes](https://github.com/jsdom/jsdom/blob/main/Changelog.md)
- [Vercel: specifying a Node.js version](https://vercel.com/docs/functions/runtimes/node-js#node.js-version)
