import { formatINRCompact } from "@stride-os/shared";
import { ArrowDownRight, ArrowUpRight, Minus } from "lucide-react";
import type { DoWBaseline, MorningCheckCard } from "../_lib/dashboard";

function deviationCopy(value: number | null) {
  if (value == null) {
    return { icon: Minus, className: "text-muted-foreground", label: "No weekday baseline yet" };
  }
  if (Math.abs(value) < 2) {
    return {
      icon: Minus,
      className: "text-muted-foreground",
      label: "In line with typical weekday",
    };
  }
  if (value > 0) {
    return {
      icon: ArrowUpRight,
      className: "text-emerald-600 dark:text-emerald-400",
      label: `${Math.round(value)}% above average ${cardWeekday(value)}`,
    };
  }
  return {
    icon: ArrowDownRight,
    className: "text-red-600 dark:text-red-400",
    label: `${Math.round(Math.abs(value))}% below average ${cardWeekday(value)}`,
  };
}

function cardWeekday(_: number) {
  return "weekday";
}

export function DoWHeadlineCard({
  targetDay,
  baseline,
}: {
  targetDay: MorningCheckCard;
  baseline: DoWBaseline;
}) {
  const deviation = deviationCopy(baseline.deviationPct);
  const Icon = deviation.icon;

  return (
    <div className="bg-card rounded-[24px] border p-5">
      <div className="space-y-1">
        <p className="text-muted-foreground text-xs uppercase tracking-[0.18em]">
          The morning check
        </p>
        <p className="text-lg font-semibold">{targetDay.dayLabel}</p>
      </div>

      <div className="mt-5 space-y-3">
        <p className="font-mono text-4xl font-semibold tracking-tight">
          {formatINRCompact(targetDay.revenuePaise / 100)}
        </p>
        <div className={`flex items-center gap-2 text-sm font-medium ${deviation.className}`}>
          <Icon className="h-4 w-4" />
          <span>{deviation.label.replace("weekday", targetDay.weekdayLabel.toLowerCase())}</span>
        </div>
      </div>

      <div className="bg-background/70 mt-5 rounded-[18px] border p-4">
        <p className="text-sm font-medium">{baseline.comparisonLabel}</p>
        <div className="text-muted-foreground mt-2 space-y-1 text-sm">
          <p>{formatINRCompact(baseline.averageRevenuePaise / 100)} average revenue</p>
          <p>
            {targetDay.orders.toLocaleString("en-IN")} orders
            {baseline.averageOrders > 0 ? ` (vs ${baseline.averageOrders.toFixed(1)} avg)` : ""}
            {" · "}
            AOV {formatINRCompact(targetDay.aovPaise / 100)}
            {baseline.averageAovPaise > 0
              ? ` (vs ${formatINRCompact(baseline.averageAovPaise / 100)} avg)`
              : ""}
          </p>
        </div>
      </div>
    </div>
  );
}
