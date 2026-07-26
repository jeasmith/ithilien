# ADR-0012: Upgrade to TypeScript 7

## Status

Accepted

Supersedes [ADR-0011](0011-add-oxlint-alongside-eslint.md).

## Context

TypeScript 7 is the native Go port of the compiler. Upgrading from 6.0.3 hit two
independent blockers, both caused by tools reaching for the TypeScript compiler
API rather than by any change to our own code.

**Blocker 1 — `typescript-eslint`.** It parses through
`@typescript-eslint/typescript-estree`, which imports the compiler API directly
and declares a peer range of `>=4.8.4 <6.1.0`. Under TypeScript 7 ESLint dies on
startup with `TypeError: Cannot read properties of undefined (reading 'Cjs')`.
No published version supports TypeScript 7 — `latest` (8.65.0) and `canary`
(8.65.1-alpha.7) both still carry the `<6.1.0` range. Pinning TypeScript 6 for
the linter alone does not work, because `typescript` is a peer dependency
resolved from the root importer and pnpm `overrides` do not redirect peer
resolution. Dropping `eslint-config-next/typescript` does not help either, since
`core-web-vitals` pulls `typescript-estree` transitively.

**Blocker 2 — Next.js.** Its build-time type check uses the same compiler API
and fails with `TypeScript 7.0.2 does not provide the compiler API required by
Next.js`.

ADR-0011 had already added Oxlint alongside ESLint. Measuring what ESLint still
contributed after Oxlint's deduplication showed only 33 active rules, and of
those only the 14 React Compiler rules from `eslint-plugin-react-hooks` had no
Oxlint equivalent — Oxlint implements just `rules-of-hooks` and
`exhaustive-deps` natively. Everything else was either already covered by Oxlint
under a category we had not enabled, or irrelevant to this codebase.

Keeping ESLint solely for those 14 rules would have required a TypeScript-capable
parser that is not `@typescript-eslint/parser` — realistically
`@babel/eslint-parser` plus `@babel/preset-typescript` — adding dependencies and
a second parse of every file to run rules Oxlint could already host.

## Decision

Upgrade to **TypeScript 7** and remove ESLint entirely, leaving Oxlint as the
only linter.

- `eslint`, `eslint-config-next`, `eslint-config-prettier` and
  `eslint-plugin-oxlint` are removed, along with `eslint.config.mjs`.
- `eslint-plugin-react-hooks` is **kept** and loaded by Oxlint through its
  `jsPlugins` mechanism, aliased to `react-compiler` to avoid colliding with
  Oxlint's native `react` plugin. Oxlint parses TypeScript and JSX with its own
  Rust parser, so the plugin runs without any TypeScript-derived parser. All 16
  of its rules are enabled from the real React implementation: `rules-of-hooks`,
  `exhaustive-deps`, and 14 React Compiler diagnostics.
- The 14 rules ESLint was contributing that Oxlint supports but had not enabled
  are now listed explicitly in `.oxlintrc.json` rather than left to category
  defaults.
- `next.config.ts` sets `experimental.useTypeScriptCli: true`, which makes
  Next.js shell out to the `tsc` CLI instead of using the compiler API.
- Dependabot's `linting` group gains `oxlint` and `oxlint-*` patterns, so the
  linter and compiler upgrade together.

Four rules are lost outright: `react/no-deprecated` and
`react/require-render-return` (class-component era; this codebase has none), and
`react/jsx-uses-react` and `react/jsx-uses-vars` (they exist only to mark
variables as used for `no-unused-vars`, which Oxlint handles natively for JSX).

## Consequences

### Positive

- **TypeScript 7.** `tsc --noEmit`, `next build`, tests and lint all pass.
- **One linter instead of two.** No more deciding which tool owns a rule, and
  the `eslint-plugin-oxlint` deduplication layer is gone with the config.
- **Type-aware linting is unaffected by the upgrade.** `oxlint-tsgolint` bundles
  its own `typescript-go`, so it never depended on the project's compiler
  version — it worked on 6.0.3 and works on 7.0.2.
- **Unknown rule names are a hard error.** Oxlint refuses to start on an
  unrecognised rule, so the explicit rule list cannot silently rot.

### Negative

- **`jsPlugins` is alpha and explicitly not covered by semver.** The React
  Compiler rules ride on it. If it regresses, the fallback is ESLint plus
  `@babel/eslint-parser` for those rules alone.
- **`experimental.useTypeScriptCli` is an experimental Next.js flag** and should
  be removed once Next.js supports the TypeScript 7 API natively.
- **We are early.** TypeScript 7 landed recently and the ecosystem is still
  catching up; more tools may need working around.

### Neutral

- CI needs no change — it already calls `pnpm lint`, `pnpm typecheck` and
  `pnpm build`.
- Prettier is untouched. `eslint-config-prettier` was removed because Oxlint's
  formatting-adjacent categories (`style`) are not enabled, so there is nothing
  to conflict with.
- Type-aware linting is switched on via `options.typeAware` in `.oxlintrc.json`
  rather than a CLI flag, so editor integrations and bare `oxlint` runs get the
  same rules as CI. `pnpm lint` is just `oxlint --deny-warnings`.
- `engines.node` was raised from `>=20` to `^20.19.0 || >=22.12.0` to match
  Oxlint's own requirement. Node 20.0–20.18 and Node 21 satisfied the old range
  but cannot run Oxlint's native bindings.

## References

- [Oxlint JS Plugins](https://oxc.rs/docs/guide/usage/linter/js-plugins.html)
- [Oxlint Type-Aware Linting is Stable](https://oxc.rs/blog/2026-07-22-type-aware-linting-stable)
- [ADR-0011: Add Oxlint Alongside ESLint](0011-add-oxlint-alongside-eslint.md)
