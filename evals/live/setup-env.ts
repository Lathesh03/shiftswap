// Runs before any evals/live test file is imported (wired via vitest.config.mts
// test.setupFiles), so env vars are in process.env before any module-level
// client construction (e.g. `new Anthropic()` in lib/agent/run.ts) happens.
import path from "node:path";

try {
  process.loadEnvFile(path.resolve(process.cwd(), ".env.local"));
} catch {
  // No .env.local (e.g. CI) — env vars are expected to already be set.
}
