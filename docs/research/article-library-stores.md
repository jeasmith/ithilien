# Candidate stores for Radar's article library

Research for [#87](https://github.com/jeasmith/ithilien/issues/87), checked
2026-09-06. **Recommendation: Neon Postgres with Drizzle**, owned by Radar. This
is evidence for [#89](https://github.com/jeasmith/ithilien/issues/89). Nothing is
provisioned or implemented by this report.

**Decision update, 2026-09-06:** Jamie selected Neon. The store choice, the
ownership and access boundaries and the ORM are accepted and recorded in
[ADR-0017](../adr/0017-use-neon-for-radar-library.md). #89 stays open only for
the schema sketch and the export and recovery procedures. The comparison below
preserves the evidence and recommendation as they stood before that decision.

## The workload being compared

The current contracts supersede the ticket's original ~66 candidates/weekday:
[the pipeline](../radar/pipeline-contracts.md) now estimates ~200 candidates and
~13 briefs per run after expanding roundups. At 260 weekdays this is a sizing
scenario of **52,000 candidate arrivals and 3,380 briefs/year**, not a measured
count of new unique articles. Dedupe and retries change actual additions;
Sightings, Verdicts, Coverage and run anomalies add records. The
[domain](../../CONTEXT.md) retains articles, including cuts, indefinitely.

The [route contract](../radar/routes-and-content.md) adds requirements beyond
simple date/slug lookups:

- Public articles must be **published and at brief depth or above**. A completed
  write stage does not grant public visibility. Private backlog search includes
  candidates and cuts; public search, counts, snippets and sitemaps must not.
- Source filtering is a many-to-many Sighting lookup. An article matching two
  sources appears once. Combine this with category, kind and text search.
- Publish an Issue once per date; freeze its membership, placement, text and kind
  label. Reuse immutable Brief writing rather than maintain independently mutable
  copies. A deep dive is additive; allocate a unique, permanent slug at first
  publication.
- Keep ingest, triage and writing resumable. A final publication must become
  visible atomically; retrying an already published date must do nothing.
- Keep private feed capabilities and diagnostics out of public Coverage.

GitHub Actions orchestrates scheduled batches and rare on-demand writes. No
realtime, vector search or provider-side scheduler is required. Public cache hits
need not read the database on every view: see the existing
[runtime-rendering research](./nextjs-runtime-rendering.md) and
[revalidation probe](../radar/revalidation-probe.md). Cache misses and private
search still need efficient reads.

## Cost and capacity

USD prices below are the provider pages observed on the research date, excluding
Vercel, GitHub Actions, agent usage and taxes. Allowances are not an operating
budget or a promise of free indefinite retention.

| Candidate           | Free allowance relevant here                                                                                                | Paid boundary and cost implication                                                                                                                                                                                                                                                                                                                                                                                                                                                                                           |
| ------------------- | --------------------------------------------------------------------------------------------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Convex              | 1M function calls/month; 0.5 GB database, 0.5 GB search storage, 1 GB file storage; 1 GB database I/O and 1 GB egress.      | Starter has no base subscription and meters excess: $2.20/M calls, $0.22/GB database storage, $0.55/GB search storage, $0.22/GB database I/O, $0.132/GB egress at the displayed US East rate. Professional is $25/developer/month. These are separate meters. [Pricing](https://www.convex.dev/pricing)                                                                                                                                                                                                                      |
| Neon Postgres       | 100 CU-hours/month/project; 0.5 GB storage/project; 5 GB public transfer/month; 100 projects; restore window up to 6 hours. | Launch: $0.106/CU-hour and $0.35/GB-month, no monthly minimum; history is additional. Exhausting a Free allowance, including the 5 GB transfer, suspends compute until the next cycle or an upgrade; Launch and Scale include 500 GB public transfer per project per month, then $0.10/GB, from 1 June 2026. One Radar library must fit its own project's allowance; 100 projects do not make a 50 GB database. [Pricing](https://neon.com/pricing), [Network transfer](https://neon.com/docs/introduction/network-transfer) |
| Turso/libSQL        | 5 GB storage, 500M rows read/month, 10M rows written/month, 3 GB sync/month, 100 databases; 1-day point-in-time restore.    | Developer is $5.99/month with monthly billing. Developer includes 9 GB storage, 2.5B reads and 25M writes, then $0.75/GB, $1/B reads and $1/M writes. [Monthly pricing](https://turso.tech/pricing?frequency=monthly)                                                                                                                                                                                                                                                                                                        |
| Repository MDX/JSON | No separate database subscription.                                                                                          | Still consumes repository storage, workflow minutes, deployment/build capacity and maintenance. The current repository is public; storing the private library here is disqualified. A separate private repository and public publication projection add infrastructure and credentials.                                                                                                                                                                                                                                      |

Storage sensitivity, **calculated rather than measured**: 52,000 candidate rows
— the ceiling if every arrival is a distinct article; dedupe lowers it — at
2 KB of metadata each is ~104 MB/year before Sightings, writing, indexes and
record overhead. Retaining an additional 10 KB of extracted text per row
adds ~520 MB/year; 50 KB adds ~2.6 GB/year. Retaining 10 KB only for the 3,380
written articles adds ~34 MB/year. Whether fetched bodies are retained, and for
which articles, is not yet settled. Token estimates do not establish stored
bytes. Search indexes and backups require further space; these figures are not
an estimate of a provider's billed footprint.

At this write rate all managed options plausibly start within their operation
allowances. Storage and public read traffic are the uncertainties. Under a
hypothetical continuously active 0.25-CU Neon compute would consume 182.5
CU-hours over 730 hours: more than Free permits, or ~$19.35/month in Launch
compute before storage. At 1 GB and 20 active CU-hours, Launch's base compute-plus-storage is
~$2.47/month, excluding history/transfer. These scenarios use the published
rates above; neither is a measured Radar bill. Caching changes active time.

## Comparison against the operating shape

| Criterion                   | Convex                                                                                                                                                             | Neon Postgres + Drizzle/Prisma                                                                                                                               | Turso/libSQL                                                                                                         | Repository MDX/JSON                                                                                                                                    |
| --------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------ | ------------------------------------------------------------------------------------------------------------------------------------------------------------ | -------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------ |
| Daily runner writes         | Deployed mutation API; CLI can invoke internal functions with deployment credentials. Prefer narrow authenticated ingest endpoints for routine runs.               | TLS database connection using a dedicated writer role; ordinary SQL batch/transaction from Node. No management API token needed for daily writes.            | Database-scoped auth token and libSQL client; write batch or short interactive transaction.                          | Commit validated files; serialize writers and reconcile branch changes. Private repo requires separately scoped credentials.                           |
| Vercel runtime reads        | HTTP query to a regional Convex backend; no need to open reactive subscriptions.                                                                                   | HTTP for one-shot reads, pooled TCP/WebSocket when sessions are needed. Co-locate compute.                                                                   | Remote libSQL client; choose nearby placement. Embedded replica claims are not an automatic Vercel latency benefit.  | Deployed immutable files have no database round trip. Runtime search needs a generated index or a server-side scan.                                    |
| Local development           | Local backend under `convex dev` (beta), or cloud dev backend. Existing Compose would need backend process/network and persisted `.convex` state.                  | Add a version-pinned Postgres service and data volume to Compose. Same SQL engine locally; Neon HTTP transport needs separate integration verification.      | Local SQLite file via `@libsql/client`, persisted outside ephemeral containers; a libSQL server adds network parity. | Existing bind-mounted files suffice; private fixtures and generated indexes need care.                                                                 |
| Extra deployment target     | Yes: functions, schema and indexes deploy to Convex in addition to Radar's Vercel app.                                                                             | Managed database provisioned separately; migrations are a release step. No separate application backend is required.                                         | Managed database plus migrations; no separately deployed application functions required.                             | No database target for public content; the viable private-repo variant adds a content pipeline and deployment coordination.                            |
| Schema change               | Validators/indexes ship with functions; existing documents must satisfy the new schema. Backfill with compatible intermediate shapes before tightening validation. | Review generated SQL migrations. Drizzle permits explicit SQL for search/roles; Prisma uses its own schema/client workflow and production migration command. | SQL migrations; test against libSQL, including FTS tables/triggers and SQLite alteration constraints.                | Version file schemas, validate all records and migrate files; rebuild affected indexes and publications.                                               |
| Date/slug/depth and filters | Indexed queries fit; combining text search with many-to-many sources needs deliberate extra design.                                                                | SQL joins/`EXISTS`, constraints and full-text indexes fit directly.                                                                                          | SQL joins/`EXISTS` and FTS5 fit; small write concurrency is sufficient.                                              | Build-time indexes can fit public content; mutable private backlog and combined pagination need application machinery.                                 |
| Atomic publication          | A single mutation is atomic and serializable. Check uniqueness and commit publication references together.                                                         | Unique date/slug/identity constraints plus a short transaction.                                                                                              | Unique keys plus a write transaction; no network/agent work inside it.                                               | One commit can hold a coherent snapshot, but serving begins only after successful deployment; private and public repo commits are not one transaction. |
| Export                      | CLI exports table JSONL in ZIP; functions/query logic still need rewriting on exit.                                                                                | `pg_dump` for Postgres portability, explicit JSON/CSV export for a provider-neutral archive.                                                                 | SQLite-compatible data/SQL export; account for libSQL-specific features.                                             | Already files; schema and derived-index portability remain application concerns.                                                                       |

The implementation facts in this table are supported by
[Convex CLI](https://docs.convex.dev/cli/overview),
[local deployments](https://docs.convex.dev/cli/local-deployments),
[schemas](https://docs.convex.dev/database/schemas),
[atomicity](https://docs.convex.dev/database/advanced/occ),
[export](https://docs.convex.dev/database/import-export/export),
[Neon's driver](https://neon.com/docs/serverless/serverless-driver),
[Drizzle migrations](https://orm.drizzle.team/docs/migrations),
[Prisma production migrations](https://docs.prisma.io/docs/cli/migrate/deploy),
[Turso's client reference](https://docs.turso.tech/sdk/ts/reference),
[Turso local development](https://docs.turso.tech/local-development),
[Postgres constraints](https://www.postgresql.org/docs/current/ddl-constraints.html)
and [pg_dump](https://www.postgresql.org/docs/current/app-pgdump.html).

“Vercel Postgres” is a historical product name: new databases come from Marketplace
providers, and existing Vercel Postgres databases migrated to Neon. Evaluate Neon,
not a second independent Vercel database engine.
[Postgres on Vercel](https://vercel.com/docs/postgres)

Turso's current docs distinguish its new engine from libSQL. This comparison
uses the supported **libSQL + `@libsql/client`** ORM path, not the new engine's
MVCC or beta Drizzle support. The libSQL client documents serialized writes and
a five-second interactive transaction timeout. Its atomic batch API is a better
fit for this small publication step. Local file reads prove neither cloud token
permissions nor remote latency.
[Turso client reference](https://docs.turso.tech/sdk/ts/reference)

## Search and privacy are the distinguishing tests

Postgres supports stored search vectors and GIN indexes. Use an indexed search
predicate alongside an `EXISTS` Sighting filter to avoid duplicate articles;
category, kind, publication and depth predicates belong in the same query,
before pagination and counts. Search over original writing versus retained
source text remains a product decision. This is an inferred implementation fit,
not a benchmark.
[Postgres full-text indexes](https://www.postgresql.org/docs/current/textsearch-tables.html)

Turso includes FTS5. Its query language, ranking and external-content tables
support a similar SQL design; keeping the FTS index consistent is application
work, commonly via triggers. Test migrations and index updates together.
[Turso extensions](https://docs.turso.tech/features/sqlite-extensions),
[SQLite FTS5](https://www.sqlite.org/fts5.html)

Convex provides transactional text search and pagination without running a
separate search service. Its search index covers one string field and equality
filter fields; results are relevance-ordered, with no alternative sort order.
Extra filters scan results individually, and search scans have a 1,024-result
limit. Category, kind and publication flags fit equality filters. A source in a
separate Sightings table is not a native relational join inside that index:
consider denormalized search records or a bounded join strategy. Filtering a
single returned page in application code would give incomplete pages/counts;
collecting everything is not a scalable escape. This is the most concrete
Convex mismatch to investigate if it remains preferred.
[Convex text search](https://docs.convex.dev/search/text-search)

For every managed option, recommend Radar ownership of the database/project,
credentials, migrations and data access module. Ithilien needs only routing and
the Radar sitemap URL. Sharing a monorepo or public origin does not require
sharing database credentials. A pipeline workspace package can reuse the domain
operations without giving `packages/ui` or the parent app database access.
This is a proposed ownership boundary for #89, grounded in the route contract.

Recommend a server-side authenticated private backlog surface for SQL stores;
browser clients receive results, never writer/database tokens. Postgres allows a
public reader role to read only curated publication views/projections and a
separate private reader to read the backlog. Writer permissions need not include
schema ownership. If using row-level security, avoid owner or `BYPASSRLS` roles
for protected requests; RLS does not protect against those roles by default.
[Postgres GRANT](https://www.postgresql.org/docs/current/sql-grant.html),
[row security](https://www.postgresql.org/docs/current/ddl-rowsecurity.html)

Turso documents database-scoped, expiring read-only and table/action permissions.
A database-wide read-only token still exposes candidates if handed to a browser;
use a server boundary or separate public tables with appropriately scoped
permissions. Keep platform provisioning credentials out of routine ingest.
[Turso authorization](https://docs.turso.tech/sdk/authorization)

Convex's public query/mutation functions need explicit authorization checks.
A deployment key used with the CLI is convenient but grants deployment-level
power, not merely “append today's articles.” A proposed narrower alternative is
an HTTP action authenticating a dedicated runner credential, validating input,
and invoking internal mutations. The HTTP action itself is not a transaction;
publication must be one mutation. Direct authenticated Convex queries could
support the backlog without a Next.js API, but that is an alternative boundary
for #89 to choose, not a reason to expose unrestricted functions.
[Convex CLI](https://docs.convex.dev/cli/overview),
[HTTP actions](https://docs.convex.dev/functions/http-actions)

The public-repository null option is viable for **published output**, not the
complete library. A private repository could hold JSON and supply a sanitized
public projection to builds. It then needs private authenticated browsing,
consistent cross-repo publication/recovery, indexing and access control. Never
bundle private data into static assets or a client-side search index. MDX also
turns content into executable components; plain validated JSON/Markdown is the
simpler proposed boundary for generated prose. Neither option makes concurrent
writers, retries or publication immutability disappear.

## Latency: what is and is not established

No candidate database was provisioned and **no Radar database latency was
measured**. Provider examples cannot establish p50/p95 for this deployment.
Convex exposes region choices; co-locate it with Radar's Vercel functions.
Neon documents a typical few-hundred-millisecond compute wake-up after suspension,
additional to network and function startup. Warm HTTP reads avoid maintaining a
client session. For CI publication with conditional slug allocation, use a TCP
`pg` transaction (or the WebSocket driver), not an interactive transaction
assumed to exist in the HTTP adapter. A TCP path can also serve Vercel Node
functions and local Postgres; choosing HTTP for reads requires an adapter split
or local Neon proxy for transport parity.
[Convex regions](https://docs.convex.dev/production/regions),
[Neon connection latency](https://neon.com/docs/connect/connection-latency),
[Neon driver](https://neon.com/docs/serverless/serverless-driver)

Turso's embedded replicas require a filesystem and explicit synchronization.
This report assumes remote reads from Vercel rather than treating ephemeral
function storage as a durable replica. A published site cache can dominate
public read performance for any candidate; correctness still requires
publication-driven revalidation and verification as established in #98.
[Turso client reference](https://docs.turso.tech/sdk/ts/reference)

Before implementation is accepted, measure warm/cold slug, latest-issue and
filtered-search reads with representative data from the actual function and
database regions. Exercise simultaneous publication attempts, retry after a
lost response, source filters matching multiple Sightings, and anonymous access
to candidates, search counts and raw diagnostics. These are follow-up validation
requirements, not checks claimed to have run here.

## Recommendation and strongest counterargument

**Take Neon Postgres with Drizzle into #89 as the leading option.** Radar's
complexity is relational identity, immutable publication, private/public
projections and combined search filters. SQL expresses these directly. Local
Postgres fits the existing Docker approach; a managed database does not require
moving pipeline code to another runtime. Drizzle's explicit SQL/migration path
fits search indexes and role grants without hiding that SQL is part of the
design. Prisma remains a credible alternative if its generated-client workflow
is preferred; neither ORM removes the need to review migrations or write search
SQL. This preference is an engineering judgement, not a demonstrated TypeScript
6 compatibility test.

**The strongest argument against it is Turso/libSQL.** The actual write workload
is tiny, SQLite supports the needed relations and text search, and its 5 GB free
allowance gives much more retention headroom than Neon's 0.5 GB. A persistent
local file is also less setup than a Postgres service. Neon adds compute billing
and cold-start behavior without a current need for high write concurrency. If
minimizing recurring cost and setup outranks Postgres's permission model and
future query flexibility, Turso is a defensible choice; validate its scoped
permissions and FTS/publication path before choosing.

Convex remains credible, especially if a responsive private editorial UI and
end-to-end generated TypeScript API become priorities. Its atomic mutations,
managed indexes and integrated search earn their keep today. Reactive
subscriptions, crons and workflow components do not earn extra credit for a
weekday batch already orchestrated in GitHub Actions. Choosing Convex need not
move that orchestration; it does introduce a backend deployment and more
provider-specific query code. The source-filter search design is the specific
trade-off to resolve, rather than dismissing it simply as “too powerful.”

The decision ticket, #89, should record the selected option and ORM, public/private access boundary,
retained-text policy and estimated bytes, migration credentials/process,
publication transaction, and an export-and-restore escape hatch. Export stable
article identities, sightings, verdicts, immutable writing, issue membership,
slugs and sanitized/publication metadata as well as private run records to
protected storage; a raw provider dump alone is not a tested migration plan.
