import type { ChannelEconomicsRow } from "../_lib/dashboard";

export function FeeVisualization({ rows }: { rows: ChannelEconomicsRow[] }) {
  const visible = rows.filter((row) => row.grossPaise > 0 && !row.awaitingParser);

  return (
    <div className="bg-card rounded-[24px] border p-5">
      <div className="space-y-1">
        <p className="text-base font-semibold">Take-home by channel</p>
        <p className="text-muted-foreground text-sm">
          The bar makes the fee cut visible relative to what the customer paid.
        </p>
      </div>

      <div className="mt-5 space-y-4">
        {visible.map((row) => {
          const feePct =
            row.grossPaise > 0 ? ((row.grossPaise - row.netPaise) / row.grossPaise) * 100 : 0;
          const netPct = row.grossPaise > 0 ? (row.netPaise / row.grossPaise) * 100 : 0;

          return (
            <div key={row.channel} className="space-y-1.5">
              <div className="flex items-center justify-between text-sm">
                <span className="font-medium">{row.label}</span>
                <span className="font-mono text-sm font-semibold">
                  ₹{Math.round(row.netPerRs100 ?? 0)} net per ₹100
                </span>
              </div>
              <div className="bg-muted/45 flex h-4 overflow-hidden rounded-full">
                <div className="bg-emerald-500" style={{ width: `${netPct}%` }} />
                <div className="bg-red-500/70" style={{ width: `${Math.max(feePct, 0)}%` }} />
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
