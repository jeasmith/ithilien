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

# Install dependencies as their own layer so they are only reinstalled when a
# manifest or the lockfile changes, not on every source edit. pnpm resolves the
# whole workspace up front, so every project's manifest has to be present —
# copying only the root package.json would install nothing for the apps.
COPY package.json pnpm-lock.yaml pnpm-workspace.yaml turbo.json ./
COPY apps/ithilien/package.json ./apps/ithilien/
COPY apps/radar/package.json ./apps/radar/
COPY packages/ui/package.json ./packages/ui/
COPY packages/typescript-config/package.json ./packages/typescript-config/
RUN pnpm install --frozen-lockfile

# Source is bind-mounted at runtime by compose. node_modules is deliberately
# kept in the image (see compose.yaml) — oxlint and Next.js ship
# platform-native binaries, so a macOS host install cannot be reused here.
COPY . .

# 3000 Ithilien, 3001 Radar, 3024 the microfrontends proxy. The proxy is the
# one to open: it stitches both apps onto a single origin.
EXPOSE 3000 3001 3024

# `next dev` binds to 0.0.0.0 by default, so no --hostname flag is needed for
# the dev servers to be reachable from the host.
CMD ["pnpm", "dev"]
