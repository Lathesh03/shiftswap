import type { Employee, Shift, SwapStatus } from "./types";

export function getEmployeeById(employees: Employee[], id: string): Employee | undefined {
  return employees.find((e) => e.id === id);
}

export function getShiftsForEmployee(shifts: Shift[], employeeId: string): Shift[] {
  return shifts.filter((s) => s.employeeId === employeeId);
}

export function isShiftUnassigned(shift: Shift): boolean {
  return shift.employeeId === null;
}

export function isSwapRequested(shift: Shift): boolean {
  return shift.status === "swap_requested";
}

export function describeSwapStatus(status: SwapStatus): string {
  switch (status) {
    case "pending":   return "Swap request is awaiting approval.";
    case "approved":  return "Swap has been approved.";
    case "rejected":  return "Swap was rejected.";
    case "cancelled": return "Swap was cancelled by the requester.";
  }
}