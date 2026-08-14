// Shared fixtures for the live (Tier 2) evals. Each scenario is seeded into a
// real Supabase project by evals/live/harness.ts, run against the real agent,
// then torn down. Employees/shifts are referenced by a local `key` here since
// their real ids only exist after insertion.

export type ScenarioEmployee = {
  key: string;
  name: string;
  email: string;
  position: string;
  department: string;
};

export type ScenarioShift = {
  key: string;
  employeeKey: string | null; // null = unassigned
  startsAt: string;
  endsAt: string;
  status: "open" | "assigned" | "swap_requested";
};

export type Scenario = {
  name: string;
  employees: ScenarioEmployee[];
  shifts: ScenarioShift[];
  swapShiftKey: string; // which shift the swap request is for
  requesterKey: string; // which employee is requesting the swap

  expect: {
    shouldProposeMatch: boolean;
    // If shouldProposeMatch, the agent's candidateId must resolve to one of these keys.
    acceptableCandidateKeys?: string[];
    mustCiteSearchPolicies: boolean;
  };
};

const DAY = "2026-09-14"; // a fixed Monday, so overlap math is deterministic across runs

export const scenarios: Scenario[] = [
  {
    name: "clear-match",
    employees: [
      { key: "requester", name: "Eval Requester A", email: "eval-requester-a@shiftswap.test", position: "Barista", department: "Cafe" },
      { key: "free", name: "Eval Free A", email: "eval-free-a@shiftswap.test", position: "Barista", department: "Cafe" },
      { key: "busy", name: "Eval Busy A", email: "eval-busy-a@shiftswap.test", position: "Barista", department: "Cafe" },
    ],
    shifts: [
      { key: "target", employeeKey: "requester", startsAt: `${DAY}T09:00:00Z`, endsAt: `${DAY}T17:00:00Z`, status: "swap_requested" },
      { key: "busy-shift", employeeKey: "busy", startsAt: `${DAY}T10:00:00Z`, endsAt: `${DAY}T18:00:00Z`, status: "assigned" },
    ],
    swapShiftKey: "target",
    requesterKey: "requester",
    expect: {
      shouldProposeMatch: true,
      acceptableCandidateKeys: ["free"],
      mustCiteSearchPolicies: true,
    },
  },
  {
    name: "no-eligible-candidates",
    employees: [
      { key: "requester", name: "Eval Requester B", email: "eval-requester-b@shiftswap.test", position: "Barista", department: "Cafe" },
      { key: "busy1", name: "Eval Busy B1", email: "eval-busy-b1@shiftswap.test", position: "Barista", department: "Cafe" },
      { key: "busy2", name: "Eval Busy B2", email: "eval-busy-b2@shiftswap.test", position: "Barista", department: "Cafe" },
    ],
    shifts: [
      { key: "target", employeeKey: "requester", startsAt: `${DAY}T09:00:00Z`, endsAt: `${DAY}T17:00:00Z`, status: "swap_requested" },
      { key: "busy1-shift", employeeKey: "busy1", startsAt: `${DAY}T08:00:00Z`, endsAt: `${DAY}T16:00:00Z`, status: "assigned" },
      { key: "busy2-shift", employeeKey: "busy2", startsAt: `${DAY}T12:00:00Z`, endsAt: `${DAY}T20:00:00Z`, status: "assigned" },
    ],
    swapShiftKey: "target",
    requesterKey: "requester",
    expect: {
      shouldProposeMatch: false,
      mustCiteSearchPolicies: false,
    },
  },
  {
    name: "multiple-eligible",
    employees: [
      { key: "requester", name: "Eval Requester C", email: "eval-requester-c@shiftswap.test", position: "Barista", department: "Cafe" },
      { key: "free1", name: "Eval Free C1", email: "eval-free-c1@shiftswap.test", position: "Barista", department: "Cafe" },
      { key: "free2", name: "Eval Free C2", email: "eval-free-c2@shiftswap.test", position: "Barista", department: "Cafe" },
      { key: "busy", name: "Eval Busy C", email: "eval-busy-c@shiftswap.test", position: "Barista", department: "Cafe" },
    ],
    shifts: [
      { key: "target", employeeKey: "requester", startsAt: `${DAY}T09:00:00Z`, endsAt: `${DAY}T17:00:00Z`, status: "swap_requested" },
      { key: "busy-shift", employeeKey: "busy", startsAt: `${DAY}T10:00:00Z`, endsAt: `${DAY}T18:00:00Z`, status: "assigned" },
    ],
    swapShiftKey: "target",
    requesterKey: "requester",
    expect: {
      shouldProposeMatch: true,
      acceptableCandidateKeys: ["free1", "free2"],
      mustCiteSearchPolicies: true,
    },
  },
];
