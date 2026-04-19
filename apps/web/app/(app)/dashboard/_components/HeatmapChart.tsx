"use client";

import { formatINRCompact } from "@stride-os/shared";
import { cn } from "@stride-os/ui";
import type { DashboardHeatmapCell } from "../_lib/dashboard";

const HOURS = [6, 8, 10, 12, 14, 16, 18, 20, 22];
const DAYS = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"];

export function HeatmapChart({ cells }: { cells: DashboardHeatmapCell[] }) {
  const maxRevenue = Math.max(...cells.map((cell) => cell.revenuePaise), 1);

  return (
    <div className="bg-card space-y-4 rounded-[22px] border p-5">
      <div className="space-y-1">
        <p className="text-sm font-semibold">When money shows up</p>
        <p className="text-muted-foreground text-sm">2-hour IST buckets across the week.</p>
      </div>

      <div className="grid grid-cols-[70px_repeat(7,minmax(0,1fr))] gap-2">
        <div />
        {DAYS.map((day) => (
          <div key={day} className="text-muted-foreground text-center text-xs font-medium">
            {day}
          </div>
        ))}
        {HOURS.map((hour) => (
          <div key={hour} className="contents">
            <div className="text-muted-foreground flex items-center text-xs">
              {String(hour).padStart(2, "0")}:00
            </div>
            {DAYS.map((dayLabel, index) => {
              const cell = cells.find(
                (item) => item.dayOfWeek === index + 1 && item.hourBlock === hour
              );
              const intensity = cell ? cell.revenuePaise / maxRevenue : 0;
              return (
                <div
                  key={`${dayLabel}-${hour}`}
                  className={cn(
                    "flex min-h-[60px] flex-col justify-between rounded-[14px] border p-2 text-[11px]"
                  )}
                  style={{
                    background: `linear-gradient(180deg, hsl(var(--primary) / ${0.12 + intensity * 0.55}), hsl(var(--secondary) / ${0.08 + intensity * 0.25}))`,
                  }}
                  aria-label={`${dayLabel} ${hour}:00 revenue ${cell ? formatINRCompact(cell.revenuePaise / 100) : "₹0"}`}
                >
                  <span className="font-medium">
                    {cell ? formatINRCompact(cell.revenuePaise / 100) : "—"}
                  </span>
                  <span className="text-muted-foreground">{cell?.orders ?? 0} orders</span>
                </div>
              );
            })}
          </div>
        ))}
      </div>
    </div>
  );
}
