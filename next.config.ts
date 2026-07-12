import type { NextConfig } from "next";

/**
 * Next.js configuration.
 *
 * Uses the standard Next.js production server so local production runs and
 * Vercel deployments share the same Next.js runtime behavior.
 *
 * @see docs/adr/0009-use-the-nextjs-production-server.md
 */
const nextConfig: NextConfig = {
  trailingSlash: false,
};

export default nextConfig;
