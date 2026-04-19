import { AlertCard } from "./AlertCard";
import { KpiCard } from "./KpiCard";
import type { DashboardOverview } from "../_lib/dashboard";

export function MorningCheckStrip({ overview }: { overview: DashboardOverview }) {
  return (
    <section className="space-y-4">
      <div className="space-y-1">
        <p className="text-primary text-sm font-medium uppercase tracking-[0.18em]">
          Morning check
        </p>
        <h1 className="text-3xl font-semibold tracking-tight">{overview.subjectDayLabel}</h1>
      </div>

      {overview.alerts.length > 0 ? (
        <div className="grid gap-3">
          {overview.alerts.map((alert) => (
            <AlertCard key={alert.id} alert={alert} />
          ))}
        </div>
      ) : null}

      <div className="grid gap-4 lg:grid-cols-3">
        <KpiCard kpi={overview.revenue} />
        <KpiCard kpi={overview.orders} />
        <KpiCard kpi={overview.aov} />
      </div>
    </section>
  );
}
