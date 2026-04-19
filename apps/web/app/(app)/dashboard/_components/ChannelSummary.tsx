import { formatINRCompact } from "@stride-os/shared";
import { cn } from "@stride-os/ui";
import type { DashboardChannelSummary as DashboardChannelSummaryRow } from "../_lib/dashboard";

function deltaTone(deltaPct: number | null): string {
  if (deltaPct == null || Math.abs(deltaPct) <= 2) return "text-muted-foreground";
  return deltaPct > 0 ? "text-[hsl(var(--success))]" : "text-[hsl(var(--danger))]";
}

export function ChannelSummary({
  rows,
  compare,
}: {
  rows: DashboardChannelSummaryRow[];
  compare: boolean;
}) {
  return (
    <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-4">
      {rows
        .filter((row) => row.channel !== "other")
        .map((row) => (
          <div key={row.channel} className="bg-card rounded-[18px] border p-4">
            <div className="space-y-1">
              <p className="text-muted-foreground text-xs uppercase tracking-[0.18em]">
                {row.label}
              </p>
              <p className="font-mono text-xl font-semibold">
                {formatINRCompact(row.revenuePaise / 100)}
              </p>
              <p className="text-muted-foreground text-sm">
                {row.orders} orders · {row.sharePct.toFixed(1)}% of total
              </p>
              <p className="text-muted-foreground text-sm">
                {row.channel === "swiggy" || row.channel === "zomato"
                  ? `Net payout ${formatINRCompact(row.netPayoutPaise / 100)}`
                  : `Net to us ${formatINRCompact(row.netPayoutPaise / 100)}`}
              </p>
            </div>
            {compare ? (
              <p className={cn("mt-3 text-sm font-medium", deltaTone(row.deltaPct))}>
                {row.deltaPct == null
                  ? "No baseline"
                  : `${row.deltaPct >= 0 ? "↑" : "↓"} ${Math.abs(row.deltaPct).toFixed(1)}%`}
              </p>
            ) : null}
          </div>
        ))}
    </div>
  );
}
