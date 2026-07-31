"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";

export default function LoginPage() {
  const supabase = createClient();
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [msg, setMsg] = useState<string | null>(null);

  async function signIn() {
    const { error } = await supabase.auth.signInWithPassword({ email, password });
    if (error) return setMsg(error.message);
    router.push("/");
    router.refresh();
  }

  async function signUp() {
    const { error } = await supabase.auth.signUp({ email, password });
    setMsg(error ? error.message : "Account created — you can log in now.");
  }

  return (
    <div className="max-w-sm mx-auto mt-24 flex flex-col gap-3">
      <h1 className="text-xl font-semibold">Sign in</h1>
      <input className="border p-2 rounded" placeholder="Email"
        value={email} onChange={(e) => setEmail(e.target.value)} />
      <input className="border p-2 rounded" type="password" placeholder="Password"
        value={password} onChange={(e) => setPassword(e.target.value)} />
      <button className="bg-black text-white p-2 rounded" onClick={signIn}>Log in</button>
      <button className="border p-2 rounded" onClick={signUp}>Sign up</button>
      {msg && <p className="text-sm text-red-600">{msg}</p>}
    </div>
  );
}
