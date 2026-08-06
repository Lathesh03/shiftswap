import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { deriveState, rowToEvent } from "@/lib/swaps";

export async function POST(request: Request) {
  const supabase = await createClient();
  const { shiftId, requestedBy } = (await request.json()) as {
    shiftId: string;
    requestedBy: string;
  };

  const { data: swap, error: swapErr } = await supabase
    .from("swap_requests").insert({ shift_id: shiftId }).select().single();
  if (swapErr) return NextResponse.json({ error: swapErr.message }, { status: 400 });

  const { error: evErr } = await supabase.from("swap_events").insert({
    swap_id: swap.id,
    type: "requested",
    payload: { shiftId, requestedBy },
  });
  if (evErr) return NextResponse.json({ error: evErr.message }, { status: 400 });

  return NextResponse.json({ swap }, { status: 201 });
}

export async function GET() {
  const supabase = await createClient();
  const { data: swaps, error } = await supabase
    .from("swap_requests").select("*").order("created_at", { ascending: false });
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  const { data: events } = await supabase
    .from("swap_events").select("*").order("created_at", { ascending: true });

  const result = (swaps ?? []).map((s) => {
    const history = (events ?? []).filter((e) => e.swap_id === s.id).map(rowToEvent);
    return { id: s.id, ...deriveState(history) };
  });
  return NextResponse.json({ swaps: result });
}
