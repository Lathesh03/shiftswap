// Copied from ../../lib/types.ts — see that file's header note in the
// project README about why this is duplicated rather than imported.

export type Employee = {
  id: string;
  name: string;
  email: string;
  position: string;
  department: string;
  created_at: string; // ISO 8601 format
};

export const SHIFT_STATUS = ['open','assigned', 'swap_requested'] as const;
export type ShiftStatus = (typeof SHIFT_STATUS)[number];
// shiftstatus is now: "open", "assigned", or "swap_requested"

export type Shift = {
  id: string;
  employeeId: string | null; //null = unassigned
  status: ShiftStatus;
  startsAt: string; // ISO 8601 format
  endsAt: string; // ISO 8601 format
  created_at: string; // ISO 8601 format
};

//Creating no id or created_at yet (the DB fills those)
export type NewEmployee = Omit<Employee, 'id' | 'created_at'>;

//updating: any subset of the editable fields
export type EmployeeUpdate = Partial<Omit<Employee, 'id' | 'created_at'>>;

export type NewShift = Omit<Shift, 'id' | 'created_at'>;

export type Result<T> =
    | {ok: true; data: T}
    | {ok: false; error: string};

// The allowed swap statuses, defined once (Week 1 Pattern 2)
export const SWAP_STATUS = [
  "requested",
  "matched",
  "approved",
  "applied",
  "rejected",
  "cancelled",
] as const;
export type SwapStatus = (typeof SWAP_STATUS)[number];

// An event is a "thing that happened" — a discriminated union (Week 1 Pattern 5).
// The `type` field is the discriminant; each variant carries only its own data.
export type SwapEvent =
  | { type: "requested"; shiftId: string; requestedBy: string; at: string }
  | { type: "matched"; candidateId: string; at: string }
  | { type: "approved"; approvedBy: string; at: string }
  | { type: "applied"; at: string }
  | { type: "rejected"; reason: string; at: string }
  | { type: "cancelled"; at: string };

// The derived state — computed from events, never stored directly.
export type SwapState = {
  status: SwapStatus;
  shiftId: string | null;
  requestedBy: string | null;
  candidateId: string | null;
  approvedBy: string | null;
  rejectionReason: string | null;
  history: SwapEvent[];
};
