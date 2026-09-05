# Radar: issue identity, routes and archive

Answer record for [#90](https://github.com/jeasmith/ithilien/issues/90) on the
[wayfinder map](https://github.com/jeasmith/ithilien/issues/82), agreed with Jamie
on 2026-09-05. Vocabulary is in `CONTEXT.md`; the agent boundary is in
[pipeline-contracts.md](./pipeline-contracts.md). This records design decisions;
it does not implement routes. Rendering belongs to #91 and the assembled spec
and ADRs to #96.

## Route map

All public URLs use `https://www.ithilien.dev`.

| Route                              | Content                                                                                    |
| ---------------------------------- | ------------------------------------------------------------------------------------------ |
| `/radar`                           | Latest published issue rendered here, with a canonical link to its dated URL               |
| `/radar/YYYY-MM-DD`                | Permanent issue with full briefs and its original section placement                        |
| `/radar/articles/<permanent-slug>` | Article brief, issue appearances, source sightings and any deep dive                       |
| `/radar/articles`                  | Published article library, with text search and category, sighting-source and kind filters |
| `/radar/archive`                   | Issue archive by date, newest first                                                        |
| `/radar/sources`                   | Public source health, including last successful checks                                     |
| `/radar/sources/runs/<run-id>`     | Public, sanitised source coverage for a particular run                                     |
| `/radar/sitemap.xml`               | Radar's public canonical content URLs                                                      |

The run-specific path is the concrete route for the agreed link from an issue to
that run's coverage. It must identify the original run rather than display the
latest source-health state.

## Issues and article pages

`/radar` serves the latest issue at its own URL; it does not redirect. Every
published issue has a permanent dated URL. Its date stays visible, including when
the latest issue is several days old.

Every entry renders its full summary and "why this matters" in the issue. The
article page renders that same brief plus the issues it appeared in, which sources
sighted it and in whose words, and any deep dive. The brief is stored once and
rendered in both places. Writing a deep dive adds content to the article page;
it never replaces the brief or rewrites a past issue. An issue may add a link
indicating that a deep dive is now available.

The article slug is assigned at first public publication and frozen. Use a
readable title-derived slug, with a short suffix when needed to resolve a
collision. Enforce uniqueness when allocating it; changes to title, publisher URL
or depth never recompute it. For example,
`/radar/articles/postgres-queue-patterns` survives promotion from brief to deep
dive. Slugs address Radar pages; the source URL still identifies the external
article for ingest and deduplication.

Only published articles at brief depth or above have public pages or appear in
public search, filters or sitemaps. Candidates, including cuts without published
writing, remain private. Completing a write stage alone does not publish a page.
The first-publication path for an on-demand deep dive is specified by #93 and
must preserve the same slug and additive-writing rules.

## Sections and article kind

Keep **Lead / Briefs / Newsletters / Research / Vendor** as distinct sections;
omit empty sections. Preserve placement as published, using the assignment rules
in [pipeline-contracts.md](./pipeline-contracts.md#sections). Kind does not move
vendor material out of Vendor or remove the unreviewed warning from preprints.

Each brief and article page also shows one primary **Article kind**:

| Label    | Meaning                                                                                                 |
| -------- | ------------------------------------------------------------------------------------------------------- |
| News     | Reports an event, release or other development                                                          |
| Opinion  | Primarily argues a position or makes a recommendation                                                   |
| Analysis | Explains or examines a subject, including technical explanations, research interpretation and tutorials |

The agent assigns kind from the article's substance, not the publisher. Mixed
pieces take the kind that best describes their primary purpose. The write stage
has full text and assigns it alongside the brief; this also covers newsletters
that bypass triage. Kind describes the source article, not Radar's own
"why this matters" commentary. It is independent of topic category and issue
section. Preserve the label shown in a published issue along with its text and
placement.

## Coverage and quiet days

Each issue has a compact coverage line linking to its run-specific coverage page.
The full table lives there, while `/radar/sources` shows current source health and
last successful checks. Public coverage shows source names, counts and sanitised
status descriptions. Private feed URLs, inbox addresses, credentials, raw error
messages and other sensitive diagnostics never appear in public output. Agent
validation anomalies remain run diagnostics, not source-coverage failures; #97
owns their operational handling.

A successful run selecting nothing publishes a dated **"Nothing selected today"**
issue with its coverage line. One to three worthwhile articles make a short
issue; there is no padding or minimum lead count. A failed run publishes no
issue: `/radar` retains the latest publication and clearly shows its date.
Before the first publication, show an explicit no-issues-yet state rather than
invent an issue or canonical date.

Zero written briefs caused by failed agent calls or rejected output must not be
presented as an editorial decision that nothing was worth selecting. #97 defines
run success, partial-result publication and failure handling consistently with
the per-row recovery contract from #85. Source failures must remain visible in
coverage even when the run can publish with partial coverage.

## Archive and article browsing

The archive lists publications by date, newest first, including successful empty
issues. Source, category and kind browsing lives in the article library alongside
text search. A source filter matches sightings: one article sighted by two
sources can match either source without becoming two articles. Category describes
the article's topic; kind distinguishes News / Opinion / Analysis. There is no
separate tag taxonomy. The category vocabulary remains open on the map.

## Canonicals and sitemap ownership

The following coordination details implement the agreed route map and address
the indexing comment on #90:

- Radar's canonical and Open Graph URLs use the shared public origin. Do not
  derive them from the child project's `VERCEL_PROJECT_PRODUCTION_URL`.
- Ithilien owns `/robots.txt` and `/sitemap.xml`. Its robots file advertises
  both the root sitemap and `https://www.ithilien.dev/radar/sitemap.xml`.
- Radar owns its sitemap, listing dated issues, published article pages, and
  its archive, article index and source-health page. Omit the duplicate latest
  issue URL, private candidates, run diagnostics and search/filter variants.
- Each app generates its own entries. The parent advertises the stable Radar
  sitemap URL; it does not copy a list of Radar articles. Publication and deep
  dive updates must refresh relevant Radar sitemap content as part of #91/#97.

A sitemap under `/radar/` scopes its entries to that path; robots files can
advertise multiple sitemap URLs. These choices follow the
[Sitemaps protocol](https://www.sitemaps.org/protocol.html). The existing Radar
layout already sets `metadataBase` to the shared origin; this contract preserves
that behavior.

When building these routes, keep the `/radar` prefix in Radar's route tree and
update the parent's microfrontends routing configuration and routing tests as
required by `AGENTS.md`. This design ticket makes no production routing changes.
