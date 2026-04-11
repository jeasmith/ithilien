/**
 * Home page — statically rendered at build time.
 *
 * This is the single entry point for the first iteration of the site.
 * It intentionally keeps things minimal: black & white palette, clear
 * typography, no JavaScript-heavy interactions.
 *
 * @see docs/adr/0006-static-rendering-by-default.md
 */
import Link from "next/link";

export default function HomePage() {
  return (
    <div className="flex flex-1 flex-col">
      <header className="border-b border-border">
        <div className="mx-auto flex h-16 w-full max-w-3xl items-center px-6">
          <Link
            href="/"
            className="font-mono text-lg font-semibold tracking-tight"
          >
            ithilien
          </Link>
        </div>
      </header>

      <main className="mx-auto flex w-full max-w-3xl flex-1 flex-col px-6 py-16">
        <div className="flex flex-1 flex-col justify-center gap-8">
          <h1 className="text-4xl font-bold tracking-tight">
            A place to try out new stuff
            <br />
            and share what I learn.
          </h1>

          <p className="max-w-prose text-lg leading-relaxed text-muted-foreground">
            This is a personal repository of experiments, projects, and writing.
            Some pages are simple text. Others show off different methods of
            rendering and delivering websites. It is, by design, sometimes
            over-engineered — because the point is to learn by building.
          </p>

          <div className="flex items-center gap-4 text-sm text-muted-foreground">
            <span>Built with Next.js</span>
            <span aria-hidden="true" className="text-border">
              /
            </span>
            <span>Deployed on Vercel</span>
            <span aria-hidden="true" className="text-border">
              /
            </span>
            <a
              href="https://github.com/jamessmith/ithilien"
              className="underline underline-offset-4 transition-colors hover:text-foreground"
              target="_blank"
              rel="noopener noreferrer"
            >
              Source on GitHub
            </a>
          </div>
        </div>
      </main>

      <footer className="border-t border-border">
        <div className="mx-auto flex h-16 w-full max-w-3xl items-center justify-between px-6 text-sm text-muted-foreground">
          <span>&copy; {new Date().getFullYear()} Jamie Smith</span>
          <span>MIT License</span>
        </div>
      </footer>
    </div>
  );
}
