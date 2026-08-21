"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";

// Renders nothing — just refreshes the server-rendered dashboard whenever a
// new swap event lands, so a request shows up without a manual reload.
// Requires realtime replication enabled for swap_events in the Supabase
// dashboard (Database → Replication) — the subscription alone isn't enough.
export default function LiveRefresh() {
  const router = useRouter();

  useEffect(() => {
    const supabase = createClient();
    const channel = supabase
      .channel("swap-events")
      .on("postgres_changes", { event: "INSERT", schema: "public", table: "swap_events" }, () => router.refresh())
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [router]);

  return null;
}
