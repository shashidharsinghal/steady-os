"use client";

import { formatINRCompact } from "@stride-os/shared";
import type { DashboardTrendPoint } from "../_lib/dashboard";

function buildLine(values: number[]): string {
  const max = Math.max(...values, 1);
  const min = Math.min(...values, 0);
  const range = Math.max(max - min, 1);

  return values
    .map((value, index) => {
      const x = (index / Math.max(values.length - 1, 1)) * 100;
      const y = 100 - ((value - min) / range) * 100;
      return `${x},${y}`;
    })
    .join(" ");
}

export function RevenueTrendChart({
  current,
  previous,
}: {
  current: DashboardTrendPoint[];
  previous: DashboardTrendPoint[] | null;
}) {
  if (current.every((point) => point.orders === 0)) {
    return (
      <div className="text-muted-foreground flex h-[240px] items-center justify-center rounded-[18px] border border-dashed text-sm">
        No sales in this period. Try expanding the range.
      </div>
    );
  }

  const currentValues = current.map((point) => point.revenuePaise);
  const previousValues = previous?.map((point) => point.revenuePaise) ?? [];
  const movingValues = current.map((point) => point.movingAveragePaise ?? 0);
  const yMax = Math.max(...currentValues, ...previousValues, ...movingValues, 1);
  const normalized = (values: number[]) => values.map((value) => (value / yMax) * 100);

  return (
    <div className="bg-card space-y-4 rounded-[22px] border p-5">
      <div className="space-y-1">
        <p className="text-sm font-semibold">Revenue trend</p>
        <p className="text-muted-foreground text-sm">
          Daily revenue with a 7-day moving average overlay.
        </p>
      </div>

      <div className="relative h-[240px] rounded-[18px] bg-[linear-gradient(to_bottom,hsl(var(--muted)/0.35),transparent)] p-4">
        <svg viewBox="0 0 100 100" className="h-full w-full overflow-visible">
          {previous && previous.length > 0 ? (
            <polyline
              fill="none"
              stroke="hsl(var(--muted-foreground))"
              strokeWidth="2.2"
              strokeDasharray="4 4"
              opacity="0.45"
              points={buildLine(normalized(previousValues))}
            />
          ) : null}
          <polyline
            fill="none"
            stroke="hsl(var(--secondary))"
            strokeWidth="2"
            strokeDasharray="5 4"
            opacity="0.65"
            points={buildLine(normalized(movingValues))}
          />
          <polyline
            fill="none"
            stroke="hsl(var(--primary))"
            strokeWidth="3"
            strokeLinecap="round"
            strokeLinejoin="round"
            points={buildLine(normalized(currentValues))}
          />
        </svg>
      </div>

      <div className="grid gap-2 sm:grid-cols-4">
        {current.slice(Math.max(current.length - 4, 0)).map((point) => (
          <div key={point.day} className="bg-background/60 rounded-[14px] border px-3 py-2">
            <p className="text-muted-foreground text-xs">{point.day}</p>
            <p className="font-mono text-sm font-semibold">
              {formatINRCompact(point.revenuePaise / 100)}
            </p>
            <p className="text-muted-foreground text-xs">{point.orders} orders</p>
          </div>
        ))}
      </div>
    </div>
  );
}
