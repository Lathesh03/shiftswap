import type { AgentDecision } from "@/lib/dashboard";

// The signature element: not just who was proposed, but who else was
// considered and why they were ruled out. That transparency is the point.
export default function DecisionCard({
  decision,
  candidateName,
}: {
  decision: AgentDecision | null;
  candidateName: string;
}) {
  if (!decision) {
    return (
      <div className="rounded-2xl border border-dashed border-border bg-card-sunken p-5 text-sm text-ink-muted">
        No AI recommendation on file for this swap — it may predate this feature, or hasn&apos;t been matched yet.
      </div>
    );
  }

  const considered = decision.considered;
  const hasRoster = "eligible" in considered;

  return (
    <div className="space-y-4 rounded-2xl border border-border bg-card p-5 shadow-[var(--shadow-card)]">
      <span className="text-xs font-bold uppercase tracking-wide text-accent-ink">AI recommendation</span>
      <p className="max-w-prose text-ink">{decision.summary}</p>

      {decision.citations.length > 0 && (
        <p className="text-sm text-ink-muted">
          Grounded in{" "}
          {decision.citations.map((c, i) => (
            <span key={c}>
              {i > 0 && ", "}
              <code className="rounded border border-border bg-card-sunken px-1.5 py-0.5 font-mono text-xs">{c}</code>
            </span>
          ))}
        </p>
      )}

      {hasRoster && (considered.eligible.length > 0 || considered.excluded.length > 0) && (
        <div>
          <p className="mb-2 text-xs font-bold uppercase tracking-wide text-ink-faint">Candidates considered</p>
          <div className="flex flex-col gap-1.5">
            {considered.eligible.map((c) => (
              <div
                key={c.id}
                className="flex items-baseline justify-between gap-3 rounded-lg bg-card-sunken px-3 py-2 text-sm"
              >
                <span className="font-medium text-ink">{c.name}</span>
                <span className="text-xs font-semibold text-success">
                  {c.name === candidateName ? "proposed" : "eligible"}
                </span>
              </div>
            ))}
            {considered.excluded.map((c) => (
              <div
                key={c.id}
                className="flex flex-col gap-0.5 rounded-lg bg-card-sunken px-3 py-2 text-sm opacity-75 sm:flex-row sm:items-baseline sm:justify-between sm:gap-3"
              >
                <span className="font-medium text-ink">{c.name}</span>
                <span className="text-xs text-danger">{c.reasons.join("; ")}</span>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
