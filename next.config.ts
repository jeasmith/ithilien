import type { NextConfig } from "next";

/**
 * Next.js configuration.
 *
 * Key decisions:
 * - Static export (`output: "export"`) for the initial iteration. All pages
 *   are statically rendered at build time. This gives us the fastest possible
 *   page loads and the simplest deployment model on Vercel.
 * - Strict React mode is enabled by default in Next.js 16.
 * - Security headers are configured at the Vercel layer (see vercel.json)
 *   rather than in Next.js middleware, since we are using static export.
 *
 * @see docs/adr/0006-static-rendering-by-default.md
 */
const nextConfig: NextConfig = {
  output: "export",
  /** Generate clean URLs without trailing slashes. */
  trailingSlash: false,
  /**
   * Disable Next.js image optimisation. The default loader relies on a
   * runtime optimisation endpoint which is incompatible with
   * `output: "export"`, so we serve images as-is from the static bundle.
   */
  images: {
    unoptimized: true,
  },
};

export default nextConfig;
