# ADR-0012: Use TypeScript 6 with Oxlint

## Status

Accepted

Supersedes [ADR-0011](0011-add-oxlint-alongside-eslint.md).

## Context

An experimental upgrade from TypeScript 6.0.3 to TypeScript 7.0.2 exposed two
ecosystem compatibility gaps:

- `typescript-eslint` and its Next.js integration depended on compiler APIs
  that TypeScript 7 no longer exposed.
- Next.js also depended on those APIs for its build-time type check and needed
  the experimental `useTypeScriptCli` escape hatch.

Oxlint had already taken over almost all lint rules. Its JavaScript-plugin bridge
can also run `eslint-plugin-react-hooks`, including the React Compiler rules that
Oxlint does not yet implement natively, without using ESLint as the linter.

Oxlint's optional type-aware backend is a separate compatibility concern. It is
powered by `typescript-go`, and its documented minimum is TypeScript 7. Using it
in a TypeScript 6 project would make lint semantics differ from the compiler,
editor, and CI type checker whose compatibility we are trying to preserve.

## Decision

Use the newest TypeScript 6 release and keep Oxlint as the only configured
linter.

- Pin the project to TypeScript `^6.0.3`.
- Keep Oxlint's native TypeScript, React, Next.js, accessibility, import, and
  Vitest rules.
- Keep `eslint-plugin-react-hooks` as an Oxlint JavaScript plugin, aliased to
  `react-compiler`. ESLint itself has no command or configuration in the
  project.
- Disable pnpm's automatic peer installation and explicitly allow the React
  Hooks plugin's missing ESLint peer. Oxlint hosts the plugin directly, so the
  ESLint runtime is not used.
- Remove `oxlint-tsgolint` and `options.typeAware`. Run the project compiler via
  `pnpm typecheck` as the authoritative semantic check.
- Remove Next.js's experimental `useTypeScriptCli` option; TypeScript 6 exposes
  the compiler API that the standard Next.js build path expects.
- Keep Prettier as the formatter.

## Consequences

### Positive

- The compiler, Next.js, editor integration, and language server all use the
  same TypeScript 6 semantics.
- Oxlint remains the single lint command and keeps the React Compiler rule
  coverage established during the ESLint migration.
- The Next.js build no longer depends on an experimental TypeScript workaround.
- A future TypeScript 7 upgrade can be evaluated as an ecosystem-wide change
  instead of forcing each compiler-API consumer through a workaround.

### Negative

- Type-aware Oxlint rules such as `no-floating-promises` are unavailable while
  the project remains on TypeScript 6. `tsc --noEmit` catches type errors but is
  not a complete substitute for semantic lint rules.
- Oxlint's `jsPlugins` support is still not covered by Oxlint's semver policy.
  A regression could temporarily remove the additional React Compiler rules.
- Disabling automatic peer installation means new dependencies with required
  peers must have those peers added explicitly rather than silently installed
  by pnpm.

### Neutral

- CI still runs linting and type checking as separate steps.
- Dependabot groups TypeScript, its language server wrapper, Oxlint, and the
  React rule bridge into one toolchain PR.

## References

- [Oxlint JS Plugins](https://oxc.rs/docs/guide/usage/linter/js-plugins.html)
- [Oxlint Type-Aware Linting](https://oxc.rs/docs/guide/usage/linter/type-aware.html)
- [TypeScript Language Server](https://github.com/typescript-language-server/typescript-language-server)
- [ADR-0011: Add Oxlint Alongside ESLint](0011-add-oxlint-alongside-eslint.md)
