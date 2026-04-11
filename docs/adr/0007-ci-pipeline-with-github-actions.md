# ADR-0007: CI Pipeline with GitHub Actions

## Status

Accepted

## Context

We need a continuous integration pipeline that runs automated checks on every
code change before it reaches production. The pipeline must:

- Run linting, type checking, formatting validation, and tests.
- Build the application to catch build-time errors.
- Be fast enough that it doesn't slow down the development workflow.
- Integrate natively with the GitHub pull request flow.

Alternatives considered:

- **Vercel Checks**: Vercel runs a build on every PR, but doesn't run our
  custom lint/test/typecheck pipeline.
- **CircleCI / Travis CI**: Capable, but adds another third-party service when
  GitHub Actions is built in.
- **Self-hosted runners**: Unnecessary complexity for a personal project.

## Decision

Use **GitHub Actions** for the CI pipeline, defined in
`.github/workflows/ci.yml`.

The pipeline runs two jobs:

1. **validate**: lint, typecheck, format check, and tests (in parallel where
   possible).
2. **build**: a full production build, run after validation passes.

Both jobs use `pnpm install --frozen-lockfile` to ensure reproducible builds.

## Consequences

### Positive

- **Native integration**: Status checks appear directly on PRs with no extra
  configuration.
- **Free for public repos**: GitHub Actions provides generous free minutes.
- **Concurrency control**: In-progress runs for the same branch are
  automatically cancelled to save minutes.
- **Caching**: pnpm store is cached between runs via `actions/setup-node`.

### Negative

- GitHub Actions YAML can be verbose and harder to test locally compared to
  a Makefile or script.
- Debugging pipeline failures sometimes requires push-and-wait cycles.

### Neutral

- Vercel still handles deployment — the CI pipeline focuses purely on quality
  gates, not deployment.

## References

- [GitHub Actions](https://docs.github.com/en/actions)
- [pnpm/action-setup](https://github.com/pnpm/action-setup)
