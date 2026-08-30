import { withMicrofrontends } from "@vercel/microfrontends/next/config";
import type { NextConfig } from "next";

/**
 * Next.js configuration for the default microfrontend.
 *
 * Uses the standard Next.js production server so local production runs and
 * Vercel deployments share the same Next.js runtime behavior.
 *
 * `withMicrofrontends` sets the asset prefix so this app's JS and CSS are
 * routed back here when it is served under the shared origin.
 *
 * @see docs/adr/0010-use-the-nextjs-production-server.md
 * @see docs/adr/0016-vercel-microfrontends.md
 */
const nextConfig: NextConfig = {
  trailingSlash: false,
  transpilePackages: ["@repo/ui"],
};

export default withMicrofrontends(nextConfig);
