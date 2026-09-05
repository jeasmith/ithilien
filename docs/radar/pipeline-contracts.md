# Radar pipeline: the deterministic/agentic boundary and the agent's contracts

The answer record for [#85](https://github.com/jeasmith/ithilien/issues/85) on the
[Radar wayfinder map](https://github.com/jeasmith/ithilien/issues/82).

Vocabulary is `CONTEXT.md`. The pipeline being replaced is described in
[current-pipeline.md](./current-pipeline.md). This is a design record, not a
specification — the ADRs are assembled in
[#96](https://github.com/jeasmith/ithilien/issues/96).

## The stage table

| Stage                                              | Code or agent | Note                                                    |
| -------------------------------------------------- | ------------- | ------------------------------------------------------- |
| Fetch and parse each source                        | code          |                                                         |
| Apply the date window                              | code          |                                                         |
| Resolve to Articles, record Sightings              | code          | five sightings of one article become **one** decision   |
| Enrich                                             | code          | canonical title, description and date, from the article |
| Suppress articles already judged                   | code          | only genuinely new articles are ever shown to the agent |
| Route `Newsletters` past triage                    | code          | the editorial bar's one rule that needs no judgement    |
| Assign Section from the publisher                  | code          | see [Sections](#sections)                               |
| **Triage** — verdict, reason, category             | **agent 1**   | title and description only, ~200 rows                   |
| **Write** — summary, why-this-matters, kind, Leads | **agent 2**   | full text, ~13 rows                                     |
| Render the issue and the article pages             | code          |                                                         |
| Coverage and the run record                        | code          |                                                         |

There is deliberately **no deterministic relevance score**. See
[What was cut](#what-was-cut).

## Why two stages

One call that both selects and writes must hold the full text of everything it
might write about. At ~200 candidates and ~2.5k tokens of article text each, that
is 400k+ tokens of input to produce thirteen short pieces of prose.

Splitting the call means the expensive full-text stage scales with **what gets
published** (~13) rather than **what gets fetched** (~200). Triage judges on the
same evidence a human uses when skimming a feed reader: a title, a description,
and who else linked it.

## Contract 1 — triage

**Purpose:** pass a Verdict on every candidate shown.

**Receives:** `docs/radar/triage.md`, plus one row per candidate:

```jsonc
{
  "id": "…",
  "title": "…", // canonical, from enrichment
  "description": "…", // canonical, from enrichment
  "publisher": "martinfowler.com",
  "publishedAt": "2026-08-31",
  "sightings": [
    { "source": "Simon Willison", "words": "…" }, // first two carry their text
    { "source": "This Week In React", "words": "…" },
    { "source": "Bytes" }, // the rest are named only
  ],
  "sightingCount": 3,
}
```

A source's own framing is signal, and several independent sources sighting one
article is itself signal (`CONTEXT.md` § Sighting). Capping the text at two
sightings stops a widely-linked article costing five descriptions.

**Returns:** one row per candidate.

```jsonc
{
  "articleId": "…",
  "verdict": "kept" | "cut",
  "reason": "…", // recorded either way
  "category": "…", // assigned for cuts as well as keeps
}
```

Category is assigned here, on both verdicts, so that every judged article in the
Library is categorised — cuts stay browsable and promotable to a deep dive. This
is why `CONTEXT.md` § Category says "considered" rather than "read".

## Contract 2 — write

**Purpose:** produce the Briefs, assign Article kind, and choose which of them lead.

**Receives:** `docs/radar/write.md`, plus the full text of each write-eligible article:
either kept by triage or routed past triage by the `Newsletters` exemption.
Code includes exempt newsletters directly in this input set without recording an
editorial Verdict. Here, "keeps" includes both groups; the exemption is eligibility
for writing, not a judgement invented by code.
This call is the only stage that sees every keep at once, so Lead selection
belongs here — "is this good **relative to today's other keeps**" is not a
question triage can answer.

**Returns:** one row per write-eligible article, including exempt newsletters.

```jsonc
{
  "articleId": "…",
  "summary": "…",
  "whyThisMatters": "…",
  "kind": "news" | "opinion" | "analysis",
  "isLead": false,
}
```

Article kind was added by [#90](https://github.com/jeasmith/ithilien/issues/90).
The write stage assigns one primary kind from the full article's substance,
including for newsletters that bypass triage. It is independent of category and
section; the public labels are News / Opinion / Analysis. Unknown or missing
kinds follow the existing per-row validation policy.

## Sections

Sections are about **who published a thing**, not what it is about — which makes
four of the five deterministic:

| Section       | Rule                                        |
| ------------- | ------------------------------------------- |
| `Research`    | publisher is `arxiv.org`                    |
| `Vendor`      | publisher is on the vendor domain list      |
| `Newsletters` | the article arrived through the mail bridge |
| `Briefs`      | everything else                             |
| `Lead`        | the agent promotes 2–3 Briefs at write time |

Deriving from the publisher rather than from the sighting resolves the
multi-sighting case for free: an arXiv paper linked by a newsletter is still
`Research`, because the publisher did not change.

[#90](https://github.com/jeasmith/ithilien/issues/90) retains all five sections,
omitting empty ones. Placement remains fixed per issue. Article kind does not
change section eligibility: for example, a Vendor article stays in Vendor whether
its kind is News or Opinion. See [the route and content contract](./routes-and-content.md).

## The editorial bar

The bar in [current-pipeline.md](./current-pipeline.md#the-editorial-bar)
fractures three ways under this split, and each rule goes to exactly one place:

| Rule                                    | Goes to     |
| --------------------------------------- | ----------- |
| `Newsletters` exempt from cutting       | code        |
| Vendor content gets its own section     | code        |
| Cut aggressively — the kill-list        | `triage.md` |
| arXiv trimmed to the 3–6 most relevant  | `triage.md` |
| Prefer pieces that _test_ a belief      | `triage.md` |
| Lead with 2–3 items, given fuller space | `write.md`  |
| Every item gets a "why this matters"    | `write.md`  |
| Flag preprints as unreviewed            | `write.md`  |
| Quiet days are fine; do not pad         | both        |

`docs/radar/bar.md` stays the human-facing statement of the whole standard.
`triage.md` and `write.md` are what actually get sent, each carrying only rules
its stage can act on. Rules that code enforces are documented in `bar.md` and
sent to nobody — telling triage that Newsletters are exempt when newsletters
never reach it is dead text, and dead instructions are how prompts rot.

Keeping these in the repo means a change in the digest's character is a
reviewable commit you can point at afterwards.

## Failure

**Validation is per row.** An invalid row — malformed, unknown article id, bad
enum value — is dropped. Valid rows are written. The run never fails as a whole.

This is safe because a partial result is a coherent state under this model:

- A candidate with no verdict is judged on the next run.
- A kept article with no Brief is `verdict: kept, depth: candidate`, and is
  written up in a later issue.

**Every drop is recorded against the run** — article id, stage, and the
validation error. Not to Coverage, which is per-source and about feeds; a
malformed agent row is not a source's fault. It belongs to a run record with an
anomalies list. Where that is surfaced is
[#97](https://github.com/jeasmith/ithilien/issues/97).

## Idempotency

All the state is per-article, so the pipeline is **resumable by construction**:
fetch dedupes by URL, triage skips articles that already carry a verdict, and
write skips articles that already have a Brief.

**Publishing the Issue is the only one-shot act.** An Issue is a publication, not
a view (`CONTEXT.md` § Issue) — once out, its text is fixed. A re-run before
publication finishes what is missing. A re-run for a date that has already
published does nothing. Briefs written after publication appear in the next
Issue, never retroactively in that one.

## Deep dives

A deep dive shares the **harness** — same invocation, same per-row validation,
same drop-and-record policy — and has its **own schema and its own
`docs/radar/deep-dive.md`**.

Not a depth parameter on the write contract. Writing is additive
(`CONTEXT.md` § Depth): a deep dive sits beside the Brief that preceded it and
never replaces it, so it cannot share the field the Brief lives in. It also has
different fields, a different trigger, and a different budget. The request flow
is [#93](https://github.com/jeasmith/ithilien/issues/93).

## What was cut

**The deterministic relevance score.** The ticket framed pre-ranking as the
token lever. It is not, because it was never allowed to do the thing that would
have made it one:

- **Code does not record verdicts.** A Verdict is an editorial judgement
  (`CONTEXT.md` § Verdict) and a regex is not judgement. A false positive from a
  kill-list would be silent, permanent, and invisible in the published digest.
- **Code does not cap the triage set.** A cap with no eviction rule creates
  purgatory: unshown candidates age, score lower on recency, and lose again
  every day. That is the same invisible loss in a different hat.

With neither cutting nor capping left, a score only sets read order — which
barely moves a classification pass and cannot be measured. Building it would
create a knob you believe is working when it isn't. So candidates are presented
grouped by source, newest first, and every eligible candidate is shown every run.

The deterministic savings are real, but they are elsewhere: URL-dedupe collapsing
multi-source sightings into one decision, suppression meaning only new articles
are ever shown, Newsletters bypassing triage, and code doing all rendering and
bookkeeping.

## What this costs

Estimates, not measurements. The baseline is read off the reference artefacts
from the current pipeline; both figures assume ~200 candidates and ~13 briefs.

|        | Today, one session          | Two-stage pipeline                   |
| ------ | --------------------------- | ------------------------------------ |
| Input  | ~50–60k                     | ~73k (39k triage + 34k write)        |
| Output | ~15–18k                     | ~10k (7.5k triage + 2.4k write)      |
| Shape  | one long tool-using session | two schema-bound calls, no tool loop |

**Token cost does not fall, and the ticket's premise that it would was wrong.**
Input rises, because promoting roundup links to full candidates tripled the pool
from ~66 to ~200. Output falls by roughly 40%, because the agent no longer
hand-builds a 476-line HTML document or rewrites the dedup ledger.

The honest headline is **the same order of tokens for three times the coverage,
with the tool loop and the run-to-run variance removed**. The variance matters as
much as the mean: the old session's cost depended on how many pages it decided to
fetch, and the new one does not.
