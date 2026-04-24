import { cn } from "@stride-os/ui";
import type { RevenuePoint } from "../_lib/dashboard";

export function DoWRibbon({ points }: { points: RevenuePoint[] }) {
  if (points.length === 0) return null;

  return (
    <div className="grid grid-cols-6 gap-2 md:grid-cols-10 xl:grid-cols-12">
      {points.map((point) => (
        <div key={point.dayKey} className="space-y-1 text-center">
          <div
            className={cn(
              "mx-auto h-3 w-3 rounded-full border",
              point.ribbonTone === "up" && "border-emerald-500/40 bg-emerald-500",
              point.ribbonTone === "flat" && "border-amber-500/40 bg-amber-400",
              point.ribbonTone === "down" && "border-red-500/40 bg-red-500",
              point.ribbonTone === "none" && "border-border bg-muted"
            )}
            title={
              point.dowDeviationPct == null
                ? `${point.shortLabel}: no same-weekday baseline yet`
                : `${point.shortLabel}: ${Math.round(point.dowDeviationPct)}% vs same-weekday baseline`
            }
          />
          <p className="text-muted-foreground text-[11px]">{point.weekdayLabel}</p>
        </div>
      ))}
    </div>
  );
}
