"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";

export default function TriggerMatchButton({ swapId }: { swapId: string }) {
  const router = useRouter();
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function run() {
    setBusy(true);
    setError(null);
    const res = await fetch(`/api/swaps/${swapId}/match`, { method: "POST" });
    setBusy(false);
    if (!res.ok) {
      setError("Couldn't run the match agent — try again.");
      return;
    }
    router.refresh();
  }

  return (
    <div className="space-y-2">
      <button
        disabled={busy}
        onClick={run}
        className="rounded-lg bg-accent px-4 py-2 text-sm font-semibold text-white disabled:opacity-50"
      >
        {busy ? "Finding a match…" : "Find a match"}
      </button>
      {error && <p className="text-sm text-danger">{error}</p>}
    </div>
  );
}
