import { ChannelEconomicsTable } from "./ChannelEconomicsTable";
import { CustomerActivityCard } from "./CustomerActivityCard";
import { HeatmapChart } from "./HeatmapChart";
import { PaymentMethodChart } from "./PaymentMethodChart";
import type { DashboardPeriodPayload } from "../_lib/dashboard";

export function DecisionSurfaceStrip({ payload }: { payload: DashboardPeriodPayload }) {
  return (
    <section className="space-y-4">
      <div className="space-y-1">
        <p className="text-primary text-sm font-medium uppercase tracking-[0.18em]">
          Decision surface
        </p>
        <h2 className="text-2xl font-semibold tracking-tight">Where to lean in next</h2>
      </div>

      <div className="grid gap-4 xl:grid-cols-[1.05fr_0.95fr]">
        <HeatmapChart cells={payload.current.heatmap} />
        <PaymentMethodChart rows={payload.current.paymentMethods} />
      </div>

      <div className="grid gap-4 xl:grid-cols-[1.2fr_0.8fr]">
        <ChannelEconomicsTable rows={payload.current.economics} />
        <CustomerActivityCard customers={payload.current.customers} />
      </div>
    </section>
  );
}
