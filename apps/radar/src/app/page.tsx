import { redirect } from "next/navigation";

/**
 * Radar owns `/radar` on the shared origin, so `/` is never routed here in
 * production. This redirect only matters when the Radar deployment is visited
 * directly on its own Vercel domain, where a bare 404 would look like a fault.
 */
export default function RootPage() {
  redirect("/radar");
}
