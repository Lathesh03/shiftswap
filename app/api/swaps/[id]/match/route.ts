import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { runMatchAgent } from "@/lib/agent/run";

export const maxDuration = 60; // agent loop makes several sequential model calls

export async function POST(
  _request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;

  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const result = await runMatchAgent(id);
  return NextResponse.json(result);
}
