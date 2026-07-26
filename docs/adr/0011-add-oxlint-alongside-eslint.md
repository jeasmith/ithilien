# ADR-0011: Add Oxlint Alongside ESLint

## Status

Superseded by [ADR-0012](0012-upgrade-to-typescript-7.md)

The "alongside" arrangement described here was short-lived. Once Oxlint's
`jsPlugins` were found to run `eslint-plugin-react-hooks` directly — the only
rules ESLint still contributed — keeping ESLint bought nothing, and removing it
was what unblocked TypeScript 7. The context and rule-coverage analysis below
remain accurate and are the reasoning ADR-0012 builds on.

## Context

Attempting to upgrade to TypeScript 7 revealed that our lint stack is pinned to
the TypeScript major version. `typescript-eslint` parses through
`@typescript-eslint/typescript-estree`, which imports the `typescript` package's
compiler API directly and declares a peer range of `>=4.8.4 <6.1.0`. Installing
TypeScript 7.0.2 makes ESLint crash on startup:

```text
TypeError: Cannot read properties of undefined (reading 'Cjs')
  at @typescript-eslint/typescript-estree/dist/create-program/shared.js:59
```

No published `typescript-eslint` supports TypeScript 7 — neither `latest`
(8.65.0) nor `canary` carries a wider peer range. Three workarounds were tested
and all failed:

- **pnpm `overrides` to pin TypeScript 6 for the linter only** — `typescript` is
  a peer dependency resolved from the root importer, and overrides do not
  redirect peer resolution.
- **Dropping `eslint-config-next/typescript`** — still crashes, because
  `core-web-vitals` pulls `typescript-estree` transitively.
- **Aliasing a second TypeScript copy** — not viable, since both `tsc` and Next
  resolve the literal `typescript` package name.

The only path to TypeScript 7 while keeping ESLint is to drop
`eslint-config-next` entirely, losing the whole Next.js ruleset.

Alternatives considered:

- **Wait for `typescript-eslint`** — zero effort and nothing is currently
  broken, but leaves us unable to adopt TypeScript 7 on our own schedule.
- **Migrate to Biome** — Rust-based, no TypeScript compiler dependency, and
  replaces Prettier too. Rejected for now: its type-aware rules are still in the
  `nursery` group (verified — the `types: recommended` domain did not flag a
  floating promise until `nursery/noFloatingPromises` was explicitly enabled),
  its Next.js domain is thinner than `eslint-plugin-next`, and taking over
  formatting makes the change hard to reverse.
- **Migrate fully to Oxlint** — premature. `eslint-plugin-next` still covers
  Next.js rules that Oxlint's `nextjs` plugin does not.

## Decision

Add **Oxlint** as a first-pass linter running ahead of ESLint, keeping both.

Oxlint is written in Rust and does not link the TypeScript compiler, so the
TypeScript major version is irrelevant to it. Type-aware linting runs through
`oxlint-tsgolint`, which bundles its own `typescript-go` — verified to work with
this project on TypeScript 6.0.3, so type-aware rules are available now and will
keep working across the TypeScript 7 upgrade.

- `.oxlintrc.json` enables the `eslint`, `typescript`, `oxc`, `unicorn`,
  `import`, `react`, `jsx-a11y`, `nextjs` and `vitest` plugins at the
  `correctness`, `suspicious` and `perf` categories.
- `pnpm lint` runs `lint:oxlint` then `lint:eslint`. Oxlint runs with
  `--type-aware --deny-warnings` so warnings fail CI.
- `eslint.config.mjs` appends `eslint-plugin-oxlint`'s
  `buildFromOxlintConfigFile(".oxlintrc.json")`, which switches off the 228
  ESLint rules Oxlint now covers. It is derived from the Oxlint config, so the
  two stay in sync without a hand-maintained list.
- Two rules are disabled as false positives for this codebase:
  `react/react-in-jsx-scope` (we use the automatic JSX runtime) and
  `import/no-unassigned-import` (side-effect imports of `globals.css` and
  `@testing-library/jest-dom/vitest` are intentional).

## Consequences

### Positive

- **Type-aware rules we did not have before.** `eslint-config-next/typescript`
  is not type-aware, so rules like `no-floating-promises` were never running.
  Oxlint caught a real defect on its first run — an incorrect `await` on the
  synchronous `buildFromOxlintConfigFile` in `eslint.config.mjs`.
- **Unblocks TypeScript 7.** When we drop `eslint-config-next`, or when
  `typescript-eslint` ships support, the Oxlint layer already covers most rules.
- **Fast.** 265 rules across 10 files in ~120ms including type-aware analysis.
- **Reversible.** Deleting `.oxlintrc.json`, the two scripts, and one import
  restores the previous setup exactly. Nothing about the source changed.

### Negative

- **Two linters to configure.** A rule can be disabled in the wrong place, and
  contributors need to know which tool owns which rule.
- **Rule drift.** `buildFromOxlintConfigFile` keeps the two in sync only for
  rules Oxlint knows about; enabling a new ESLint plugin that overlaps Oxlint
  can reintroduce double-reporting.
- **`oxlint-tsgolint` tracks TypeScript releases closely** (its version encodes
  the compiler version, e.g. `7.0.2001` for TypeScript 7.0.2), so it needs
  bumping alongside compiler upgrades.

### Neutral

- CI needs no change — it already calls `pnpm lint`, which now runs both.
- Prettier is untouched; Oxlint does not format.
- Dependabot's `linting` group covers `oxlint`, `oxlint-tsgolint`,
  `eslint-plugin-oxlint` and `typescript`, so these move together in one PR.

## References

- [Oxlint](https://oxc.rs/docs/guide/usage/linter)
- [Oxlint Type-Aware Linting is Stable](https://oxc.rs/blog/2026-07-22-type-aware-linting-stable)
- [tsgolint](https://github.com/oxc-project/tsgolint)
- [ADR-0008: Dependency Security with Dependabot](0008-dependency-security-with-dependabot.md)
