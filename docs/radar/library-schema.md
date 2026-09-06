# Radar's article library: schema sketch

Part of the answer record for
[#89](https://github.com/jeasmith/ithilien/issues/89) on the
[wayfinder map](https://github.com/jeasmith/ithilien/issues/82). The store choice
and its ownership, access and migration boundaries are in
[ADR-0017](../adr/0017-use-neon-for-radar-library.md); this is the shape the data
takes inside it.

A sketch, not a migration. Every table here is derived from a term in
`CONTEXT.md` or a rule in [pipeline-contracts.md](./pipeline-contracts.md) and
[routes-and-content.md](./routes-and-content.md) — the citation matters more than
the column list, because the columns will move and the rules will not. Types are
indicative. Nothing here is provisioned, and no Drizzle schema is written yet.

Points the sketch could not settle on its own are marked **open**; those since
decided with Jamie are marked **settled** and say why.

## Ingest

### `source`

One row per place articles are surfaced from (`CONTEXT.md` § Source).

| Column            | Notes                                                              |
| ----------------- | ------------------------------------------------------------------ |
| `id`              |                                                                    |
| `name`            | Unique; the name shown on `/radar/sources`                         |
| `category`        | The fallback category, and the grouping for coverage               |
| `mechanism`       | `feed` \| `scrape` \| `api` — an implementation, not a kind        |
| `endpoint`        | **Private.** Feed URLs and inbox addresses are bearer capabilities |
| `via_mail_bridge` | True for the three email-only sources                              |
| `active`          |                                                                    |
| `last_success_at` | Denormalised for `/radar/sources`; derivable from `coverage`       |

`via_mail_bridge` is load-bearing twice over: it assigns the `Newsletters`
section and it grants the triage exemption. The bridge is not a source, so it is
a property of these rows rather than a row of its own.

### `article`

The thing on the web, identified by where it lives (`CONTEXT.md` § Article).

| Column          | Notes                                                                     |
| --------------- | ------------------------------------------------------------------------- |
| `id`            |                                                                           |
| `url`           | **Unique.** Normalised. This is identity, and it is what fetch dedupes on |
| `publisher`     | Host. Derives Section, so it must survive multi-sighting unchanged        |
| `title`         | Canonical, from enrichment — not what a source said                       |
| `description`   | Canonical, from enrichment                                                |
| `published_at`  | Canonical, from enrichment                                                |
| `enriched_at`   | Null until enriched                                                       |
| `depth`         | `candidate` \| `brief` \| `deep`. Climbed in order, never descended       |
| `category`      | Null until judged, or set from the source for exempt newsletters          |
| `slug`          | **Unique**, null until first publication, frozen thereafter               |
| `first_seen_at` |                                                                           |

`url` unique is the whole of deduplication: five sightings of one article become
one decision because they collide on this column, not because a later stage
groups them.

`depth` is derived state — it is `deep` if a deep dive exists, `brief` if a brief
does, `candidate` otherwise. Storing it is a read-path convenience, and it must
be maintained in the same transaction as the writing it reflects or it will lie.

**Settled — an exempt newsletter takes its source's category.** Triage assigns
category on both verdicts so that every judged article is categorised, but
newsletters bypass triage and the write contract returns no category, so nothing
in the agent path would ever populate this column for them. Code sets
`article.category` from `source.category` on the exemption path. The column is
therefore populated for every published article and the read path has no
fallback logic — the fallback happened at write time, deterministically, and is
recorded like any other value. Adding a `category` field to the write contract
for this one group was rejected: it would give the column two writers, and a
newsletter is about what the newsletter is about anyway. The articles a
newsletter links are candidates in their own right and are categorised by triage.

### `sighting`

One source surfacing one article on one day, in that source's own words
(`CONTEXT.md` § Sighting).

| Column           | Notes                                                                  |
| ---------------- | ---------------------------------------------------------------------- |
| `id`             |                                                                        |
| `article_id`     |                                                                        |
| `source_id`      |                                                                        |
| `sighted_on`     | Date                                                                   |
| `words`          | The source's framing. Null where a roundup carried only link text      |
| `via_article_id` | Null unless this sighting came from a roundup, pointing at the roundup |

Unique on `(source_id, article_id, sighted_on)`, so a re-run of the same day is
idempotent while a genuine re-sighting a week later is a second row.

`via_article_id` keeps `CONTEXT.md` § Roundup honest: the links a roundup carries
are sightings of further articles, and this records which roundup did the
carrying without making the roundup a source. It also makes the two-sightings
text cap in the triage contract explicable to a human reading the row.

The source filter on `/radar/articles` matches through this table, which is why
an article sighted by two sources appears once rather than twice.

## Judgement and writing

### `verdict`

The editorial judgement passed on a candidate (`CONTEXT.md` § Verdict).

| Column       | Notes                                          |
| ------------ | ---------------------------------------------- |
| `id`         |                                                |
| `article_id` | **Unique.** One terminal judgement per article |
| `run_id`     |                                                |
| `verdict`    | `kept` \| `cut`                                |
| `reason`     | Recorded either way                            |
| `category`   | Assigned on both verdicts                      |
| `decided_at` |                                                |

A row here is what suppression reads: the triage set is articles with no verdict
that did not arrive through the mail bridge. That is the only suppression in the
model, and it replaces the `seen` bit the old pipeline conflated four facts into.

**Settled — one verdict per article, and promotion sits outside it.** A verdict
is the agent's triage judgement and nothing else, so `article_id` is unique and
suppression is simply "a row exists". Promoting a cut article to a deep dive does
not touch this table: the request is its own recorded act in `deep_dive`, and the
agent's `cut` stays exactly as it was passed, reason intact. That keeps `verdict`
meaning one thing, keeps the record that the agent once said no — a cut is a
decision, not a deletion — and means the deep-dive request, which
[#93](https://github.com/jeasmith/ithilien/issues/93) is already going to record
as an event, is the single source of truth for why a cut article has writing.
Overwriting the verdict was rejected because it destroys the record; appending a
second owner-authored verdict was rejected because it makes one table hold two
different kinds of judgement.

A consequence for the public projection: a cut article with a deep dive becomes
public once #93's first-publication path has run, because its depth is `deep` and
it has been published. Its verdict is still `cut`. The projection reads depth and
publication, never the verdict, so this needs no special case.

### `brief`

The summary and "why this matters" that constitute a brief.

| Column             | Notes                             |
| ------------------ | --------------------------------- |
| `id`               |                                   |
| `article_id`       |                                   |
| `summary`          |                                   |
| `why_this_matters` |                                   |
| `kind`             | `news` \| `opinion` \| `analysis` |
| `written_at`       |                                   |
| `write_attempt_id` | The attempt that produced it      |

**Settled — a brief is immutable, in the database and everywhere else.** One row,
referenced by the issue and the article page alike, never updated. The route
contract's "stored once and rendered in both places" is therefore literal, and
an issue's fixed text is preserved by the row never changing rather than by a
frozen copy.

The reason is not that the record must be inviolable. It is that a brief is
**transient**: in most cases it is read once, on the day its issue publishes.
Whatever lasting value an article page has comes from its sightings, its issue
appearances and any deep dive, not from a brief being kept current. A correction
path would add a second writer to this table in order to fix text almost nobody
will read again, and every correction path grows — "fix the typo" is one step
from "soften the claim". If a brief is wrong in a way that matters, a deep dive
says so, which is the additive model doing its job. The alternative — `issue_entry`
freezing its own copy so the brief could be corrected — was rejected on that
basis; it is the one choice here that could not have been retrofitted, and it is
now closed.

### `deep_dive`

A full analysis, produced on request. Its own table because writing is additive:
a deep dive sits beside the brief that preceded it and cannot share the field the
brief lives in.

Columns beyond `article_id`, `requested_at` and `write_attempt_id` wait on
[#93](https://github.com/jeasmith/ithilien/issues/93), which owns the request
flow and whether an article can be deep-dived more than once. If it can, this
table needs an ordering column and `CONTEXT.md` needs a word for the second one.

### `source_snapshot`

The exact extracted source text supplied to a writing stage, retained privately
and permanently per ADR-0017.

| Column             | Notes                                          |
| ------------------ | ---------------------------------------------- |
| `id`               |                                                |
| `article_id`       |                                                |
| `retrieved_at`     |                                                |
| `text`             | **Private.** Evidence, not publishable content |
| `write_attempt_id` | The attempt this text was supplied to          |

Written before the writing call, so a failed call does not lose its input. Keyed
to the attempt rather than the article, so a later retrieval does not overwrite
the evidence for earlier writing. This is the table that grows without bound and
therefore the one that decides the storage bill — the research report's 50 KB per
article scenario is ~2.6 GB/year against Neon's 0.5 GB free allowance.

### `write_attempt`

| Column       | Notes                              |
| ------------ | ---------------------------------- |
| `id`         |                                    |
| `run_id`     |                                    |
| `article_id` |                                    |
| `stage`      | `brief` \| `deep_dive`             |
| `started_at` |                                    |
| `outcome`    | `written` \| `dropped` \| `failed` |

The seam that makes retention and anomaly recording work: snapshot, attempt and
resulting writing form one chain, so a dropped row keeps the text that was sent
and the reason it was dropped.

## Publication

### `issue`

One day's digest — a publication, not a view (`CONTEXT.md` § Issue).

| Column            | Notes                                              |
| ----------------- | -------------------------------------------------- |
| `id`              |                                                    |
| `issue_date`      | **Unique.** This is what makes publishing one-shot |
| `published_at`    |                                                    |
| `state`           | `draft` \| `published`                             |
| `coverage_run_id` | The run whose coverage this issue links to         |

The unique `issue_date` plus a transaction is the whole idempotency story for
publication: a re-run for a date that has already published does nothing because
it cannot insert. A successful run that selected nothing still publishes a row —
the "Nothing selected today" issue — while a failed run publishes none, so the
presence of a row means a run succeeded.

### `issue_entry`

Where a brief sat within one issue — placement, not a property of the article
(`CONTEXT.md` § Section).

| Column       | Notes                                                                |
| ------------ | -------------------------------------------------------------------- |
| `id`         |                                                                      |
| `issue_id`   |                                                                      |
| `article_id` |                                                                      |
| `brief_id`   | The brief published here                                             |
| `section`    | `lead` \| `briefs` \| `newsletters` \| `research` \| `vendor`        |
| `kind_label` | Frozen as shown, so a later kind revision cannot rewrite past issues |
| `position`   | Order within the section                                             |

Unique on `(issue_id, article_id)`. Recording placement per issue is what lets
editorial policy change without a past issue losing the structure it was actually
published with.

Publication is the transaction that inserts the `issue` row, its entries, and any
`article.slug` allocation together. Slug allocation is conditional — allocate only
where `slug IS NULL` — and needs a real interactive transaction, which is why
ADR-0017's driver note matters: the TCP `pg` path or the WebSocket driver, not the
HTTP adapter.

## Operations

### `run`

| Column        | Notes                                                             |
| ------------- | ----------------------------------------------------------------- |
| `id`          | The `<run-id>` in `/radar/sources/runs/<run-id>`, so it is public |
| `kind`        | `daily` \| `deep_dive`                                            |
| `started_at`  |                                                                   |
| `finished_at` |                                                                   |
| `status`      | Definition belongs to #97                                         |

The id appears in a public URL, so it must not be a guessable sequence that
invites enumeration of runs that published nothing.

### `coverage`

What happened when a run reached out to each source (`CONTEXT.md` § Coverage).

| Column           | Notes                                                               |
| ---------------- | ------------------------------------------------------------------- |
| `run_id`         |                                                                     |
| `source_id`      |                                                                     |
| `found`          |                                                                     |
| `in_window`      |                                                                     |
| `new`            |                                                                     |
| `status_public`  | Sanitised description, safe for `/radar/sources/runs/<run-id>`      |
| `status_private` | **Private.** Raw error text, which can contain feed URLs and tokens |

Unique on `(run_id, source_id)`. Splitting public from private status at the
column level rather than sanitising on read is deliberate: the route contract
forbids private feed URLs and raw errors in public output, and a column that is
never selected by the public role cannot leak through a forgotten code path.

### `run_anomaly`

Every dropped agent row, recorded against the run (pipeline-contracts § Failure).

| Column       | Notes                                                       |
| ------------ | ----------------------------------------------------------- |
| `run_id`     |                                                             |
| `article_id` | Nullable — an unknown article id is one of the drop reasons |
| `stage`      | `triage` \| `write` \| `deep_dive`                          |
| `error`      | The validation error                                        |
| `raw_row`    | **Private.** The row as received                            |

Deliberately not `coverage`: a malformed agent row is not a source's fault. Where
these surface is #97.

## The public projection

One rule, and everything on `/radar` reads through it:

> An article is public when it has a `slug`, its depth is `brief` or above, and
> it appears in an `issue_entry` of a `published` issue.

Completing a write stage does not publish anything. Candidates and cuts without
published writing stay private, which keeps them out of public pages, search,
result counts, snippets and the sitemap.

Enforce it as a database view rather than a convention in query code, and grant
the public role access to the view and not the tables. A projection expressed
once cannot drift between the page, the search endpoint and the sitemap.

## Roles

Four, because ADR-0017 separates migration credentials from application and
pipeline ones:

| Role             | Grants                                                             |
| ---------------- | ------------------------------------------------------------------ |
| `radar_public`   | `SELECT` on the public views only                                  |
| `radar_private`  | `SELECT` on candidates and diagnostics; used only after owner auth |
| `radar_pipeline` | `INSERT`/`UPDATE` for ingest, verdicts, writing, runs. No DDL      |
| `radar_migrate`  | DDL only, used by the gated migration job                          |

`/radar` is public read, private write, and the write side is `radar_pipeline`
running in GitHub Actions rather than anything reachable from a browser. Which
authentication mechanism gates `radar_private`, and where the pipeline credential
lives, remain [#94](https://github.com/jeasmith/ithilien/issues/94).

## Search and indexes

The route contract's article library needs text search combined with category,
sighting-source and kind filters, over the public projection only.

Postgres full-text search over `title`, `description`, `summary` and
`why_this_matters` with a GIN index, filtered by the projection. Kind and category
are low-cardinality column filters. Source is the fan-out: it joins through
`sighting`, so an article sighted twice must be collapsed with `EXISTS` rather
than a join that duplicates rows and corrupts result counts.

Indexes the read paths ask for: `issue(issue_date)` for the archive and the latest
issue, `article(slug)` for article pages, `sighting(article_id)` and
`sighting(source_id)` for both filter directions, and a partial index on articles
with no verdict for the triage set — the one query that runs against the whole
library every weekday.

Search is text, category, source and kind. Semantic and vector search are out of
scope on the map until the library has volume worth searching.

## Export and recovery

ADR-0017 requires an escape hatch and the research report is explicit that a raw
provider dump is not a tested migration plan. What the export must carry is
settled by the model: stable article identities and their canonical metadata,
sightings with their words, verdicts with their reasons, the immutable writing,
issue membership with section and frozen kind label, allocated slugs, and the
private run records — coverage, anomalies and retained source text.

The recovery requirement is equally clear: restoring into an empty database must
reproduce the public projection byte-for-byte and preserve every allocated slug,
because a slug is a permanent public URL. A restore that renumbers ids is
acceptable; one that reallocates a slug is a broken link.

**Open — where does the export land, how often, and what proves the restore
works?** Neon's free tier gives a restore window of hours, not an archive, so
this is a real gap rather than a belt-and-braces extra. The shape of the answer
is a destination, a cadence and a rehearsal, and none of the three is implied by
the store choice.

**Open — is the export a flat-file dump or the publication source of truth?**
These pull in different directions. A periodic dump is simple and adds nothing to
the publish path. Committing the published projection to a private repository on
every publication makes the escape hatch continuously proven and gives the
archive real durability, but it puts a git write inside the one-shot publication
transaction, which the idempotency contract has so far kept free of external
dependencies.

## What this sketch does not decide

Rendering and cache revalidation are #91. The authentication mechanism and the
pipeline's credentials are #94. Run status, partial publication and failure
handling are #97. The category vocabulary is still open on the map. The ADR set
is assembled in #96.
