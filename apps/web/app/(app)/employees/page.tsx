import Link from "next/link";
import { Plus } from "lucide-react";
import { Button, Tabs, TabsContent, TabsList, TabsTrigger } from "@stride-os/ui";
import { createClient } from "@/lib/supabase/server";
import { getRole } from "@/lib/auth";
import type { Employee } from "@stride-os/shared";
import { EmployeeListItem } from "./_components/EmployeeListItem";

export default async function EmployeesPage() {
  const [supabase, role] = await Promise.all([createClient(), getRole()]);

  const [{ data: employees }, { data: outlets }, { data: assignments }] = await Promise.all([
    supabase.from("employees").select("*").order("created_at", { ascending: false }),
    supabase.from("outlets").select("id, name").is("archived_at", null),
    supabase.from("employee_outlet_assignments").select("employee_id"),
  ]);

  const outletMap = new Map((outlets ?? []).map((outlet) => [outlet.id, outlet.name]));
  const allEmployees = (employees ?? []) as Employee[];
  const assignedEmployeeIds = new Set(
    (assignments ?? []).map((assignment) => assignment.employee_id)
  );
  const activeEmployees = allEmployees.filter((employee) => !employee.archived_at);
  const archivedEmployees = allEmployees.filter((employee) => employee.archived_at);
  const unassignedEmployees = activeEmployees.filter(
    (employee) => !assignedEmployeeIds.has(employee.id) && !employee.current_outlet_id
  );
  const assignedEmployees = activeEmployees.filter(
    (employee) => assignedEmployeeIds.has(employee.id) || Boolean(employee.current_outlet_id)
  );
  const isPartner = role === "partner";

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div className="space-y-1">
          <h1 className="text-2xl font-bold">Employees</h1>
          <p className="text-muted-foreground text-sm">
            Track team members, outlets, and payroll history.
          </p>
        </div>
        {isPartner && (
          <Button asChild size="sm">
            <Link href="/employees/new">
              <Plus className="mr-1 h-4 w-4" />
              New employee
            </Link>
          </Button>
        )}
      </div>

      <Tabs defaultValue="active">
        <TabsList>
          <TabsTrigger value="active">Active</TabsTrigger>
          <TabsTrigger value="archived">Archived</TabsTrigger>
        </TabsList>

        <TabsContent value="active" className="mt-4 space-y-6">
          {activeEmployees.length === 0 ? (
            <div className="flex flex-col items-center justify-center rounded-lg border border-dashed py-16 text-center">
              {isPartner ? (
                <>
                  <p className="text-muted-foreground mb-4">No employees yet.</p>
                  <Button asChild>
                    <Link href="/employees/new">Create your first employee</Link>
                  </Button>
                </>
              ) : (
                <p className="text-muted-foreground">
                  No employees are visible for your outlets yet.
                </p>
              )}
            </div>
          ) : (
            <>
              {assignedEmployees.length > 0 && (
                <section className="space-y-3">
                  <div>
                    <h2 className="font-semibold">Assigned employees</h2>
                    <p className="text-muted-foreground text-sm">
                      Employees with a primary outlet assigned.
                    </p>
                  </div>
                  <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
                    {assignedEmployees.map((employee) => (
                      <EmployeeListItem
                        key={employee.id}
                        employee={employee}
                        primaryOutletName={
                          employee.current_outlet_id
                            ? outletMap.get(employee.current_outlet_id)
                            : null
                        }
                      />
                    ))}
                  </div>
                </section>
              )}

              {unassignedEmployees.length > 0 && (
                <section className="space-y-3">
                  <div>
                    <h2 className="font-semibold">Unassigned</h2>
                    <p className="text-muted-foreground text-sm">
                      Employees who don&apos;t yet have a primary outlet.
                    </p>
                  </div>
                  <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
                    {unassignedEmployees.map((employee) => (
                      <EmployeeListItem
                        key={employee.id}
                        employee={employee}
                        primaryOutletName={null}
                      />
                    ))}
                  </div>
                </section>
              )}
            </>
          )}
        </TabsContent>

        <TabsContent value="archived" className="mt-4">
          {archivedEmployees.length === 0 ? (
            <p className="text-muted-foreground text-sm">No archived employees yet.</p>
          ) : (
            <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
              {archivedEmployees.map((employee) => (
                <EmployeeListItem
                  key={employee.id}
                  employee={employee}
                  primaryOutletName={
                    employee.current_outlet_id ? outletMap.get(employee.current_outlet_id) : null
                  }
                />
              ))}
            </div>
          )}
        </TabsContent>
      </Tabs>
    </div>
  );
}
