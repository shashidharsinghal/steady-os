"use client";

import { useState } from "react";
import { Button, cn } from "@stride-os/ui";
import type { DashboardChannel, DashboardTrendPoint } from "../_lib/dashboard";

const CHANNELS: Array<{ key: DashboardChannel; label: string; color: string }> = [
  { key: "dine_in", label: "Dine In", color: "hsl(var(--chart-dine-in))" },
  { key: "takeaway", label: "Takeaway", color: "hsl(var(--chart-takeaway))" },
  { key: "swiggy", label: "Swiggy", color: "hsl(var(--chart-swiggy))" },
  { key: "zomato", label: "Zomato", color: "hsl(var(--chart-zomato))" },
];

export function ChannelMixChart({ trend }: { trend: DashboardTrendPoint[] }) {
  const [visibleChannels, setVisibleChannels] = useState<DashboardChannel[]>(
    CHANNELS.map((channel) => channel.key)
  );

  function toggleChannel(channel: DashboardChannel) {
    setVisibleChannels((current) =>
      current.includes(channel) ? current.filter((item) => item !== channel) : [...current, channel]
    );
  }

  const totals = trend.map((point) =>
    visibleChannels.reduce((sum, channel) => sum + (point.channels[channel] ?? 0), 0)
  );
  const maxTotal = Math.max(...totals, 1);

  if (trend.every((point) => totals[trend.indexOf(point)] === 0)) {
    return (
      <div className="text-muted-foreground flex h-[240px] items-center justify-center rounded-[18px] border border-dashed text-sm">
        No channel mix available for this period.
      </div>
    );
  }

  return (
    <div className="bg-card space-y-4 rounded-[22px] border p-5">
      <div className="space-y-1">
        <p className="text-sm font-semibold">Channel mix</p>
        <p className="text-muted-foreground text-sm">
          Revenue composition by channel across the period.
        </p>
      </div>

      <div className="flex flex-wrap gap-2">
        {CHANNELS.map((channel) => {
          const active = visibleChannels.includes(channel.key);
          return (
            <Button
              key={channel.key}
              type="button"
              variant={active ? "default" : "outline"}
              size="sm"
              onClick={() => toggleChannel(channel.key)}
            >
              {channel.label}
            </Button>
          );
        })}
      </div>

      <div className="space-y-2">
        {trend.map((point) => {
          return (
            <div key={point.day} className="space-y-1">
              <div className="flex items-center justify-between text-xs">
                <span className="text-muted-foreground">{point.day}</span>
                <span className="text-muted-foreground">{point.orders} orders</span>
              </div>
              <div className="bg-muted/40 flex h-4 overflow-hidden rounded-full">
                {CHANNELS.filter((channel) => visibleChannels.includes(channel.key)).map(
                  (channel) => {
                    const value = point.channels[channel.key] ?? 0;
                    const widthPct = (value / maxTotal) * 100;
                    return (
                      <div
                        key={channel.key}
                        className={cn("h-full transition-all")}
                        style={{ width: `${widthPct}%`, background: channel.color }}
                      />
                    );
                  }
                )}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
