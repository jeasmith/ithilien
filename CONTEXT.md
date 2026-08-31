# Context

The ubiquitous language of this project. A glossary, not a specification — no
implementation details, no decisions, no schema. Where a term's meaning was
decided rather than merely described, the decision lives in an ADR or on the
[wayfinder map](https://github.com/jeasmith/ithilien/issues/82), not here.

## Radar

Radar publishes an architectural digest at `/radar`.

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

One source surfacing one article, on one day, in that source's own words. Many
sightings, one article. Several independent sources sighting the same article is
itself a signal about that article.

### Roundup

An article whose substance is its links — This Week In React, Bytes, Dear
Architects. Each link it carries is a sighting of a further article, so the
articles a roundup points at enter the library on the same footing as anything
arriving directly from a feed.

### Enrichment

Establishing an article's own title, description and publication date by
retrieving it, rather than accepting what a source said about it. Necessary
because a sighting from a feed carries a description while a sighting from a
roundup carries only link text — enrichment is what makes the two comparable.

Enrichment is mechanical. It describes an article; it does not judge one.

### Library

The complete record of every article Radar has ever seen. Nothing leaves it. An
article's absence from a digest says nothing about its presence in the library.

### Depth

How much original writing exists about an article. Three levels, climbed in
order and never descended:

- **Candidate** — nothing written yet. A known article, enriched but unjudged.
- **Brief** — a short original treatment: a summary and a "why this matters"
  line.
- **Deep dive** — a full analysis, produced on request rather than on a
  schedule.

An article is publicly visible from **brief** upward. Candidates are private.

Writing is **additive**. A deep dive never replaces the brief that preceded it.

### Verdict

The editorial judgement passed on a candidate: **kept** or **cut**, with the
reason recorded either way.

A **cut** is a decision, not a deletion. Cut articles stay in the library, stay
findable, and can be promoted to a deep dive later. They are simply never shown
to the agent again, so cutting costs nothing on subsequent runs.

> **Not a ledger.** The pipeline this replaces held a single `seen` bit per item
> that conflated four separate facts — that a row exists, that the agent has
> considered it, that the verdict was no, and that it should never be shown
> again. Those are four distinct things here, and only the last is a
> suppression.

### Summary and "why this matters"

The two pieces of original writing that constitute a brief. The **summary** says
what the article contains. **"Why this matters"** says what it changes about a
decision, a design, or a client conversation. Neither is the source's own text,
and neither is enrichment.

### Category

What an article is about. One per article, assigned when the article is judged —
by which point the article has been read, so it is better placed than the
source-level default. A source also carries a category, but that is a fallback
for articles not yet judged, and the grouping for coverage.

### Issue

One day's digest. **A publication, not a view**: once out, its text is fixed. An
issue may note that a deeper analysis has since appeared and link to it, but it
never restates itself in light of later work. What Radar thought in September
stays readable in December.

### Section

Where a brief sat within one issue — Lead, Briefs, Newsletters, Research,
Vendor. Placement, not a property of the article. Quarantining vendor content
and flagging preprints as unreviewed are editorial policies, and policies change;
recording placement per issue means a past issue keeps the structure it was
actually published with.

### Coverage

What happened when a run reached out to each source: how much was found, how
much fell in the window, how much was new, and what went wrong. Per run, grouped
by source. Coverage exists so that a silently broken source is visible rather
than invisible.

## Not part of the language

- **Adopt / Trial / Assess / Hold.** Present in Radar's placeholder page today,
  implying a Thoughtworks-radar framing the digest does not use. Its fate is
  [#95](https://github.com/jeasmith/ithilien/issues/95).
- **Tags**, as a scheme separate from category. Considered and not adopted: two
  overlapping classification schemes cost more ambiguity than they remove.

## Terms deliberately not yet defined

- The **persona** that "why this matters" is written against —
  [#92](https://github.com/jeasmith/ithilien/issues/92).
- Whether an article can be deep-dived more than once, and what a second
  analysis is called — [#93](https://github.com/jeasmith/ithilien/issues/93).
