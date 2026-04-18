import Link from "next/link";
import { Plus, Search } from "lucide-react";
import {
  Button,
  Card,
  CardContent,
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
  Tabs,
  TabsContent,
  TabsList,
  TabsTrigger,
} from "@stride-os/ui";
import { createClient } from "@/lib/supabase/server";
import { getRole } from "@/lib/auth";
import type { Employee } from "@stride-os/shared";
import { EmployeeRoleBadge } from "./_components/EmployeeRoleBadge";

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
  const isPartner = role === "partner";

  return (
    <div className="space-y-6">
      <div className="flex items-end justify-between gap-4">
        <div className="space-y-1">
          <h1 className="text-2xl font-semibold">Employees</h1>
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
        <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
          <TabsList>
            <TabsTrigger value="active">Active</TabsTrigger>
            <TabsTrigger value="archived">Archived</TabsTrigger>
          </TabsList>

          <div className="flex flex-wrap items-center gap-3">
            <div className="text-muted-foreground border-border/80 bg-background/80 flex items-center gap-2 rounded-[10px] border px-3 py-2 text-sm">
              <Search className="h-4 w-4" />
              <span className="flex-1">Search employees</span>
              <span className="border-border/80 bg-muted/60 rounded-md border px-1.5 py-0.5 text-[11px] uppercase tracking-[0.16em]">
                Cmd K
              </span>
            </div>
            <div className="flex gap-2">
              <Chip label="All roles" />
              <Chip label="Assigned" />
              <Chip label="Unassigned" />
            </div>
          </div>
        </div>

        <TabsContent value="active" className="mt-4 space-y-6">
          {activeEmployees.length === 0 ? (
            <div className="flex flex-col items-center justify-center rounded-[20px] border border-dashed py-16 text-center">
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
            <Card>
              <CardContent className="p-0">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Name</TableHead>
                      <TableHead>Role</TableHead>
                      <TableHead>Position</TableHead>
                      <TableHead>Outlet</TableHead>
                      <TableHead>Phone</TableHead>
                      <TableHead>Joined</TableHead>
                      <TableHead>Status</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {activeEmployees.map((employee) => (
                      <TableRow key={employee.id}>
                        <TableCell>
                          <Link
                            href={`/employees/${employee.id}`}
                            className="flex items-center gap-3"
                          >
                            <div className="bg-primary/12 text-primary border-primary/15 flex h-10 w-10 items-center justify-center rounded-full border text-sm font-semibold">
                              {employee.full_name.slice(0, 1).toUpperCase()}
                            </div>
                            <div className="space-y-0.5">
                              <p className="font-medium">{employee.full_name}</p>
                              <p className="text-muted-foreground text-sm">
                                {employee.employment_type === "full_time"
                                  ? "Full-time"
                                  : "Part-time"}
                              </p>
                            </div>
                          </Link>
                        </TableCell>
                        <TableCell>
                          <EmployeeRoleBadge role={employee.role} />
                        </TableCell>
                        <TableCell>{employee.position ?? "—"}</TableCell>
                        <TableCell>
                          {employee.current_outlet_id
                            ? (outletMap.get(employee.current_outlet_id) ?? "—")
                            : "Unassigned"}
                        </TableCell>
                        <TableCell>{employee.phone}</TableCell>
                        <TableCell>{employee.joined_on}</TableCell>
                        <TableCell>
                          <span className="text-muted-foreground text-sm">
                            {unassignedEmployees.some((item) => item.id === employee.id)
                              ? "Unassigned"
                              : "Assigned"}
                          </span>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </CardContent>
            </Card>
          )}
        </TabsContent>

        <TabsContent value="archived" className="mt-4">
          {archivedEmployees.length === 0 ? (
            <p className="text-muted-foreground text-sm">No archived employees yet.</p>
          ) : (
            <Card>
              <CardContent className="p-0">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Name</TableHead>
                      <TableHead>Role</TableHead>
                      <TableHead>Outlet</TableHead>
                      <TableHead>Phone</TableHead>
                      <TableHead>Left on</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {archivedEmployees.map((employee) => (
                      <TableRow key={employee.id}>
                        <TableCell>
                          <Link href={`/employees/${employee.id}`} className="font-medium">
                            {employee.full_name}
                          </Link>
                        </TableCell>
                        <TableCell>
                          <EmployeeRoleBadge role={employee.role} />
                        </TableCell>
                        <TableCell>
                          {employee.current_outlet_id
                            ? (outletMap.get(employee.current_outlet_id) ?? "—")
                            : "Unassigned"}
                        </TableCell>
                        <TableCell>{employee.phone}</TableCell>
                        <TableCell>{employee.left_on ?? "—"}</TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </CardContent>
            </Card>
          )}
        </TabsContent>
      </Tabs>
    </div>
  );
}

function Chip({ label }: { label: string }) {
  return (
    <button
      type="button"
      className="text-muted-foreground hover:border-primary/25 hover:text-foreground border-border/70 bg-background/80 rounded-full border px-3 py-1.5 text-xs font-medium transition-colors"
    >
      {label}
    </button>
  );
}
