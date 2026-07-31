"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

export default function AddShift() {
  const router = useRouter();
  const [startsAt, setStartsAt] = useState("");
  const [endsAt, setEndsAt] = useState("");
  const [error, setError] = useState<string | null>(null);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);

    const res = await fetch("/api/shifts", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ employeeId: null, startsAt, endsAt, status: "open" }),
    });

    if (!res.ok) {
      const { error } = await res.json();
      setError(error ?? "Failed to add shift.");
      return;
    }

    setStartsAt("");
    setEndsAt("");
    router.refresh();
  }

  return (
    <form onSubmit={handleSubmit}>
      <label>
        Starts at
        <input type="datetime-local" value={startsAt} onChange={(e) => setStartsAt(e.target.value)} required />
      </label>
      <label>
        Ends at
        <input type="datetime-local" value={endsAt} onChange={(e) => setEndsAt(e.target.value)} required />
      </label>
      {error && <p>{error}</p>}
      <button type="submit">Add Shift</button>
    </form>
  );
}
