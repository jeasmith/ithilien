# Context

The ubiquitous language of this project. A glossary, not a specification — no
implementation details, no decisions, no schema. Where a term's meaning was
decided rather than merely described, the decision lives in an ADR or on the
wayfinder map, not here.

Being built out as terms are resolved. See
[the Radar map](https://github.com/jeasmith/ithilien/issues/82).

## Radar

### Library

The complete record of everything Radar has ever fetched. Nothing leaves it. An
item's absence from a digest says nothing about its presence in the library.

### Depth

How much original writing exists about an article. Three levels, climbed in
order and never descended:

- **Candidate** — nothing written yet. What arrived from a source: a title, a
  link, a date, and the source's own description.
- **Brief** — a short original treatment: a written summary and a "why this
  matters" line. What a digest entry consists of today.
- **Deep** — a full analysis, produced on request rather than on a schedule.

An article is publicly visible from **brief** upward. Candidates are private.

### Verdict

The editorial judgement passed on a candidate: **kept** or **cut**, with the
reason recorded either way.

A **cut** is a decision, not a deletion. Cut articles remain in the library,
remain findable, and can be promoted to a deep dive later. They are simply never
shown to the agent again, so cutting costs nothing on subsequent runs.

> **Not a ledger.** The pipeline this replaces held a single `seen` bit per item
> that conflated four separate things — that a row exists, that the agent has
> considered it, that the verdict was no, and that it should never be shown
> again. Those are four distinct facts here, and only the last is a suppression.

### Why this matters

The line written against Jamie's interests explaining what an article changes
about a decision, a design, or a client conversation — as distinct from the
summary, which says what the article contains. Both are original writing; neither
is the source's own text.

### Source

Somewhere articles are surfaced from. A source has a name, a category and a
fetch mechanism — a feed, a scraped page, or an API query. The mechanism is an
implementation of a source, not a different kind of thing.

Three sources are email-only and reach Radar through a forwarding bridge. The
bridge is not itself a source; it is how those sources are read.

### Article

The thing on the web. Identified by where it lives, not by who mentioned it, so
the same piece surfaced by two sources is one article.

### Sighting

One source surfacing one article, on one day, with that source's own words for
it. Many sightings, one article.

A sighting is not always a feed entry. A roundup — This Week In React, Bytes,
Dear Architects — is an article whose substance is its links, and each of those
links is a sighting of a further article. Several independent sources sighting
the same article is itself a signal about that article.

## Terms deliberately not yet defined

Issue, Section, Category, Tag, Coverage, and the persona the "why this matters"
line is written against. All are live questions on
[#84](https://github.com/jeasmith/ithilien/issues/84).
