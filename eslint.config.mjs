import { defineConfig, globalIgnores } from "eslint/config";
import nextVitals from "eslint-config-next/core-web-vitals";
import nextTs from "eslint-config-next/typescript";
import prettier from "eslint-config-prettier";
import oxlint from "eslint-plugin-oxlint";

// Turns off the ESLint rules that oxlint already enforces, derived from
// .oxlintrc.json so the two stay in sync automatically. Must come last —
// it only removes rules, never adds them.
const oxlintOverrides = oxlint.buildFromOxlintConfigFile(".oxlintrc.json");

/** ESLint flat config combining Next.js, TypeScript, and Prettier rules. */
const eslintConfig = defineConfig([
  ...nextVitals,
  ...nextTs,
  prettier,
  ...oxlintOverrides,
  globalIgnores([".next/**", "out/**", "build/**", "next-env.d.ts"]),
]);

export default eslintConfig;
