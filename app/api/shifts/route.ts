import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import type { NewShift } from "@/lib/types";

export async function GET() {
  const supabase = await createClient();

  const { data, error } = await supabase
    .from("shifts")
    .select("id, employeeId:employee_id, startsAt:starts_at, endsAt:ends_at, status, created_at");

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json(data);
}

export async function POST(req: Request) {
  const supabase = await createClient();
  const body: NewShift = await req.json();

  const { data, error } = await supabase
    .from("shifts")
    .insert({
      employee_id: body.employeeId,
      starts_at:   body.startsAt,
      ends_at:     body.endsAt,
      status:      body.status,
    })
    .select("id, employeeId:employee_id, startsAt:starts_at, endsAt:ends_at, status, created_at")
    .single();

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json(data, { status: 201 });
}
