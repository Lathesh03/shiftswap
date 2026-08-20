import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { runMatchAgent } from "@/lib/agent/run";
import type { EligibilityResult } from "@/lib/scheduling/core";

export const maxDuration = 60; // agent loop makes several sequential model calls

type PolicyMatch = { source: string; content: string; similarity: number };
type PolicySearchResult = { matches: PolicyMatch[] } | { error: string };

export async function POST(
  _request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;

  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const result = await runMatchAgent(id);

  const considered: EligibilityResult =
    (result.steps.find((s) => s.tool === "find_eligible_candidates")?.output as EligibilityResult | undefined) ??
    { error: "Agent never looked up eligible candidates." };

  const citations = result.steps
    .filter((s) => s.tool === "search_policies")
    .flatMap((s) => {
      const output = s.output as PolicySearchResult;
      return "matches" in output ? output.matches.map((m) => m.source) : [];
    });

  const { error: persistError } = await supabase.from("agent_decisions").insert({
    swap_id: id,
    summary: result.finalText,
    considered,
    citations: [...new Set(citations)],
    steps: result.steps,
  });
  if (persistError) {
    // Best-effort: the match already ran (and may have already written to
    // swap_events) by the time this insert happens, so a logging failure
    // here shouldn't turn into a user-facing error for a match that worked.
    console.error("Failed to persist agent_decisions:", persistError.message);
  }

  return NextResponse.json(result);
}
