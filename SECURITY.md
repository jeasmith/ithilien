# Security Policy

## Reporting a Vulnerability

If you discover a security vulnerability in this project, please report it
responsibly.

**Do not open a public GitHub issue for security vulnerabilities.**

Instead, please email the maintainer directly or use
[GitHub's private vulnerability reporting](https://docs.github.com/en/code-security/security-advisories/guidance-on-reporting-and-writing-information-about-vulnerabilities/privately-reporting-a-security-vulnerability).

## Supported Versions

Only the latest version deployed to production is actively maintained.

## Security Practices

This project follows these security practices:

- **Dependency management**: Dependabot is configured to automatically flag and
  update vulnerable dependencies on a weekly cadence.
- **CI pipeline**: All pull requests must pass linting, type checking, and tests
  before merging.
- **Static export**: The initial deployment is a fully static site, which
  significantly reduces the attack surface (no server-side request handling).
- **No secrets in code**: Environment variables and secrets are managed through
  Vercel's environment configuration, never committed to the repository.
- **Security headers**: Configured at the Vercel platform layer.

## Dependencies

We pin major versions and use Dependabot to keep packages current. All
dependency updates go through the same CI pipeline as application code.
