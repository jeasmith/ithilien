/**
 * Vitest global setup — registers jest-dom matchers and cleans up the DOM
 * after each test to prevent state leaking between test cases.
 */
import { cleanup } from "@testing-library/react";
import "@testing-library/jest-dom/vitest";
import { afterEach } from "vitest";

/**
 * `withMicrofrontends` injects the routing config into the client bundle at
 * build time. Vitest never runs that step, and the microfrontends-aware `Link`
 * throws without it, so supply the minimum it needs: which application owns
 * which path, and which one is the default.
 *
 * This mirrors apps/ithilien/microfrontends.json. The real file is asserted
 * against in Ithilien's own routing test.
 *
 * A real build hashes the application keys (`radar` becomes something like
 * `50b7fe`). Readable names are used here because the values only have to
 * agree with NEXT_PUBLIC_MFE_CURRENT_APPLICATION_HASH below, and names make a
 * failing assertion legible.
 */
process.env.NEXT_PUBLIC_MFE_CLIENT_CONFIG = JSON.stringify({
  applications: {
    ithilien: { default: true },
    radar: { routing: [{ paths: ["/radar", "/radar/:path*"] }] },
  },
});

/**
 * Identifies which application is rendering, matching a key in the config
 * above. Without it every link looks like it belongs to a different
 * application, which would hide the difference between an in-app transition
 * and a cross-application navigation.
 */
process.env.NEXT_PUBLIC_MFE_CURRENT_APPLICATION_HASH = "radar";

afterEach(() => {
  cleanup();
});
