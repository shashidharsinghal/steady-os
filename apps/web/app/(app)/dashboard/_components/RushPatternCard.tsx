import { formatINRCompact } from "@stride-os/shared";
import type { RushPattern } from "../_lib/dashboard";

export function RushPatternCard({ rush }: { rush: RushPattern }) {
  const max = Math.max(...rush.hours.map((row) => row.averageRevenuePaise), 1);

  return (
    <div className="bg-card rounded-[24px] border p-5">
      <div className="space-y-1">
        <p className="text-muted-foreground text-xs uppercase tracking-[0.18em]">Today's rush</p>
        <p className="text-lg font-semibold">
          {rush.peakHourLabel
            ? `Today's rush will likely peak around ${rush.peakHourLabel}`
            : (rush.fallbackLabel ?? "Typical rush pattern is still building")}
        </p>
        <p className="text-muted-foreground text-sm">
          {rush.peakWindowSharePct != null &&
          rush.peakWindowStartHour != null &&
          rush.peakWindowEndHour != null
            ? `${Math.round(rush.peakWindowSharePct)}% of matched-day revenue usually lands between ${String(rush.peakWindowStartHour).padStart(2, "0")}:00 and ${String(rush.peakWindowEndHour).padStart(2, "0")}:59.`
            : rush.baselineLabel}
        </p>
      </div>

      {rush.mode === "insufficient" ? null : (
        <div className="mt-5 space-y-3">
          {rush.hours.map((row) => (
            <div key={row.hour} className="grid grid-cols-[56px_1fr_auto] items-center gap-3">
              <span className="text-muted-foreground text-xs">{row.label}</span>
              <div className="bg-muted/45 h-3 overflow-hidden rounded-full">
                <div
                  className="h-full rounded-full bg-[linear-gradient(90deg,hsl(var(--primary)),hsl(var(--secondary)))]"
                  style={{ width: `${(row.averageRevenuePaise / max) * 100}%` }}
                />
              </div>
              <span className="font-mono text-xs font-medium">
                {formatINRCompact(row.averageRevenuePaise / 100)}
              </span>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
