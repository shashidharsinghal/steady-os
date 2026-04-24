import { formatINRCompact } from "@stride-os/shared";
import { cn } from "@stride-os/ui";
import type { DoWPatternPoint } from "../_lib/dashboard";

export function DoWPatternChart({ rows }: { rows: DoWPatternPoint[] }) {
  const max = Math.max(...rows.map((row) => row.averageRevenuePaise), 1);

  return (
    <div className="bg-card rounded-[24px] border p-5">
      <div className="space-y-1">
        <p className="text-base font-semibold">Day-of-week pattern</p>
        <p className="text-muted-foreground text-sm">
          Average revenue by weekday inside the selected period.
        </p>
      </div>

      <div className="mt-5 space-y-3">
        {rows.map((row) => (
          <div key={row.dayOfWeek} className="grid grid-cols-[92px_1fr_auto] items-center gap-3">
            <span className="text-sm font-medium">{row.label}</span>
            <div className="bg-muted/45 h-4 overflow-hidden rounded-full">
              <div
                className={cn(
                  "h-full rounded-full",
                  row.isHighest &&
                    "bg-[linear-gradient(90deg,hsl(var(--primary)),hsl(var(--secondary)))]",
                  row.isLowest &&
                    "bg-[linear-gradient(90deg,hsl(var(--muted-foreground)),hsl(var(--muted)))]",
                  !row.isHighest &&
                    !row.isLowest &&
                    "bg-[linear-gradient(90deg,hsl(var(--secondary)),hsl(var(--secondary)/0.65))]"
                )}
                style={{ width: `${(row.averageRevenuePaise / max) * 100}%` }}
              />
            </div>
            <div className="text-right">
              <p className="font-mono text-sm font-semibold">
                {formatINRCompact(row.averageRevenuePaise / 100)}
              </p>
              <p className="text-muted-foreground text-[11px]">
                {row.isHighest
                  ? "Highest"
                  : row.isLowest
                    ? "Lowest"
                    : `${row.daysCount} day${row.daysCount === 1 ? "" : "s"}`}
              </p>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
