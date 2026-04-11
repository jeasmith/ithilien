# ADR-0005: Use Vitest for Testing

## Status

Accepted

## Context

We need a test runner that supports TypeScript, React component testing, and
integrates well with the modern JavaScript toolchain. Requirements:

- Fast execution — tests should run in under a few seconds for a good developer
  experience.
- Native TypeScript and ESM support without extra transpilation config.
- Compatible with React Testing Library for component tests.
- Good IDE integration and watch mode.

Alternatives considered:

- **Jest**: The incumbent standard. Excellent ecosystem, but slower startup,
  requires more configuration for ESM/TypeScript, and uses a different
  transform pipeline from the rest of the toolchain.
- **Bun test**: Extremely fast, but ecosystem compatibility is still maturing.
- **Playwright Test**: Better suited as a complement for E2E tests rather than
  a unit/component test runner.

## Decision

Use **Vitest** as the primary test runner.

Vitest uses the same Vite-based transform pipeline that many modern tools use,
giving near-instant startup. It is API-compatible with Jest (same `describe`,
`it`, `expect` interface), so the learning curve for Jest users is minimal.

## Consequences

### Positive

- **Fast**: Vite-powered HMR-style test re-runs in watch mode.
- **Zero-config TypeScript**: Works with TypeScript and path aliases out of the
  box via the Vite config.
- **Jest-compatible API**: Easy to adopt for anyone who has written Jest tests.
- **Built-in coverage**: V8 coverage provider without extra dependencies.
- **ESM-first**: No CJS/ESM interop issues.

### Negative

- Smaller ecosystem than Jest — some niche Jest plugins may not have Vitest
  equivalents.
- Vitest is younger than Jest, so edge cases may be less documented.

### Neutral

- React Testing Library works identically with Vitest and Jest.
- We can add Playwright later for E2E tests without conflict.

## References

- [Vitest](https://vitest.dev)
- [React Testing Library](https://testing-library.com/docs/react-testing-library/intro)
- [Vitest — Comparison with Jest](https://vitest.dev/guide/comparisons.html)
