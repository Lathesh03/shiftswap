import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { proposeMatch } from "@/lib/agent/tools";
import { runMatchAgent } from "@/lib/agent/run";

export const maxDuration = 60;

type SupabaseClient = Awaited<ReturnType<typeof createClient>>;

async function makeEmployee(supabase: SupabaseClient, label: string) {
  const { data, error } = await supabase
    .from("employees")
    .insert({
      name: `QA ${label}`,
      email: `qa-${label.toLowerCase().replace(/\s+/g, "-")}-${Date.now()}@example.com`,
      position: "Server",
      department: "Floor",
    })
    .select().single();
  if (error) throw new Error(error.message);
  return data;
}

async function makeShift(supabase: SupabaseClient, employeeId: string | null, day: string) {
  const { data, error } = await supabase
    .from("shifts")
    .insert({
      employee_id: employeeId,
      starts_at: `${day}T09:00:00Z`,
      ends_at: `${day}T17:00:00Z`,
      status: employeeId ? "assigned" : "open",
    })
    .select().single();
  if (error) throw new Error(error.message);
  return data;
}

async function makeSwap(supabase: SupabaseClient, shiftId: string, requestedBy: string) {
  const { data: swap, error } = await supabase
    .from("swap_requests").insert({ shift_id: shiftId }).select().single();
  if (error) throw new Error(error.message);
  await supabase.from("swap_events").insert({
    swap_id: swap.id, type: "requested", payload: { shiftId, requestedBy },
  });
  return swap;
}

export async function GET() {
  const supabase = await createClient();
  const createdEmployeeIds: string[] = [];
  const createdShiftIds: string[] = [];
  const createdSwapIds: string[] = [];

  try {
    const requester = await makeEmployee(supabase, "Requester");
    const candidateA = await makeEmployee(supabase, "Candidate A");
    const candidateB = await makeEmployee(supabase, "Candidate B");
    createdEmployeeIds.push(requester.id, candidateA.id, candidateB.id);

    // ---------- Test 1: illegal state (swap already approved) ----------
    const shift1 = await makeShift(supabase, requester.id, "2026-09-01");
    createdShiftIds.push(shift1.id);
    const swap1 = await makeSwap(supabase, shift1.id, requester.id);
    createdSwapIds.push(swap1.id);

    // Advance it for real (matched), then simulate a manager's approval directly.
    await proposeMatch(swap1.id, candidateA.id);
    await supabase.from("swap_events").insert({
      swap_id: swap1.id, type: "approved", payload: { approvedBy: "qa-manager" },
    });

    const agentOnApproved = await runMatchAgent(swap1.id);
    const { data: eventsAfterTest1 } = await supabase
      .from("swap_events").select("*").eq("swap_id", swap1.id).order("created_at", { ascending: true });

    const test1 = {
      description: "Agent run against a swap already in 'approved' state",
      agentSteps: agentOnApproved.steps.map((s) => ({ tool: s.tool, output: s.output })),
      finalText: agentOnApproved.finalText,
      eventTypesAfter: (eventsAfterTest1 ?? []).map((e) => e.type),
      passed:
        (eventsAfterTest1 ?? []).filter((e) => e.type === "matched").length === 1 && // still only the ONE real match from setup
        agentOnApproved.steps.some(
          (s) => s.tool === "propose_match" && (s.output as { ok: boolean }).ok === false
        ),
    };

    // ---------- Test 2: rule violation via a race condition ----------
    const shift2 = await makeShift(supabase, requester.id, "2026-09-02");
    createdShiftIds.push(shift2.id);
    const swap2 = await makeSwap(supabase, shift2.id, requester.id);
    createdSwapIds.push(swap2.id);

    // At this instant, candidateA is free — a real check would say "eligible."
    // Now simulate something changing between check and commit: candidateA
    // picks up a conflicting shift right before we try to commit the match.
    const racingShift = await makeShift(supabase, candidateA.id, "2026-09-02");
    createdShiftIds.push(racingShift.id);

    const raceAttempt = await proposeMatch(swap2.id, candidateA.id);
    const test2 = {
      description: "propose_match called for a candidate who had a conflict-free record moments earlier, but now has an overlapping shift",
      result: raceAttempt,
      passed: raceAttempt.ok === false,
    };

    // ---------- Test 3: no eligible candidates ----------
    const shift3 = await makeShift(supabase, requester.id, "2026-09-03");
    createdShiftIds.push(shift3.id);
    const swap3 = await makeSwap(supabase, shift3.id, requester.id);
    createdSwapIds.push(swap3.id);

    // Block EVERY other employee in the table at this time — not just the
    // fixtures we created — so there is genuinely no one left eligible.
    const { data: allEmployees } = await supabase.from("employees").select("id").neq("id", requester.id);
    for (const e of allEmployees ?? []) {
      const block = await makeShift(supabase, e.id, "2026-09-03");
      createdShiftIds.push(block.id);
    }

    const agentNoCandidates = await runMatchAgent(swap3.id);
    const { data: eventsAfterTest3 } = await supabase
      .from("swap_events").select("*").eq("swap_id", swap3.id).order("created_at", { ascending: true });

    const test3 = {
      description: "Agent run where every other employee has a conflicting shift",
      agentSteps: agentNoCandidates.steps.map((s) => ({ tool: s.tool, output: s.output })),
      finalText: agentNoCandidates.finalText,
      eventTypesAfter: (eventsAfterTest3 ?? []).map((e) => e.type),
      passed:
        !agentNoCandidates.steps.some((s) => s.tool === "propose_match") &&
        !(eventsAfterTest3 ?? []).some((e) => e.type === "matched"),
    };

    return NextResponse.json({ test1, test2, test3 });
  } finally {
    // Cleanup — swaps cascade their events; delete shifts and employees last.
    for (const id of createdSwapIds) await supabase.from("swap_requests").delete().eq("id", id);
    for (const id of createdShiftIds) await supabase.from("shifts").delete().eq("id", id);
    for (const id of createdEmployeeIds) await supabase.from("employees").delete().eq("id", id);
  }
}
