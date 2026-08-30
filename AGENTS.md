# Repository guidance for coding agents

- Use Node.js 24 LTS and pnpm 10.
- This is a Turborepo monorepo: applications in `apps/`, shared code in
  `packages/`. Root scripts fan out across every project; narrow them with
  `--filter=<name>`, e.g. `pnpm test --filter=radar`.
- `apps/ithilien` serves `/` and is the default microfrontend — it owns
  `microfrontends.json`. `apps/radar` serves `/radar`.
- Run `pnpm validate` before handing off changes; run `pnpm build` when build
  behaviour could be affected.
- Prefer semantic TypeScript navigation when the host supports LSP. Launch the
  project-local server from the repository root with `pnpm --silent lsp`; it
  communicates over clean stdio and uses the repository's TypeScript 6 compiler.
- Use `rg` for text search when an LSP client is unavailable.
- Oxlint is the only configured linter. Type-aware checks belong to
  `pnpm typecheck`, because Oxlint's type-aware backend requires TypeScript 7.

## Microfrontends constraints

- Vercel does not strip routed prefixes, so Radar's routes live at
  `src/app/radar/`. `basePath` is unsupported.
- Cross-application links use `Link` from `@vercel/microfrontends/next/client`,
  never `next/link`.
- Code in `packages/ui` must not use the `@/*` alias — it resolves against the
  consuming application and will fail the build. Use `@repo/ui/...`.
- New routed paths go in `apps/ithilien/microfrontends.json` and must be covered
  in `apps/ithilien/src/__tests__/microfrontends.test.ts`.
- Full detail is in `CLAUDE.md` and
  `docs/adr/0016-vercel-microfrontends.md`.
