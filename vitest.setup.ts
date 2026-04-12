/**
 * Vitest global setup — registers jest-dom matchers and cleans up the DOM
 * after each test to prevent state leaking between test cases.
 */
import { cleanup } from "@testing-library/react";
import "@testing-library/jest-dom/vitest";
import { afterEach } from "vitest";

afterEach(() => {
  cleanup();
});
