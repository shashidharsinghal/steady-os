import { Badge } from "@stride-os/ui";
import type { IngestionStatus } from "@stride-os/ingestion";

const labelMap: Record<IngestionStatus, string> = {
  uploaded: "Uploaded",
  parsing: "Parsing",
  preview_ready: "Preview ready",
  committing: "Committing",
  committed: "Committed",
  rolled_back: "Rolled back",
  failed: "Failed",
  purged: "Purged",
};

const colorMap: Record<IngestionStatus, string> = {
  uploaded: "bg-blue-500/12 text-blue-700 dark:text-blue-300",
  parsing: "bg-amber-500/12 text-amber-700 dark:text-amber-300",
  preview_ready: "bg-violet-500/12 text-violet-700 dark:text-violet-300",
  committing: "bg-amber-500/12 text-amber-700 dark:text-amber-300",
  committed: "bg-emerald-500/12 text-emerald-700 dark:text-emerald-300",
  rolled_back: "bg-slate-500/12 text-slate-700 dark:text-slate-300",
  failed: "bg-red-500/12 text-red-700 dark:text-red-300",
  purged: "bg-slate-500/12 text-slate-700 dark:text-slate-300",
};

export function RunStatusBadge({ status }: { status: IngestionStatus }) {
  return (
    <Badge variant="secondary" className={colorMap[status]}>
      {labelMap[status]}
    </Badge>
  );
}
