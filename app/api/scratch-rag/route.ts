import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { runMatchAgent } from "@/lib/agent/run";

export const maxDuration = 60;

export async function GET() {
  const supabase = await createClient();

  const { data: employees } = await supabase.from("employees").select("*").limit(3);
  const { data: shifts } = await supabase.from("shifts").select("*").limit(1);
  if (!employees || employees.length < 2 || !shifts || shifts.length < 1) {
    return NextResponse.json({ error: "Need at least 2 employees and 1 shift in the DB to run this test." });
  }
  const requester = employees.find((e) => e.name) ?? employees[0];
  const shift = shifts[0];

  const { data: swap, error: swapErr } = await supabase
    .from("swap_requests").insert({ shift_id: shift.id }).select().single();
  if (swapErr) return NextResponse.json({ error: swapErr.message });

  await supabase.from("swap_events").insert({
    swap_id: swap.id,
    type: "requested",
    payload: { shiftId: shift.id, requestedBy: requester.id },
  });

  const result = await runMatchAgent(swap.id);

  // Cleanup
  await supabase.from("swap_requests").delete().eq("id", swap.id);

  return NextResponse.json({
    calledSearchPolicies: result.steps.some((s) => s.tool === "search_policies"),
    steps: result.steps,
    finalText: result.finalText,
  });
}
