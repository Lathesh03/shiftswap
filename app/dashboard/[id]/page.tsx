import { redirect, notFound } from "next/navigation";
import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { getSwapWithContext, getEmployeeDirectory } from "@/lib/dashboard";
import Timeline from "./timeline";
import DecisionCard from "./decision-card";
import SwapActions from "./swap-actions";
import TriggerMatchButton from "./trigger-match-button";

export default async function SwapDetail({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const [swap, directory] = await Promise.all([getSwapWithContext(id), getEmployeeDirectory()]);
  if (!swap) notFound();

  const eligibleCandidates =
    swap.decision && "eligible" in swap.decision.considered ? swap.decision.considered.eligible : [];

  return (
    <main className="mx-auto max-w-2xl space-y-8 px-6 py-10">
      <Link href="/dashboard" className="text-sm font-medium text-focus">
        ← Back to dashboard
      </Link>

      <div>
        <h1 className="text-2xl font-extrabold tracking-tight text-ink text-balance">
          {swap.requesterName} → {swap.candidateName !== "—" ? swap.candidateName : "no cover yet"}
        </h1>
        {swap.shift && (
          <p className="mt-1 text-ink-muted">
            {new Date(swap.shift.starts_at).toLocaleString("en-US", { dateStyle: "full", timeStyle: "short" })} –{" "}
            {new Date(swap.shift.ends_at).toLocaleTimeString("en-US", { timeStyle: "short" })} · {swap.requesterDepartment}
          </p>
        )}
      </div>

      {swap.status === "matched" && <DecisionCard decision={swap.decision} candidateName={swap.candidateName} />}

      <section>
        <h2 className="mb-3 text-sm font-bold text-ink">What happens next</h2>
        {swap.status === "requested" && <TriggerMatchButton swapId={swap.id} />}
        {swap.status === "matched" && (
          <SwapActions swapId={swap.id} managerId={user.email ?? user.id} eligibleCandidates={eligibleCandidates} />
        )}
        {["applied", "rejected", "cancelled"].includes(swap.status) && (
          <p className="text-sm text-ink-faint">This swap is resolved — no further action needed.</p>
        )}
      </section>

      <section>
        <h2 className="mb-3 text-sm font-bold text-ink">Timeline</h2>
        <Timeline history={swap.history} directory={directory} />
      </section>
    </main>
  );
}
