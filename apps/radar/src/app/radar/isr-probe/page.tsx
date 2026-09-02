/**
 * Throwaway ISR probe page for #98.
 *
 * Answers one question that Vercel documents nowhere and that cannot be tested
 * locally: does on-demand revalidation reach the Radar deployment when it is
 * triggered through the microfrontends proxy on the shared origin?
 *
 * The page renders a generation timestamp so a regeneration is visible in the
 * response body, and carries a long `revalidate` so nothing regenerates on a
 * timer while the probe is running — any change is on-demand revalidation and
 * nothing else.
 *
 * Delete this route once #98 records its answer.
 *
 * @see https://github.com/jeasmith/ithilien/issues/98
 */

/** One day. Long enough that time-based revalidation cannot confound the probe. */
export const revalidate = 86400;

/**
 * The probe runs on the live site, so keep it out of the index. It is unlinked
 * from everywhere, but an unlinked page is still a crawlable one.
 */
export const metadata = {
  robots: { index: false, follow: false },
};

/**
 * `new Date()` is not a dynamic API, so this page still prerenders; the value is
 * captured whenever Next.js generates the page, which is exactly what we want to
 * watch.
 */
export default function IsrProbePage() {
  const generatedAt = new Date().toISOString();

  return (
    <main className="mx-auto flex w-full max-w-3xl flex-1 flex-col gap-4 px-6 py-16">
      <h1 className="text-2xl font-bold tracking-tight">ISR probe</h1>
      <p className="max-w-prose text-sm leading-relaxed text-muted-foreground">
        Throwaway page for{" "}
        <a
          href="https://github.com/jeasmith/ithilien/issues/98"
          className="underline underline-offset-4"
        >
          issue 98
        </a>
        . If the timestamp below changes after the revalidation endpoint is
        called, on-demand revalidation crossed the microfrontends proxy.
      </p>
      <p data-testid="generated-at" className="font-mono text-sm">
        generated-at: {generatedAt}
      </p>
    </main>
  );
}
