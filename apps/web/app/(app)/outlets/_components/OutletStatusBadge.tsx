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
  active: "bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200",
  setup: "bg-amber-100 text-amber-800 dark:bg-amber-900 dark:text-amber-200",
  closed: "bg-neutral-100 text-neutral-600 dark:bg-neutral-800 dark:text-neutral-400",
};

export function OutletStatusBadge({ status }: { status: OutletStatus }) {
  return (
    <Badge variant={variantMap[status]} className={colorMap[status]}>
      {labelMap[status]}
    </Badge>
  );
}
