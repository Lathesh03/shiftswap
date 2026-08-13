import type { SupabaseClient } from "@supabase/supabase-js";
import { assertTransition, deriveState, rowToEvent } from "@/lib/swaps";
import { embedQuery } from "@/lib/embeddings";
import { eligibleCandidates, checkCandidate } from "@/lib/scheduling/rules";

// TOOL 1 (read-only): who could take this swap's shift?
export async function findEligibleCandidates(supabase: SupabaseClient, swapId: string) {
  const { data: rows } = await supabase
    .from("swap_events").select("*").eq("swap_id", swapId)
    .order("created_at", { ascending: true });
  const state = deriveState((rows ?? []).map(rowToEvent));
  if (!state.shiftId) return { error: "Swap has no shift." };

  const { data: shift } = await supabase
    .from("shifts").select("*").eq("id", state.shiftId).single();

  const { data: employees } = await supabase
    .from("employees").select("*").neq("id", state.requestedBy ?? "");
  const { data: allShifts } = await supabase.from("shifts").select("*");

  const eligible = eligibleCandidates(shift, employees ?? [], allShifts ?? [], state.requestedBy)
    .map((e) => ({ id: e.id, name: e.name, position: e.position, department: e.department }));

  return { shift: { id: shift.id, starts_at: shift.starts_at, ends_at: shift.ends_at }, eligible };
}

// TOOL 2 (read-only): may THIS candidate take the shift? Returns reasons.
export async function checkLaborRules(supabase: SupabaseClient, candidateId: string, swapId: string) {
  const { data: rows } = await supabase
    .from("swap_events").select("*").eq("swap_id", swapId)
    .order("created_at", { ascending: true });
  const state = deriveState((rows ?? []).map(rowToEvent));

  const { data: shift } = await supabase
    .from("shifts").select("*").eq("id", state.shiftId!).single();
  const { data: candidateShifts } = await supabase
    .from("shifts").select("*").eq("employee_id", candidateId);

  return checkCandidate(candidateId, state.requestedBy, shift, candidateShifts ?? []);
}

// TOOL 3 (ACTION — GUARDED): record the match.
// The agent can ONLY match through here, and here we re-check everything.
export async function proposeMatch(supabase: SupabaseClient, swapId: string, candidateId: string) {
  // 1. Re-validate the rules server-side. NEVER trust that the model checked.
  const rules = await checkLaborRules(supabase, candidateId, swapId);
  if (!rules.allowed) {
    return { ok: false, error: `Match rejected: ${rules.reasons.join(" ")}` };
  }

  // 2. Guard the state transition (same guard the buttons use).
  const { data: rows } = await supabase
    .from("swap_events").select("*").eq("swap_id", swapId)
    .order("created_at", { ascending: true });
  const events = (rows ?? []).map(rowToEvent);
  const check = assertTransition(events, "matched");
  if (!check.ok) return { ok: false, error: check.error };

  // 3. Append the SAME event, to the SAME log.
  const { error } = await supabase.from("swap_events").insert({
    swap_id: swapId,
    type: "matched",
    payload: { candidateId },
  });
  if (error) return { ok: false, error: error.message };

  return { ok: true, candidateId };
}

// TOOL 4 (read-only, RAG): search company policy for passages relevant to a question.
export async function searchPolicies(supabase: SupabaseClient, query: string) {
  const query_embedding = await embedQuery(query);
  const { data, error } = await supabase.rpc("match_policies", {
    query_embedding,
    match_count: 3,
  });
  if (error) return { error: error.message };
  return { matches: data }; // [{ source, content, similarity }, ...]
}
