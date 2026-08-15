import { defineConfig } from "vitest/config";

// Only evals/live pays for this: env loading + the OTEL/Langfuse SDK. Kept
// out of vitest.config.mts so `npm test` (Tier 1) stays fast and dependency-free.
// Self-contained rather than importing the base config — small enough that
// duplicating resolve.alias/test.include beats fighting sibling .mts module resolution.
export default defineConfig({
  resolve: {
    alias: {
      "@": import.meta.dirname,
    },
  },
  test: {
    environment: "node",
    include: ["**/*.eval.ts"],
    setupFiles: ["./evals/live/setup-env.ts"],
  },
});
