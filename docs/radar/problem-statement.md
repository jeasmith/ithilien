# Problem statement and first-build scope reset

Drafted on 2026-10-17 for the owner to agree, after a few weeks away from the project. It restates what Radar is for and proposes the scope decisions that follow from it. Once agreed, where this note conflicts with `docs/radar/*`, `CONTEXT.md`, ADR-0017, ADR-0018 or the map in #82, this note wins until those documents are amended to match. Until then it is a proposal, and the status column in **Decisions** says which rows are already settled.

## The problem

A Claude cloud scheduled task produces a weekday architectural digest for one reader. Its curation is good, but everything it learns is thrown away. The seen ledger keeps only the most recent 4,000 IDs, a cut is suppressed forever on a single glance, and the summary and "why this matters" line the agent writes are never stored (`current-pipeline.md`; #83). Most of each run's tokens go on mechanical work: re-reading the runbook, rewriting the fetcher to disk, and hand-writing a ~476-line HTML file, which is the single largest per-run cost (#82; `current-pipeline.md`).

**Radar keeps the agent for judgement and writing, stores what it judges and writes, and publishes a daily issue at `/radar` from that store, without growing into a content platform.**

- **User:** Jamie, alone, as reader and editor. The pages are public, but no feature is built for other readers.
- **Job to be done:** each weekday morning, read a short, curated issue (2–3 leads on a normal day, none forced on a quiet one) with a "why this matters" on every item, see which sources failed, and know that anything once judged or written is kept and reachable later.

## Hard constraints

From the owner (#82, settled while charting):

- Orchestration is a scheduled GitHub Actions workflow; the Claude cloud scheduled task retires.
- The agent runs on the Claude subscription through `CLAUDE_CODE_OAUTH_TOKEN`, not metered API billing.
- `/radar` is public read, private write. The private write surface is GitHub (`workflow_dispatch`); the app has no sign-in and no private pages.
- Everything fetched is stored; source text is not retained.
- The first build is "the original problem, solved, and no more".
- The editorial bar stands: curated not comprehensive, cut aggressively, Newsletters exempt from cutting, quiet days are not padded (`current-pipeline.md`).
- Absence cannot be the signal: a failed run must be detected positively (#97, owner comment).
- The repository is public, so Actions logs and job summaries carry counts and identifiers only (#94).

From the platforms (see `docs/research/`, `revalidation-probe.md`):

- Radar's routes live under `src/app/radar/`; there is no `basePath` (ADR-0016).
- Revalidation must be triggered on the shared origin, because every `*.vercel.app` URL is behind Vercel SSO; polling it ~35 times in 95 s trips bot mitigation for ~20 minutes.
- Publication needs an interactive transaction, so the TCP `pg` or WebSocket driver, not Neon's HTTP adapter.
- Neon Free: 0.5 GB storage and 100 CU-hours a month; exhausting an allowance suspends compute.
- One subscription allowance is shared with interactive use. Exhaustion fails the job with no resume; the OAuth token lasts one year and nothing warns before it lapses.
- `schedule` runs can be delayed or dropped, run only from the default branch, and are disabled after 60 days without repository activity.
- JSON Schema `format` is not enforced in `structured_output`, so URLs and dates are validated in code.

## What the current pipeline already does

From `docs/radar/current-pipeline.md` and #82.

| Capability                                                     | Scheduled task today                                    | Radar first build                                |
| -------------------------------------------------------------- | ------------------------------------------------------- | ------------------------------------------------ |
| Fetch 22 sources (17 feeds, 1 API, 1 scrape, 3 by mail bridge) | Yes, by a fetcher rewritten to disk each run            | Same sources, fetched by committed code          |
| Curate ~66 candidates to ~13 across five sections, 2–3 leads   | Yes                                                     | Same bar, same sections                          |
| Daily readable page                                            | Self-contained HTML Artifact, hand-written by the agent | Rendered from stored data at `/radar/YYYY-MM-DD` |
| Coverage table for broken feeds                                | Yes, in the page                                        | Yes, in the issue                                |
| Remember what was judged                                       | Seen ledger capped at 4,000 IDs, then forgotten         | Every article and verdict, indefinitely          |
| Keep the written summaries                                     | No                                                      | Every brief, immutable                           |
| Past issues reachable                                          | Only the latest Artifact                                | Dated URLs and an archive                        |
| Run-to-run cost                                                | Varies with how many pages the session fetches          | Two schema-bound calls, no tool loop             |

Curation and the coverage table are parity. Every other row is a gap the rebuild closes: the page and fetcher rows are the mechanical token cost, and the four rows from _Remember_ down are the library being thrown away.

## Decisions

Status: **Settled** (closed ticket or ADR), **Proposed** or **Proposed cut** (this draft's recommendation), **Owner to decide**.

| #   | Topic                  | Proposed decision                                                                                                                                                                                                                                                                                                                                                                                                                                                     | Status                       |
| --- | ---------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ---------------------------- |
| 1   | First-build scope      | Scheduled Action, fetch → dedupe → enrich → triage → write → publish, Neon, `/radar`, dated issues, article pages, archive, sitemap. Nothing else.                                                                                                                                                                                                                                                                                                                    | Settled (#82)                |
| 2   | Store                  | Neon Postgres with Drizzle, owned by Radar.                                                                                                                                                                                                                                                                                                                                                                                                                           | Settled (ADR-0017, #89)      |
| 3   | Tables                 | Nine: `source`, `article`, `sighting`, `verdict`, `brief`, `issue`, `issue_entry`, `run`, `coverage`. Cut `deep_dive` (row 9), `write_attempt` (row 4) and `run_anomaly`, whose dropped-row counts and reasons go on `run` (#85 asks only that every drop is recorded against the run). Cut pre-built columns for deferred work: `article.depth` (derive it), `sighting.via_article_id`.                                                                              | Proposed cut                 |
| 4   | Writing fingerprint    | #82 asks that each writing attempt records a fingerprint of what it was shown. Keep that as a hash and byte count on `brief`, not a separate attempts table. Trade-off: failed attempts then leave no fingerprint.                                                                                                                                                                                                                                                    | Owner to decide              |
| 5   | Agent calls            | Keep two calls. At ~66 candidates a single full-text call is still ~165k input (calculated: 66 × the record's ~2.5k tokens per article), against a triage call of title and description only. The record's cost table (~73k in) assumes ~200 and was not redone for ~66. Restate every ~200 figure as ~66.                                                                                                                                                            | Proposed                     |
| 6   | Article kind           | Cut News / Opinion / Analysis. It came from #90, is not in the editorial bar, and adds a field, an enum, a label and a filter. #90 is closed, so this reverses a decision.                                                                                                                                                                                                                                                                                            | Owner to decide              |
| 7   | Interest profile (#92) | The persona and bar become the committed prompt files `pipeline-contracts.md` already names (`bar.md`, `triage.md`, `write.md`), versioned by git. No stored profile, learning or quality eval. Close #92.                                                                                                                                                                                                                                                            | Proposed                     |
| 8   | Taxonomy               | The nine categories in use today become the agent's vocabulary as they are.                                                                                                                                                                                                                                                                                                                                                                                           | Proposed                     |
| 9   | Deep dives (#93)       | Defer the whole path: workflow, table, prompt, page treatment and the source-text exception. Not in the #82 first-build list, but not in its _Out of scope_ list either, and #82's write surface names deep-dive requests.                                                                                                                                                                                                                                            | Owner to decide              |
| 10  | Promotion by URL       | A `workflow_dispatch` that writes a brief for a cut or unseen URL. #82 names it as how cuts are promoted in place of a backlog UI; build it as slice 4.                                                                                                                                                                                                                                                                                                               | Settled (#82)                |
| 11  | Routes                 | `/radar`, `/radar/YYYY-MM-DD`, `/radar/articles/<slug>`, `/radar/archive`, `/radar/sitemap.xml`. Cut `/radar/articles` (search and filters) and `/radar/sources`; the coverage table sits at the foot of each issue, as it does today. Both reverse #90, and #82's _Out of scope_ keeps `/radar/sources` and says text search carries v1.                                                                                                                             | Owner to decide              |
| 12  | Rendering              | ISR with a 24-hour backstop and on-demand revalidation through the shared origin.                                                                                                                                                                                                                                                                                                                                                                                     | Settled (ADR-0018, #91, #98) |
| 13  | Invalidation           | One cache tag for all Radar pages, one POST per publication, then a single check of `/radar` with backoff. Cut the per-path matrix: at one write a weekday, over-invalidating costs nothing. Reverses #91's exact invalidation.                                                                                                                                                                                                                                       | Owner to decide              |
| 14  | Database roles         | Two: `radar_public` (read, Vercel) and `radar_pipeline` (write, Actions). Migrations run by hand with the owner credential fetched through `neonctl`. Cut `radar_export`, `radar_migrate` and the public projection view; the public role gets table and column grants that leave out `verdict`, the drop reasons on `run` and private coverage detail. Reverses part of #94.                                                                                         | Owner to decide              |
| 15  | Backup                 | A monthly `pg_dump` the owner runs locally with the same `neonctl` credential. Cut the export role, deploy key, backup repository and twelve-file rotation.                                                                                                                                                                                                                                                                                                           | Owner to decide              |
| 16  | Failure handling (#97) | Cron off the hour, outside working hours; `timeout-minutes`, `--max-turns` and `--max-budget-usd` set. A failed run publishes nothing and GitHub's failure email is the alert. Positive detection is one scheduled check later the same day that fails if no issue row exists for the date, and fails 30 days before `CLAUDE_CODE_OAUTH_TOKEN_EXPIRES`. No automatic retry; rerun by `workflow_dispatch`. Cut the volume tripwire (#94); the budget flag bounds cost. | Proposed                     |
| 17  | Partial runs           | Publish if the write stage produced briefs, with failed sources visible in coverage. If every agent call failed, the run fails and publishes nothing, so a failure never reads as a quiet day.                                                                                                                                                                                                                                                                        | Proposed                     |
| 18  | Mail bridge            | The three email sources stay a feed whose URL is a secret. Bridge fixes stay out.                                                                                                                                                                                                                                                                                                                                                                                     | Settled (#82, #94)           |
| 19  | Credentials            | `radar-production` Environment restricted to `main`; OAuth token as a repository secret; no Neon integration; one revalidation secret.                                                                                                                                                                                                                                                                                                                                | Settled (#94)                |
| 20  | Visual identity (#95)  | In scope per #82. Proposed: ship slices 1–2 in the existing blueprint-navy style, then redesign against real issues.                                                                                                                                                                                                                                                                                                                                                  | Owner to decide              |
| 21  | Notification           | None. The issue is at `/radar`.                                                                                                                                                                                                                                                                                                                                                                                                                                       | Proposed                     |
| 22  | Spec assembly (#96)    | This note plus the amended records is the spec. Rescope #96 to the amendments and one issue per slice.                                                                                                                                                                                                                                                                                                                                                                | Proposed                     |
| 23  | Revalidation, smaller  | Time-based ISR only (for example `revalidate = 3600`), with no handler, no `RADAR_REVALIDATE_SECRET` and no verify step. The issue appears within the hour instead of within seconds. Reverses ADR-0018's on-demand path.                                                                                                                                                                                                                                             | Owner to decide              |
| 24  | Sources, smaller       | The 22 sources live in committed code, not a `source` table; `sighting` and `coverage` key on the source name. Eight tables, and the `endpoint` / `endpoint_secret` check goes with it.                                                                                                                                                                                                                                                                               | Owner to decide              |

### Build slices

1. **Daily issue.** Migrations for the nine tables, the scheduled workflow with its `workflow_dispatch` twin, fetch to publish in one run, `/radar` and `/radar/YYYY-MM-DD` with the coverage table, revalidation by tag (or none, if row 23 is agreed). Entries link to the source article. This is the first usable version: run it beside the scheduled task until it matches.
2. **Guardrails, then retire the task.** The missed-run and token-expiry check, guardrail flags, and public-output hygiene checked against a real log. Retire the Claude cloud scheduled task.
3. **Library pages.** Article pages with frozen slugs, the archive, the sitemap and the parent's robots entry, plus `/radar/sources` and library search if row 11 keeps them.
4. **Promotion by URL** (row 10).
5. **Visual identity** (#95), if row 20 is agreed.

## Deferred

Subject to the rows marked **Owner to decide**.

- **Deep dives** (#93): the model allows them later as a new table and page section; nothing in slices 1–3 blocks them.
- **Article search and filters**: archive and article pages make the library reachable; search earns its place once the library has volume.
- **Article kind**: can be backfilled from stored briefs if wanted.
- **`/radar/sources` and per-run coverage pages**: coverage is stored per run from day one and shown on each issue.
- **Roundup expansion and `via_article_id`**: the column can be added with the feature.
- **`write_attempt`, `run_anomaly` and `deep_dive` tables**: no first-build reader for any of them.
- **Automated backup**: export role, deploy key, repository and rotation, once there is enough to lose that a hand dump is a burden.
- **Volume tripwire** (row 16).
- Private backlog UI, gated migration job, restore rehearsal, backfill of past digests and semantic search: as already deferred on #82. Syndication, still _Not yet specified_ there, waits too.

## Documents to amend

- `docs/radar/pipeline-contracts.md`: ~200 to ~66, drop `kind` from the write contract, drop the deep-dive contract.
- `docs/radar/library-schema.md`: nine tables, two roles, no projection view, no `depth` or `via_article_id`, hand-run dump.
- `docs/radar/routes-and-content.md`: route map, coverage on the issue, no kind labels or library search.
- `docs/radar/rendering-strategy.md`: one tag and one check in place of the invalidation matrix.
- `docs/radar/credentials.md`: drop `radar_export`, `RADAR_BACKUP_DEPLOY_KEY`, `radar_migrate` and the tripwire.
- `docs/radar/current-pipeline.md`: its "bridge is out of scope" line contradicts row 18.
- `CONTEXT.md`: **Article kind** and **Depth** under rows 3 and 6.
- ADR-0017 (roles, export, fingerprint) and ADR-0018 (invalidation), amended or superseded together.
- Duplicate ADR numbers: renumber `0011-node-24-as-the-runtime-baseline.md` and `0012-pnpm-overrides-for-transitive-security-patches.md` to the next free numbers, since prose citing ADR-0012 means the TypeScript 6 record.
- Issues: close #92; rescope #93 to deferred; keep #95; rescope #96 and #97 as in rows 16 and 22; update #82's decisions and _Out of scope_.

## Questions for the owner

1. Writing fingerprint (row 4): **column** on `brief` (recommended), table, or drop?
2. Article kind (row 6): **cut** (recommended) or keep?
3. Deep dives (row 9): **defer** (recommended) or build?
4. `/radar/sources` and library search (row 11): **defer** (recommended) or keep?
5. Invalidation (rows 13 and 23): **hourly** ISR (recommended), one tag, or ADR-0018 as written?
6. Database roles (row 14): **two** (recommended) or four?
7. Backup (row 15): **hand** dump (recommended) or automated?
8. Volume tripwire (row 16): **cut** (recommended) or keep?
9. Visual identity (row 20): **after** slice 2 (recommended) or before slice 1?
10. Sources (row 24): **code** (recommended) or table?
