import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { runMatchAgent } from "@/lib/agent/run";
import { embedQuery } from "@/lib/embeddings";

export const maxDuration = 60;

export async function GET() {
  try {
    // Isolate the embedding call first, before anything else can fail.
    const envCheck = {
      voyageKeyPresent: !!process.env.VOYAGE_API_KEY,
      voyageKeyLength: process.env.VOYAGE_API_KEY?.length ?? 0,
    };
    const testEmbedding = await embedQuery("test");

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
      envCheck,
      testEmbeddingLength: testEmbedding.length,
      calledSearchPolicies: result.steps.some((s) => s.tool === "search_policies"),
      steps: result.steps,
      finalText: result.finalText,
    });
  } catch (err) {
    return NextResponse.json({
      caughtError: err instanceof Error ? err.message : String(err),
      stack: err instanceof Error ? err.stack : undefined,
    }, { status: 500 });
  }
}
