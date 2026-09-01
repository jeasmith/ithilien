/**
 * Throwaway revalidation endpoint for #98.
 *
 * Calls `revalidatePath` on the ISR probe page so the probe can observe whether
 * the invalidation reaches the Radar deployment's cache when the request arrives
 * through the microfrontends proxy rather than Radar's own domain.
 *
 * Two guards, both fail-closed:
 *
 * 1. It refuses to run on a production deployment at all. The probe belongs on a
 *    preview, and an unauthenticated revalidation endpoint has no business on the
 *    live site even briefly.
 * 2. Preview deployments in this project sit behind Vercel Authentication
 *    (`ssoProtection: all_except_custom_domains`), so reaching this handler
 *    already requires an authenticated session or a share token. That is the
 *    access control; there is deliberately no secret to store, rotate or leak.
 *
 * Delete this route once #98 records its answer.
 *
 * @see https://github.com/jeasmith/ithilien/issues/98
 */
import { revalidatePath } from "next/cache";

/** The probe endpoint must never be cached or prerendered. */
export const dynamic = "force-dynamic";

/** The page this endpoint invalidates. */
const PROBE_PATH = "/radar/isr-probe";

/** Invalidates the probe page, unless this is a production deployment. */
export async function POST(): Promise<Response> {
  if (process.env.VERCEL_ENV === "production") {
    return Response.json(
      { error: "The #98 probe is disabled on production deployments." },
      { status: 404 },
    );
  }

  revalidatePath(PROBE_PATH);

  return Response.json({
    revalidated: true,
    path: PROBE_PATH,
    deploymentUrl: process.env.VERCEL_URL ?? null,
    vercelEnv: process.env.VERCEL_ENV ?? null,
    at: new Date().toISOString(),
  });
}
