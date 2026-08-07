import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { findEligibleCandidates, checkLaborRules, proposeMatch } from "@/lib/agent/tools";

export async function GET() {
  const supabase = await createClient();
  const results: Record<string, unknown> = {};

  const { data: employees } = await supabase.from("employees").select("*").limit(3);
  const { data: shifts } = await supabase.from("shifts").select("*").limit(1);
  if (!employees || employees.length < 2 || !shifts || shifts.length < 1) {
    return NextResponse.json({ error: "Need at least 2 employees and 1 shift in the DB to run this test." });
  }
  const [requester, candidateA, candidateB] = employees;
  const shift = shifts[0];

  // Create a fresh test swap
  const { data: swap, error: swapErr } = await supabase
    .from("swap_requests").insert({ shift_id: shift.id }).select().single();
  if (swapErr) return NextResponse.json({ error: swapErr.message });

  await supabase.from("swap_events").insert({
    swap_id: swap.id,
    type: "requested",
    payload: { shiftId: shift.id, requestedBy: requester.id },
  });

  results.eligible = await findEligibleCandidates(swap.id);
  results.laborRulesForRequester = await checkLaborRules(requester.id, swap.id);

  results.selfMatchAttempt = await proposeMatch(swap.id, requester.id);

  const otherCandidate = candidateB ?? candidateA;
  results.legalMatchAttempt = await proposeMatch(swap.id, otherCandidate.id);

  results.matchAgainAttempt = await proposeMatch(swap.id, otherCandidate.id);

  // Cleanup
  await supabase.from("swap_requests").delete().eq("id", swap.id);

  return NextResponse.json(results);
}
