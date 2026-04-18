import { Badge } from "@stride-os/ui";
import type { EmployeeRole } from "@stride-os/shared";

const ROLE_STYLES: Record<EmployeeRole, string> = {
  manager: "bg-sky-500/12 text-sky-700 dark:text-sky-300",
  staff: "bg-slate-500/12 text-slate-700 dark:text-slate-300",
  cleaner: "bg-emerald-500/12 text-emerald-700 dark:text-emerald-300",
};

export function EmployeeRoleBadge({ role }: { role: EmployeeRole }) {
  return (
    <Badge variant="secondary" className={ROLE_STYLES[role]}>
      {role.charAt(0).toUpperCase() + role.slice(1)}
    </Badge>
  );
}
