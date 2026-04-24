import { formatINRCompact } from "@stride-os/shared";
import type { DashboardChannel, RevenuePoint } from "../_lib/dashboard";

const CHANNEL_META: Array<{ key: DashboardChannel; label: string; fill: string }> = [
  { key: "dine_in", label: "Dine In", fill: "hsl(var(--primary) / 0.75)" },
  { key: "takeaway", label: "Takeaway", fill: "hsl(var(--muted-foreground) / 0.45)" },
  { key: "swiggy", label: "Swiggy", fill: "hsl(27 94% 56% / 0.75)" },
  { key: "zomato", label: "Zomato", fill: "hsl(4 80% 58% / 0.72)" },
  { key: "other", label: "Other", fill: "hsl(var(--secondary) / 0.55)" },
];

function buildArea(values: number[], baseValues: number[], maxValue: number): string {
  const top = values
    .map((value, index) => {
      const x = (index / Math.max(values.length - 1, 1)) * 100;
      const y = 100 - (value / Math.max(maxValue, 1)) * 100;
      return `${x},${y}`;
    })
    .join(" ");

  const bottom = [...baseValues]
    .reverse()
    .map((value, index) => {
      const x = ((baseValues.length - 1 - index) / Math.max(baseValues.length - 1, 1)) * 100;
      const y = 100 - (value / Math.max(maxValue, 1)) * 100;
      return `${x},${y}`;
    })
    .join(" ");

  return `${top} ${bottom}`;
}

export function ChannelStackedAreaChart({ points }: { points: RevenuePoint[] }) {
  if (points.every((point) => point.revenuePaise === 0)) {
    return (
      <div className="bg-card text-muted-foreground flex h-[360px] items-center justify-center rounded-[24px] border border-dashed text-sm">
        No channel breakdown is available for this period yet.
      </div>
    );
  }

  const totals = points.map((point) => point.revenuePaise);
  const maxTotal = Math.max(...totals, 1);
  const cumulativeBase = new Array(points.length).fill(0);
  const renderedAreas = CHANNEL_META.map((channel) => {
    const topValues = points.map((point, index) => {
      cumulativeBase[index] += point.channels[channel.key] ?? 0;
      return cumulativeBase[index];
    });
    const bottomValues = topValues.map(
      (value, index) => value - (points[index]?.channels[channel.key] ?? 0)
    );
    return {
      ...channel,
      path: buildArea(topValues, bottomValues, maxTotal),
    };
  });

  return (
    <div className="bg-card space-y-4 rounded-[24px] border p-5">
      <div className="space-y-1">
        <p className="text-base font-semibold">Channel breakdown over time</p>
        <p className="text-muted-foreground text-sm">
          Stacked channel contribution across the selected period.
        </p>
      </div>

      <div className="bg-background/60 rounded-[20px] border p-4">
        <svg viewBox="0 0 100 100" className="h-[260px] w-full overflow-visible">
          {renderedAreas.map((area) => (
            <polygon key={area.key} points={area.path} fill={area.fill} />
          ))}
        </svg>
      </div>

      <div className="flex flex-wrap gap-3">
        {CHANNEL_META.map((channel) => {
          const total = points.reduce((sum, point) => sum + (point.channels[channel.key] ?? 0), 0);
          if (total === 0) return null;
          return (
            <div
              key={channel.key}
              className="flex items-center gap-2 rounded-full border px-3 py-1.5 text-xs"
            >
              <span className="h-2.5 w-2.5 rounded-full" style={{ background: channel.fill }} />
              <span>{channel.label}</span>
              <span className="text-muted-foreground">{formatINRCompact(total / 100)}</span>
            </div>
          );
        })}
      </div>
    </div>
  );
}
