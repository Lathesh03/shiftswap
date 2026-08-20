"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";

type Candidate = { id: string; name: string };

export default function SwapActions({
  swapId,
  managerId,
  eligibleCandidates,
}: {
  swapId: string;
  managerId: string;
  eligibleCandidates: Candidate[];
}) {
  const router = useRouter();
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [reassigning, setReassigning] = useState(false);
  const [pickedCandidate, setPickedCandidate] = useState(eligibleCandidates[0]?.id ?? "");

  async function act(type: string, extra: Record<string, unknown> = {}) {
    setBusy(true);
    setError(null);
    const res = await fetch(`/api/swaps/${swapId}/events`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ type, ...extra }),
    });
    setBusy(false);
    if (!res.ok) {
      const body = await res.json().catch(() => ({}));
      setError(body.error ?? "Something went wrong.");
      return;
    }
    setReassigning(false);
    router.refresh();
  }

  if (reassigning) {
    return (
      <div className="flex flex-wrap items-center gap-2">
        {eligibleCandidates.length > 0 ? (
          <select
            value={pickedCandidate}
            onChange={(e) => setPickedCandidate(e.target.value)}
            className="rounded-lg border border-border bg-card px-3 py-2 text-sm text-ink"
          >
            {eligibleCandidates.map((c) => (
              <option key={c.id} value={c.id}>
                {c.name}
              </option>
            ))}
          </select>
        ) : (
          <input
            placeholder="Employee id"
            value={pickedCandidate}
            onChange={(e) => setPickedCandidate(e.target.value)}
            className="rounded-lg border border-border bg-card px-3 py-2 text-sm text-ink"
          />
        )}
        <button
          disabled={busy || !pickedCandidate}
          onClick={() => act("matched", { candidateId: pickedCandidate, override: true, by: managerId })}
          className="rounded-lg bg-accent px-4 py-2 text-sm font-semibold text-white disabled:opacity-50"
        >
          Confirm reassign
        </button>
        <button
          disabled={busy}
          onClick={() => setReassigning(false)}
          className="rounded-lg border border-border px-4 py-2 text-sm font-semibold text-ink"
        >
          Cancel
        </button>
        {error && <p className="w-full text-sm text-danger">Couldn&apos;t reassign — {error}</p>}
      </div>
    );
  }

  return (
    <div className="space-y-2">
      <div className="flex flex-wrap gap-2">
        <button
          disabled={busy}
          onClick={() => act("approved", { approvedBy: managerId })}
          className="rounded-lg bg-accent px-4 py-2 text-sm font-semibold text-white disabled:opacity-50"
        >
          Approve swap
        </button>
        <button
          disabled={busy}
          onClick={() => {
            const reason = prompt("Reason for rejecting?");
            if (reason !== null) act("rejected", { reason });
          }}
          className="rounded-lg border border-border px-4 py-2 text-sm font-semibold text-ink disabled:opacity-50"
        >
          Reject
        </button>
        <button
          disabled={busy}
          onClick={() => setReassigning(true)}
          className="rounded-lg border border-border px-4 py-2 text-sm font-semibold text-ink disabled:opacity-50"
        >
          Reassign
        </button>
      </div>
      {error && <p className="text-sm text-danger">Couldn&apos;t complete that — {error} Refresh to see the latest.</p>}
    </div>
  );
}
