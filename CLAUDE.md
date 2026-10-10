@AGENTS.md

## Claude Code

- **Cloud sessions** get Node.js and dependencies from
  `.claude/hooks/session-start.sh`: it installs the Node major in `.nvmrc`
  (the cloud image ships Node 22), enables pnpm through Corepack and runs
  `pnpm install`. It exits immediately in local sessions, which use the host
  toolchain or Docker.
- **Shared permissions** live in `.claude/settings.json`: the validate, test
  and build scripts run without prompting; force pushes are denied. Personal
  rules go in `.claude/settings.local.json`, which is ignored.
- **GitHub from cloud sessions**: the session's GitHub proxy blocks GraphQL,
  so `gh issue`, `gh pr view` and `gh pr checks` fail there; `gh pr diff` and
  `gh run` work. Use the REST API instead, e.g.
  `gh api repos/jeasmith/ithilien/issues` or
  `gh api repos/jeasmith/ithilien/pulls/<n>`.
