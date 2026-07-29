import { shifts, employees } from "@/lib/mock-data";
import { getEmployeeById } from "@/lib/queries";

export default function SchedulePage() {
  return (
    <ul>
      {shifts.map((shift) => {
        const employee = shift.employeeId
          ? getEmployeeById(employees, shift.employeeId)
          : undefined;

        return (
          <li key={shift.id}>
            <span>{shift.id}</span>
            <span>{shift.status}</span>
            <span>{employee?.name ?? "Unassigned"}</span>
          </li>
        );
      })}
    </ul>
  );
}
