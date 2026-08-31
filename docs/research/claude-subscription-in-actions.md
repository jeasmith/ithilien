# Claude on the subscription from a scheduled GitHub Action

Research for [#86](https://github.com/jeasmith/ithilien/issues/86), part of the
Radar wayfinder map [#82](https://github.com/jeasmith/ithilien/issues/82).

Investigated 2026-08-31. Every claim below carries the primary source that owns
it. Where a source could not be found, the point is labelled **UNVERIFIED** and
no inference is offered in its place.

Two version facts pin the code citations. The repo pins
`anthropics/claude-code-action` at `a874e9ecd7bb36efdad65429c6b35815f5a08f10`,
labelled `v1.0.210`. That SHA is simultaneously the tip of the `v1` floating tag
and the highest version tag in the repository, so **the pinned version is the
current version** and no "old vs new" split applies
(`git ls-remote --tags https://github.com/anthropics/claude-code-action`, run
2026-08-31, returns `a874e9e...` for both `refs/tags/v1^{}` and
`refs/tags/v1.0.210^{}`; the highest tag by version sort is `v1.0.210`).

---

## Verdict

**Viable. Yes.**

A scheduled, unattended GitHub Actions workflow can run Claude on Jamie's
subscription via `claude_code_oauth_token`. This is not a loophole or an
unpoliced grey area: Anthropic documents the exact combination — a `schedule:`
trigger, automation mode, and a subscription OAuth token — on its own GitHub
Actions page, and a support article names "The Claude Code GitHub Actions
integration" as a first-class subscription-billed surface. See
[Point 2](#2-is-unattended-scheduled-use-on-a-subscription-token-within-the-terms)
for the full argument, including the one clause that makes this a question worth
asking and the specific thing that answers it.

**Recommended invocation shape:** `anthropics/claude-code-action` in _automation
mode_ (a `prompt` input is supplied), triggered by `schedule:` for the daily run
and `workflow_dispatch:` for the deep dive, with:

- `claude_code_oauth_token: ${{ secrets.CLAUDE_CODE_OAUTH_TOKEN }}`
- `--json-schema` in `claude_args`, and the run's product read back from the
  action's `structured_output` output rather than parsed out of prose
- `--allowedTools` / `--tools` in `claude_args` as the tool restriction
- `--max-turns` and `--max-budget-usd` in `claude_args` as the runaway guard
- a `concurrency:` group shared by both workflows

Do **not** reach for `claude -p` directly: the CI-recommended `--bare` flag
cannot read a subscription token at all
([Point 5](#5-invocation-shape-action-vs-agent-sdk-vs-claude--p)).

The headline numbers: the token lasts **one year** and must be rotated by hand
([Point 4](#4-token-lifetime-and-rotation)); the allowance is **shared with
interactive use** and a scheduled run that hits the wall **fails the job with no
warning and no auto-resume** ([Point 3](#3-how-the-allowance-behaves-under-a-scheduled-job));
a warm end-to-end round trip is **~3 minutes** with ~10 s of that being
GitHub-side overhead ([Point 6](#6-end-to-end-latency)).

The one number that changes the shape of the plan is in
[Point 3](#3-how-the-allowance-behaves-under-a-scheduled-job) — see
[What this changes about the wider plan](#what-this-changes-about-the-wider-plan).

---

## 1. Is `claude_code_oauth_token` supported on `schedule:` and `repository_dispatch`? Does the action gate on event type?

**Yes, both are supported. The action gates on event type, but `schedule` and
`repository_dispatch` are both on the supported list, and the token input is not
part of any gate.**

### The token input is event-agnostic

`claude_code_oauth_token` is a plain composite-action input, declared at
[`action.yml:70`](https://github.com/anthropics/claude-code-action/blob/v1.0.210/action.yml#L70)
and forwarded straight to the `CLAUDE_CODE_OAUTH_TOKEN` environment variable of
the run step at
[`action.yml:336`](https://github.com/anthropics/claude-code-action/blob/v1.0.210/action.yml#L336):

```yaml
CLAUDE_CODE_OAUTH_TOKEN: ${{ inputs.claude_code_oauth_token || env.CLAUDE_CODE_OAUTH_TOKEN }}
```

There is no reference to the event name anywhere near it. Grepping the whole
repository for `claude_code_oauth_token` returns only the input declaration, the
env forward, the same pair in `base-action/`, docs, and one test — no branching
on `github.event_name`.

### The event allow-list

Event gating happens in
[`src/github/context.ts`](https://github.com/anthropics/claude-code-action/blob/v1.0.210/src/github/context.ts).
Two constants define the world:

```ts
const ENTITY_EVENT_NAMES = [
  "issues",
  "issue_comment",
  "pull_request",
  "pull_request_review",
  "pull_request_review_comment",
] as const;

const AUTOMATION_EVENT_NAMES = [
  "workflow_dispatch",
  "repository_dispatch",
  "schedule",
  "workflow_run",
] as const;
```

`parseGitHubContext()` has an explicit `case` for each of `workflow_dispatch`,
`repository_dispatch`, `schedule`, and `workflow_run`, and a `default` that
throws `` `Unsupported event type: ${context.eventName}` ``. So the gate is a
positive allow-list, and both events named in the ticket are on it. `push` and
`release`, for the record, are _not_.

### Which mode a scheduled run lands in

[`src/modes/detector.ts`](https://github.com/anthropics/claude-code-action/blob/v1.0.210/src/modes/detector.ts)
walks a chain of `isEntityContext(...)` checks. A `schedule` or
`repository_dispatch` context is not an entity context, so every branch is
skipped and control reaches the final line:

```ts
// Default to agent mode (which won't trigger without a prompt)
return "agent";
```

Agent mode's own docstring says it "runs whenever an explicit prompt is provided
in the workflow configuration… providing direct access to Claude Code for
automation workflows"
([`src/modes/agent/index.ts`](https://github.com/anthropics/claude-code-action/blob/v1.0.210/src/modes/agent/index.ts)).
`prepare.ts` then sets `contains_trigger` from `!!context.inputs?.prompt`. **A
scheduled run does nothing unless you supply a `prompt`.** That is the switch.

### The two actor checks, and which one bites

[`src/entrypoints/prepare.ts`](https://github.com/anthropics/claude-code-action/blob/v1.0.210/src/entrypoints/prepare.ts)
runs the write-permission check only for entity contexts and `workflow_run`:

```ts
if (isEntityContext(context) || isWorkflowRunEvent(context)) { ... checkWritePermissions ... }
```

The action's own security documentation states this directly:

> `workflow_dispatch`, `repository_dispatch`, and `schedule` events are not
> checked separately — GitHub itself requires write access to dispatch a
> workflow, and scheduled runs have no external actor.
>
> — [`docs/security.md`](https://github.com/anthropics/claude-code-action/blob/v1.0.210/docs/security.md)

The **human-actor** check does still run, on every event, because
`prepareAgentMode` calls `checkHumanActor` unconditionally. Anthropic's docs
spell out the consequence:

> **Human actor**: on every event, the Claude Code GitHub Action rejects a bot
> actor unless you list it in `allowed_bots`… This check also applies to
> scheduled runs, which GitHub attributes to a repository user, usually the one
> who last changed the workflow's `cron` schedule. If that user is a bot, list
> it in `allowed_bots`.
>
> — [Claude Code GitHub Actions § Who can trigger runs](https://code.claude.com/docs/en/github-actions#who-can-trigger-runs)

GitHub partially corroborates that actor attribution, though its statement is
narrower than Anthropic's:

> **For a deactivated scheduled workflow**, if a user with write permissions to
> the repository makes a commit that changes the `cron` schedule on the workflow,
> the workflow will be reactivated, and that user will become the `actor`
> associated with any workflow runs.
>
> — [GitHub: Events that trigger workflows § schedule](https://docs.github.com/en/actions/reference/workflows-and-actions/events-that-trigger-workflows#schedule)
> (emphasis added)

GitHub documents that rule only for the reactivation case; the general rule for
an always-active scheduled workflow is **UNVERIFIED** from GitHub's own docs.
Anthropic states the broader version ("usually the one who last changed the
workflow's `cron` schedule"), and that is the behaviour to plan against.

**Practical consequence for Radar.** A `schedule:` run is fine — Jamie owns the
cron line, so the actor is a `User`. A `repository_dispatch` deep-dive request
is the risky one: the actor is whoever's credential called the REST endpoint. If
that is a personal access token, the actor is Jamie and the check passes. If it
is `GITHUB_TOKEN` or a GitHub App, the actor is `github-actions[bot]` or the app
slug and **the run fails** unless the bot is named in `allowed_bots`. This is a
real design constraint on the deep-dive button, not a footnote.

### Anthropic documents the scheduled case explicitly

Anthropic's GitHub Actions page has a section titled **"Run on a schedule"**:

> With a `prompt` input, the Claude Code GitHub Action runs in automation mode on
> any GitHub event, including a cron schedule.
>
> — [Claude Code GitHub Actions § Run on a schedule](https://code.claude.com/docs/en/github-actions#run-on-a-schedule)

The action repository ships a complete worked example under
[Scheduled Repository Maintenance](https://github.com/anthropics/claude-code-action/blob/v1.0.210/docs/solutions.md#scheduled-repository-maintenance),
and lists `repository_dispatch` under
[Supported GitHub Events](https://github.com/anthropics/claude-code-action/blob/v1.0.210/docs/custom-automations.md#supported-github-events).

One inconsistency worth knowing: that same `custom-automations.md` list marks
`workflow_dispatch` as "coming soon". The code contradicts its own docs —
`workflow_dispatch` is in `AUTOMATION_EVENT_NAMES` and has a `case` in
`parseGitHubContext`. **Trust the code and the docs site; `custom-automations.md`
is stale.**

---

## 2. Is unattended, scheduled use on a subscription token within the terms?

**Plainly: yes. This specific use is explicitly permitted by Anthropic, in
writing, on Anthropic's own properties. It does not require API billing.**

That answer is not obvious from the terms alone, so here is the whole chain
rather than the conclusion.

### The clause that makes this a question

Anthropic's Consumer Terms of Service, § 3 "Use of our Services", prohibit:

> Except when you are accessing our Services via an Anthropic API Key **or where
> we otherwise explicitly permit it**, to access the Services through automated
> or non-human means, whether through a bot, script, or otherwise.
>
> — [Anthropic Consumer Terms of Service](https://www.anthropic.com/legal/consumer-terms),
> effective October 8, 2025 (emphasis added)

Read without the carve-out, that clause forbids exactly what this plan proposes.
The carve-out — "where we otherwise explicitly permit it" — is what the rest of
this section is about.

> **Regional caveat.** `anthropic.com/legal/consumer-terms` is geo-served. The
> copy retrieved for this research is the Anthropic Ireland, Limited version,
> which opens "These Terms apply to you if you are a consumer who is resident in
> the United Kingdom." The automated-access clause quoted above appeared
> identically in two independent fetches of that URL. Whether the US
> (Anthropic PBC) version words that bullet identically is **UNVERIFIED** from
> here — the page offers no region selector and no alternate URL.

### The explicit permission

Three Anthropic-owned sources permit this combination, escalating in specificity.

**(a) The docs say an OAuth token bills to the subscription.** On the GitHub
Actions page, under "Manage costs":

> **API tokens**: each interaction consumes tokens based on the length of prompts
> and responses… **If you authenticate with an OAuth token, runs use your Claude
> subscription instead of API billing.**
>
> — [Claude Code GitHub Actions § Manage costs](https://code.claude.com/docs/en/github-actions#manage-costs)

**(b) The docs put a subscription token and a `schedule:` trigger on the same
page.** The manual-setup step describes `CLAUDE_CODE_OAUTH_TOKEN` as "an OAuth
token that authenticates with your Claude subscription, available on Pro, Max,
Team, and Enterprise plans", and the "Run on a schedule" section documents cron
automation, with the standing instruction that "If you authenticate with a
Claude subscription, replace the `anthropic_api_key` line in any example with
`claude_code_oauth_token: ${{ secrets.CLAUDE_CODE_OAUTH_TOKEN }}`"
([same page](https://code.claude.com/docs/en/github-actions)). There is no
carve-out saying the substitution stops applying to the scheduled example.

**(c) A support article names the GitHub Actions integration as a
subscription-billed surface, by name.** This is the decisive one. Anthropic's
help centre article _Use the Claude Agent SDK with your Claude plan_
([support.claude.com article 15036540](https://support.claude.com/en/articles/15036540-use-the-claude-agent-sdk-with-your-claude-plan),
last modified 2026-06-16) describes a monthly Agent SDK credit and lists what it
would cover:

> The Agent SDK monthly credit applies to:
>
> - Claude Agent SDK usage in your own projects (Python or TypeScript)
> - The `claude -p` command in Claude Code (non-interactive mode)
> - **The Claude Code GitHub Actions integration**
> - Third-party apps that authenticate with your Claude subscription through the
>   Agent SDK

and, in the update banner at the top of the article:

> **Update June 15:** We're pausing the changes to Claude Agent SDK usage
> described below. For now, nothing has changed: **Claude Agent SDK, `claude -p`,
> and third-party app usage still draw from your subscription's usage limits.**

Anthropic built a billing mechanism _specifically_ for non-interactive,
programmatic, subscription-authenticated usage — and, having paused it, states
that such usage continues to draw on the subscription allowance as before. That
is an explicit permission by any reading. It is not silence, and it is not
inference.

### Where the boundary actually sits

The permission is real but not unbounded. The genuine edges, from primary
sources:

- **Non-commercial.** The UK Consumer Terms include: "You agree not to use our
  Services for any commercial or business purposes"
  ([Consumer Terms](https://www.anthropic.com/legal/consumer-terms)). Radar is a
  personal blog on a personal site, so this is satisfied — but it is the clause
  that would break if Radar ever became a commercial product.
- **No account sharing.** "You may not share your Account login information,
  Anthropic API key, or Account credentials with anyone else or make your Account
  available to anyone else"
  ([Consumer Terms](https://www.anthropic.com/legal/consumer-terms)). A token in
  a repository secret on Jamie's own private-write repository, used only for
  Jamie's own automation, is not sharing. A token in a public repo where
  contributors can trigger runs would be a different conversation. The map's
  "public read, private write" constraint already puts Radar on the right side of
  this.
- **Anthropic's own steer for scale.** The same support article says: "The Agent
  SDK monthly credit is sized for individual experimentation and automation.
  Teams running shared production automation should use Claude Platform with an
  API key for predictable pay-as-you-go billing." This is guidance addressed to
  Team/Enterprise admins about _shared_ automation, and it is a recommendation,
  not a prohibition. One weekday cron on one person's account is squarely
  "individual… automation".
- **Anthropic reserves discretion over volume.** "to manage capacity and ensure
  fair access to all users, we may limit your usage in other ways, such as weekly
  and monthly caps or model and feature usage, at our discretion"
  ([What is the Max plan?](https://support.claude.com/en/articles/11049741-what-is-the-max-plan)).
  This is a throttling right, not a permission question.
- **The agentic Usage Policy guidance does not touch this.**
  [Using agents according to our Usage Policy](https://support.claude.com/en/articles/12005017-using-agents-according-to-our-usage-policy)
  enumerates prohibited agentic uses — surveillance, harmful content, scaled
  abuse, unauthorised system access. Reading RSS feeds and writing a digest
  appears nowhere near any of them.

**No primary source was found that prohibits scheduled, unattended,
single-account use of Claude Code on a subscription.** Searching the Consumer
Terms, the [Usage Policy](https://www.anthropic.com/legal/aup) (effective
September 15, 2025), and the Claude Code documentation surfaced nothing. The
Usage Policy's automation-adjacent bullets are about _abuse_: "Utilize automation
in account creation or to engage in spammy behavior", "Coordinate malicious
activity across multiple accounts to avoid detection", "Create or manage multiple
accounts to evade detection or circumvent platform safeguards". None applies.

### Since the answer is yes, is the metered alternative still worth pricing?

The ticket asks for the metered cost only if (2) comes back negative. It did not.
But the cost is small enough and the allowance contention real enough
([Point 3](#3-how-the-allowance-behaves-under-a-scheduled-job)) that the number is
worth having on the table anyway, so it is in
[Appendix: metered-API cost](#appendix-metered-api-cost-if-you-ever-want-it).

---

## 3. How the allowance behaves under a scheduled job

### One pool, shared with everything

> Note that your usage of all different Claude product surfaces (claude.ai,
> Claude Code, Claude Desktop) counts towards the same usage limit.
>
> — [How do usage and length limits work?](https://support.claude.com/en/articles/11647753-how-do-usage-and-length-limits-work)

and, for Claude Code specifically, "all activity in both tools counts against the
same usage limits"
([Use Claude Code with your Pro or Max plan](https://support.claude.com/en/articles/11145838-use-claude-code-with-your-pro-or-max-plan)).

Since the pause described in
[article 15036540](https://support.claude.com/en/articles/15036540-use-the-claude-agent-sdk-with-your-claude-plan),
GitHub Actions runs land in that same pool. **The 07:00 digest competes directly
with Jamie's own morning at the keyboard.**

### Two windows, both counting at once

Subscription plans carry a rolling five-hour session window and a weekly window:

> Your session-based usage limit will reset every five hours… [the Max plan
> includes] a weekly usage limit that applies across all models [resetting] at a
> fixed time each week that is assigned to your account.
>
> — [What is the Max plan?](https://support.claude.com/en/articles/11049741-what-is-the-max-plan)

> Usage counts against the session and weekly allowances at the same time. A
> single burst of heavy activity, such as a large workflow fanout, can exhaust
> the weekly allowance before the session window resets.
>
> — [Claude Code error reference § You've hit your session limit](https://code.claude.com/docs/en/errors#youve-hit-your-session-limit)

That second sentence names "a large workflow fanout" as the failure mode.
Anthropic does not publish absolute token figures for Pro/Max windows; Max 5x and
Max 20x are described only as "five times" and "20 times more usage per session
than Pro"
([What is the Max plan?](https://support.claude.com/en/articles/11049741-what-is-the-max-plan)).
Exact per-plan token or hour figures are **UNVERIFIED** — Anthropic does not
publish them.

### What happens mid-run

Requests stop dead:

```text
You've hit your session limit · resets 3:45pm
You've hit your weekly limit · resets Mon 12:00am
```

> Claude Code blocks further requests until the reset time shown in the message.
> The session and weekly limits are shared across all models, so switching models
> doesn't restore access.
>
> — [Claude Code error reference](https://code.claude.com/docs/en/errors#youve-hit-your-session-limit)

**The automatic wait-and-continue does not help a scheduled job.** The docs are
specific that it is interactive-only:

> **In an interactive session** signed in with a claude.ai subscription, Claude
> Code can also wait in the open session and continue the interrupted task
> shortly after the reset.
>
> — [Claude Code error reference](https://code.claude.com/docs/en/errors#youve-hit-your-session-limit)
> (emphasis added)

The other documented recoveries — the Desktop app's "Auto-continue when limits
reset" checkbox, `/model` to dodge a model-family limit, `/usage-credits` — are
all interactive surfaces. None exists inside a GitHub Actions run.

The `CLAUDE_CODE_RETRY_WATCHDOG=1` environment variable, which the docs
explicitly recommend "in unattended sessions such as CI jobs", does **not** cover
this case either. It retries `429` and `529` _capacity_ errors indefinitely, and:

> Claude Code fails at once on a `429` that reports a spend limit or exhausted
> usage credits.
>
> — [Claude Code error reference § Tune retry behavior](https://code.claude.com/docs/en/errors)

It is still worth setting for transient overload, but it is not an allowance
safety net.

**Net behaviour: the run fails, the job goes red, partial work is lost, and the
only signal is a failed Actions run.** There is no documented mid-run warning.

### Is there any advance warning available to a workflow?

Partially, and not through the action. Claude Code exposes `rate_limits` fields
to a custom status line
([statusline § rate limit usage](https://code.claude.com/docs/en/statusline#rate-limit-usage))
and `/usage` shows plan bars — but both are CLI/interactive surfaces. Whether
those figures can be read from inside `claude-code-action` is **UNVERIFIED**; no
action input or output exposes them, and `structured_output`, `conclusion`,
`execution_file`, and `session_id` are the only outputs declared in
[`action.yml`](https://github.com/anthropics/claude-code-action/blob/v1.0.210/action.yml).

### The lever that does exist

`--max-budget-usd`, passed through `claude_args`:

> Maximum dollar amount to spend on API calls before stopping (print mode only).
> Spend from subagents counts toward the cap.
>
> — [CLI reference](https://code.claude.com/docs/en/cli-reference#cli-flags)

On a subscription the dollar figure is a client-side estimate computed from token
counts at list price
([Manage costs § Using the `/usage` command](https://code.claude.com/docs/en/costs#using-the-usage-command)),
so it is not a bill — but it is a proportional, deterministic cap on how much of
the allowance one run can consume, which is exactly what the map's open
"Allowance guardrails" question is looking for. Pair it with `--max-turns`.

---

## 4. Token lifetime and rotation

**One year. Manual rotation. No automated renewal path.**

> For CI pipelines, scripts, or other environments where interactive browser
> login isn't available, generate a **one-year OAuth token** with
> `claude setup-token`… The command opens the same browser authorization flow as
> `/login`, and the token prints to the terminal after you approve access in the
> browser. **It does not save the token anywhere**; copy it and set it as the
> `CLAUDE_CODE_OAUTH_TOKEN` environment variable…
>
> This token authenticates with your Claude subscription and requires a Pro, Max,
> Team, or Enterprise plan. **It can only make model requests**, so it can't
> establish Remote Control sessions or fetch claude.ai connectors.
>
> — [Authentication § Generate a long-lived token](https://code.claude.com/docs/en/authentication#generate-a-long-lived-token)
> (emphasis added)

Facts that follow:

- **Lifetime: one year from minting.** Not from first use.
- **Not stored locally.** Re-reading it later is impossible; it must be captured
  at mint time and pasted into the repository secret.
- **Model requests only.** Fine for this workload.
- **Precedence.** `CLAUDE_CODE_OAUTH_TOKEN` sits at position 5 in Claude Code's
  credential order, below `ANTHROPIC_AUTH_TOKEN`, `ANTHROPIC_API_KEY`, and
  `apiKeyHelper`
  ([Authentication § Authentication precedence](https://code.claude.com/docs/en/authentication#authentication-precedence)).
  On a clean GitHub runner none of those are set, so it wins — but do not set
  `ANTHROPIC_API_KEY` in the same workflow expecting the OAuth token to be used.

### The rotation story is bad, and it is bad in a specific way

The expiry warning Claude Code added in v2.1.203 — `Your login expires in 3 days
· run /login to renew` — **does not apply to this token**:

> The warning appears only when a claude.ai or Claude Console login is the active
> credential, and **not** when a cloud provider, `ANTHROPIC_API_KEY`,
> `ANTHROPIC_AUTH_TOKEN`, or `apiKeyHelper` supplies the credential.
>
> — [Authentication § Renew an expiring login](https://code.claude.com/docs/en/authentication#renew-an-expiring-login)

That list enumerates the _other_ environment credentials; whether a
`CLAUDE_CODE_OAUTH_TOKEN` session would emit the warning is **UNVERIFIED**, but
it is moot regardless: nothing reads a startup warning in an Actions log, and
`/login` cannot be run there. The same section notes the general hazard:

> Renewing early matters most for sessions that run unattended.

So: **there is no automatic rotation, no expiry notification that reaches a
workflow, and no documented programmatic way to mint a replacement.**
`claude setup-token` requires an interactive browser authorization.

**Failure mode when it lapses.** Requests fail with
`Login expired · Please run /login` / `Failed to authenticate: OAuth session
expired and could not be refreshed`
([error reference § Login expired](https://code.claude.com/docs/en/errors#login-expired)),
the action's `conclusion` output goes to `failure`, and the digest silently stops
being produced until someone notices.

**Recommendation for the build:** a dated calendar reminder at mint time minus
one month, and a workflow that fails loudly rather than quietly. This belongs in
the map's open "Observability and partial failure" question — an annual
credential cliff is exactly the kind of half-failure that needs a notification
path.

The alternative that removes the cliff entirely is **workload identity
federation**, where the action exchanges the workflow's GitHub OIDC token for
Claude API access with no static secret at all
([GitHub Actions § Set up for an organization](https://code.claude.com/docs/en/github-actions#set-up-for-an-organization)).
It requires a Claude Console service account, i.e. **metered API billing**. It is
the right answer if the annual rotation ever becomes intolerable, and the wrong
answer while the subscription is the point.

---

## 5. Invocation shape: action vs Agent SDK vs `claude -p`

### Summary

|                                   | Structured JSON validated against a schema                                                       | Tool restrictions                                                                                 | Realistic inside an Action                                      | Subscription token           |
| --------------------------------- | ------------------------------------------------------------------------------------------------ | ------------------------------------------------------------------------------------------------- | --------------------------------------------------------------- | ---------------------------- |
| `claude-code-action` (agent mode) | **Yes** — `--json-schema` in `claude_args`, read back from the `structured_output` action output | **Yes** — `--allowedTools`, `--tools`, `--disallowedTools`, `--permission-mode`, `settings` input | **Yes — it _is_ the Action**                                    | Yes                          |
| Claude Agent SDK (TS/Python)      | **Yes, and best** — `outputFormat` / `output_format`, plus Zod/Pydantic for typed objects        | Yes, plus programmatic approval callbacks                                                         | Possible, but you own install, auth wiring, and GitHub plumbing | Yes (the SDK spawns the CLI) |
| `claude -p` headless              | **Yes** — `--output-format json --json-schema`                                                   | Yes — same CLI flags                                                                              | **Compromised** — see the `--bare` trap below                   | **Only without `--bare`**    |

### Structured output, in detail

All three route to the same mechanism. The semantics:

> Define a JSON Schema for the structure you need, and the SDK validates the
> output against it, **re-prompting on mismatch**. If validation does not succeed
> within the retry limit, the result is an error instead of structured data.
>
> — [Get structured output from agents](https://code.claude.com/docs/en/agent-sdk/structured-outputs)

The failure is a named subtype, `error_max_structured_output_retries`, which the
same page notes can fire either from repeated validation failures _or_ from "a
model-fallback retraction with no successful retry" — check the `errors` list on
the result message to tell them apart. The retry-limit _number_ is not published;
**UNVERIFIED**.

Schema validation is strict enough to fail fast on a bad schema
(`Error: --json-schema is not a valid JSON Schema`) but the `format` keyword is
an annotation only and is **not enforced** — so `"format": "date-time"` or
`"format": "uri"` will not actually validate a value
([headless docs § Get structured output](https://code.claude.com/docs/en/headless#get-structured-output),
[CLI reference](https://code.claude.com/docs/en/cli-reference#cli-flags)). For
Radar this matters: if the digest schema carries article URLs and publication
dates, they need validating in the workflow, not by the schema.

In the Action, the result surfaces as a single output:

> `structured_output` — JSON string containing all structured output fields when
> `--json-schema` is provided in `claude_args`. Use `fromJSON()` to parse.
>
> — [`action.yml:182-184`](https://github.com/anthropics/claude-code-action/blob/v1.0.210/action.yml#L182)

with the caveat that "Due to GitHub Actions limitations, composite actions cannot
expose dynamic outputs. All fields are bundled in the single `structured_output`
JSON string"
([`docs/usage.md`](https://github.com/anthropics/claude-code-action/blob/v1.0.210/docs/usage.md#structured-outputs)).
Parse with `fromJSON()` in an expression or `jq` in a step. This is the seam that
makes the agent's output a _contract_ rather than prose to be scraped — directly
relevant to the map's "deterministic/agentic boundary" ticket.

### The `--bare` trap — why not `claude -p`

Anthropic recommends `--bare` for scripts and CI, because it skips
auto-discovery of hooks, skills, commands, subagents, plugins, MCP servers, auto
memory, and `CLAUDE.md`, giving "the same result on every machine", and it "will
become the default for `-p` in a future release"
([headless docs § Start faster with bare mode](https://code.claude.com/docs/en/headless#start-faster-with-bare-mode)).

But:

> **Bare mode does not read `CLAUDE_CODE_OAUTH_TOKEN`.** If your script passes
> `--bare`, authenticate with `ANTHROPIC_API_KEY` or an `apiKeyHelper` instead.
>
> — [Authentication § Generate a long-lived token](https://code.claude.com/docs/en/authentication#generate-a-long-lived-token)

and, from the other side:

> In bare mode, Claude Code never reads OAuth credentials or the system keychain.
>
> — [headless docs](https://code.claude.com/docs/en/headless#start-faster-with-bare-mode)

**So on a subscription you must run `claude -p` _without_ `--bare`** — which
means the run loads the repository's `CLAUDE.md`, hooks, `.mcp.json`, and skills,
and the docs warn that a `-p` session does this "even in a folder you've never
trusted" with "no workspace trust dialog and no per-server approval prompt". You
would be choosing the least reproducible configuration and forfeiting the flag
Anthropic built for CI. Not worth it when the Action is right there.

### Two known limitations to flag

- **Subagents in the Action.** Anthropic's
  [Claude Code FAQ](https://support.claude.com/en/articles/12386420-claude-code-faq)
  says: "Subagents are available via the Claude Code SDK. They're not yet
  integrated into GitHub Actions, but we are considering this." That article
  carries no version marker and may lag the code — `base-action/src/run-claude-sdk.ts`
  handles subagent message forwarding, and `claude_args` passes arbitrary flags
  through — so treat the support-article claim as **possibly stale** and verify
  empirically before designing a subagent fan-out into the digest run.
- **`track_progress`.** `validateTrackProgressEvent` in
  [`src/modes/detector.ts`](https://github.com/anthropics/claude-code-action/blob/v1.0.210/src/modes/detector.ts)
  throws for any event outside `pull_request`, `issues`, `issue_comment`,
  `pull_request_review_comment`, `pull_request_review`. **Do not set
  `track_progress` on a scheduled workflow — it is a hard error, not a no-op.**

---

## 6. End-to-end latency

Assembled from GitHub's documented behaviour plus measurements from this
repository's own workflow runs. The measurements are the more useful half.

### Measured, in this repo

Run
[33331679752](https://github.com/jeasmith/ithilien/actions/runs/33331679752)
(`claude-code-review.yml`, the only workflow here that actually invokes the
agent), via `gh api repos/jeasmith/ithilien/actions/runs/33331679752/jobs`:

| Stage                                                                                     | Duration     |
| ----------------------------------------------------------------------------------------- | ------------ |
| Event received → run created                                                              | 19:43:57     |
| Run created → job started                                                                 | ~3 s         |
| `Set up job` + `Checkout repository`                                                      | ~4 s         |
| `Run Claude Code Review` (bun install + Claude Code install + plugin install + agent run) | **2 m 44 s** |
| Post-steps + `Complete job`                                                               | <1 s         |
| **Total wall clock**                                                                      | **2 m 54 s** |

Across the last twelve runs of that workflow, total wall clock ranged from **17 s
to 2 m 55 s**, the short ones being runs where Claude declined to review. So
**~10 s is GitHub-side and action-fixed overhead; everything else is the agent.**

The fixed overhead is explained by the action's composite steps
([`action.yml`](https://github.com/anthropics/claude-code-action/blob/v1.0.210/action.yml)):
install Bun 1.3.14 (cache deliberately disabled — the comment notes "The 35 MB
Bun binary downloads in 2-3s, so disabling the cache is a net wallclock win"),
`bun install --production`, then the run entrypoint.

### The `repository_dispatch` → workflow-start leg

GitHub publishes **no latency figure or SLA** for `repository_dispatch` →
workflow start. **UNVERIFIED.** The `pull_request` → job-start delay measured
above (~3 s) is the closest available proxy and is not a guarantee.

What GitHub does document
([Events that trigger workflows](https://docs.github.com/en/actions/reference/workflows-and-actions/events-that-trigger-workflows)):

- `repository_dispatch` is triggered through the REST API, "when you want to
  trigger a workflow for activity that happens outside of GitHub".
- `client_payload` is capped at **10 top-level properties** and **65,535
  characters** — ample for an article ID, but not for shipping article text.
- "This event will only trigger a workflow run if the workflow file exists on the
  **default branch**." Same constraint as `schedule`.

### Realistic budget for the deep-dive button

| Leg                                     | Estimate              | Basis                                |
| --------------------------------------- | --------------------- | ------------------------------------ |
| Button → `repository_dispatch` accepted | <1 s                  | REST call                            |
| Dispatch → job started                  | seconds, unguaranteed | proxy measurement; no SLA            |
| Runner setup + action install           | ~10 s                 | measured                             |
| Agent run (single-article deep dive)    | 1–5 min               | measured PR-review runs as the floor |
| Write-back (commit / API call)          | seconds               |                                      |
| **Perceived total**                     | **~1.5–6 min**        |                                      |

**This is not a button that feels like a button.** It is a "request submitted,
check back shortly" interaction. That is a UI consequence, and it belongs in the
deep-dive flow ticket rather than being discovered during the build.

### Scheduled-run caveats that bite

- **`schedule` runs late — and can be dropped entirely.** This is the sharpest
  finding in this section:

  > The `schedule` event can be delayed during periods of high loads of GitHub
  > Actions workflow runs. **High load times include the start of every hour. If
  > the load is sufficiently high enough, some queued jobs may be dropped.** To
  > decrease the chance of delay, schedule your workflow to run at a different
  > time of the hour.
  >
  > — [GitHub: Events that trigger workflows § schedule](https://docs.github.com/en/actions/reference/workflows-and-actions/events-that-trigger-workflows#schedule)
  > (emphasis added)

  So a `cron: "0 6 * * 1-5"` is the single worst minute to pick, and a missed run
  is not a hypothetical. **Use an off-hour minute** (e.g. `"37 6 * * 1-5"`) and
  treat "the digest did not appear" as a state the system must detect, not one it
  can assume away. No bound on the delay is published.

- **Minimum interval is 5 minutes.** Irrelevant here.
- **Default branch only.** "Scheduled workflows run on the latest commit on the
  default branch." So the digest workflow cannot be tested on a branch by
  waiting for its cron — pair every `schedule:` with `workflow_dispatch:`.
- **Public repos disable schedules after 60 days idle.** "In a public repository,
  scheduled workflows are automatically disabled when no repository activity has
  occurred in 60 days." Ithilien is active, but this is a real silent-failure
  mode for a quiet period.
- **Job ceiling: 6 hours.** "Each job in a workflow can run for up to 6 hours of
  execution time"
  ([GitHub Actions limits](https://docs.github.com/en/actions/reference/limits)).
  Far above anything here; set a `timeout-minutes` well below it anyway so a
  wedged agent does not burn 6 hours of runner time.

---

## 7. Concurrency: the daily run and a deep dive overlapping

Two independent questions — GitHub's scheduler, and Anthropic's allowance.

### On the GitHub side: solved, but pick the right knob

Without a `concurrency:` block, both workflows simply run in parallel. With one,
GitHub's semantics are
([Workflow syntax § `concurrency`](https://docs.github.com/en/actions/reference/workflows-and-actions/workflow-syntax#concurrency)):

- "Use `concurrency` to ensure that only a single job or workflow using the same
  concurrency group will run at a time."
- Default on collision: "any existing `pending` job or workflow in the same
  concurrency group will be canceled and the new queued job or workflow will take
  its place." **A deep-dive request arriving while the digest runs would cancel a
  second pending deep-dive request.** For a user-triggered action that is data
  loss, not throttling.
- `queue: max` changes that — "allows up to 100 jobs or workflow runs can be
  `pending` in the concurrency group", cancelling only beyond capacity.
- "The combination of `queue: max` and `cancel-in-progress: true` is not allowed
  and will result in a workflow validation error."

**Recommendation:** put both workflows in one shared group, e.g.
`group: radar-agent`, with `queue: max` and without `cancel-in-progress`. That
serialises agent runs against the subscription, preserves queued deep-dive
requests, and never drops a user request on the floor. Note the existing
`claude-code-review.yml` already uses `cancel-in-progress: true` — correct for
per-PR reviews, wrong for this.

Repository-level throughput ceilings (1,500 triggering events / 10 s, 500
workflow runs queued / 10 s, per
[GitHub Actions limits](https://docs.github.com/en/actions/reference/limits)) are
orders of magnitude above this workload.

### On the Anthropic side: unaddressed by any of that

Serialising the _workflows_ does not serialise the _allowance_. Both runs draw
from the same shared pool
([How do usage and length limits work?](https://support.claude.com/en/articles/11647753-how-do-usage-and-length-limits-work)),
and so does Jamie's terminal. A deep dive queued behind the digest still lands in
the same five-hour window and can push it over — with the failure mode from
[Point 3](#3-how-the-allowance-behaves-under-a-scheduled-job): a hard stop, no
warning, a red run.

Whether Anthropic imposes a **concurrent-session cap** on a single subscription
token is **UNVERIFIED** — no documented limit was found, and no documented
behaviour for two simultaneous sessions on one `CLAUDE_CODE_OAUTH_TOKEN`.

The available mitigations are all budget-shaped, not lock-shaped:
`--max-budget-usd` and `--max-turns` per run, `concurrency` to avoid stacking
runs, and scheduling the cron outside Jamie's usual working window so the digest
and the human are not in the same five-hour bucket.

---

## Appendix: metered-API cost, if you ever want it

Not required by the verdict — included because the number is small enough to
change how the allowance-contention trade-off feels.

### Assumed run shape

Estimates, stated as such. Derived from the ticket's own figures (~66 candidate
items in, ~13 curated entries out) plus the token-accounting behaviour Anthropic
documents: Claude Code "sends your full conversation with every request, and each
time Claude uses tools it sends another request carrying that batch of tool
results", re-read at the cached rate under prompt caching
([Manage costs § Why usage climbs in a long session](https://code.claude.com/docs/en/costs#why-usage-climbs-in-a-long-session)).
Thinking tokens are billed as output and "the default budget can be tens of
thousands of tokens per request"
([Manage costs § Adjust extended thinking](https://code.claude.com/docs/en/costs#adjust-extended-thinking)),
which is why output dominates below.

**Daily digest run:** 66 items × ~250 tokens ≈ 16.5k, plus persona/runbook/system
≈ 30k initial context; ~15 tool-carrying turns; 13 entries × ~220 tokens ≈ 3k of
prose plus extended thinking.

| Component                       | Tokens |
| ------------------------------- | ------ |
| Cache writes (5 m)              | 30k    |
| Cache hits & refreshes          | 525k   |
| Fresh base input (tool results) | 60k    |
| Output incl. thinking           | 40k    |

**On-demand deep dive:** 15k cache writes, 100k cache hits, 25k base input, 25k
output.

### Rates

From [Anthropic pricing](https://platform.claude.com/docs/en/about-claude/pricing),
per MTok:

| Model           | Base input | 5 m cache write | Cache hit | Output |
| --------------- | ---------- | --------------- | --------- | ------ |
| Claude Opus 5   | $5         | $6.25           | $0.50     | $25    |
| Claude Sonnet 5 | $2         | $2.50           | $0.20     | $10    |

(Sonnet 5's $2/$10 is confirmed standard, not introductory: "The previously
scheduled increase to $3/$15 per million input/output tokens on September 1, 2026
will not occur.")

### Result

|                            | Opus 5      | Sonnet 5    |
| -------------------------- | ----------- | ----------- |
| Daily digest, per run      | **≈ $1.75** | **≈ $0.70** |
| Per month (21.75 weekdays) | **≈ $38**   | **≈ $15**   |
| Deep dive, per request     | **≈ $0.89** | **≈ $0.36** |

Batch processing halves input and output rates
([pricing § batch](https://platform.claude.com/docs/en/about-claude/pricing)) but
is not applicable to an interactive agent loop.

For context, plan prices are Pro $20/month ($17 annual) and Max "From $100"
per month at 5x or 20x Pro's usage
([claude.com/pricing](https://claude.com/pricing)).

**Reading.** Metered API for this exact workload is roughly **$15–40/month** on
top of whatever the subscription already costs. That is not nothing, but it is
also not the deciding factor. The real question is whether the digest eating a
slice of the five-hour window every weekday morning is acceptable. If it is not,
the cheapest fix is not to abandon the subscription — it is to run the digest on
Sonnet and reserve Opus for deep dives, or to move the cron outside Jamie's
working hours.

The middle path worth knowing about: **usage credits**. Enabled on Pro/Max, they
let usage continue past the plan limit at standard API rates rather than blocking,
with a configurable monthly spend cap
([Manage usage credits for paid Claude plans](https://support.claude.com/en/articles/12429409-manage-usage-credits-for-paid-claude-plans)).
That converts the hard failure in
[Point 3](#3-how-the-allowance-behaves-under-a-scheduled-job) into a small,
bounded bill — but note the side effect: the prompt-cache lifetime "is an hour on
a subscription and **drops to five minutes once you're drawing on usage
credits**"
([Manage costs](https://code.claude.com/docs/en/costs#why-usage-climbs-in-a-long-session)),
which makes overflow runs disproportionately expensive unless you set the TTL
explicitly.

---

## Recommended workflow shape

```yaml
name: Radar Digest
on:
  schedule:
    - cron:
        "37 6 * * 1-5" # 07:37 BST. NOT :00 — GitHub names the top of the
        # hour as peak load, where runs are delayed or dropped.
  workflow_dispatch: # required for testing — schedule only runs on default branch

concurrency:
  group: radar-agent # shared with the deep-dive workflow
  queue: max # queue, do not cancel, pending requests

jobs:
  digest:
    runs-on: ubuntu-latest
    timeout-minutes: 30
    permissions:
      contents: write
      id-token: write
    steps:
      - uses: actions/checkout@v7
        with: { fetch-depth: 1 }

      - id: curate
        uses: anthropics/claude-code-action@<pinned-sha> # v1.0.210
        env:
          CLAUDE_CODE_RETRY_WATCHDOG: "1" # transient 429/529 only
        with:
          claude_code_oauth_token: ${{ secrets.CLAUDE_CODE_OAUTH_TOKEN }}
          prompt: "/radar:curate" # a repo skill, not inline prose
          claude_args: |
            --model claude-sonnet-5
            --max-turns 25
            --max-budget-usd 2.00
            --allowedTools "Read,Bash(jq:*)"
            --json-schema '{"type":"object", ...}'

      - name: Write the digest
        run: echo '${{ steps.curate.outputs.structured_output }}' | jq . > digest.json
```

Design notes behind each choice:

- **`prompt` is what selects automation mode** — without it a scheduled run is a
  no-op (`prepare.ts` sets `contains_trigger` from `!!context.inputs.prompt`).
- **No `track_progress`** — it throws on `schedule` events.
- **`--json-schema` + `structured_output`** puts a validated contract on the
  agent/deterministic seam. Validate URLs and dates yourself; `format` is not
  enforced.
- **`--allowedTools` is the whole permission model** for a plain-text prompt:
  "For a plain-text prompt, Claude has no shell or GitHub API access until you
  grant the tools the prompt needs"
  ([GitHub Actions § Run on a schedule](https://code.claude.com/docs/en/github-actions#run-on-a-schedule)).
  Invoke a repo skill instead and its `allowed-tools` frontmatter grants apply.
- **`--max-budget-usd` and `--max-turns`** are the only allowance guardrails
  available inside a run.
- **`queue: max`** so a deep-dive request never silently cancels another one.
- **Deep dive:** prefer `workflow_dispatch` over `repository_dispatch` if the
  trigger can come from a browser session that authenticates as Jamie — it
  sidesteps the `checkHumanActor` problem in
  [Point 1](#1-is-claude_code_oauth_token-supported-on-schedule-and-repository_dispatch-does-the-action-gate-on-event-type)
  entirely. If `repository_dispatch` is required, the dispatching credential must
  resolve to a `User`, or the bot must be listed in `allowed_bots`.

---

## What this changes about the wider plan

1. **The map's constraint holds.** "Agent usage stays on the Claude
   subscription via `secrets.CLAUDE_CODE_OAUTH_TOKEN`… not metered API billing"
   is sanctioned, documented, and needs no revision.
2. **"Allowance guardrails" is now a sharper question.** The map lists it as _not
   yet specified_. The finding that a scheduled run hitting the wall **fails hard
   with no warning and no auto-resume**, while sharing one pool with Jamie's own
   terminal, makes this a correctness concern rather than a budgeting one. The
   available levers are `--max-budget-usd`, `--max-turns`, cron placement outside
   working hours, model choice, and optionally usage credits as an overflow
   valve.
3. **The deep-dive button is a "request submitted" interaction, not an instant
   one** (~1.5–6 min). That is a UI constraint for the deep-dive flow ticket.
4. **`repository_dispatch` has a human-actor trap.** `checkHumanActor` runs on
   every event; a dispatch made with `GITHUB_TOKEN` or a GitHub App fails unless
   `allowed_bots` names it. This lands squarely on the "write boundary, secrets
   and trust model" ticket. `workflow_dispatch` avoids it.
5. **There is an annual credential cliff.** A one-year token, no automated
   rotation, no expiry signal that reaches a workflow. Feed this into the
   "Observability and partial failure" open question — the digest going quiet
   because a token lapsed is the archetypal half-failure the map is worried
   about.
6. **`schedule` is approximate, droppable, and default-branch-only.** GitHub
   documents that queued scheduled jobs "may be dropped" under high load, with
   the top of every hour named as peak. A weekday digest therefore needs an
   off-hour cron minute _and_ a way to notice a missed run — which promotes
   "Observability and partial failure" from a nice-to-have to a requirement, and
   means the digest's own page cannot assume yesterday's entry exists. Every
   scheduled workflow also needs a `workflow_dispatch` twin to be testable at
   all, since `schedule` only runs from the default branch.
7. **`structured_output` is a real seam.** The action can hand back
   schema-validated JSON rather than prose, which is exactly the boundary the
   "deterministic/agentic boundary" ticket is trying to draw. Caveat: the
   `format` keyword is not enforced, so URL and date validation stays on the
   deterministic side.
