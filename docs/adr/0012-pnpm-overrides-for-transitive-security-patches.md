# ADR-0012: pnpm Overrides for Transitive Security Patches

## Status

Accepted

## Context

ADR-0008 established Dependabot as the mechanism for keeping dependencies
current. Dependabot raises PRs against **direct** dependencies, which leaves a
gap: an advisory against a package several levels down the tree stays open until
every intermediate package publishes a release that moves its own floor.

Working through the open Dependabot PRs surfaced exactly that gap. Merging them
resolved most advisories — a newer `next` dropped the vulnerable `sharp` and
`nanoid`, a newer `shadcn` dropped the vulnerable `undici`, `hono` and
`fast-uri` — but three remained with no direct dependency left to bump:

- `postcss` — reached through `next`, `shadcn` and `@tailwindcss/postcss`.
- `js-yaml` — reached through `eslint`'s `@eslint/eslintrc` and `cosmiconfig`.
- `brace-expansion` — reached through `eslint`'s `minimatch` 3.

The project already carried `pnpm.overrides.postcss` pinned to an exact version.
That pin had become actively harmful: it held the whole tree on a `postcss`
version that later turned out to be vulnerable, and because it was exact, no
patch release could flow in.

Alternatives considered:

- **Wait for upstream**: Requires no action, but leaves known-vulnerable code in
  the tree for as long as intermediate maintainers take to release.
- **`pnpm.auditConfig.ignoreCves`**: Silences the alert without changing the
  installed code. That hides the problem rather than fixing it.
- **Drop the `postcss` override entirely**: Tested, and insufficient — natural
  resolution still admits a vulnerable `postcss` alongside the patched ones.

## Decision

Use **`pnpm.overrides` to force patched versions of transitive dependencies**
where no direct dependency bump is available, and express every override as a
**caret range rather than an exact pin**, so that later patch releases flow in
automatically instead of being frozen out.

Where a package has consumers on more than one major, the override is scoped to
the major that needs it, so it cannot drag other consumers backwards:

```json
"overrides": {
  "postcss": "^8.5.26",
  "js-yaml@^4": "^4.3.1",
  "brace-expansion@^1": "^1.1.18"
}
```

An override is a temporary measure. Each one should be removed once the
packages that pull it in have raised their own floors past the advisory.

## Consequences

### Positive

- `pnpm audit` reports no known vulnerabilities, and the corresponding
  Dependabot alerts close once the change lands on `main`.
- Caret ranges mean a future patch release is picked up by an ordinary
  `pnpm install` rather than needing another ADR.
- Scoping by major keeps `brace-expansion` 5.x consumers on 5.x while the
  `minimatch` 3 path moves to a patched 1.x.

### Negative

- Overrides force a version the intermediate package did not choose and did not
  test against. The risk is low for patch-level security releases but is not
  zero.
- Overrides are easy to add and easy to forget, so the list needs periodic
  pruning or it becomes a source of silent, stale pins — precisely the failure
  mode that motivated this ADR.

### Neutral

- `js-yaml` and `brace-expansion` are reached only through `eslint`, so both
  overrides become removable if the lint toolchain changes.

## References

- [pnpm: `overrides`](https://pnpm.io/settings#overrides)
- [ADR-0008: Dependency Security with Dependabot](0008-dependency-security-with-dependabot.md)
