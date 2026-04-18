import { Badge } from "@stride-os/ui";
import type { OutletStatus } from "@stride-os/shared";

const variantMap: Record<OutletStatus, "default" | "secondary" | "outline"> = {
  active: "default",
  setup: "secondary",
  closed: "outline",
};

const labelMap: Record<OutletStatus, string> = {
  active: "Active",
  setup: "Setup",
  closed: "Closed",
};

const colorMap: Record<OutletStatus, string> = {
  active: "bg-emerald-500/12 text-emerald-700 dark:text-emerald-300",
  setup: "bg-amber-500/12 text-amber-700 dark:text-amber-300",
  closed: "bg-slate-500/12 text-slate-700 dark:text-slate-300",
};

export function OutletStatusBadge({ status }: { status: OutletStatus }) {
  return (
    <Badge variant={variantMap[status]} className={colorMap[status]}>
      {labelMap[status]}
    </Badge>
  );
}
