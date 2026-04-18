import { notFound } from "next/navigation";
import Link from "next/link";
import { Pencil } from "lucide-react";
import {
  Button,
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  Tabs,
  TabsContent,
  TabsList,
  TabsTrigger,
} from "@stride-os/ui";
import { createClient } from "@/lib/supabase/server";
import { getRole } from "@/lib/auth";
import type { Employee, EmployeeSalaryHistoryEntry } from "@stride-os/shared";
import { ArchiveEmployeeDialog } from "../_components/ArchiveEmployeeDialog";
import { AssignToOutletDialog } from "../_components/AssignToOutletDialog";
import { EmployeeRoleBadge } from "../_components/EmployeeRoleBadge";
import { RecordSalaryChangeDialog } from "../_components/RecordSalaryChangeDialog";
import { SalaryHistoryTable } from "../_components/SalaryHistoryTable";

type OutletSummary = {
  id: string;
  name: string;
};

export default async function EmployeeDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const [supabase, role] = await Promise.all([createClient(), getRole()]);

  const { data: employeeData } = await supabase.from("employees").select("*").eq("id", id).single();
  if (!employeeData) notFound();

  const employee = employeeData as Employee;
  const isPartner = role === "partner";

  const [{ data: outlets }, { data: assignments }, { data: salaryHistory }, { data: reportsTo }] =
    await Promise.all([
      supabase.from("outlets").select("id, name").is("archived_at", null).order("name"),
      supabase
        .from("employee_outlet_assignments")
        .select("outlet_id")
        .eq("employee_id", employee.id),
      isPartner
        ? supabase
            .from("employee_salary_history")
            .select("*")
            .eq("employee_id", employee.id)
            .order("effective_from", { ascending: false })
        : Promise.resolve({ data: [], error: null }),
      employee.reports_to
        ? supabase.from("employees").select("id, full_name").eq("id", employee.reports_to).single()
        : Promise.resolve({ data: null, error: null }),
    ]);

  const outletList = (outlets ?? []) as OutletSummary[];
  const assignedOutletIds = new Set((assignments ?? []).map((assignment) => assignment.outlet_id));
  const assignedOutlets = outletList.filter((outlet) => assignedOutletIds.has(outlet.id));
  const primaryOutlet = outletList.find((outlet) => outlet.id === employee.current_outlet_id);
  const salaryEntries = (salaryHistory ?? []) as EmployeeSalaryHistoryEntry[];

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div className="space-y-2">
          <div className="flex items-center gap-2">
            <h1 className="text-2xl font-bold">{employee.full_name}</h1>
            <EmployeeRoleBadge role={employee.role} />
          </div>
          <p className="text-muted-foreground text-sm">
            {employee.position ?? "No position set"}
            {employee.archived_at ? " · Archived" : ""}
          </p>
        </div>

        {isPartner && (
          <div className="flex flex-wrap gap-2">
            <Button asChild size="sm" variant="outline">
              <Link href={`/employees/${employee.id}/edit`}>
                <Pencil className="mr-1 h-4 w-4" />
                Edit
              </Link>
            </Button>
            <AssignToOutletDialog
              employeeId={employee.id}
              employeeName={employee.full_name}
              assignedOutlets={assignedOutlets}
              allOutlets={outletList}
            />
            <RecordSalaryChangeDialog employeeId={employee.id} employeeName={employee.full_name} />
            {!employee.archived_at && (
              <ArchiveEmployeeDialog employeeId={employee.id} employeeName={employee.full_name} />
            )}
          </div>
        )}
      </div>

      <Tabs defaultValue="overview">
        <TabsList>
          <TabsTrigger value="overview">Overview</TabsTrigger>
          {isPartner && <TabsTrigger value="salary">Salary history</TabsTrigger>}
        </TabsList>

        <TabsContent value="overview" className="mt-4">
          <div className="grid gap-4 lg:grid-cols-[2fr_1fr]">
            <Card>
              <CardHeader>
                <CardTitle>Employee details</CardTitle>
              </CardHeader>
              <CardContent>
                <dl className="grid gap-3 text-sm sm:grid-cols-2">
                  <DetailRow label="Phone" value={employee.phone} />
                  <DetailRow label="Email" value={employee.email} />
                  <DetailRow
                    label="Employment type"
                    value={employee.employment_type.replace("_", " ")}
                  />
                  <DetailRow label="Joined on" value={employee.joined_on} />
                  <DetailRow label="Date of birth" value={employee.date_of_birth} />
                  <DetailRow label="Primary outlet" value={primaryOutlet?.name ?? "Unassigned"} />
                  <DetailRow label="Reports to" value={reportsTo?.full_name ?? null} />
                  <DetailRow label="Emergency contact" value={employee.emergency_contact_name} />
                  <DetailRow label="Emergency phone" value={employee.emergency_contact_phone} />
                  <DetailRow label="Aadhaar last 4" value={employee.aadhaar_last_4} />
                  <div className="sm:col-span-2">
                    <dt className="text-muted-foreground font-medium">Address</dt>
                    <dd className="mt-0.5">
                      {employee.address ?? <span className="text-muted-foreground">—</span>}
                    </dd>
                  </div>
                </dl>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Outlet assignments</CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                {assignedOutlets.length > 0 ? (
                  assignedOutlets.map((outlet) => (
                    <div key={outlet.id} className="rounded-md border p-3 text-sm">
                      <p className="font-medium">{outlet.name}</p>
                      {outlet.id === employee.current_outlet_id && (
                        <p className="text-muted-foreground mt-1 text-xs">Primary outlet</p>
                      )}
                    </div>
                  ))
                ) : (
                  <p className="text-muted-foreground text-sm">No outlet assignments yet.</p>
                )}
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        {isPartner && (
          <TabsContent value="salary" className="mt-4">
            <SalaryHistoryTable history={salaryEntries} />
          </TabsContent>
        )}
      </Tabs>
    </div>
  );
}

function DetailRow({ label, value }: { label: string; value: string | null | undefined }) {
  return (
    <div>
      <dt className="text-muted-foreground font-medium">{label}</dt>
      <dd className="mt-0.5 capitalize">
        {value ?? <span className="text-muted-foreground">—</span>}
      </dd>
    </div>
  );
}
