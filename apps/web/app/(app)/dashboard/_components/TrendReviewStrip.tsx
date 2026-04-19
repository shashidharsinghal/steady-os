import { CompareToggle } from "./CompareToggle";
import { PeriodSelector } from "./PeriodSelector";
import { RevenueTrendChart } from "./RevenueTrendChart";
import { ChannelMixChart } from "./ChannelMixChart";
import { ChannelSummary } from "./ChannelSummary";
import {
  formatCompactPeriodLabel,
  type DashboardPeriod,
  type DashboardPeriodPayload,
} from "../_lib/dashboard";

export function TrendReviewStrip({
  period,
  compare,
  payload,
}: {
  period: DashboardPeriod;
  compare: boolean;
  payload: DashboardPeriodPayload;
}) {
  const rangeLabel = formatCompactPeriodLabel(new Date(period.start), new Date(period.end));

  return (
    <section className="space-y-4">
      <div className="bg-card flex flex-col gap-4 rounded-[22px] border p-5 xl:flex-row xl:items-end xl:justify-between">
        <div className="space-y-2">
          <p className="text-primary text-sm font-medium uppercase tracking-[0.18em]">
            Trend review
          </p>
          <div className="space-y-1">
            <p className="text-2xl font-semibold tracking-tight">{period.label}</p>
            <p className="text-muted-foreground text-sm">{rangeLabel}</p>
            {compare && period.compareLabel ? (
              <p className="text-muted-foreground text-xs">
                Previous period: {period.compareLabel}
              </p>
            ) : null}
          </div>
        </div>
        <div className="space-y-3">
          <PeriodSelector
            period={period.key}
            customStart={period.customStart}
            customEnd={period.customEnd}
          />
          <CompareToggle enabled={compare} />
        </div>
      </div>

      <div className="grid gap-4 xl:grid-cols-[1.15fr_0.85fr]">
        <RevenueTrendChart
          current={payload.current.trend}
          previous={payload.previous?.trend ?? null}
        />
        <ChannelMixChart trend={payload.current.trend} />
      </div>

      <ChannelSummary rows={payload.current.channelSummary} compare={compare} />
    </section>
  );
}
