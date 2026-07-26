import type { NextConfig } from "next";

/**
 * Next.js configuration.
 *
 * Uses the standard Next.js production server so local production runs and
 * Vercel deployments share the same Next.js runtime behavior.
 *
 * @see docs/adr/0010-use-the-nextjs-production-server.md
 */
const nextConfig: NextConfig = {
  trailingSlash: false,

  experimental: {
    // TypeScript 7 no longer exposes the compiler API Next.js uses for its
    // build-time type check. This makes Next shell out to the tsc CLI instead.
    // Remove once Next.js supports the TypeScript 7 API natively.
    // @see docs/adr/0012-upgrade-to-typescript-7.md
    useTypeScriptCli: true,
  },
};

export default nextConfig;
