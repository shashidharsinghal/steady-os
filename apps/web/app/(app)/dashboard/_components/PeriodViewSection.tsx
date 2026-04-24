import { CompareToggle } from "./CompareToggle";
import { PeriodSelector } from "./PeriodSelector";
import { RevenueOverTimeChart } from "./RevenueOverTimeChart";
import { DoWPatternChart } from "./DoWPatternChart";
import { ChannelStackedAreaChart } from "./ChannelStackedAreaChart";
import type { PeriodViewData } from "../_lib/dashboard";

export function PeriodViewSection({ data, compare }: { data: PeriodViewData; compare: boolean }) {
  return (
    <section className="space-y-4">
      <div className="bg-card flex flex-col gap-4 rounded-[24px] border p-5 xl:flex-row xl:items-end xl:justify-between">
        <div className="space-y-1">
          <p className="text-primary text-sm font-medium uppercase tracking-[0.22em]">Section 2</p>
          <h2 className="text-2xl font-semibold tracking-tight">Period View</h2>
          <p className="text-muted-foreground text-sm">
            {data.rangeLabel}
            {compare && data.period.compareLabel
              ? ` · comparing to ${data.period.compareLabel}`
              : ""}
          </p>
        </div>
        <div className="space-y-3">
          <PeriodSelector
            period={data.period.key}
            customStart={data.period.customStart}
            customEnd={data.period.customEnd}
          />
          <CompareToggle enabled={compare} />
        </div>
      </div>

      <div className="grid gap-4 xl:grid-cols-[1.18fr_0.82fr]">
        <RevenueOverTimeChart current={data.current} previous={data.previous} />
        <DoWPatternChart rows={data.dowPattern} />
      </div>

      <ChannelStackedAreaChart points={data.current} />
    </section>
  );
}
