import { redirect } from "next/navigation";
import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import AddEmployee from "../add-employee";
import SignOut from "../sign-out";

export default async function Team() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const { data: employees } = await supabase
    .from("employees")
    .select("*")
    .order("created_at", { ascending: false });

  return (
    <main className="mx-auto max-w-2xl px-6 py-10 space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold tracking-tight text-ink">Team</h1>
        <SignOut />
      </div>
      <nav className="flex gap-4 text-sm font-medium">
        <Link href="/dashboard" className="text-focus">Manager dashboard →</Link>
        <Link href="/shifts" className="text-focus">Shifts</Link>
        <Link href="/swaps" className="text-focus">Swaps</Link>
      </nav>
      <AddEmployee />
      <ul className="flex flex-col gap-2">
        {employees?.map((e) => (
          <li key={e.id} className="rounded-xl border border-border bg-card p-3 text-ink">
            {e.name} — {e.email}{" "}
            <span className="text-ink-muted">
              ({e.position}, {e.department})
            </span>
          </li>
        ))}
      </ul>
    </main>
  );
}
