import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import AddEmployee from "./add-employee";
import SignOut from "./sign-out";

export default async function Home() {
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
    <main className="max-w-2xl mx-auto mt-12 flex flex-col gap-6 p-4">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-semibold">Team</h1>
        <SignOut />
      </div>
      <AddEmployee />
      <ul className="flex flex-col gap-2">
        {employees?.map((e) => (
          <li key={e.id} className="border rounded p-3">
            {e.name} — {e.email}{" "}
            <span className="text-gray-500">
              ({e.position}, {e.department})
            </span>
          </li>
        ))}
      </ul>
    </main>
  );
}
