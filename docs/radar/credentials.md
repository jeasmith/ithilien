# Radar: credential inventory and trust boundary

Answer record for [#94](https://github.com/jeasmith/ithilien/issues/94) on the
[wayfinder map](https://github.com/jeasmith/ithilien/issues/82), agreed with Jamie
on 2026-09-13. The roles and their grants are in
[library-schema.md](./library-schema.md); the revalidation call is in
[rendering-strategy.md](./rendering-strategy.md). This records where every
credential lives and what it can do. Nothing here is provisioned.

## The boundary

`/radar` is public read, private write, and the private write surface is GitHub.
Nothing a browser can reach holds a credential that writes. Three trust roots
remain:

- **GitHub** runs the pipeline and holds its write credentials.
- **Vercel** runs the app and holds a read credential for public data only.
- **Jamie's Neon account** is the root over the database, and is used only to
  bootstrap roles and to fetch the migration credential on demand.

**Ithilien holds none of these.** Its Vercel project has no Radar environment
variables and no database access. Both `vercel.json` files keep their existing
header posture unchanged: the revalidation handler is a server-to-server `POST`,
so `connect-src 'self'` does not apply to it.

## Inventory

| Credential                                    | Can do                                              | Lives in                                                     | Environments                        | Rotation                                                                                           | If it leaks                                                                                                                     |
| --------------------------------------------- | --------------------------------------------------- | ------------------------------------------------------------ | ----------------------------------- | -------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------- |
| `RADAR_DATABASE_URL` (`radar_public`, pooled) | `SELECT` on the public views                        | Radar's Vercel project, set by hand                          | Production, Preview, Development    | On suspicion                                                                                       | Nothing that is not already on the site                                                                                         |
| `RADAR_PIPELINE_DATABASE_URL` (direct)        | Read and write pipeline tables; no `DELETE`, no DDL | GitHub Environment `radar-production`                        | `main` only                         | On suspicion                                                                                       | The private backlog is readable; verdicts and issues can be forged                                                              |
| `RADAR_EXPORT_DATABASE_URL` (direct)          | `SELECT` on every table and sequence                | GitHub Environment `radar-production`                        | `main` only                         | On suspicion                                                                                       | The private backlog and run records — raw feed errors with capabilities already redacted, and dropped agent rows — are readable |
| `radar_migrate`                               | DDL, the migration journal, backfills               | **Nowhere.** Fetched per command through `neonctl`           | Local, via the container            | Neon console, on suspicion                                                                         | Schema and data can be changed — requires Jamie's Neon login first                                                              |
| Neon owner role                               | Everything                                          | Jamie's Neon account                                         | Bootstrap only                      | Neon console                                                                                       | Everything                                                                                                                      |
| `RADAR_REVALIDATE_SECRET`                     | Force regeneration of Radar cache paths             | Radar's Vercel project **and** `radar-production`            | Vercel Production only; `main` only | On suspicion; one run may fail meanwhile                                                           | Extra regeneration, one database read per path                                                                                  |
| `RADAR_BRIDGE_FEED_URL`                       | Read every newsletter forwarded to the bridge inbox | GitHub Environment `radar-production`                        | `main` only                         | Regenerate at Kill The Newsletter                                                                  | The newsletters are readable                                                                                                    |
| Bridge inbox address                          | Deliver mail into the bridge feed                   | Jamie's iCloud mail rules and Kill The Newsletter; not Radar | None                                | With the feed URL: a new Kill The Newsletter feed, then the mail rules and `RADAR_BRIDGE_FEED_URL` | Junk can be injected into the feed, which triage then judges                                                                    |
| `RADAR_BACKUP_DEPLOY_KEY`                     | Push to the private backup repository               | GitHub Environment `radar-production`                        | `main` only                         | On suspicion                                                                                       | The twelve dumps can be overwritten or deleted                                                                                  |
| `CLAUDE_CODE_OAUTH_TOKEN`                     | Spend Jamie's Claude subscription allowance         | Repository secret, as today                                  | Every branch                        | **Annually, by hand** — see below                                                                  | The shared allowance can be exhausted                                                                                           |

## Decisions

### Workflow secrets live in a GitHub Environment

Radar's Actions-side secrets live in a GitHub Environment named
`radar-production`, restricted to the `main` deployment branch, with **no
required reviewers**. The daily digest, the deep-dive workflow and the monthly
export all declare `environment: radar-production`.

Repository secrets are available to a workflow run on any branch, and this
repository already runs an agent (`claude.yml`) with `contents: write` that
creates branches. Restricting the environment to `main` means no branch can read
a write credential by running a workflow. A reviewer gate would stall the
scheduled run every weekday, so there is none.

`CLAUDE_CODE_OAUTH_TOKEN` stays a repository secret. `claude.yml` and
`claude-code-review.yml` need it on pull request branches, and a second copy
would double the annual rotation. GitHub gives no repository secrets to
`pull_request` runs from forks, and `claude.yml` only responds to owners,
members and collaborators, so the token reaches branches pushed by people with
write access. Whether those existing workflows should narrow further is outside
this record; Radar's workflows never use the repository copy for anything but
agent calls on `main`.

The environment is configuration that the repository cannot show, so the spec
must list it.

### Secret feed endpoints are secrets; public ones are data

Ordinary RSS and Atom feed URLs stay in `source.endpoint`. They are public data,
and adding a source should not need a secret change.

The Kill The Newsletter feed URL is a bearer capability. Its `source` row holds a
null `endpoint` and an `endpoint_secret` naming the environment variable
(`RADAR_BRIDGE_FEED_URL`) that carries it. A check constraint requires exactly
one of the two. The pipeline resolves the endpoint from whichever is set; a named
secret that is missing from the environment is a coverage failure for that
source, not a crashed run. The inbox address is used only by the iCloud mail
rules, never by the pipeline, so Radar holds no copy of it. It is inventoried
because the two are rotated together: replacing the Kill The Newsletter feed
issues a new address and a new feed URL at once.

This puts no credential value in the database, so the monthly dump includes
`source` directly. It also makes write-time redaction exact — the redactor
replaces every secret value it loaded from the environment — and GitHub masks
registered secrets in logs, which a URL read from the database would never be.

### One revalidation secret, no overlap

`RADAR_REVALIDATE_SECRET` is set in Radar's Vercel project for **Production
only**, and in `radar-production`. Preview and Development deployments do not
receive it, so their handler fails closed; previews cannot exercise the
cross-application path anyway, because bypass tokens are deployment-scoped
(`revalidation-probe.md`).

There is no second, previous-value variable. A Vercel environment change takes
effect only on the next deployment, so rotation leaves a window in which the two
copies disagree; that window may fail one run, which is accepted for a secret
rotated only on suspicion. The handler compares in constant time, returns a
**distinct `401`** on a mismatch so the workflow can report failed revalidation
rather than a stale page, and sends `Cache-Control: no-store`. How that failure
surfaces is #97.

### The app reads with the public role everywhere, without the Neon integration

Radar's Vercel project does **not** install the Neon integration. One
`RADAR_DATABASE_URL`, using `radar_public` and Neon's pooled endpoint, is set by
hand in Production, Preview and Development. Local development gets it through
`vercel env pull`.

Preview builds need Neon, because `next build` prerenders the fixed ISR routes
from the public projection (ADR-0018). The role reads public views only, so a
preview or a laptop gains nothing a reader lacks, and previews render real
published content. The integration was rejected because it chooses the role in
the connection strings it injects rather than letting the project pin one —
Neon's default owner role in the common case — and it creates a database branch
per preview that a read-only app does not need. It becomes worth revisiting when
previews need to test migrations or writes, which arrives with the deferred gated
migration job.

The pipeline and the export use Neon's direct endpoint, which is the plain path
for the real transaction that publication needs.

### The migration credential is never stored

`pnpm --filter=radar db:migrate` obtains the `radar_migrate` connection string at
run time with `neonctl connection-string --role-name radar_migrate`, holds it in
the migration process's environment, and never writes it to disk. There is no
`.env` entry, Actions secret or Vercel variable for it. Its strength is Jamie's
Neon account, which the owner role already depends on.

Migrations run **inside the Docker container**. `neonctl auth` opens a browser
login, so Jamie authenticates once on the host; only the migration command
mounts the host's `~/.config/neon` into the container, read-only. The `dev`
service never sees it.

The Neon owner role is used once, by a bootstrap script that creates the four
roles and transfers table ownership to `radar_migrate`, which must own the tables
to `ALTER` them. Migrations issue the grants to the other roles.

When the gated migration job returns from the deferred list, `radar_migrate`
moves into its own GitHub Environment **with** a required reviewer — the approval
gate belongs there, not on `radar-production`.

### The export has its own read-only role and a deploy key

The monthly dump reads through a fourth role, `radar_export`, with `SELECT` on
every table and sequence and no writes. Reusing `radar_pipeline` would work, but
a job that never writes should not hold a credential that can publish.

The push uses a **deploy key** with write access to the private backup
repository only. It is bound to one repository rather than to Jamie's account,
and it does not expire, so it adds no second annual cliff. A fine-grained token
would expire, belong to a person, and invite over-granting.

The dump is written to a file and pushed with `git`: never piped to standard
output, and no `set -x`.

### Everything a Radar run prints is public

This repository is public, so its Actions logs, job summaries and
`workflow_dispatch` inputs are readable by anyone. The map's earlier plan to list
cuts in the run's job summary would have published the private backlog.

- **Job summaries carry counts and identifiers only**: the run id, candidate,
  keep, cut and drop counts, coverage failures by source name, and the issue URL.
  They never name a cut article or quote a verdict reason.
- **Cuts are browsed in Neon's SQL console**, with a saved query the spec
  documents.
- **Agent rows never reach standard output.** Anomalies go to `run_anomaly`.
  `claude-code-action` runs with `show_full_output` and `display_report` left at
  their `false` defaults, which its own documentation warns expose content in
  public logs.
- **Deep-dive URLs visible on a run are accepted.** A requested deep dive is
  meant to become public, and an abandoned request reveals only interest.

### Runs that write cannot overlap, and cannot run away

The daily digest and the deep-dive workflow share one concurrency group:

```yaml
concurrency:
  group: radar-writer
  queue: max
```

Without `queue`, a group holds one pending run and a newer arrival cancels it, so
two deep dives dispatched during a daily run would silently lose the first.
`queue: max` holds up to 100 pending runs, processed first-in, first-out by when
each began waiting. That is scheduling behaviour, not an ordering guarantee, and
a run arriving at a full queue is not held — so no run may depend on another
having run before it; each stage stays idempotent and read-before-write, as the
pipeline contracts already require. `queue` cannot be combined with
`cancel-in-progress: true`, which a writer would not want anyway. The monthly export is outside the group: `pg_dump` reads a consistent
snapshot and holds no write credential.

Runaway protection is structural rather than a budget:

- **No self-dispatch.** Radar workflows grant `permissions: contents: read` and
  nothing else, so a run cannot trigger another run.
- **Every job has `timeout-minutes`.**
- **A volume tripwire, not a cap.** If a run's candidate count or pending write
  rows exceed a fixed multiple of expected volume — around five times, with
  exact figures in the spec — the run **fails** before calling the agent. It
  never truncates the set, which would be the purgatory cap #85 rejected; a
  failed run is visible where silently dropped articles are not.
- `--max-turns` and `--max-budget-usd` values belong to #97.

### The annual token cliff gets a date to check

`CLAUDE_CODE_OAUTH_TOKEN` has a one-year lifetime, is minted interactively and
cannot be rotated automatically. Alongside it, a non-secret repository variable
`CLAUDE_CODE_OAUTH_TOKEN_EXPIRES` records its expiry date, updated whenever
Jamie mints a replacement. That turns the cliff into a date a workflow can check
ahead of time rather than a silence noticed afterwards. The warning mechanism and
its lead time are #97's.

## Handoffs

- **#93** — the deep-dive workflow joins `radar-writer` with `queue: max`, runs
  in `radar-production`, and prints nothing a public log should not hold.
- **#97** — detect the token expiry from `CLAUDE_CODE_OAUTH_TOKEN_EXPIRES`;
  classify the handler's `401` as failed revalidation; decide what the volume
  tripwire's failure reports; set the in-run guardrail values.
- **#96** — the spec lists the `radar-production` environment, the Vercel
  variables and the bootstrap script, none of which the repository shows by
  itself.
