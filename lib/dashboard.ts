import { createClient } from "@/lib/supabase/server";
import { deriveState, rowToEvent } from "@/lib/swaps";
import type { SwapState } from "@/lib/types";
import type { AgentStep } from "@/lib/agent/loop";
import type { EligibilityResult } from "@/lib/scheduling/core";

type ShiftRow = {
  id: string;
  employee_id: string | null;
  starts_at: string;
  ends_at: string;
  status: string;
};

type EmployeeRow = { id: string; name: string; department: string };

export type AgentDecision = {
  id: string;
  swap_id: string;
  summary: string;
  considered: EligibilityResult;
  citations: string[];
  steps: AgentStep[];
  created_at: string;
};

export type SwapWithContext = SwapState & {
  id: string;
  shift: ShiftRow | null;
  decision: AgentDecision | null;
  requesterName: string;
  requesterDepartment: string;
  candidateName: string;
};

export async function getSwapsWithContext(): Promise<SwapWithContext[]> {
  const supabase = await createClient();
  const [{ data: swaps }, { data: events }, { data: decisions }, { data: employees }, { data: shifts }] =
    await Promise.all([
      supabase.from("swap_requests").select("*").order("created_at", { ascending: false }),
      supabase.from("swap_events").select("*").order("created_at", { ascending: true }),
      supabase.from("agent_decisions").select("*").order("created_at", { ascending: false }),
      supabase.from("employees").select("id, name, department").returns<EmployeeRow[]>(),
      supabase.from("shifts").select("*").returns<ShiftRow[]>(),
    ]);

  const employeeById = (id: string | null) => employees?.find((e) => e.id === id) ?? null;

  return (swaps ?? []).map((s) => {
    const history = (events ?? []).filter((e) => e.swap_id === s.id).map(rowToEvent);
    const state = deriveState(history);
    return {
      id: s.id,
      ...state,
      shift: shifts?.find((sh) => sh.id === state.shiftId) ?? null,
      decision: ((decisions ?? []) as AgentDecision[]).find((d) => d.swap_id === s.id) ?? null,
      requesterName: employeeById(state.requestedBy)?.name ?? "—",
      requesterDepartment: employeeById(state.requestedBy)?.department ?? "—",
      candidateName: employeeById(state.candidateId)?.name ?? "—",
    };
  });
}

export async function getSwapWithContext(swapId: string): Promise<SwapWithContext | null> {
  const swaps = await getSwapsWithContext();
  return swaps.find((s) => s.id === swapId) ?? null;
}

// id -> name, for resolving historical actors (approvedBy, past candidates
// from an overridden match) in a swap's timeline.
export async function getEmployeeDirectory(): Promise<Record<string, string>> {
  const supabase = await createClient();
  const { data: employees } = await supabase.from("employees").select("id, name").returns<{ id: string; name: string }[]>();
  return Object.fromEntries((employees ?? []).map((e) => [e.id, e.name]));
}
