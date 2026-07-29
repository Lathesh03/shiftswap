export type Employee = {
  id: string;
  name: string;
  email: string;
  position: string;
  department: string;
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

function first<T>(arr: T[]): T | undefined {
  return arr[0];
}
const employees: Employee[] = [];
const shifts: Shift[] = [];
const e = first<Employee>(employees); //e: Employee | undefined

export type SwapStatus = "pending" | "approved" | "rejected" | "cancelled";

export type Result<T> = 
    | {ok: true; data: T}
    | {ok: false; error: string};
