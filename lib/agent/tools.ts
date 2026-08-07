import { createClient } from "@/lib/supabase/server";
import { assertTransition, deriveState, rowToEvent } from "@/lib/swaps";

// Small helper: overlap test for two time ranges.
function overlaps(aStart: string, aEnd: string, bStart: string, bEnd: string) {
  return new Date(aStart) < new Date(bEnd) && new Date(aEnd) > new Date(bStart);
}

// TOOL 1 (read-only): who could take this swap's shift?
export async function findEligibleCandidates(swapId: string) {
  const supabase = await createClient();

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

  const eligible = (employees ?? [])
    .filter((e) =>
      !(allShifts ?? []).some(
        (s) => s.employee_id === e.id &&
          overlaps(s.starts_at, s.ends_at, shift.starts_at, shift.ends_at)
      )
    )
    .map((e) => ({ id: e.id, name: e.name, position: e.position, department: e.department }));

  return { shift: { id: shift.id, starts_at: shift.starts_at, ends_at: shift.ends_at }, eligible };
}

// TOOL 2 (read-only): may THIS candidate take the shift? Returns reasons.
export async function checkLaborRules(candidateId: string, swapId: string) {
  const supabase = await createClient();

  const { data: rows } = await supabase
    .from("swap_events").select("*").eq("swap_id", swapId)
    .order("created_at", { ascending: true });
  const state = deriveState((rows ?? []).map(rowToEvent));

  const reasons: string[] = [];
  if (candidateId === state.requestedBy) reasons.push("Candidate is the requester.");

  const { data: shift } = await supabase
    .from("shifts").select("*").eq("id", state.shiftId!).single();
  const { data: candidateShifts } = await supabase
    .from("shifts").select("*").eq("employee_id", candidateId);

  const clash = (candidateShifts ?? []).some((s) =>
    overlaps(s.starts_at, s.ends_at, shift.starts_at, shift.ends_at)
  );
  if (clash) reasons.push("Candidate already works an overlapping shift.");

  return { allowed: reasons.length === 0, reasons };
}

// TOOL 3 (ACTION — GUARDED): record the match.
// The agent can ONLY match through here, and here we re-check everything.
export async function proposeMatch(swapId: string, candidateId: string) {
  const supabase = await createClient();

  // 1. Re-validate the rules server-side. NEVER trust that the model checked.
  const rules = await checkLaborRules(candidateId, swapId);
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
