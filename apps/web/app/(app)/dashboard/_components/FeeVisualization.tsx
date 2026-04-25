import { formatINRCompact } from "@stride-os/shared";
import type { ChannelEconomicsRow } from "../_lib/dashboard";

const UNSETTLED_TITLE = "Awaiting settlement file. Upload Swiggy/Zomato annexure in /ingest.";

export function FeeVisualization({ rows }: { rows: ChannelEconomicsRow[] }) {
  const settledRows = rows.filter((row) => row.grossPaise > 0 && row.netPaise != null);
  const fullySettledRows = settledRows.filter(
    (row) => row.ordersTotal > 0 && row.ordersPending === 0
  );
  const biggestLeak = fullySettledRows.reduce<ChannelEconomicsRow | null>((worst, row) => {
    if (!row.netPaise) return worst;
    if (!worst || row.grossPaise - row.netPaise > worst.grossPaise - (worst.netPaise ?? 0)) {
      return row;
    }
    return worst;
  }, null);

  return (
    <div className="space-y-4">
      <div className="bg-card rounded-[24px] border p-5">
        <div className="space-y-1">
          <p className="text-base font-semibold">Take-home by channel</p>
          <p className="text-muted-foreground text-sm">
            The bar makes the fee cut visible relative to what the customer paid.
          </p>
        </div>

        {settledRows.length === 0 ? (
          <div
            className="text-muted-foreground mt-5 rounded-[18px] border border-dashed p-4 text-sm"
            title={UNSETTLED_TITLE}
          >
            Awaiting settlement file. Upload Swiggy or Zomato annexures in /ingest to unlock
            take-home economics.
          </div>
        ) : (
          <div className="mt-5 space-y-4">
            {settledRows.map((row) => {
              const safeNetPaise = row.netPaise ?? 0;
              const feePct =
                row.grossPaise > 0 ? ((row.grossPaise - safeNetPaise) / row.grossPaise) * 100 : 0;
              const netPct = row.grossPaise > 0 ? (safeNetPaise / row.grossPaise) * 100 : 0;

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
        )}
      </div>

      {biggestLeak ? (
        <div className="bg-card rounded-[24px] border p-5">
          <p className="text-base font-semibold">Take-Home Leak</p>
          <p className="text-muted-foreground mt-2 text-sm leading-6">
            Biggest take-home gap: {biggestLeak.label}. Of{" "}
            {formatINRCompact(biggestLeak.grossPaise / 100)} gross, you receive{" "}
            {formatINRCompact((biggestLeak.netPaise ?? 0) / 100)}. That&apos;s{" "}
            {formatINRCompact((biggestLeak.grossPaise - (biggestLeak.netPaise ?? 0)) / 100)} (
            {Math.round(
              ((biggestLeak.grossPaise - (biggestLeak.netPaise ?? 0)) / biggestLeak.grossPaise ||
                0) * 100
            )}
            %) lost to commission and fees.
          </p>
        </div>
      ) : null}
    </div>
  );
}
