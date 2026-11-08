/**
 * An interactive article on OAuth 2.0 and OpenID Connect. The prose lives in
 * `article.mdx`; this page supplies metadata and the page frame.
 *
 * @see docs/adr/0019-mdx-for-interactive-articles.md
 */
import type { Metadata } from "next";
import { SiteFooter } from "@/components/site-footer";
import { SiteHeader } from "@/components/site-header";
import Article from "./article.mdx";

/** While true, search engines are asked not to index the page and a banner says it is unfinished. */
const DRAFT = true;

export const metadata: Metadata = {
  title: "How OAuth and OpenID Connect work",
  description:
    "Step through the OAuth 2.0 authorization code flow, PKCE and the identity layer OpenID Connect adds on top.",
  robots: DRAFT ? { index: false, follow: false } : undefined,
};

/** Renders the article inside the site frame. */
export default function OAuthAndOidcPage() {
  return (
    <div className="flex flex-1 flex-col">
      <SiteHeader />
      <main className="mx-auto w-full max-w-3xl flex-1 px-6 py-16">
        {DRAFT && (
          <p className="mb-8 rounded-lg border border-border bg-muted px-4 py-2 text-sm">
            Draft: this article is still being written.
          </p>
        )}
        <article>
          <Article />
        </article>
      </main>
      <SiteFooter />
    </div>
  );
}
