import { formatINRCompact } from "@stride-os/shared";
import type { CustomerTimelineEntry } from "../actions";

function formatDateTime(iso: string) {
  return new Date(iso).toLocaleString("en-IN", {
    day: "2-digit",
    month: "short",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

export function CustomerTimeline({ rows }: { rows: CustomerTimelineEntry[] }) {
  if (rows.length === 0) {
    return (
      <div className="text-muted-foreground rounded-[18px] border border-dashed p-5 text-sm">
        No customer events recorded yet.
      </div>
    );
  }

  return (
    <div className="space-y-3">
      {rows.map((row) => (
        <div key={`${row.source}-${row.id}`} className="bg-card rounded-[18px] border p-4">
          <div className="flex items-start justify-between gap-3">
            <div className="space-y-1">
              <p className="font-medium">{row.title}</p>
              <p className="text-muted-foreground text-sm">{row.subtitle}</p>
              <p className="text-muted-foreground text-xs">{formatDateTime(row.occurredAt)}</p>
            </div>
            <p className="font-mono text-sm font-semibold">
              {formatINRCompact(row.amountPaise / 100)}
            </p>
          </div>
        </div>
      ))}
    </div>
  );
}
