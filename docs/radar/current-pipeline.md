# The current digest pipeline

A description of how Jamie's Architecture Digest works **today**, written as
reference material for the Radar rebuild charted on
[the wayfinder map](https://github.com/jeasmith/ithilien/issues/82).

This is a **summary, not a copy**. The original artefacts — the runbook, the
source list, the Python fetcher, the seen ledger — live in a Claude project
outside this repo and are not vendored here, for two reasons: they contain a
bearer credential that cannot go in a public repo (see
[Redactions](#redactions)), and the pipeline is being reimplemented rather than
ported. Nothing below should be read as a specification of what to build.

## What runs today

A Claude cloud scheduled task, *"Architecture Digest — weekday morning"*, fires
at 07:00 on weekdays into a **fresh session with no memory of previous runs**.
Everything it needs is attached to the project. Each run:

1. Reads the runbook, the fetcher, the seen ledger and the source list.
2. Writes the fetcher to disk, installs `feedparser`, and runs it over a
   1.2-day window — 3.2 days on Mondays, to cover the weekend.
3. Reads the resulting candidate list and curates it against an editorial bar.
4. Hand-writes a single self-contained HTML file in a fixed house style.
5. Delivers that file, and updates the published Artifact page in place.
6. Writes the updated seen ledger back to the project.

A representative run: **66 candidates in, 13 kept**, across five sections.

### What the rebuild is not porting

- **The Python fetcher.** It is being replaced, not translated.
- **HTML generation.** The single largest per-run token cost, and entirely
  redundant once Radar renders from stored data.
- **The seen ledger as a capped file.** It holds only the most recent 4,000 IDs
  and discards everything else — precisely the "library I am throwing away"
  problem the rebuild exists to fix.
- **Artifact delivery.** Superseded by publishing to `/radar`.

## Sources

Twenty feeds plus one scraped page. Category is assigned **statically per
source** in the fetcher, not inferred per item.

| Source | Category | Mechanism |
| --- | --- | --- |
| Simon Willison | AI & Agents | Atom |
| The Pragmatic Engineer | Engineering Practice | RSS |
| Martin Fowler | Architecture & Design | Atom |
| Dan Luu | Engineering Practice | Atom |
| arXiv cs.SE | Research | `export.arxiv.org` API |
| Tim Deschryver | Frontend & Platform | RSS |
| Total TypeScript | Frontend & Platform | RSS |
| AI Hero | AI & Agents | RSS |
| OpenAI News | Industry | RSS |
| Sean Goedecke | Engineering Practice | RSS |
| Drew Breunig | AI & Agents | Atom |
| Elad Gil | Industry | RSS |
| Frontend at Scale | Frontend & Platform | RSS |
| This Week In React | Frontend & Platform | RSS |
| CodeRabbit | Vendor | RSS |
| Farnam Street | Thinking & Craft | RSS |
| Boris Tane | Engineering Practice | RSS |
| AI Village | AI & Agents | RSS |
| Anthropic News | Industry | **HTML scrape** |
| Kill The Newsletter bridge | Newsletters | Atom (**redacted**) |

The full feed URLs are in the Claude project. They are public and can be brought
across verbatim — with the single exception noted under
[Redactions](#redactions).

**Categories in use — nine, not eight**: AI & Agents, Engineering Practice,
Architecture & Design, Research, Frontend & Platform, Industry, Vendor,
Thinking & Craft, Newsletters. (Earlier tickets on the map said eight; that was
a miscount.)

### Per-source facts the rebuild must not lose

- **Anthropic News has no RSS.** It is scraped from the server-rendered
  `PublicationList` markup on `anthropic.com/news`. No JS required, but it is
  markup-shaped and will break silently when the page changes.
- **arXiv's RSS feed returns zero entries at weekends** because it is
  announcement-day based. The `export.arxiv.org` API is date-stamped and
  reliable, but rate-limits with HTTP 429 under load. On 429, skip arXiv for
  that issue and note it — never block the digest.
- **Three sources are email-only** and reach the pipeline through a
  Kill The Newsletter bridge: Dear Architects, Bytes/ui.dev, and Lars Faye
  (whose sender address was still unconfirmed as of 22 Aug 2026). Server-side
  iCloud rules do the forwarding.
- **The Pragmatic Engineer's Deep Dives are a paid tier**; the public feed may
  carry excerpts rather than full text.
- **openai.com returns 403 to automated link checks.** The links are valid in a
  browser — this is not a broken link.
- **AI Village's feed is heavily event promotion** (DEF CON panels, CTF calls)
  rather than writing, and takes a heavier cut than the others.

Bringing these across as **data** rather than a Markdown file is a decision for
the domain model — see [#84](https://github.com/jeasmith/ithilien/issues/84).
Each source carries a name, a feed URL, a category, a fetch mechanism, and a set
of known quirks; the quirks are the part most easily lost in translation.

## The editorial bar

This is the part that makes the digest good, and the part most at risk in a
rebuild. Reproduced closely because the wording carries the intent.

- **Curated, filtered and ranked — not comprehensive.**
- **Lead with 2–3 items** that carry real signal, given fuller treatment. Prefer
  pieces that *test* a widely-held belief with evidence over pieces that assert
  one.
- **Every item gets a "why this matters" line**, written for a technical
  architect at a consultancy working on AI-heavy and cloud-native systems. Say
  what it changes about a decision, a design, or a client conversation — not a
  restatement of the summary.
- **arXiv cs.SE runs 30–60 papers a week.** Take the 3–6 with clearest
  architectural relevance. Flag them as unreviewed preprints and note
  sample-size weaknesses honestly.
- **Vendor content gets its own section and a `vendor` tag.** Keep marketing
  surfaces visually separate from independent voices.
- **Cut aggressively.** Customer case studies, executive appointments, pricing
  and seat announcements, policy letters, and minor point releases do not make
  it. Package releases appear only if the *how* is interesting.
- **The `Newsletters` category is exempt from cutting** — every item that comes
  through the bridge goes in. These are sources Jamie deliberately subscribed to
  individually, so each issue is already his editorial choice.
- **Quiet days are fine.** A three-item digest on a slow Tuesday is a better
  product than padding.
- **The coverage table stays**, so a silently broken feed is visible rather than
  invisible.

## Data shapes

### Candidate item

Emitted per item by the fetcher: `source`, `category`, `title` (truncated to 300
chars), `link`, `id` (feed GUID, falling back to the link), `published` (ISO
8601), `author`, `summary` (HTML-stripped and whitespace-collapsed, truncated to
1,200 chars).

Note `summary` here is the **feed's own** text, not written by the agent. The
agent's rewritten summary and its "why this matters" line are separate, and
currently exist only inside the rendered HTML — they are never stored.

### Run envelope

`generated`, `window_days`, `count`, a `report` array, and the items.

### Coverage report

Per source: `source`, `error`, `total_entries`, `in_window`, `new`. Rendered as
the table at the foot of every issue, with an OK/quiet/error status per row.

### Deduplication

An ID is added to the seen ledger once it has been *fetched in window* — not
once it has been published. Items cut by the editorial bar are therefore
suppressed forever on the strength of a single glance. The ledger is capped at
the most recent 4,000 IDs.

## Published shape

Sections, in order: **Lead** (2–3 items, fuller treatment, rule dividers),
**Briefs**, **Newsletters**, **Research** (preprint-tagged), **Vendor**
(visually set apart), **Coverage** (the table).

Each rendered item carries: category, source, date, linked title, a written
summary, and a "why this matters" paragraph. The masthead shows the date, the
kept/candidate counts and the window length; a sticky pill nav gives per-section
counts.

### House style

Blueprint-inspired. Dark by default (`--bg` deep blueprint navy `#0b1220`) with
a `prefers-color-scheme: light` variant (cool blue-grey `#f2f4f7`, not cream) and
a `data-theme` override. One copper/amber accent for section headers and the
masthead; one blueprint blue for links and the "why this matters" label; one
green for preprint tags. Three type roles: Fraunces for the masthead only,
system sans for prose, IBM Plex Mono for metadata and the coverage table. A
restrained grid-line texture behind the masthead. No browser storage.

Set 27 Aug 2026. Whether it survives into a multi-page site is
[#95](https://github.com/jeasmith/ithilien/issues/95).

## Redactions

Not reproduced here:

- **The Kill The Newsletter feed URL and inbox address.** These are bearer
  capabilities, not identifiers — anyone holding either can read every
  newsletter forwarded into that inbox. They appear in the original
  `sources.md`, the runbook, and the fetcher's feed table. Any implementation
  must take them from configuration, never from source control.
- **`mail-forwarding-debug.md`** in full. It is a record of Jamie's personal
  iCloud mail rules, contains the inbox address throughout and his personal
  email, and the newsletter bridge is out of scope for the rebuild in any case.
- **The Artifact gallery URL and artifact id**, being a live link to the
  published digest surface.

Newsletter sender addresses are not redacted — they are public.

The unredacted originals remain in the Claude project as
`claude/digest-runbook.md`, `claude/sources.md`, `claude/fetch_feeds.py`,
`claude/seen-items.json` and `claude/mail-forwarding-debug.md`.
