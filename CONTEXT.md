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
