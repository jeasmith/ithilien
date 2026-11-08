# ADR-0019: MDX for Interactive Articles

## Status

Accepted

## Context

The site needs to publish articles that mix prose with small interactive
pieces, starting with one on OAuth 2.0 and OpenID Connect where the reader
steps through the authorization code flow and computes a PKCE challenge.

The prose is the bulk of the work and should be comfortable to write. The
interactive pieces are React components. Writing prose as JSX in a `page.tsx`
works but is tiring to write and review; a headless CMS or a content database
adds a service, credentials and a build step for a handful of articles.

The open scope proposal for Radar (draft PR #141) asks the project to keep
complexity down, so the choice should add as little as possible.

## Decision

Use **MDX** through **`@next/mdx`** in the Ithilien app.

- Each article is a folder under `apps/ithilien/src/app/posts/<slug>/` with a
  `page.tsx` for metadata and the page frame, and an `article.mdx` for the
  prose. The page imports the MDX file, so metadata stays typed TypeScript and
  no frontmatter parser is needed.
- Interactive pieces are client components in
  `apps/ithilien/src/components/article/`, imported by the MDX file.
- `src/mdx-components.tsx` styles the elements Markdown produces, instead of
  adding `@tailwindcss/typography`.
- No remark or rehype plugins: Turbopack cannot pass plugin functions to the
  MDX loader, and none are needed yet.
- An unfinished article sets `DRAFT = true` in its page, which asks search
  engines not to index it and shows a banner. It is not linked from the home
  page until it is finished.

Articles stay on the Ithilien app. `/posts/*` already routes there, so
`microfrontends.json` does not change.

## Consequences

### Positive

- Prose is plain Markdown, with components dropped in where needed.
- Articles are static pages built with the rest of the app: no new service,
  runtime or credential.
- Interactive components are ordinary React, tested with Vitest like the rest
  of the code.

### Negative

- Four new dependencies (`@next/mdx`, `@mdx-js/loader`, `@mdx-js/react`,
  `@types/mdx`), kept current by Dependabot.
- Prettier skips `.mdx` files (`.prettierignore`): its MDX parser predates
  MDX 3 and merges list items written inside components. Articles are
  formatted by hand.
- Vitest does not compile MDX, so tests cover the components and the article
  itself is checked by `pnpm build`.
- A draft article is still reachable by its URL once deployed; `DRAFT` only
  keeps it out of search results and off the home page.

### Neutral

- If articles grow numerous enough to need listing, tags or feeds, a content
  layer can be added then; this decision does not preclude one.

## References

- [Next.js: Markdown and MDX](https://nextjs.org/docs/app/guides/mdx)
- [MDX](https://mdxjs.com/)
