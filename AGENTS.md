# Repository guidance for coding agents

- Use Node.js 24 LTS and pnpm 10.
- Run `pnpm validate` before handing off changes; run `pnpm build` when build
  behaviour could be affected.
- Prefer semantic TypeScript navigation when the host supports LSP. Launch the
  project-local server from the repository root with `pnpm --silent lsp`; it
  communicates over clean stdio and uses the repository's TypeScript 6 compiler.
- Use `rg` for text search when an LSP client is unavailable.
- Oxlint is the only configured linter. Type-aware checks belong to
  `pnpm typecheck`, because Oxlint's type-aware backend requires TypeScript 7.
