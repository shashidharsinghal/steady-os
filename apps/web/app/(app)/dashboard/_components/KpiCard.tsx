"use client";

import { Minus, TrendingDown, TrendingUp } from "lucide-react";
import { Card, CardContent, cn } from "@stride-os/ui";
import { formatINRCompact } from "@stride-os/shared";
import type { DashboardKpi } from "../_lib/dashboard";

function formatValue(title: string, value: number): string {
  if (title === "Orders") return Math.round(value).toLocaleString("en-IN");
  return formatINRCompact(value / 100);
}

function getDeltaTone(deltaPct: number | null): {
  Icon: typeof TrendingUp;
  label: string;
  className: string;
} {
  if (deltaPct == null || Math.abs(deltaPct) <= 5) {
    return { Icon: Minus, label: "Flat", className: "text-muted-foreground" };
  }
  if (deltaPct > 0) {
    return {
      Icon: TrendingUp,
      label: `${deltaPct.toFixed(1)}%`,
      className: "text-[hsl(var(--success))]",
    };
  }
  return {
    Icon: TrendingDown,
    label: `${Math.abs(deltaPct).toFixed(1)}%`,
    className: "text-[hsl(var(--danger))]",
  };
}

function Sparkline({ values }: { values: number[] }) {
  const max = Math.max(...values, 1);
  const min = Math.min(...values, 0);
  const range = Math.max(max - min, 1);
  const points = values
    .map((value, index) => {
      const x = (index / Math.max(values.length - 1, 1)) * 100;
      const y = 100 - ((value - min) / range) * 100;
      return `${x},${y}`;
    })
    .join(" ");

  return (
    <svg viewBox="0 0 100 100" className="h-12 w-full">
      <polyline
        fill="none"
        stroke="hsl(var(--primary))"
        strokeWidth="3"
        strokeLinecap="round"
        strokeLinejoin="round"
        points={points}
      />
    </svg>
  );
}

export function KpiCard({ kpi }: { kpi: DashboardKpi }) {
  const delta = getDeltaTone(kpi.deltaPct);
  return (
    <Card className="overflow-hidden">
      <CardContent className="space-y-4 p-5">
        <div className="space-y-1">
          <p className="text-muted-foreground text-xs uppercase tracking-[0.18em]">{kpi.title}</p>
          <p className="font-mono text-3xl font-semibold tabular-nums tracking-tight">
            {formatValue(kpi.title, kpi.value)}
          </p>
        </div>

        <div className="flex items-center gap-2 text-sm">
          <delta.Icon className={cn("h-4 w-4", delta.className)} />
          <span className={cn("font-medium", delta.className)}>{delta.label}</span>
          <span className="text-muted-foreground">{kpi.deltaLabel}</span>
        </div>

        <Sparkline values={kpi.sparkline.map((point) => point.revenuePaise)} />
      </CardContent>
    </Card>
  );
}
