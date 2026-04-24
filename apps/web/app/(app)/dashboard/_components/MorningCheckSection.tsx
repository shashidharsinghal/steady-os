import { FreshnessBanner } from "./FreshnessBanner";
import { AlertsStrip } from "./AlertsStrip";
import { DoWHeadlineCard } from "./DoWHeadlineCard";
import { RushPatternCard } from "./RushPatternCard";
import { InsightsSlot } from "./slots/InsightsSlot";
import type { MorningCheckData } from "../_lib/dashboard";

export function MorningCheckSection({ data }: { data: MorningCheckData }) {
  return (
    <section className="space-y-4">
      <div className="space-y-1">
        <p className="text-primary text-sm font-medium uppercase tracking-[0.22em]">Section 1</p>
        <h2 className="text-2xl font-semibold tracking-tight">The Morning Check</h2>
        <p className="text-muted-foreground text-sm">
          Yesterday first, with a weekday-aware baseline and a clear read on where the rush usually
          lands.
        </p>
      </div>

      <FreshnessBanner freshness={data.freshness} />
      <AlertsStrip alerts={data.alerts} />

      <div className="grid gap-4 xl:grid-cols-[1.05fr_0.95fr]">
        <DoWHeadlineCard targetDay={data.targetDay} baseline={data.baseline} />
        <RushPatternCard rush={data.rushPattern} />
      </div>

      <InsightsSlot />
    </section>
  );
}
