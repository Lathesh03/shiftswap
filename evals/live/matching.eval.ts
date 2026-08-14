// Tier 2: live-LLM evals. Real Claude calls, real Voyage embeddings, real
// (seeded and torn-down) Supabase rows. Run with `npm run eval` — not part
// of the CI-blocking `npm test` gate, since it costs tokens and is
// nondeterministic by nature.
import { describe, it, expect } from "vitest";
import { adminClient, runScenarioOnce, passAtK, type LiveRunResult } from "@/evals/live/harness";
import { scenarios, type Scenario } from "@/evals/scenarios";

const supabase = adminClient();

function byName(name: string): Scenario {
  const scenario = scenarios.find((s) => s.name === name);
  if (!scenario) throw new Error(`Unknown scenario: ${name}`);
  return scenario;
}

// Resolve the real employee id the agent proposed back to the scenario's
// local key, so we can check it against `expect.acceptableCandidateKeys`.
function candidateKeyOf(result: LiveRunResult): string | undefined {
  return Object.entries(result.seeded.employeeIds).find(([, id]) => id === result.proposedCandidateId)?.[0];
}

describe("match agent — live", () => {
  it(
    "clear-match: proposes the eligible candidate, never the busy one (pass@3)",
    async () => {
      const scenario = byName("clear-match");
      const { passed, k, results } = await passAtK(supabase, scenario, 3, (r) => {
        const key = candidateKeyOf(r);
        return key !== undefined && scenario.expect.acceptableCandidateKeys!.includes(key);
      });

      // Hard guardrail on every run, not just the majority: if it proposed
      // anyone, that candidate must be one of the genuinely eligible ones.
      for (const r of results) {
        if (r.proposedCandidateId !== null) {
          expect(scenario.expect.acceptableCandidateKeys).toContain(candidateKeyOf(r));
        }
      }

      // Capability check — tolerant of occasional model flakiness.
      expect(passed, `${passed}/${k} runs proposed the eligible candidate`).toBeGreaterThanOrEqual(2);
    },
    180_000
  );

  it(
    "no-eligible-candidates: never proposes a match, on every run",
    async () => {
      const scenario = byName("no-eligible-candidates");
      const { passed, k } = await passAtK(supabase, scenario, 3, (r) => r.proposedCandidateId === null);
      // Hard guardrail — must hold every time, not just pass@k.
      expect(passed, `${passed}/${k} runs correctly proposed no match`).toBe(k);
    },
    180_000
  );

  it(
    "multiple-eligible: proposes one of the genuinely eligible candidates",
    async () => {
      const scenario = byName("multiple-eligible");
      const { passed, k, results } = await passAtK(supabase, scenario, 3, (r) => {
        const key = candidateKeyOf(r);
        return key !== undefined && scenario.expect.acceptableCandidateKeys!.includes(key);
      });

      for (const r of results) {
        if (r.proposedCandidateId !== null) {
          expect(scenario.expect.acceptableCandidateKeys).toContain(candidateKeyOf(r));
        }
      }

      expect(passed, `${passed}/${k} runs proposed an eligible candidate`).toBeGreaterThanOrEqual(2);
    },
    180_000
  );

  it(
    "cites a policy passage when it proposes a match",
    async () => {
      const scenario = byName("clear-match");
      const result = await runScenarioOnce(supabase, scenario);
      try {
        expect(result.citedSearchPolicies).toBe(true);
      } finally {
        await result.seeded.cleanup();
      }
    },
    60_000
  );
});
