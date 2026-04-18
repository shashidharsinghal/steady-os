import Link from "next/link";
import { Card, CardContent } from "@stride-os/ui";
import type { Employee } from "@stride-os/shared";
import { EmployeeRoleBadge } from "./EmployeeRoleBadge";

export function EmployeeListItem({
  employee,
  primaryOutletName,
}: {
  employee: Employee;
  primaryOutletName?: string | null;
}) {
  return (
    <Link href={`/employees/${employee.id}`}>
      <Card className="hover:border-primary/40 transition-colors">
        <CardContent className="space-y-3 p-5">
          <div className="flex items-start justify-between gap-3">
            <div className="space-y-1">
              <h2 className="font-semibold leading-tight">{employee.full_name}</h2>
              <p className="text-muted-foreground text-sm">
                {employee.position ?? "No position set"}
              </p>
            </div>
            <EmployeeRoleBadge role={employee.role} />
          </div>

          <dl className="grid gap-2 text-sm">
            <div className="flex items-center justify-between gap-3">
              <dt className="text-muted-foreground">Primary outlet</dt>
              <dd className="text-right">{primaryOutletName ?? "Unassigned"}</dd>
            </div>
            <div className="flex items-center justify-between gap-3">
              <dt className="text-muted-foreground">Phone</dt>
              <dd>{employee.phone}</dd>
            </div>
            <div className="flex items-center justify-between gap-3">
              <dt className="text-muted-foreground">Employment</dt>
              <dd>{employee.employment_type === "full_time" ? "Full-time" : "Part-time"}</dd>
            </div>
          </dl>
        </CardContent>
      </Card>
    </Link>
  );
}
