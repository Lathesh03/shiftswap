import type { SupabaseClient } from "@supabase/supabase-js";

const REPO = "Lathesh03/shiftswap"; // this project's GitHub repo — Session 5's CI workflow

export type AgentHealth = {
  evalsStatus: "passing" | "failing" | "unknown";
  autoMatched: number;
  overridden: number;
  avgResolutionHours: number | null;
  swapsThisWeek: number;
};

type MatchedEventRow = { payload: { override?: boolean }; created_at: string };
type EventRow = { swap_id: string; type: string; created_at: string };

async function getLatestCiStatus(): Promise<"passing" | "failing" | "unknown"> {
  try {
    const res = await fetch(
      `https://api.github.com/repos/${REPO}/actions/workflows/ci.yml/runs?branch=main&per_page=1`,
      { next: { revalidate: 300 } } // 5 min cache — no need to hit GitHub on every dashboard load
    );
    if (!res.ok) return "unknown";
    const data = await res.json();
    const run = data.workflow_runs?.[0];
    if (!run || run.status !== "completed") return "unknown";
    return run.conclusion === "success" ? "passing" : "failing";
  } catch {
    return "unknown";
  }
}

export async function getAgentHealth(supabase: SupabaseClient): Promise<AgentHealth> {
  const weekAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString();

  const [{ data: matchedEvents }, { data: allEvents }, ciStatus] = await Promise.all([
    supabase.from("swap_events").select("payload, created_at").eq("type", "matched").returns<MatchedEventRow[]>(),
    supabase.from("swap_events").select("swap_id, type, created_at").order("created_at", { ascending: true }).returns<EventRow[]>(),
    getLatestCiStatus(),
  ]);

  let autoMatched = 0;
  let overridden = 0;
  let swapsThisWeek = 0;
  for (const e of matchedEvents ?? []) {
    if (e.payload?.override) overridden++;
    else autoMatched++;
    if (e.created_at >= weekAgo) swapsThisWeek++;
  }

  // Average hours from request to resolution, across swaps that reached one.
  const bySwap = new Map<string, { requestedAt?: string; resolvedAt?: string }>();
  for (const e of allEvents ?? []) {
    const entry = bySwap.get(e.swap_id) ?? {};
    if (e.type === "requested") entry.requestedAt = e.created_at;
    if (e.type === "applied" || e.type === "rejected" || e.type === "cancelled") entry.resolvedAt = e.created_at;
    bySwap.set(e.swap_id, entry);
  }
  const durationsHours = [...bySwap.values()]
    .filter((s): s is { requestedAt: string; resolvedAt: string } => !!s.requestedAt && !!s.resolvedAt)
    .map((s) => (new Date(s.resolvedAt).getTime() - new Date(s.requestedAt).getTime()) / 3_600_000);
  const avgResolutionHours = durationsHours.length
    ? durationsHours.reduce((a, b) => a + b, 0) / durationsHours.length
    : null;

  return { evalsStatus: ciStatus, autoMatched, overridden, avgResolutionHours, swapsThisWeek };
}
