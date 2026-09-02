/**
 * Guards the microfrontends routing table. Ithilien is the default
 * application, so it owns microfrontends.json and a mistake here silently
 * sends traffic to the wrong deployment.
 */
import { describe, expect, it } from "vitest";
import { validateRouting } from "@vercel/microfrontends/next/testing";

/** Resolved against the app directory, which is Vitest's working directory. */
const CONFIG = "./microfrontends.json";

describe("microfrontends routing", () => {
  it("routes the Radar digest to the Radar application", () => {
    expect(() =>
      validateRouting(CONFIG, {
        radar: [
          "/radar",
          "/radar/an-entry",
          "/radar/nested/an-entry",
          // Route handlers are ordinary paths to the proxy. Verified against a
          // real deployment by the #98 probe.
          "/radar/api/an-endpoint",
        ],
      }),
    ).not.toThrow();
  });

  it("keeps the site root on Ithilien", () => {
    expect(() =>
      validateRouting(CONFIG, {
        ithilien: ["/", "/about", "/posts/a-post"],
      }),
    ).not.toThrow();
  });
});
