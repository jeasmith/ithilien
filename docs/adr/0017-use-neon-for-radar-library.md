# ADR-0017: Use Neon Postgres for Radar's article library

## Status

Accepted — Jamie selected Neon on 2026-09-06.

## Context

Radar needs a permanent article library with multiple source sightings per
article, recorded editorial verdicts, additive writing and immutable daily
publications. Public search combines text, category, kind and sighting-source
filters; unpublished candidates and private diagnostics must remain private.
GitHub Actions already owns pipeline orchestration.

[Research for #87](../research/article-library-stores.md) compared Convex,
Neon Postgres, Turso/libSQL and repository-backed MDX/JSON against these
requirements. The current pipeline estimates about 200 candidates and 13 briefs
per weekday; storage size and traffic remain unmeasured.

## Decision

Use **Neon Postgres** as the persistent store for Radar's article library.
Postgres's relational queries, constraints and transactions fit the relationships,
combined search filters and one-time publication rule. A local Postgres service
also fits the repository's Docker development approach.

Radar owns a **dedicated Neon project**, its database, credentials and migrations.
Jamie accepted this ownership boundary on 2026-09-06. Ithilien integrates through
Radar's public routes and sitemap; it does not receive database credentials or
direct access to Radar's tables. Sharing the monorepo and public origin does not
make the library shared application data.

Radar's web application accesses Neon **through Radar's own server code**.
Jamie accepted this access boundary on 2026-09-06. Public pages and the private
backlog read the same database through separate permissions. The public role can
read only published writing and the sanitised coverage the routes expose. Private
reads — candidates, cuts without published writing and run diagnostics — are
permitted to the owner alone; the server verifies the signed-in
user is the owner before issuing the query, and the query runs under a role the
public path never holds. Browser clients receive authorized results, never
database credentials. No separate API service is introduced for the library. The
authentication mechanism and pipeline writer credentials remain part of #94.

Use **Drizzle ORM and Drizzle Kit** for typed database access, schema definitions
and migration tooling. Jamie accepted Drizzle on 2026-09-06. Its SQL-oriented
query model fits Radar's relationships and publication transactions. Use explicit
SQL where search indexes or database permissions require it; adopting Drizzle
does not remove the need to understand and review the SQL being executed.

**Do not retain source text.** Record a **fingerprint** of the extracted text
supplied to each brief and deep-dive writing attempt — a content hash, its length
and its retrieval time — and nothing more. Jamie revised this on 2026-09-06,
later the same day, from an earlier acceptance of permanent retention of the
full text. The database exists to hold clear relations between pieces of
information, and a source is adequately identified by its URL; if the original
author takes an article down, Radar's own writing stands and the link is what
remains. The fingerprint preserves what retention was actually for — proof of
what a given attempt was shown, and the ability of a later re-fetch to detect
that the source has changed — without holding third-party text permanently or
making the library's size a function of article length. Text supplied to a
writing call lives in the run's workspace for the duration of the run, which
covers retries within it.

Article metadata, sightings, verdicts and Radar's own writing remain permanent
for all articles. Full source bodies fetched for enrichment or writing are not
part of the archive. Promoting an older candidate or revisiting a source
therefore retrieves it again, which can have changed or disappeared. Whether a
deep dive alone warrants retaining its source is left to #93.

Apply **reviewed, committed SQL migrations automatically as a gated release
step in GitHub Actions**. Jamie accepted automated migrations on 2026-09-06.
A dedicated job applies pending migrations before the dependent Radar version
can deploy; migration failure blocks that release. Serialize production migration
runs and give the job a dedicated migration credential, separate from ordinary
application and pipeline roles. Routine ingest never changes the schema.

Keep the currently deployed application compatible during migration: add new
structures, backfill data, then remove obsolete structures in a later release.
Application rollback must remain compatible with the expanded schema; automatic
destructive down-migrations are not the rollback strategy. Verify migration
history on both an empty database and an existing supported schema before
production execution.

The release implementation must coordinate Vercel deployment with this gate.
An independent automatic Vercel deployment must not bypass it. This ADR records
the required ordering; it does not change the current deployment workflow.

This accepts the store, ownership, web access, data-access tooling, source-text
fingerprinting and migration execution choices.
[#89](https://github.com/jeasmith/ithilien/issues/89) still owns the schema sketch
and the export and recovery procedures. No database, paid plan,
credentials or dependencies are provisioned by this ADR.

The alternatives remain credible but were less compelling for this workload:

- **Convex** provides atomic mutations and reactive queries, but daily batch
  publication has limited need for live synchronization. Combining full-text
  search with many-to-many sighting-source filters needs additional query or
  denormalization design. Its integrated backend adds a function deployment while
  orchestration remains in GitHub Actions.
- **Turso/libSQL** is the strongest alternative: SQL and full-text search fit,
  local files are simple, and its free storage allowance is larger. Neon is
  preferred for Postgres's permissions and query flexibility, accepting the
  additional local service and potential compute cost.
- **Repository-backed content** can hold published output, but this repository
  is public. The private library would require a separate private repository and
  additional search, access and publication coordination.

## Consequences

### Positive

- Relationships, uniqueness and publication transactions can use native SQL
  facilities rather than application-only conventions.
- Standard Postgres provides a familiar local development and provider-exit path.
- The pipeline can remain in GitHub Actions without a separately deployed
  application backend for database operations.

### Negative

- Neon introduces managed storage and compute costs. Its free tier is a starting
  allowance, not a long-term retention budget.
- Suspended compute can add latency. Actual read performance must be measured
  from Radar's Vercel deployment before implementation is accepted.
- We must own migrations, role permissions, search indexes and recovery checks.

### Neutral

- Rendering and cache revalidation remain #91; write credentials and trust remain
  #94; operational failure handling remains #97.
- Storage sizing must use measured metadata and writing bytes. With source text
  fingerprinted rather than retained, library size no longer depends on article
  length.
- An export capability must be paired with a tested restore procedure; choosing
  Postgres alone does not establish recovery readiness.

## References

- [Store comparison and primary sources](../research/article-library-stores.md)
- [Drizzle overview](https://orm.drizzle.team/docs/overview)
- [Drizzle migration workflows](https://orm.drizzle.team/docs/migrations)
- [Store decision ticket #89](https://github.com/jeasmith/ithilien/issues/89)
- [Radar domain vocabulary](../../CONTEXT.md)
- [Pipeline contracts](../radar/pipeline-contracts.md)
- [Routes and publication contract](../radar/routes-and-content.md)
