import { defineConfig } from "vitest/config";

export default defineConfig({
  resolve: {
    alias: {
      "@": import.meta.dirname,
    },
  },
  test: {
    environment: "node",
    include: ["**/*.test.ts", "**/*.eval.ts"],
    setupFiles: ["./evals/live/setup-env.ts"],
  },
});
