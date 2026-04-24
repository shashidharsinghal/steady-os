import { EconomicsTable } from "./EconomicsTable";
import { FeeVisualization } from "./FeeVisualization";
import { RecommendationSlot } from "./slots/RecommendationSlot";
import type { ChannelEconomicsRow } from "../_lib/dashboard";

export function ChannelEconomicsSection({ rows }: { rows: ChannelEconomicsRow[] }) {
  return (
    <section className="space-y-4">
      <div className="space-y-1">
        <p className="text-primary text-sm font-medium uppercase tracking-[0.22em]">Section 3</p>
        <h2 className="text-2xl font-semibold tracking-tight">Channel Economics</h2>
        <p className="text-muted-foreground text-sm">
          What each channel actually leaves behind after commissions and fees.
        </p>
      </div>

      <div className="grid gap-4 xl:grid-cols-[1.15fr_0.85fr]">
        <EconomicsTable rows={rows} />
        <FeeVisualization rows={rows} />
      </div>

      <RecommendationSlot />
    </section>
  );
}
