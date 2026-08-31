import { withMicrofrontends } from "@vercel/microfrontends/next/config";
import type { NextConfig } from "next";

/**
 * Next.js configuration for the Radar microfrontend.
 *
 * Radar is a child application in the microfrontends group. Vercel routes
 * `/radar/*` here without stripping the prefix, which is why the routes live
 * under `src/app/radar/` rather than using `basePath` — `basePath` is not
 * supported by Vercel microfrontends.
 *
 * @see docs/adr/0016-vercel-microfrontends.md
 */
const nextConfig: NextConfig = {
  trailingSlash: false,
  transpilePackages: ["@repo/ui"],
};

export default withMicrofrontends(nextConfig);
