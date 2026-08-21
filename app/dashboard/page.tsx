import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { getSwapsWithContext } from "@/lib/dashboard";
import SwapRow from "./swap-row";
import LiveRefresh from "./live-refresh";
import AgentHealth from "./agent-health";

export default async function Dashboard() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const swaps = await getSwapsWithContext();
  const needsAction = swaps.filter((s) => s.status === "matched");
  const inProgress = swaps.filter((s) => s.status === "requested" || s.status === "approved");
  const resolved = swaps.filter((s) => ["applied", "rejected", "cancelled"].includes(s.status));

  const headline =
    needsAction.length === 0
      ? "You're all caught up."
      : needsAction.length === 1
        ? "1 swap needs your decision."
        : `${needsAction.length} swaps need your decision.`;

  return (
    <main className="mx-auto max-w-3xl px-6 py-10 space-y-10">
      <LiveRefresh />
      <div>
        <h1 className="text-3xl font-extrabold tracking-tight text-ink text-balance">{headline}</h1>
        <p className="mt-2 max-w-prose text-ink-muted">
          Everything the AI proposed today, with its reasoning, so you can approve, reject, or reassign in one click.
        </p>
      </div>

      <section className="space-y-4">
        <div className="flex items-center justify-between">
          <h2 className="text-sm font-bold text-accent-ink">Needs your decision</h2>
          <span className="text-xs font-medium text-ink-faint">{needsAction.length} open</span>
        </div>
        {needsAction.length === 0 ? (
          <p className="rounded-2xl border border-dashed border-border bg-card-sunken px-6 py-8 text-center text-ink-muted">
            No swaps need your attention — you&apos;re all caught up.
          </p>
        ) : (
          <ul className="flex flex-col gap-3">
            {needsAction.map((s) => (
              <li key={s.id}>
                <SwapRow swap={s} highlight />
              </li>
            ))}
          </ul>
        )}
      </section>

      <section className="space-y-4">
        <div className="flex items-center justify-between">
          <h2 className="text-sm font-bold text-ink">In progress</h2>
          <span className="text-xs font-medium text-ink-faint">{inProgress.length}</span>
        </div>
        {inProgress.length === 0 ? (
          <p className="text-sm text-ink-faint">Nothing in progress right now.</p>
        ) : (
          <ul className="flex flex-col gap-3">
            {inProgress.map((s) => (
              <li key={s.id}>
                <SwapRow swap={s} />
              </li>
            ))}
          </ul>
        )}
      </section>

      <section className="space-y-4">
        <div className="flex items-center justify-between">
          <h2 className="text-sm font-bold text-ink">Resolved</h2>
          <span className="text-xs font-medium text-ink-faint">{resolved.length}</span>
        </div>
        {resolved.length === 0 ? (
          <p className="text-sm text-ink-faint">No swaps resolved yet.</p>
        ) : (
          <ul className="flex flex-col gap-3">
            {resolved.map((s) => (
              <li key={s.id}>
                <SwapRow swap={s} />
              </li>
            ))}
          </ul>
        )}
      </section>

      <AgentHealth />
    </main>
  );
}
