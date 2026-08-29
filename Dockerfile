# Development container image.
#
# Local development runs entirely in this container, so the host only needs a
# container runtime — no Node.js, no pnpm.
#
# The Node major version is pinned to match .nvmrc, CI, and Vercel's runtime.
# Vercel offers 24.x, 22.x and 20.x only, so 24 is the newest version that
# keeps local development, CI, and production on the same major.
#
# @see docs/adr/0013-docker-based-local-development.md

FROM node:24-bookworm-slim AS dev

# git is needed by some tooling; ca-certificates for HTTPS registry access.
RUN apt-get update \
  && apt-get install -y --no-install-recommends git ca-certificates \
  && rm -rf /var/lib/apt/lists/*

# corepack pins pnpm to the version in package.json's packageManager field.
RUN corepack enable

WORKDIR /app

# Install dependencies as their own layer so they are only reinstalled when the
# manifest or lockfile changes, not on every source edit.
COPY package.json pnpm-lock.yaml pnpm-workspace.yaml ./
RUN pnpm install --frozen-lockfile

# Source is bind-mounted at runtime by compose. node_modules is deliberately
# kept in the image (see compose.yaml) — oxlint and Next.js ship
# platform-native binaries, so a macOS host install cannot be reused here.
COPY . .

EXPOSE 3000

# Bind to all interfaces so the dev server is reachable from the host.
CMD ["pnpm", "dev", "--hostname", "0.0.0.0"]
