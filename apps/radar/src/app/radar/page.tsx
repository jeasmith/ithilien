/**
 * Radar landing page — statically rendered at build time.
 *
 * Placeholder content for the architectural digest. The entries below are
 * stand-ins so the routing and shared styling can be verified end to end.
 *
 * @see docs/adr/0006-static-rendering-by-default.md
 */
// Microfrontends-aware Link: renders a next/link for same-application hrefs
// and a plain anchor with cross-zone prefetching for hrefs owned by another
// application, so `/` correctly triggers a full navigation to Ithilien.
import { Link } from "@vercel/microfrontends/next/client";

/** Year captured when this module is evaluated during `next build` (static HTML). */
const COPYRIGHT_YEAR = new Date().getFullYear();

/** A single digest entry. Replaced by real content once the digest is written. */
type DigestEntry = {
  title: string;
  summary: string;
  status: "Adopt" | "Trial" | "Assess" | "Hold";
};

const PLACEHOLDER_ENTRIES: readonly DigestEntry[] = [
  {
    title: "Microfrontends on a shared origin",
    summary:
      "Splitting a site across independently deployable Vercel projects while keeping one domain, one set of cookies, and relative links that just work.",
    status: "Trial",
  },
  {
    title: "Server components as the default",
    summary:
      "Treating client-side interactivity as the exception rather than the starting point, and what that does to bundle size and time to first byte.",
    status: "Adopt",
  },
  {
    title: "Type-aware linting without ESLint",
    summary:
      "Whether a Rust-based linter plus a separate typecheck pass is a fair trade for losing the plugin ecosystem.",
    status: "Assess",
  },
];

/** Renders the Radar digest landing page with placeholder entries. */
export default function RadarPage() {
  return (
    <div className="flex flex-1 flex-col">
      <header className="border-b border-border">
        <div className="mx-auto flex h-16 w-full max-w-3xl items-center justify-between px-6">
          <Link
            href="/radar"
            className="font-mono text-lg font-semibold tracking-tight"
          >
            radar
          </Link>
          <Link
            href="/"
            className="text-sm text-muted-foreground underline underline-offset-4 transition-colors hover:text-foreground"
          >
            ithilien
          </Link>
        </div>
      </header>

      <main className="mx-auto flex w-full max-w-3xl flex-1 flex-col px-6 py-16">
        <div className="flex flex-col gap-8">
          <div className="flex flex-col gap-4">
            <p className="font-mono text-sm tracking-tight text-muted-foreground">
              An architectural digest
            </p>
            <h1 className="text-4xl font-bold tracking-tight">
              What is worth
              <br />
              keeping an eye on.
            </h1>
          </div>

          <p className="max-w-prose text-lg leading-relaxed text-muted-foreground">
            Radar collects notes on architectural patterns, the trade-offs
            behind them, and where they have earned a place in real work. It is
            deliberately opinionated and deliberately revisable.
          </p>

          <p className="max-w-prose text-sm leading-relaxed text-muted-foreground">
            The entries below are placeholders while the digest is being
            written.
          </p>

          <ul className="flex flex-col gap-px overflow-hidden rounded-lg border border-border bg-border">
            {PLACEHOLDER_ENTRIES.map((entry) => (
              <li key={entry.title} className="bg-background p-6">
                <div className="flex flex-col gap-2">
                  <div className="flex items-baseline justify-between gap-4">
                    <h2 className="text-lg font-semibold tracking-tight">
                      {entry.title}
                    </h2>
                    <span className="shrink-0 font-mono text-xs tracking-tight text-muted-foreground">
                      {entry.status}
                    </span>
                  </div>
                  <p className="max-w-prose text-sm leading-relaxed text-muted-foreground">
                    {entry.summary}
                  </p>
                </div>
              </li>
            ))}
          </ul>
        </div>
      </main>

      <footer className="border-t border-border">
        <div className="mx-auto flex h-16 w-full max-w-3xl items-center justify-between px-6 text-sm text-muted-foreground">
          <span>&copy; {COPYRIGHT_YEAR} Jamie Smith</span>
          <span>MIT License</span>
        </div>
      </footer>
    </div>
  );
}
