"use client";

import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";

export default function SignOut() {
  const router = useRouter();
  const supabase = createClient();

  async function out() {
    await supabase.auth.signOut();
    router.push("/login");
    router.refresh();
  }

  return (
    <button className="text-sm underline" onClick={out}>
      Sign out
    </button>
  );
}
