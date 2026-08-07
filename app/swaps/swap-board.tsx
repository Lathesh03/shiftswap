"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import type { SwapState, SwapStatus } from "@/lib/types";

// Which buttons to show per status (mirrors ALLOWED_TRANSITIONS)
const ACTIONS: Record<SwapStatus, string[]> = {
  requested: ["matched", "rejected", "cancelled"],
  matched: ["approved", "rejected", "cancelled"],
  approved: ["applied", "rejected", "cancelled"],
  applied: [], rejected: [], cancelled: [],
};

type Swap = SwapState & { id: string };
type Emp = { id: string; name: string };
type Shift = { id: string; status: string; starts_at: string };

export default function SwapBoard({
  swaps, employees, shifts,
}: { swaps: Swap[]; employees: Emp[]; shifts: Shift[] }) {
  const router = useRouter();
  const [shiftId, setShiftId] = useState("");
  const [requestedBy, setRequestedBy] = useState("");

  async function createSwap() {
    if (!shiftId || !requestedBy) return;
    await fetch("/api/swaps", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ shiftId, requestedBy }),
    });
    router.refresh();
  }

  async function advance(id: string, type: string) {
    // Quick-and-dirty inputs for the fields a couple of events need.
    const payload: Record<string, unknown> = { type };
    if (type === "matched") payload.candidateId = prompt("Candidate employee id?") ?? "";
    if (type === "approved") payload.approvedBy = prompt("Approver id?") ?? "";
    if (type === "rejected") payload.reason = prompt("Reason?") ?? "";

    const res = await fetch(`/api/swaps/${id}/events`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    });
    if (!res.ok) alert((await res.json()).error); // shows the guard's rejection
    router.refresh();
  }

  return (
    <div className="flex flex-col gap-6">
      {/* Create */}
      <div className="flex gap-2 items-end border rounded p-3">
        <select className="border p-2 rounded" value={shiftId}
          onChange={(e) => setShiftId(e.target.value)}>
          <option value="">Shift…</option>
          {shifts.map((s) => (
            <option key={s.id} value={s.id}>
              {s.status} — {new Date(s.starts_at).toLocaleString()}
            </option>
          ))}
        </select>
        <select className="border p-2 rounded" value={requestedBy}
          onChange={(e) => setRequestedBy(e.target.value)}>
          <option value="">Requested by…</option>
          {employees.map((e) => <option key={e.id} value={e.id}>{e.name}</option>)}
        </select>
        <button className="bg-black text-white px-4 py-2 rounded" onClick={createSwap}>
          New swap
        </button>
      </div>

      {/* List */}
      {swaps.map((s) => (
        <div key={s.id} className="border rounded p-3 flex flex-col gap-2">
          <div className="flex justify-between">
            <span className="font-medium">Swap {s.id.slice(0, 8)}</span>
            <span className="text-sm uppercase tracking-wide">{s.status}</span>
          </div>

          <ol className="text-sm text-gray-600 flex flex-col gap-0.5">
            {s.history.map((ev, i) => (
              <li key={i}>{new Date(ev.at).toLocaleTimeString()} — {ev.type}</li>
            ))}
          </ol>

          <div className="flex gap-2">
            {ACTIONS[s.status].map((a) => (
              <button key={a} className="border px-3 py-1 rounded text-sm"
                onClick={() => advance(s.id, a)}>
                {a}
              </button>
            ))}
          </div>
        </div>
      ))}
    </div>
  );
}
