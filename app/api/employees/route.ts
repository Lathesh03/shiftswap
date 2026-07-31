import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import type { NewEmployee } from "@/lib/types";

export async function GET() {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("employees")
    .select("*")
    .order("created_at", { ascending: false });

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ employees: data });
}

export async function POST(request: Request) {
  const supabase = await createClient();
  // Week-1 shortcut: trust the shape. Runtime validation (zod) comes later.
  const body = (await request.json()) as NewEmployee;

  const { data, error } = await supabase
    .from("employees")
    .insert({
      name: body.name,
      email: body.email,
      position: body.position,
      department: body.department,
    })
    .select()
    .single();

  if (error) return NextResponse.json({ error: error.message }, { status: 400 });
  return NextResponse.json({ employee: data }, { status: 201 });
}
