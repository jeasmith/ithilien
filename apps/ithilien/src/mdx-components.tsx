/**
 * Styles for the elements MDX produces, so an article's Markdown matches the
 * site without a typography plugin. Next.js picks this file up by name.
 *
 * @see docs/adr/0019-mdx-for-interactive-articles.md
 */
import type { MDXComponents } from "mdx/types";

const components: MDXComponents = {
  h1: ({ children, ...props }) => (
    <h1 className="mt-2 mb-6 text-4xl font-bold tracking-tight" {...props}>
      {children}
    </h1>
  ),
  h2: ({ children, ...props }) => (
    <h2
      className="mt-14 mb-4 scroll-mt-8 text-2xl font-semibold tracking-tight"
      {...props}
    >
      {children}
    </h2>
  ),
  h3: ({ children, ...props }) => (
    <h3 className="mt-8 mb-3 text-lg font-semibold tracking-tight" {...props}>
      {children}
    </h3>
  ),
  p: (props) => <p className="my-4 leading-relaxed" {...props} />,
  a: ({ children, ...props }) => (
    <a
      className="underline underline-offset-4 transition-colors hover:text-muted-foreground"
      {...props}
    >
      {children}
    </a>
  ),
  ul: (props) => <ul className="my-4 list-disc space-y-1 pl-6" {...props} />,
  ol: (props) => <ol className="my-4 list-decimal space-y-1 pl-6" {...props} />,
  blockquote: (props) => (
    <blockquote
      className="my-6 border-l-2 border-border pl-4 text-muted-foreground"
      {...props}
    />
  ),
  code: (props) => (
    <code
      className="rounded bg-muted px-1 py-0.5 font-mono text-[0.9em]"
      {...props}
    />
  ),
  pre: (props) => (
    <pre
      className="my-6 overflow-x-auto rounded-lg border border-border bg-muted p-4 font-mono text-sm [&>code]:bg-transparent [&>code]:p-0"
      {...props}
    />
  ),
  hr: () => <hr className="my-10 border-border" />,
};

/** Hands MDX the site's element styles. */
export function useMDXComponents(): MDXComponents {
  return components;
}
