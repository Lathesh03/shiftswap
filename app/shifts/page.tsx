import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import type { Shift } from "@/lib/types";
import AddShift from "../add-shift";

export default async function ShiftsPage() {
  const supabase = await createClient();

  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const { data: shifts, error } = await supabase
    .from("shifts")
    .select("id, employeeId:employee_id, startsAt:starts_at, endsAt:ends_at, status, created_at")
    .returns<Shift[]>();

  if (error) throw new Error(error.message);

  return (
    <>
      <AddShift />
      <ul>
      {shifts.map((shift) => (
        <li key={shift.id}>
          <span>{shift.id}</span>
          <span>{shift.status}</span>
          <span>{shift.startsAt}</span>
          <span>{shift.endsAt}</span>
          <span>{shift.employeeId ?? "Unassigned"}</span>
        </li>
      ))}
      </ul>
    </>
  );
}
