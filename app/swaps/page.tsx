import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { deriveState, rowToEvent } from "@/lib/swaps";
import SwapBoard from "./swap-board";

export default async function SwapsPage() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const [{ data: swaps }, { data: events }, { data: employees }, { data: shifts }] =
    await Promise.all([
      supabase.from("swap_requests").select("*").order("created_at", { ascending: false }),
      supabase.from("swap_events").select("*").order("created_at", { ascending: true }),
      supabase.from("employees").select("*"),
      supabase.from("shifts").select("*"),
    ]);

  const withState = (swaps ?? []).map((s) => {
    const history = (events ?? []).filter((e) => e.swap_id === s.id).map(rowToEvent);
    return { id: s.id, ...deriveState(history) };
  });

  return (
    <main className="max-w-3xl mx-auto mt-12 p-4 flex flex-col gap-6">
      <h1 className="text-2xl font-semibold">Shift Swaps</h1>
      <SwapBoard
        swaps={withState}
        employees={employees ?? []}
        shifts={shifts ?? []}
      />
    </main>
  );
}
