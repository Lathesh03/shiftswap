"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

export default function AddEmployee() {
  const router = useRouter();
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [position, setPosition] = useState("");
  const [department, setDepartment] = useState("");

  async function add() {
    const res = await fetch("/api/employees", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ name, email, position, department }),
    });
    if (res.ok) {
      setName("");
      setEmail("");
      setPosition("");
      setDepartment("");
      router.refresh(); // re-runs the server component so the list updates
    }
  }

  return (
    <div className="flex flex-col gap-2 sm:flex-row">
      <input className="border p-2 rounded flex-1" placeholder="Name"
        value={name} onChange={(e) => setName(e.target.value)} />
      <input className="border p-2 rounded flex-1" placeholder="Email"
        value={email} onChange={(e) => setEmail(e.target.value)} />
      <input className="border p-2 rounded flex-1" placeholder="Position"
        value={position} onChange={(e) => setPosition(e.target.value)} />
      <input className="border p-2 rounded flex-1" placeholder="Department"
        value={department} onChange={(e) => setDepartment(e.target.value)} />
      <button className="bg-black text-white px-4 rounded" onClick={add}>Add</button>
    </div>
  );
}
