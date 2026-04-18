import { Badge } from "@stride-os/ui";
import type { EmployeeRole } from "@stride-os/shared";

const ROLE_STYLES: Record<EmployeeRole, string> = {
  manager: "bg-blue-100 text-blue-800 hover:bg-blue-100",
  staff: "bg-slate-100 text-slate-800 hover:bg-slate-100",
  cleaner: "bg-teal-100 text-teal-800 hover:bg-teal-100",
};

export function EmployeeRoleBadge({ role }: { role: EmployeeRole }) {
  return (
    <Badge variant="secondary" className={ROLE_STYLES[role]}>
      {role.charAt(0).toUpperCase() + role.slice(1)}
    </Badge>
  );
}
