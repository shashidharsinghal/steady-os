import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import type { Employee } from "@stride-os/shared";
import { EmployeeRoleBadge } from "@/app/(app)/employees/_components/EmployeeRoleBadge";

export async function OutletTeamTab({ outletId }: { outletId: string }) {
  const supabase = await createClient();
  const [{ data: primaryEmployees }, { data: assignments }] = await Promise.all([
    supabase
      .from("employees")
      .select("*")
      .eq("current_outlet_id", outletId)
      .is("archived_at", null)
      .order("full_name"),
    supabase.from("employee_outlet_assignments").select("employee_id").eq("outlet_id", outletId),
  ]);

  const assignmentIds = Array.from(
    new Set((assignments ?? []).map((assignment) => assignment.employee_id))
  );

  const { data: assignedEmployees } =
    assignmentIds.length > 0
      ? await supabase
          .from("employees")
          .select("*")
          .in("id", assignmentIds)
          .is("archived_at", null)
          .order("full_name")
      : { data: [] as Employee[] };

  const rosterMap = new Map<string, Employee>();
  for (const employee of (primaryEmployees ?? []) as Employee[]) {
    rosterMap.set(employee.id, employee);
  }
  for (const employee of (assignedEmployees ?? []) as Employee[]) {
    rosterMap.set(employee.id, employee);
  }

  const roster = Array.from(rosterMap.values()).sort((a, b) =>
    a.full_name.localeCompare(b.full_name)
  );

  if (roster.length === 0) {
    return (
      <p className="text-muted-foreground text-sm">No employees assigned to this outlet yet.</p>
    );
  }

  return (
    <div className="space-y-3">
      {roster.map((employee) => (
        <Link
          key={employee.id}
          href={`/employees/${employee.id}`}
          className="hover:border-primary/40 flex items-center justify-between rounded-lg border p-4 transition-colors"
        >
          <div>
            <p className="font-medium">{employee.full_name}</p>
            <p className="text-muted-foreground text-sm">
              {employee.position ?? "No position set"}
              {employee.current_outlet_id === outletId ? " · Primary outlet" : ""}
            </p>
          </div>
          <EmployeeRoleBadge role={employee.role} />
        </Link>
      ))}
    </div>
  );
}
