import { formatINRCompact } from "@stride-os/shared";
import type { RevenuePoint } from "../_lib/dashboard";

function formatDayLabel(dayKey: string) {
  return new Intl.DateTimeFormat("en-IN", {
    timeZone: "Asia/Kolkata",
    day: "2-digit",
    month: "short",
    year: "numeric",
  }).format(new Date(`${dayKey}T00:00:00+05:30`));
}

function formatTooltipDayLabel(dayKey: string) {
  return new Intl.DateTimeFormat("en-IN", {
    timeZone: "Asia/Kolkata",
    weekday: "long",
    day: "2-digit",
    month: "short",
  }).format(new Date(`${dayKey}T00:00:00+05:30`));
}

function formatTickLabel(dayKey: string, singleMonth: boolean) {
  const date = new Date(`${dayKey}T00:00:00+05:30`);
  return new Intl.DateTimeFormat("en-IN", {
    timeZone: "Asia/Kolkata",
    day: "2-digit",
    ...(singleMonth ? {} : { month: "short" }),
  }).format(date);
}

function formatYAxisTick(value: number) {
  if (value <= 0) return "₹0";
  if (value >= 1000) return `₹${value.toFixed(1)}k`;
  return `₹${Math.round(value)}`;
}

export function RevenueOverTimeChart({
  current,
  previous: _previous,
}: {
  current: RevenuePoint[];
  previous: RevenuePoint[] | null;
}) {
  const dataPoints = current
    .filter((point) => point.orders > 0)
    .map((point) => ({
      ...point,
      revenue: Number(point.revenuePaise) / 100,
      aov: point.orders > 0 ? Number(point.revenuePaise) / 100 / point.orders : 0,
    }));

  if (dataPoints.length === 0) {
    return (
      <div className="bg-card text-muted-foreground flex h-[380px] items-center justify-center rounded-[24px] border border-dashed text-sm">
        No orders landed in this period. Try expanding the range.
      </div>
    );
  }

  const weekendRevenue = dataPoints
    .filter((point) => point.dayOfWeek === 6 || point.dayOfWeek === 7)
    .reduce((sum, point) => sum + point.revenue, 0);
  const totalRevenue = dataPoints.reduce((sum, point) => sum + point.revenue, 0);
  const weekendSharePct = totalRevenue > 0 ? (weekendRevenue / totalRevenue) * 100 : 0;

  const maxDayRevenue = Math.max(...dataPoints.map((point) => point.revenue), 1);
  const yMax = Math.max(maxDayRevenue * 1.1, 1);
  const barSize = Math.max(4, Math.min(24, 600 / dataPoints.length));
  const chartWidth = Math.max(520, dataPoints.length * (barSize + 12));
  const lastPoint = dataPoints[dataPoints.length - 1]!;
  const recentCards = dataPoints.slice(Math.max(dataPoints.length - 4, 0));
  const singleMonth =
    new Set(
      dataPoints.map((point) =>
        new Intl.DateTimeFormat("en-IN", {
          timeZone: "Asia/Kolkata",
          month: "2-digit",
          year: "numeric",
        }).format(new Date(`${point.dayKey}T00:00:00+05:30`))
      )
    ).size === 1;

  return (
    <div className="bg-card space-y-4 rounded-[24px] border p-5">
      <div className="space-y-1">
        <p className="text-base font-semibold">Revenue over time</p>
        <p className="text-muted-foreground text-sm">
          Daily revenue bars for days that actually had orders.
        </p>
      </div>

      <div className="rounded-[20px] border bg-[linear-gradient(to_bottom,hsl(var(--muted)/0.45),transparent)] p-4">
        <div className="relative grid h-[280px] grid-cols-[44px_1fr] gap-4">
          <div className="text-muted-foreground flex h-full flex-col justify-between text-[11px]">
            <span>{formatYAxisTick(yMax)}</span>
            <span>{formatYAxisTick(yMax / 2)}</span>
            <span>₹0</span>
          </div>

          <div className="relative h-full overflow-x-auto">
            <div className="pointer-events-none absolute inset-0 flex flex-col justify-between">
              <div className="border-border/60 border-t border-dashed" />
              <div className="border-border/45 border-t border-dashed" />
              <div className="border-border/60 border-t border-dashed" />
            </div>

            <div
              className="relative flex h-full items-end gap-3"
              style={{ width: `${chartWidth}px` }}
            >
              {dataPoints.map((point) => {
                const heightPct = (point.revenue / yMax) * 100;
                const isLast = point.dayKey === lastPoint.dayKey;

                return (
                  <div
                    key={point.dayKey}
                    className="group relative flex shrink-0 items-end justify-center"
                    style={{ width: `${barSize}px` }}
                  >
                    {isLast ? (
                      <div className="border-primary/45 pointer-events-none absolute inset-y-0 left-1/2 -translate-x-1/2 border-l border-dashed" />
                    ) : null}

                    <div className="relative flex h-full w-full flex-col items-center justify-end">
                      <div className="bg-background/95 pointer-events-none invisible absolute bottom-[calc(100%+12px)] left-1/2 z-10 w-44 -translate-x-1/2 rounded-[16px] border p-3 opacity-0 shadow-lg transition-all duration-150 group-hover:visible group-hover:opacity-100">
                        <p className="text-xs font-semibold">
                          {formatTooltipDayLabel(point.dayKey)}
                        </p>
                        <div className="text-muted-foreground mt-2 space-y-1 text-xs">
                          <p>Revenue: {formatINRCompact(point.revenue)}</p>
                          <p>Orders: {point.orders.toLocaleString("en-IN")}</p>
                          <p>AOV: {formatINRCompact(point.aov)}</p>
                        </div>
                      </div>

                      {isLast ? (
                        <div className="bg-background/90 text-muted-foreground pointer-events-none absolute bottom-[calc(100%+6px)] left-1/2 -translate-x-1/2 whitespace-nowrap rounded-full border px-2 py-1 text-[11px] shadow-sm">
                          Last upload: {formatDayLabel(point.dayKey)}
                        </div>
                      ) : null}

                      <div
                        className="bg-primary w-full rounded-t-[10px] transition-[filter,opacity] duration-150 group-hover:brightness-110"
                        style={{ height: `${Math.max(heightPct, 2)}%` }}
                        aria-label={`${formatDayLabel(point.dayKey)} revenue ${formatINRCompact(point.revenue)} from ${point.orders} orders`}
                        title={`${formatTooltipDayLabel(point.dayKey)} · ${formatINRCompact(point.revenue)} · ${point.orders} orders · AOV ${formatINRCompact(point.aov)}`}
                      />

                      <p className="mt-2 text-center text-[11px] font-medium">
                        {formatTickLabel(point.dayKey, singleMonth)}
                      </p>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      </div>

      <p className="text-muted-foreground text-sm">
        Saturdays and Sundays account for {Math.round(weekendSharePct)}% of revenue this period.
      </p>

      <div className="grid gap-2 md:grid-cols-3 xl:grid-cols-4">
        {recentCards.map((point) => (
          <div key={point.dayKey} className="bg-background/70 rounded-[16px] border p-3">
            <p className="text-muted-foreground text-xs">{formatDayLabel(point.dayKey)}</p>
            <p className="font-mono text-sm font-semibold">{formatINRCompact(point.revenue)}</p>
            <p className="text-muted-foreground text-xs">
              {point.orders} orders · AOV {formatINRCompact(point.aov)}
            </p>
          </div>
        ))}
      </div>
    </div>
  );
}
