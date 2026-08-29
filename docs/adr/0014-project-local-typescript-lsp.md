# ADR-0014: Provide a Project-Local TypeScript Language Server

## Status

Accepted

## Context

TypeScript includes `tsserver`, which provides semantic code intelligence over
a TypeScript-specific protocol. VS Code integrates with it directly, while
other editors and agent hosts commonly expect the standard Language Server
Protocol (LSP).

Relying on a globally installed language server can also make navigation use a
different TypeScript version from the repository's compiler and CI checks.

## Decision

Install `typescript-language-server` as a development dependency and expose it
through the `lsp` package script, using stdio as the transport. Machine clients
launch it with `pnpm --silent lsp` so pnpm does not write its lifecycle banner
into the protocol stream. The server wraps the repository-local TypeScript 6
`tsserver`.

Commit VS Code workspace settings that point its built-in TypeScript language
features at `node_modules/typescript/lib`. VS Code does not use the LSP wrapper,
but both integration paths therefore share the same project compiler.

Document the LSP entrypoint in `README.md`, `CONTRIBUTING.md`, `CLAUDE.md`, and
`AGENTS.md` so editors and agent hosts can discover it without a global install.

## Consequences

### Positive

- LSP-capable clients get definitions, references, rename operations,
  diagnostics, code actions, and other semantic navigation.
- Humans, agents, CI, and the Next.js build resolve the same TypeScript version.
- The language server is reproducible through the lockfile and available inside
  the development container.

### Negative

- Clients still need to be configured to launch the stdio command; there is no
  universal repository-level LSP client configuration format.
- The server is a community-maintained wrapper rather than a Microsoft
  TypeScript package.

### Neutral

- VS Code continues to use its built-in TypeScript language feature rather than
  the LSP wrapper.
- Text search remains the fallback for agent hosts that cannot attach an LSP
  client.

## References

- [TypeScript Language Server](https://github.com/typescript-language-server/typescript-language-server)
- [Language Server Protocol](https://microsoft.github.io/language-server-protocol/)
- [ADR-0012: Use TypeScript 6 with Oxlint](0012-use-typescript-6-with-oxlint.md)
