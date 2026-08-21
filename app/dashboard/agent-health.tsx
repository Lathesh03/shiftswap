import { createClient } from "@/lib/supabase/server";
import { getAgentHealth } from "@/lib/agent-health";

const STATUS_COPY: Record<"passing" | "failing" | "unknown", { dot: string; label: string }> = {
  passing: { dot: "text-success", label: "Evals passing" },
  failing: { dot: "text-danger", label: "Evals failing" },
  unknown: { dot: "text-ink-faint", label: "Evals status unknown" },
};

export default async function AgentHealth() {
  const supabase = await createClient();
  const health = await getAgentHealth(supabase);
  const status = STATUS_COPY[health.evalsStatus];
  const totalMatched = health.autoMatched + health.overridden;

  return (
    <footer className="flex flex-wrap items-center justify-between gap-3 border-t border-border pt-6 text-sm text-ink-faint">
      <span>
        <span className={`font-bold ${status.dot}`} aria-hidden>
          ●
        </span>{" "}
        {status.label}
        {totalMatched > 0 && (
          <>
            {" · "}
            {totalMatched} swap{totalMatched === 1 ? "" : "s"} matched
            {health.overridden > 0 && ` (${health.overridden} overridden by a manager)`}
          </>
        )}
        {health.avgResolutionHours !== null && ` · ~${Math.round(health.avgResolutionHours)}h avg. to resolve`}
      </span>
      <span>Traced with Langfuse</span>
    </footer>
  );
}
