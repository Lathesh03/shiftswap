import type { Employee, Shift } from "./types";

export const employees: Employee[] = [
  { id: "e1", name: "Alice Martin", email: "alice@example.com", position: "Barista", department: "Front of House" },
  { id: "e2", name: "Bob Chen",    email: "bob@example.com",   position: "Cashier", department: "Front of House" },
  { id: "e3", name: "Carol Davis", email: "carol@example.com", position: "Cook",    department: "Kitchen" },
];

export const shifts: Shift[] = [
  { id: "s1", employeeId: "e1", status: "assigned", startsAt: "2025-07-14T08:00:00Z", endsAt: "2025-07-14T16:00:00Z", created_at: "2025-07-01T00:00:00Z" },
  { id: "s2", employeeId: "e2", status: "assigned", startsAt: "2025-07-14T12:00:00Z", endsAt: "2025-07-14T20:00:00Z", created_at: "2025-07-01T00:00:00Z" },
  { id: "s3", employeeId: "e3", status: "swap_requested", startsAt: "2025-07-15T08:00:00Z", endsAt: "2025-07-15T16:00:00Z", created_at: "2025-07-01T00:00:00Z" },
  { id: "s4", employeeId: null,  status: "open", startsAt: "2025-07-15T16:00:00Z", endsAt: "2025-07-15T23:00:00Z", created_at: "2025-07-01T00:00:00Z" },
];
