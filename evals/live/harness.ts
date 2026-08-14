// Tier 2: seeds real rows into the real Supabase project, runs the real
// agent (real Claude + Voyage calls), asserts, then always tears down.
// Not for CI-on-every-push — this costs tokens and touches production data.
import { createClient, type SupabaseClient } from "@supabase/supabase-js";
import { runMatchAgentWith } from "@/lib/agent/run";
import type { AgentResult } from "@/lib/agent/loop";
import type { Scenario } from "@/evals/scenarios";

export function adminClient(): SupabaseClient {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !key) {
    throw new Error("Live evals need NEXT_PUBLIC_SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY set.");
  }
  return createClient(url, key);
}

export type SeededScenario = {
  swapId: string;
  employeeIds: Record<string, string>;
  shiftIds: Record<string, string>;
  cleanup: () => Promise<void>;
};

export async function seedScenario(supabase: SupabaseClient, scenario: Scenario): Promise<SeededScenario> {
  const employeeIds: Record<string, string> = {};
  for (const e of scenario.employees) {
    const { data, error } = await supabase
      .from("employees")
      .insert({ name: e.name, email: e.email, position: e.position, department: e.department })
      .select("id")
      .single();
    if (error) throw new Error(`Seeding employee '${e.key}' failed: ${error.message}`);
    employeeIds[e.key] = data.id;
  }

  const shiftIds: Record<string, string> = {};
  for (const s of scenario.shifts) {
    const { data, error } = await supabase
      .from("shifts")
      .insert({
        employee_id: s.employeeKey ? employeeIds[s.employeeKey] : null,
        starts_at: s.startsAt,
        ends_at: s.endsAt,
        status: s.status,
      })
      .select("id")
      .single();
    if (error) throw new Error(`Seeding shift '${s.key}' failed: ${error.message}`);
    shiftIds[s.key] = data.id;
  }

  const targetShift = scenario.shifts.find((s) => s.key === scenario.swapShiftKey)!;
  const targetShiftId = shiftIds[scenario.swapShiftKey];
  const requesterId = employeeIds[scenario.requesterKey];

  // findEligibleCandidates() queries the WHOLE employees/shifts tables, not
  // anything scoped to this scenario. Any real, pre-existing employee with no
  // shift on the scenario's date would otherwise look "eligible" too and the
  // agent could legitimately propose them — give every one of them a shift
  // overlapping the target window so only this scenario's fixtures are free.
  const { data: allEmployees, error: allEmpErr } = await supabase.from("employees").select("id");
  if (allEmpErr) throw new Error(`Fetching existing employees failed: ${allEmpErr.message}`);
  const scenarioEmployeeIds = new Set(Object.values(employeeIds));
  const foreignEmployeeIds = (allEmployees ?? []).map((e) => e.id).filter((id) => !scenarioEmployeeIds.has(id));

  let blockingShiftIds: string[] = [];
  if (foreignEmployeeIds.length > 0) {
    const { data: blockingShifts, error: blockErr } = await supabase
      .from("shifts")
      .insert(
        foreignEmployeeIds.map((employee_id) => ({
          employee_id,
          starts_at: targetShift.startsAt,
          ends_at: targetShift.endsAt,
          status: "assigned",
        }))
      )
      .select("id");
    if (blockErr) throw new Error(`Blocking pre-existing employees failed: ${blockErr.message}`);
    blockingShiftIds = (blockingShifts ?? []).map((s) => s.id);
  }

  const { data: swapRequest, error: swapErr } = await supabase
    .from("swap_requests").insert({ shift_id: targetShiftId }).select("id").single();
  if (swapErr) throw new Error(`Seeding swap_requests failed: ${swapErr.message}`);

  const { error: evErr } = await supabase.from("swap_events").insert({
    swap_id: swapRequest.id,
    type: "requested",
    payload: { shiftId: targetShiftId, requestedBy: requesterId },
  });
  if (evErr) throw new Error(`Seeding 'requested' event failed: ${evErr.message}`);

  const cleanup = async () => {
    await supabase.from("swap_events").delete().eq("swap_id", swapRequest.id);
    await supabase.from("swap_requests").delete().eq("id", swapRequest.id);
    const allShiftIds = [...Object.values(shiftIds), ...blockingShiftIds];
    if (allShiftIds.length > 0) {
      await supabase.from("shifts").delete().in("id", allShiftIds);
    }
    if (Object.values(employeeIds).length > 0) {
      await supabase.from("employees").delete().in("id", Object.values(employeeIds));
    }
  };

  return { swapId: swapRequest.id, employeeIds, shiftIds, cleanup };
}

export type LiveRunResult = {
  scenario: string;
  agentResult: AgentResult;
  proposedCandidateId: string | null;
  citedSearchPolicies: boolean;
  seeded: SeededScenario;
};

// Seed, run the real agent once, and report what happened. Cleanup is the
// caller's responsibility (via result.seeded.cleanup()) so a failing
// assertion can still inspect the seeded ids before rows are removed.
export async function runScenarioOnce(supabase: SupabaseClient, scenario: Scenario): Promise<LiveRunResult> {
  const seeded = await seedScenario(supabase, scenario);
  const agentResult = await runMatchAgentWith(supabase, seeded.swapId);

  const proposeStep = agentResult.steps.find((s) => s.tool === "propose_match");
  const proposedCandidateId = proposeStep
    ? ((proposeStep.output as { ok?: boolean; candidateId?: string }).candidateId ?? null)
    : null;
  const citedSearchPolicies = agentResult.steps.some((s) => s.tool === "search_policies");

  return { scenario: scenario.name, agentResult, proposedCandidateId, citedSearchPolicies, seeded };
}

// pass@k: run a scenario k times, report how many satisfy `check`. Use this
// for capability checks that tolerate model flakiness; for hard guardrails
// (never propose an ineligible candidate) assert on every run instead.
export async function passAtK(
  supabase: SupabaseClient,
  scenario: Scenario,
  k: number,
  check: (result: LiveRunResult) => boolean
): Promise<{ passed: number; k: number; results: LiveRunResult[] }> {
  const results: LiveRunResult[] = [];
  for (let i = 0; i < k; i++) {
    const result = await runScenarioOnce(supabase, scenario);
    try {
      results.push(result);
    } finally {
      await result.seeded.cleanup();
    }
  }
  return { passed: results.filter(check).length, k, results };
}
