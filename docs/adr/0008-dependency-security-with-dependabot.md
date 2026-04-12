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

- **Grouped updates**: Minor and patch updates are grouped into a single PR per
  category (production vs. dev) to reduce noise.
- **Weekly schedule**: Updates are checked every Monday morning.
- **GitHub Actions updates**: The CI workflow's action versions are also kept
  up to date.

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
- Major version updates still create individual PRs and require manual review.

### Neutral

- Dependabot works with pnpm lockfiles natively.
- Security updates bypass the grouping rules and are always created
  immediately.

## References

- [GitHub Dependabot](https://docs.github.com/en/code-security/dependabot)
- [Dependabot — Grouped Updates](https://docs.github.com/en/code-security/dependabot/dependabot-version-updates/configuration-options-for-the-dependabot.yml-file#groups)
