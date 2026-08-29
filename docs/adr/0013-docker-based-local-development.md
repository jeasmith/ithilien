# ADR-0013: Docker-Based Local Development on Node.js 24

## Status

Accepted

## Context

Local development required a specific Node.js version to be installed on the
host. The project pinned `>=20` in `engines.node` and `20` in `.nvmrc`, which
had drifted from what the toolchain actually needs — ADR-0012 had already raised
the floor to `^20.19.0 || >=22.12.0` because Oxlint's native bindings do not run
on earlier releases.

Two problems followed from this:

- **Host coupling.** Contributing meant installing the right Node.js major, and
  a mismatched host version produced failures that looked like project bugs.
- **Version drift.** `.nvmrc`, `engines.node`, CI and Vercel could disagree, and
  nothing enforced that they matched.

"Latest Node.js" is ambiguous. At the time of writing the newest release is
**26.8.1** (Current) and the newest LTS is **24.20.0** ("Krypton", both current
as of 2026-08-29). Vercel, our deployment target, offers **24.x, 22.x and
20.x** only. Node 26 is therefore not deployable: choosing it would guarantee
that local development ran a different major than production, which is the
precise failure this ADR exists to prevent.

Node 25 is not a candidate either — odd-numbered releases are not LTS, and 25 is
already past end-of-life.

Alternatives considered:

- **Nix / devbox**: reproducible and lighter than containers, but a much less
  familiar tool for casual contributors.
- **mise / asdf**: manages the Node version but still installs onto the host and
  does nothing about native-binary or OS differences.
- **Dev container only (no compose)**: ties the workflow to VS Code. Compose
  works from any editor or a bare terminal, and the dev container can reuse it.

## Decision

Standardise on **Node.js 24 LTS** and make **Docker the supported path for local
development**, with host-based development still possible for anyone who wants
it.

- `.nvmrc` is `24`; `engines.node` is `24.x`, matching the form Vercel
  documents for `package.json` overrides. CI already reads `.nvmrc`, so all
  three stay aligned from a single edit.
- `Dockerfile` provides a `dev` target on `node:24-bookworm-slim`. Debian rather
  than Alpine, because the glibc native bindings for Oxlint and Turbopack are
  the better-tested path. pnpm comes from `corepack`, which honours the
  `packageManager` field.
- `compose.yaml` bind-mounts the source for live editing but masks
  `/app/node_modules` and `/app/.next` with named volumes.
- File watching uses polling (`WATCHPACK_POLLING`, `CHOKIDAR_USEPOLLING`),
  because inotify events do not cross bind mounts reliably on macOS or Windows.
- `.devcontainer/devcontainer.json` reuses the same compose service, so the VS
  Code integration cannot drift from the command-line one.

Masking `node_modules` is the load-bearing detail. Oxlint and Next.js resolve
platform-native binaries — for example, `@oxlint/binding-darwin-arm64` on a Mac
and `@oxlint/binding-linux-arm64-gnu` in the container. Sharing one
`node_modules` between host and container would put the wrong architecture on
the path. The lockfile records every platform's bindings, so
`pnpm install --frozen-lockfile` resolves the correct set inside the image.

## Consequences

### Positive

- **No host Node.js required.** A container runtime is the only prerequisite.
- **One source of truth for the Node version.** `.nvmrc` drives CI, the
  Dockerfile pins the same major, and `engines.node` tells Vercel.
- **Local matches production.** Node 24 is Vercel's default runtime.
- **Editor parity.** The dev container runs the same image as the terminal.

### Negative

- **Slower first run.** The initial image build installs the full dependency
  tree; subsequent starts reuse the layer cache.
- **Polling costs CPU.** It is the reliable option across host platforms, but it
  is busier than native inotify.
- **Two dependency trees.** Anyone who also develops on the host keeps a
  separate `node_modules`, and the two are not interchangeable.
- **`engines.node` is now narrow.** `24.x` rejects Node 22 and 26 on the host.
  This is deliberate — it is what keeps the environments aligned — but it will
  need editing when Vercel adds a newer major.

### Neutral

- CI is unchanged beyond picking up the new `.nvmrc`; it still runs on the
  GitHub-hosted runner rather than in this image.
- The image targets development only. Vercel builds the production artefact and
  does not consume this Dockerfile.

## References

- [Vercel — Supported Node.js Versions](https://vercel.com/docs/functions/runtimes/node-js/node-js-versions)
- [Node.js Releases](https://nodejs.org/en/about/previous-releases)
- [Development Containers](https://containers.dev/)
- [ADR-0012: Use TypeScript 6 with Oxlint](0012-use-typescript-6-with-oxlint.md)
