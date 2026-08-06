import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { assertTransition, deriveState, rowToEvent } from "@/lib/swaps";
import type { SwapEvent } from "@/lib/types";

export async function POST(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const supabase = await createClient();
  const body = (await request.json()) as { type: SwapEvent["type"] } & Record<string, unknown>;

  // 1. Load current history
  const { data: rows, error } = await supabase
    .from("swap_events").select("*").eq("swap_id", id)
    .order("created_at", { ascending: true });
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  const events = (rows ?? []).map(rowToEvent);

  // 2. Guard the transition
  const check = assertTransition(events, body.type);
  if (!check.ok) return NextResponse.json({ error: check.error }, { status: 409 });

  // 3. Append (payload = everything except the type discriminant)
  const { type, ...payload } = body;
  const { error: insErr } = await supabase
    .from("swap_events").insert({ swap_id: id, type, payload });
  if (insErr) return NextResponse.json({ error: insErr.message }, { status: 400 });

  // 4. Return the new derived state
  const { data: updated } = await supabase
    .from("swap_events").select("*").eq("swap_id", id)
    .order("created_at", { ascending: true });
  return NextResponse.json({ state: deriveState((updated ?? []).map(rowToEvent)) });
}
