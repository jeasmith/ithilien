/**
 * Throwaway revalidation endpoint for #98.
 *
 * Calls `revalidatePath` on the ISR probe page so the probe can measure whether,
 * and how quickly, the invalidation reaches the copy served at the shared origin
 * when the request arrives through the microfrontends proxy.
 *
 * This runs on production, because production is the only place it can run: both
 * Vercel projects use `ssoProtection: all_except_custom_domains`, so every
 * `*.vercel.app` URL — preview *and* Radar's own production deployment URL —
 * answers an unauthenticated request with a 302 to `vercel.com/sso-api`. The
 * custom domain is the only reachable surface, and it only serves production.
 *
 * It is therefore secret-guarded and fails closed: no secret configured, no
 * revalidation. The secret lives in Vercel env config, never in the repo.
 *
 * Delete this route once #98 records its answer.
 *
 * @see https://github.com/jeasmith/ithilien/issues/98
 */
import { createHash, timingSafeEqual } from "node:crypto";
import { revalidatePath } from "next/cache";

/** The probe endpoint must never be cached or prerendered. */
export const dynamic = "force-dynamic";

/** The page this endpoint invalidates. */
const PROBE_PATH = "/radar/isr-probe";

/**
 * Constant-time comparison. Both sides are hashed first so the comparison is
 * always over equal-length buffers — `timingSafeEqual` throws on a length
 * mismatch, and an early return on length would leak the secret's length.
 */
function secretMatches(provided: string, expected: string): boolean {
  return timingSafeEqual(
    createHash("sha256").update(provided).digest(),
    createHash("sha256").update(expected).digest(),
  );
}

/** Invalidates the probe page for a caller holding the shared secret. */
export async function POST(request: Request): Promise<Response> {
  const expected = process.env.RADAR_PROBE_SECRET;

  if (!expected) {
    return Response.json(
      { error: "RADAR_PROBE_SECRET is not configured." },
      { status: 503 },
    );
  }

  const provided = request.headers.get("x-probe-secret");

  if (!provided || !secretMatches(provided, expected)) {
    return Response.json({ error: "Forbidden." }, { status: 403 });
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
