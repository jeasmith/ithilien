# ADR-0008: Dependency Security with Dependabot

## Status

Accepted

## Context

Third-party dependencies are one of the primary attack vectors for modern web
applications. Even a personal project should manage dependencies responsibly:

- Vulnerable packages must be flagged and updated promptly.
- Dependency updates should go through the same review process as application
  code.
- The volume of update PRs should be manageable — one PR per patch bump is
  noise.

Alternatives considered:

- **Renovate Bot**: More configurable than Dependabot, supports auto-merge
  policies. However, it requires a separate GitHub App installation and more
  complex configuration.
- **Manual updates**: Running `pnpm update` periodically. Relies on discipline
  and is easy to forget.
- **Socket.dev**: Supply chain security analysis. Valuable as a complement but
  doesn't handle the update workflow itself.

## Decision

Use **GitHub Dependabot** for automated dependency updates and vulnerability
alerts.

Configuration is defined in `.github/dependabot.yml` with:

- **Toolchain family groups**: Packages that must move together — Next.js and
  React, the Vitest/Vite test stack, the lint and format tools, the styling
  stack — are grouped by name pattern, and those groups include **major**
  bumps. A React major without the matching `@types/react` does not typecheck,
  so splitting them across PRs produces PRs that cannot pass CI individually.
- **Catch-all groups**: Anything not matched by a family group is grouped into a
  single production PR and a single dev PR, minor and patch only, so an
  unanticipated major still lands in its own reviewable PR.
- **Weekly schedule**: Updates are checked every Monday morning.
- **GitHub Actions updates**: Action versions are kept up to date and grouped
  into a single PR — these bumps are low-risk and reviewed as a batch.

## Consequences

### Positive

- **Automated vulnerability alerts**: GitHub flags known CVEs in dependencies
  and can auto-create PRs to fix them.
- **Grouped PRs**: Reduces the number of PRs to review while still keeping
  dependencies current.
- **Zero maintenance**: Dependabot is a native GitHub feature — no external
  service to manage.
- **Audit trail**: Every dependency change goes through a PR with CI checks.

### Negative

- Dependabot's grouping and auto-merge capabilities are less flexible than
  Renovate's.
- Grouping majors by family means one bad bump blocks the rest of its group
  until the PR is fixed or the offending package is pinned. This is the
  deliberate trade for not having to land four coupled PRs in the right order.
- Group membership is defined by name patterns, so a newly added package falls
  into a catch-all group until someone adds it to the right family list.

### Neutral

- Dependabot works with pnpm lockfiles natively.
- Security updates bypass the grouping rules and are always created
  immediately.

## References

- [GitHub Dependabot](https://docs.github.com/en/code-security/dependabot)
- [Dependabot — Grouped Updates](https://docs.github.com/en/code-security/dependabot/dependabot-version-updates/configuration-options-for-the-dependabot.yml-file#groups)
